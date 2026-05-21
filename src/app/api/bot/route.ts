import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateChatReply } from "@/lib/bot-ai";

const BOT_MESSAGES = {
  WELCOME_NEW: "أهلاً بيك! أنا أنيس 💚\nأنا هنا أساعدك تلاقي اللي كتبه ربنا ليك بطريقة شرعية ومحترمة.\n\nاكتب /help لترى ما يمكنني فعله 😊",
  WELCOME_BACK: (name: string) => `أهلاً تاني! سعيد بعودتك 💚\n${name}، اكتب /help لترى الأوامر المتاحة.`,
  NO_MATCHES: "لا توجد عروض متاحة حالياً 💚\nسيتوفر المزيد قريباً — أنيس بيدور عليك!",
};

async function sendBotMessage(userId: string, content: string, messageType?: string) {
  return prisma.botMessage.create({
    data: { userId, content, isFromBot: true, messageType },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const messages = await prisma.botMessage.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { content } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: "فارغ" }, { status: 400 });

  const text = content.trim();

  // 1. حفظ رسالة المستخدم
  await prisma.botMessage.create({
    data: { userId: session.userId, content: text, isFromBot: false },
  });

  // تحديث آخر نشاط
  await prisma.user.update({
    where: { id: session.userId },
    data: { lastActiveAt: new Date() },
  });

  let botReply = "";
  let navigateTo: string | null = null;
  const cmd = text.toLowerCase();

  // ============================================================
  // 2. اعتراض الأوامر السريعة المباشرة (Quick Actions)
  // ============================================================
  if (cmd === "/help") {
    botReply = "الأوامر المتاحة 💚\n\n🔍 /browse — استعراض الملفات\n📋 /profile — ملفي\n⚙️ /preferences — التفضيلات\n🚨 /report — شكوى";
  } else if (cmd === "/browse") {
    navigateTo = "/browse";
    botReply = "ثواني وهحوّلك لصفحة الاستكشاف 💚";
  } else if (cmd === "/matches") {
    navigateTo = "/matches";
    botReply = "بفتحلك ملفات التوافق المكتملة 💚";
  } else if (cmd === "/profile") {
    navigateTo = "/profile"; 
    botReply = "بفتحلك ملفك الشخصي دلوقتي 📋";
  } else if (cmd === "/preferences") {
    navigateTo = "/preferences";
    botReply = "جاري تحويلك لصفحة التفضيلات ⚙️";
  } else if (cmd === "/report") {
    navigateTo = "/matches";
    botReply = "لو حصلت مشكلة بعد توافق مكتمل، افتح ملفات التوافق واختار تقييم التجربة ثم شكوى رسمية. الإدارة هتراجعها بعناية.";
  } else {
    // ============================================================
    // 3. المحادثة الذكية باستخدام Gemini (AI Companion)
    // ============================================================
    try {
      // جلب السياق الحالي للمستخدم (Context)
      const [profile, recentMessages, pendingMatchesCount, fullyMatchedCount] = await Promise.all([
        prisma.profile.findUnique({ where: { userId: session.userId } }),
        prisma.botMessage.findMany({
          where: { userId: session.userId },
          orderBy: { createdAt: "desc" },
          take: 6, // آخر 6 رسائل لتذكر سياق المحادثة
        }),
        prisma.match.count({
          where: session.gender === "MALE"
            ? { maleId: session.userId, status: "PENDING_MALE" }
            : { femaleId: session.userId, status: "PENDING_FEMALE" }
        }),
        prisma.match.count({
          where: session.gender === "MALE"
            ? { maleId: session.userId, status: "FULLY_MATCHED" }
            : { femaleId: session.userId, status: "FULLY_MATCHED" }
        })
      ]);

      botReply = await generateChatReply(text, session, profile, recentMessages, pendingMatchesCount, fullyMatchedCount);

    } catch (e) {
      console.error("AI Bot Error:", e);
      botReply = "معلش، النظام عندي فيه تحديث بسيط دلوقتي 💚\nاستخدم الأزرار اللي تحت أو اكتب /help لحد ما أرجعلك بكامل طاقتي!";
    }
  }

  // 4. حفظ وإرسال رد البوت
  const botMessage = await sendBotMessage(session.userId, botReply);

  return NextResponse.json({
    message: botMessage,
    navigateTo,
  });
}
