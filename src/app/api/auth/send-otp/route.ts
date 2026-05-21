import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOTP, sendOTPViaSMS } from "@/lib/otp";
import { isEgyptianMobile, normalizePhoneLike } from "@/lib/moderation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { phone, gender } = await request.json();

    // التحقق من صحة البيانات
    if (!phone || !gender) {
      return NextResponse.json(
        { error: "رقم الهاتف والجنس مطلوبان" },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhoneLike(phone);
    if (!isEgyptianMobile(cleanPhone)) {
      return NextResponse.json(
        { error: "رقم الهاتف غير صحيح" },
        { status: 400 }
      );
    }

    const limited = checkRateLimit(`otp:${cleanPhone}`, 5, 15 * 60 * 1000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds);

    // إيجاد أو إنشاء المستخدم
    let user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: cleanPhone,
          gender: gender === "FEMALE" ? "FEMALE" : "MALE",
        },
      });
    }

    // التحقق من الحظر
    if (user.status === "BANNED") {
      return NextResponse.json(
        { error: "هذا الحساب محظور" },
        { status: 403 }
      );
    }

    // إنشاء وإرسال OTP
    const code = await createOTP(user.id, cleanPhone);
    await sendOTPViaSMS(cleanPhone, code);

    return NextResponse.json({
      success: true,
      userId: user.id,
      message: "تم إرسال كود التحقق",
      // ظاهر في DEV فقط — أحذفه في الـ production
      ...(process.env.NODE_ENV === "development" && { dev_code: code }),
    });
  } catch (error) {
    console.error("[send-otp]", error);
    return NextResponse.json({ error: "حدث خطأ، حاول مجدداً" }, { status: 500 });
  }
}
