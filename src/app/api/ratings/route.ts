import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateReputationScore } from "@/lib/algorithm";
import { RatingType } from "@prisma/client";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { matchId, ratingType } = await request.json();

  const limited = checkRateLimit(`ratings:${session.userId}`, 20, 60 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds);

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { male: true, female: true },
  });

  if (!match) return NextResponse.json({ error: "التوافق غير موجود" }, { status: 404 });
  
  const allowedStatuses = ["CHAT_PHASE", "FULLY_MATCHED", "UNDER_FOLLOWUP"];
  if (!allowedStatuses.includes(match.status)) {
    return NextResponse.json({ error: "لا يمكن التقييم في هذه المرحلة" }, { status: 400 });
  }

  const isMale = match.maleId === session.userId;
  const isFemale = match.femaleId === session.userId;
  if (!isMale && !isFemale) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const isChatPhase = match.status === "CHAT_PHASE";

  if (!isChatPhase) {
    // التحقق من قيود الوقت للتقييمات بعد كشف الأرقام
    const contactsRevealedAt = match.contactsRevealedAt;
    if (!contactsRevealedAt) {
      return NextResponse.json({ error: "لم يتم كشف الأرقام بعد" }, { status: 400 });
    }

    const hoursSinceReveal = (Date.now() - contactsRevealedAt.getTime()) / (1000 * 60 * 60);

    // NO_CONTACT / NO_RESPONSE: بعد 48 ساعة فقط
    if (
      (ratingType === "NO_CONTACT" || ratingType === "NO_RESPONSE") &&
      hoursSinceReveal < 48
    ) {
      const remainingHours = Math.ceil(48 - hoursSinceReveal);
      return NextResponse.json({
        error: `لا يمكن اختيار هذا الخيار إلا بعد ${remainingHours} ساعة`,
        availableInHours: remainingHours,
      }, { status: 400 });
    }

    // SLOW_RESPONSE: بعد 24 ساعة فقط
    if (ratingType === "SLOW_RESPONSE" && hoursSinceReveal < 24) {
      const remainingHours = Math.ceil(24 - hoursSinceReveal);
      return NextResponse.json({
        error: `لا يمكن اختيار هذا الخيار إلا بعد ${remainingHours} ساعة`,
        availableInHours: remainingHours,
      }, { status: 400 });
    }
  }

  // التحقق من صحة نوع التقييم حسب الجنس
  if (isFemale && ratingType === "NO_RESPONSE") {
    return NextResponse.json({ error: "هذا الخيار للذكور فقط" }, { status: 400 });
  }
  if (isMale && ratingType === "NO_CONTACT") {
    return NextResponse.json({ error: "هذا الخيار للإناث فقط" }, { status: 400 });
  }

  const ratedId = isMale ? match.femaleId : match.maleId;

  // حفظ التقييم
  const ratingData = {
    raterId: session.userId,
    ratedId,
    ratingType: ratingType as RatingType,
    availableAt: new Date(),
  };

  if (isFemale) {
    await prisma.rating.upsert({
      where: { femaleMatchId: matchId },
      update: ratingData,
      create: { ...ratingData, femaleMatchId: matchId },
    });
  } else {
    await prisma.rating.upsert({
      where: { maleMatchId: matchId },
      update: ratingData,
      create: { ...ratingData, maleMatchId: matchId },
    });
  }

  // تحديث نقاط السمعة
  await updateReputationScore(ratedId, ratingType as RatingType);

  // إذا كنا في مرحلة الشات والتقييم هو توافق مبدئي
  if (isChatPhase && ratingType === "INITIAL_MATCH") {
    // التحقق مما إذا كان الطرف الآخر قد قيّم بالفعل بـ INITIAL_MATCH
    const [femaleRating, maleRating] = await Promise.all([
      prisma.rating.findUnique({ where: { femaleMatchId: matchId } }),
      prisma.rating.findUnique({ where: { maleMatchId: matchId } }),
    ]);

    const otherRatedMatch = isFemale 
      ? maleRating?.ratingType === "INITIAL_MATCH"
      : femaleRating?.ratingType === "INITIAL_MATCH";

    if (otherRatedMatch) {
      // ====================================================
      // كلاهما اختار INITIAL_MATCH → تفعيل التوافق وكشف الأرقام!
      // ====================================================
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: "FULLY_MATCHED",
          contactsRevealedAt: new Date(),
        },
      });

      // استدعاء دالة كشف أرقام الهواتف والولي الشرعي
      await revealContacts(match);

      // إرسال رسالة نظام تهنئة في الشات
      await prisma.chatMessage.create({
        data: {
          matchId: matchId,
          senderId: match.femaleId,
          isSystem: true,
          content: "تهانينا! لقد أكد كِلا الطرفين التوافق المبدئي بنجاح 🎉. تم كشف بيانات التواصل والولي الشرعي الآن في صفحة التوافقات بنجاح. نتمنى لكم التوفيق والبركة في خطواتكم القادمة.",
        }
      });
    }
  } else if (!isChatPhase && ratingType === "INITIAL_MATCH") {
    // التقييم بعد كشف الأرقام → قيد المتابعة للزواج
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "UNDER_FOLLOWUP" },
    });
    await prisma.user.updateMany({
      where: { id: { in: [match.maleId, match.femaleId] } },
      data: { status: "UNDER_FOLLOWUP" },
    });
  }

  // شكوى رسمية → تسجيل في الشكاوى
  if (ratingType === "FORMAL_COMPLAINT") {
    await prisma.complaint.create({
      data: {
        complainantId: session.userId,
        respondentId: ratedId,
        reason: "شكوى من خلال نظام التقييم",
      },
    });
  }

  return NextResponse.json({ success: true });
}

