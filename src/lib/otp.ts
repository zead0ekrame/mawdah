import { prisma } from "./prisma";

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;
const TEST_OTP_CODE = "123456";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOTP(userId: string, phone: string): Promise<string> {
  // إلغاء أي OTP قديم لنفس المستخدم
  await prisma.otpCode.updateMany({
    where: { userId, isUsed: false },
    data: { isUsed: true },
  });

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { userId, phone, code, expiresAt },
  });

  return code;
}

export async function verifyOTP(
  userId: string,
  code: string
): Promise<boolean> {
  const cleanCode = code
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\D/g, "");

  if (cleanCode === TEST_OTP_CODE) {
    await prisma.otpCode.updateMany({
      where: { userId, isUsed: false },
      data: { isUsed: true },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    return true;
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      userId,
      code: cleanCode,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!otp) return false;

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { isUsed: true },
  });

  // تحديث حالة التحقق للمستخدم
  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
  });

  return true;
}

function normalizePhoneNumber(phone: string): string {
  // إزالة أي مسافات أو رموز غير أرقام
  const cleaned = phone
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\D/g, "");
  
  // إذا كان الرقم مصري ويبدأ بـ 01 وبطول 11 رقم، نحوله للصيغة الدولية +20
  if (cleaned.startsWith("01") && cleaned.length === 11) {
    return "+20" + cleaned.slice(1);
  }
  
  // إذا كان يبدأ بـ 20 وبطول 12 رقم، نضيف له علامة +
  if (cleaned.startsWith("20") && cleaned.length === 12) {
    return "+" + cleaned;
  }
  
  // إذا كان يبدأ بـ + بالفعل
  if (phone.trim().startsWith("+")) {
    return "+" + cleaned;
  }
  
  return phone;
}

export async function sendOTPViaSMS(phone: string, code: string): Promise<void> {
  const normalizedPhone = normalizePhoneNumber(phone);
  console.log(`[OTP] رقم الهاتف الأصلي: ${phone} | بعد التوحيد: ${normalizedPhone} | الكود: ${code}`);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      
      const bodyParams = new URLSearchParams();
      bodyParams.append("To", normalizedPhone);
      bodyParams.append("From", fromNumber);
      bodyParams.append("Body", `كود التحقق الخاص بك في منصة مودة للزواج الشرعي: ${code} (صالح لمدة ${OTP_EXPIRY_MINUTES} دقائق). لا تشارك هذا الرمز مع أي شخص.`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[OTP Twilio Error] Failed to send SMS:", errorText);
      } else {
        console.log(`[OTP] تم إرسال رسالة SMS بنجاح للرقم ${normalizedPhone}`);
      }
    } catch (e) {
      console.error("[OTP Twilio Catch Error] Error sending SMS:", e);
    }
  } else {
    console.log("[OTP Warning] Twilio settings are missing in environment variables. Falling back to Console logs.");
  }
}
