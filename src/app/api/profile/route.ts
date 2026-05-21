import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  findProfileMessageIssues,
  isEgyptianMobile,
  normalizePhoneLike,
} from "@/lib/moderation";

// GET: جلب الملف الشخصي
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { userId: session.userId },
  });

  const preferences = await prisma.preference.findMany({
    where: { userId: session.userId },
  });

  return NextResponse.json({ profile, preferences });
}

// POST: إنشاء أو تعديل الملف الشخصي
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      age, currentGovernorate, postMarriageGovernorate,
      maritalStatus, childrenCount, currentWivesCount,
      religiousLevel, educationLevel, heightCategory,
      weightCategory, skinColor, personalMessage,
      hijabType, guardianPhone,
    } = body;

    const cleanedMessage = String(personalMessage ?? "").trim();
    const messageIssues = findProfileMessageIssues(cleanedMessage);
    if (messageIssues.length > 0) {
      return NextResponse.json({ error: messageIssues[0], issues: messageIssues }, { status: 400 });
    }

    const shouldUpdatePhone = body.hasOwnProperty("guardianPhone");
    let finalGuardianPhone = null;

    if (shouldUpdatePhone) {
      const [rawPhone, rawChannel] = String(guardianPhone ?? "").split("|");
      const cleanedPhoneDigits = normalizePhoneLike(rawPhone);
      if (session.gender === "FEMALE" && !isEgyptianMobile(cleanedPhoneDigits)) {
        return NextResponse.json({ error: "رقم التواصل غير صحيح (يجب أن يكون رقم هاتف مصري صحيح يبدأ بـ 01)" }, { status: 400 });
      }
      if (session.gender === "MALE" && cleanedPhoneDigits && !isEgyptianMobile(cleanedPhoneDigits)) {
        return NextResponse.json({ error: "رقم التواصل غير صحيح (يجب أن يكون رقم هاتف مصري صحيح يبدأ بـ 01)" }, { status: 400 });
      }

      finalGuardianPhone = cleanedPhoneDigits 
        ? (rawChannel ? `${cleanedPhoneDigits}|${rawChannel}` : cleanedPhoneDigits)
        : null;
    }

    // حساب نسبة اكتمال الملف
    const requiredFields = [
      age, currentGovernorate, postMarriageGovernorate,
      maritalStatus, religiousLevel, educationLevel,
      heightCategory, weightCategory, skinColor, cleanedMessage,
    ];
    const filled = requiredFields.filter(Boolean).length;
    const completenessScore = Math.round((filled / requiredFields.length) * 100);

    const profileData: any = {
      age: parseInt(age),
      currentGovernorate,
      postMarriageGovernorate,
      maritalStatus,
      childrenCount: childrenCount ? parseInt(childrenCount) : null,
      currentWivesCount: currentWivesCount ? parseInt(currentWivesCount) : null,
      religiousLevel: parseInt(religiousLevel),
      educationLevel,
      heightCategory,
      weightCategory,
      skinColor,
      personalMessage: cleanedMessage,
      hijabType: session.gender === "FEMALE" ? hijabType : null,
      completenessScore,
    };

    if (shouldUpdatePhone) {
      profileData.guardianPhone = finalGuardianPhone;
    }

    const profile = await prisma.profile.upsert({
      where: { userId: session.userId },
      update: profileData,
      create: { userId: session.userId, ...profileData },
    });

    return NextResponse.json({ profile, completenessScore });
  } catch (error) {
    console.error("[profile POST]", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