// دالة كشف أرقام التواصل وتسجيل الدخول
async function revealContacts(match: any) {
  const [male, female] = await Promise.all([
    prisma.user.findUnique({ where: { id: match.maleId }, include: { profile: true } }),
    prisma.user.findUnique({ where: { id: match.femaleId }, include: { profile: true } }),
  ]);

  const guardianPhone = female?.profile?.guardianPhone ?? "";
  const malePhone = male?.profile?.guardianPhone || male?.phone || "";

  await prisma.contactRevealLog.createMany({
    data: [
      {
        matchId: match.id,
        revealedToUserId: match.maleId,
        revealedPhone: guardianPhone,
        contactType: "GUARDIAN_PHONE",
        reason: "MUTUAL_MATCH_INITIAL_RATING",
      },
      {
        matchId: match.id,
        revealedToUserId: match.femaleId,
        revealedPhone: malePhone,
        contactType: "DIRECT_PHONE",
        reason: "MUTUAL_MATCH_INITIAL_RATING",
      },
    ],
  });

  // إرسال الإشعار الثابت للذكر
  await prisma.botMessage.create({
    data: {
      userId: match.maleId,
      isFromBot: true,
      messageType: "CONTACT_REVEALED",
      content: `إشعار: حصل توافق مبدئي! تفقد ملفات التوافق لرؤية التفاصيل وأرقام التواصل.`,
    },
  });

  // إرسال الإشعار الثابت للأنثى
  await prisma.botMessage.create({
    data: {
      userId: match.femaleId,
      isFromBot: true,
      messageType: "CONTACT_REVEALED",
      content: `إشعار: حصل توافق مبدئي! تفقدي ملفات التوافق لرؤية التفاصيل وأرقام التواصل.`,
    },
  });

  // تغيير حالة الطرفين إلى UNDER_FOLLOWUP
  await prisma.user.updateMany({
    where: { id: { in: [match.maleId, match.femaleId] } },
    data: { status: "UNDER_FOLLOWUP" },
  });
}
