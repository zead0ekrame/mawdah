import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOTP } from "@/lib/otp";
import { createSession, setSessionCookie } from "@/lib/session";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: "البيانات مطلوبة" },
        { status: 400 }
      );
    }

    const limited = checkRateLimit(`verify-otp:${userId}`, 8, 15 * 60 * 1000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds);

    const isValid = await verifyOTP(userId, code);
    if (!isValid) {
      return NextResponse.json(
        { error: "الكود غير صحيح أو منتهي الصلاحية" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    // تحديث آخر نشاط
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });

    const token = await createSession({
      userId: user.id,
      phone: user.phone,
      gender: user.gender,
      isAdmin: user.isAdmin,
    });

    await setSessionCookie(token);

    // هل أكمل الملف الشخصي؟
    const profile = await prisma.profile.findUnique({ where: { userId } });

    return NextResponse.json({
      success: true,
      hasProfile: !!profile,
      gender: user.gender,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error("[verify-otp]", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
