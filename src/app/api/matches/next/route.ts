import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  getNextMatchForFemale,
  getNextMatchForMale,
  recordMatchAppearance,
  calculateCompatibility,
} from "@/lib/algorithm";
import { EDU_LABELS, GOV_LABELS } from "@/lib/labels";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isFemale = session.gender === "FEMALE";
  const userId = session.userId;

  // عدد العروض اليوم
  const todayCount = await prisma.match.count({
    where: isFemale
      ? { femaleId: userId, createdAt: { gte: today } }
      : { maleId: userId, createdAt: { gte: today } },
  });

  // جلب الملف التالي من الخوارزمية
  const otherId = isFemale
    ? await getNextMatchForFemale(userId)
    : await getNextMatchForMale(userId);

  // الحد اليومي
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const daysSince = user ? (Date.now() - user.createdAt.getTime()) / 86400000 : 99;
  let dailyLimit = 5;
  if (daysSince <= 7) dailyLimit += 2;

  if (!otherId) {
    return NextResponse.json({ profile: null, todayCount, dailyLimit });
  }

  // حساب التوافق وتسجيل الظهور
  const maleId = isFemale ? otherId : userId;
  const femaleId = isFemale ? userId : otherId;

  const score = await calculateCompatibility(maleId, femaleId);
  await recordMatchAppearance(maleId, femaleId, score);

  // جلب match ID
  const match = await prisma.match.findUnique({
    where: { maleId_femaleId: { maleId, femaleId } },
  });

  // جلب الملف المناسب
  const other = await prisma.user.findUnique({
    where: { id: otherId },
    include: { profile: true },
  });
  const current = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!other?.profile || !match) {
    return NextResponse.json({ profile: null, todayCount, dailyLimit });
  }

  const p = other.profile;

  return NextResponse.json({
    profile: {
      matchId: match.id,
      age: p.age,
      currentGovernorate: p.currentGovernorate,
      maritalStatus: p.maritalStatus,
      childrenCount: p.childrenCount,
      currentWivesCount: p.currentWivesCount,
      religiousLevel: p.religiousLevel,
      educationLevel: p.educationLevel,
      heightCategory: p.heightCategory,
      weightCategory: p.weightCategory,
      skinColor: p.skinColor,
      // الحجاب يظهر للذكر فقط
      hijabType: !isFemale ? p.hijabType : undefined,
      personalMessage: p.personalMessage,
      compatibilityScore: score,
      compatibilityReasons: buildCompatibilityReasons(current?.profile, p),
      gender: isFemale ? "MALE" : "FEMALE",
    },
    todayCount: todayCount + 1,
    dailyLimit,
  });
}

function buildCompatibilityReasons(current: any, other: any) {
  if (!current || !other) return ["بياناتكما مكتملة بما يكفي للترشيح"];

  const reasons: string[] = [];

  if (current.currentGovernorate === other.currentGovernorate) {
    reasons.push(`نفس المحافظة: ${GOV_LABELS[other.currentGovernorate] ?? other.currentGovernorate}`);
  }
  if (current.currentGovernorate === other.currentGovernorate) {
    reasons.push("توقع السكن بعد الزواج متوافق");
  }
  if (Math.abs(current.religiousLevel - other.religiousLevel) <= 1) {
    reasons.push("مستوى الالتزام قريب");
  }
  if (Math.abs(current.age - other.age) <= 5) {
    reasons.push("السن في نطاق قريب");
  }
  if (current.educationLevel === other.educationLevel) {
    reasons.push(`نفس مستوى التعليم: ${EDU_LABELS[other.educationLevel] ?? other.educationLevel}`);
  }

  return reasons.slice(0, 3).length > 0
    ? reasons.slice(0, 3)
    : ["الترشيح مناسب بناءً على التفضيلات الأساسية"];
}
