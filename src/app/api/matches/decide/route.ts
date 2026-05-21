import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { trainWeightsIfReady } from "@/lib/algorithm";
import { sendPushToUser } from "@/lib/push";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// ============================================================
// نظام Mutual Match:
// كل طرف يتصفح بشكل مستقل ويختار — لما الاثنين يختارا بعض
// تظهر الأرقام تلقائياً بدون أي إشعار مسبق
// ============================================================
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { matchId, decision } = await request.json();

  const limited = checkRateLimit(`match-decision:${session.userId}`, 30, 60 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds);

  if (!matchId || !["APPROVED", "REJECTED"].includes(decision)) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      male: true,
      female: { include: { profile: true } },
    },
  });

  if (!match) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // تحديد من يتخذ القرار: الأنثى أم الذكر؟
  const isFemale = match.femaleId === session.userId;
  const isMale = match.maleId === session.userId;

  if (!isFemale && !isMale) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }

  // منع القرار المكرر
  if (isFemale && match.femaleDecision !== null) {
    return NextResponse.json({ error: "تم اتخاذ القرار مسبقاً" }, { status: 409 });
  }
  if (isMale && match.maleDecision !== null) {
    return NextResponse.json({ error: "تم اتخاذ القرار مسبقاً" }, { status: 409 });
  }

  // تحديث قرار هذا الطرف
  const updateData: Record<string, unknown> = isFemale
    ? { femaleDecision: decision, femaleDecidedAt: new Date() }
    : { maleDecision: decision, maleDecidedAt: new Date() };

  // تحديد ما إذا كان الطرف الآخر وافق مسبقاً
  const otherApproved = isFemale
    ? match.maleDecision === "APPROVED"
    : match.femaleDecision === "APPROVED";

  let isChatPhase = false;

  if (decision === "APPROVED" && otherApproved) {
    // ====================================================
    // توافق مزدوج! — كلاهما وافق بشكل مستقل → مرحلة المحادثة الآمنة
    // ====================================================
    isChatPhase = true;
    updateData.status = "CHAT_PHASE";
  } else if (decision === "REJECTED") {
    updateData.status = isFemale ? "FEMALE_REJECTED" : "MALE_REJECTED";
  } else {
    // وافق لكن الآخر لم يحسم بعد — يُحفظ صامتاً
    updateData.status = isFemale ? "PENDING_MALE" : "PENDING_FEMALE";
  }

  await prisma.match.update({ where: { id: matchId }, data: updateData });

  // إذا بدأ الشات → إرسال إشعارات وتنبيه ترحيبي
  if (isChatPhase) {
    // إرسال Push Notification للطرفين فوراً لبدء الشات
    sendPushToUser(match.maleId, {
      title: "مودة 💚",
      body: "تم فتح المحادثة الآمنة بينكما! افتح التطبيق لبدء التعارف بكل احترام وجدية.",
      url: `/matches`,
    }).catch(() => {});
    sendPushToUser(match.femaleId, {
      title: "مودة 💚",
      body: "تم فتح المحادثة الآمنة بينكما! افتحي التطبيق لبدء التعارف بكل احترام وجدية.",
      url: `/matches`,
    }).catch(() => {});

    // إضافة رسالة نظام ترحيبية في الشات لتوضيح القوانين والخطوات القادمة
    await prisma.chatMessage.create({
      data: {
        matchId: matchId,
        senderId: match.femaleId, // كاتب الرسالة كطرف تقني
        isSystem: true,
        content: "تم فتح المحادثة الآمنة بينكما تلقائياً للتطابق المشترك. يرجى التعارف بكل احترام وجدية وسؤال الأسئلة الأساسية لتحديد التوافق. يمنع تبادل أرقام الهواتف أو الروابط هنا لحمايتكم. عند تأكدكم من التوافق الفكري والروحي، اضغطا معاً على زر «تأكيد التوافق المبدئي» بجانب الشات لكشف أرقام التواصل والولي الشرعي.",
      }
    });
  }

  // تدريب ذاتي في الخلفية
  trainWeightsIfReady().catch(() => {});

  return NextResponse.json({ success: true, decision, isChatPhase });
}

// ============================================================
// كشف الأرقام لكلا الطرفين بعد التوافق المزدوج
// ============================================================
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
        reason: "MUTUAL_MATCH",
      },
      {
        matchId: match.id,
        revealedToUserId: match.femaleId,
        revealedPhone: malePhone,
        contactType: "DIRECT_PHONE",
        reason: "MUTUAL_MATCH",
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
