import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { broadcastPush } from "@/lib/push";

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
    }

    // استخراج جميع المستخدمين النشطين أو الموقوفين مؤقتاً (الذين لديهم حسابات حقيقية)
    const users = await prisma.user.findMany({
      where: {
        status: { in: ["ACTIVE", "PAUSED", "UNDER_FOLLOWUP"] }
      },
      select: { id: true }
    });

    if (users.length === 0) {
      return NextResponse.json({ message: "لا يوجد مستخدمون لإرسال الإشعار إليهم" });
    }

    // إرسال الإشعار كـ BotMessage للجميع في الدردشة
    const botMessages = users.map(user => ({
      userId: user.id,
      content: `إشعار إداري: ${message}`,
      isFromBot: true,
      messageType: "BROADCAST"
    }));

    await prisma.botMessage.createMany({ data: botMessages });

    // إرسال Web Push للمستخدمين المشتركين في الإشعارات
    const pushCount = await broadcastPush({
      title: "أنيس 💚",
      body: message,
      url: "/chat",
    });

    return NextResponse.json({ success: true, botCount: users.length, pushCount });
  } catch (e) {
    console.error("Admin Broadcast Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
