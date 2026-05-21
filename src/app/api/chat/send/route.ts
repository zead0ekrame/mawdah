import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function containsBlockedContent(text: string): boolean {
  // 1. فحص الروابط (HTTP/HTTPS/WWW والروابط المختصرة)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,6})/gi;
  
  // 2. فحص أرقام الهواتف (الأرقام الإنجليزية والعربية والشرقية) بمختلف التنسيقات
  const phoneRegex = /(\+?\d[\d\s-]{7,11}|[٠-٩][٠-٩\s-]{7,11}|[۰-۹][۰-۹\s-]{7,11})/g;

  return urlRegex.test(text) || phoneRegex.test(text);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { matchId, content } = await request.json();

  if (!matchId || !content || content.trim() === "") {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    return NextResponse.json({ error: "التوافق غير موجود" }, { status: 404 });
  }

  // التأكد من أن المستخدم أحد طرفي هذا التوافق
  const isParticipant = match.maleId === session.userId || match.femaleId === session.userId;
  if (!isParticipant) {
    return NextResponse.json({ error: "غير مصرح لك بدخول هذه المحادثة" }, { status: 403 });
  }

  // التأكد من أن التوافق في مرحلة الشات المفتوح
  if (match.status !== "CHAT_PHASE") {
    return NextResponse.json({ error: "المحادثة مغلقة أو لم تبدأ بعد في هذه المرحلة" }, { status: 400 });
  }

  // فحص حظر الروابط أو الهواتف لحماية المستخدمين
  if (containsBlockedContent(content)) {
    return NextResponse.json({
      error: "من أجل حمايتكم، يمنع تبادل أرقام الهواتف أو روابط المواقع في هذه المرحلة. يمكنك إكمال الحوار والتعارف هنا، وعندما تكونان جاهزين للتواصل المباشر، اضغطا معاً على زر «تأكيد التوافق المبدئي» بجانب الشات لكشف أرقام الهواتف رسمياً وبشكل شرعي.",
      isBlocked: true
    }, { status: 400 });
  }

  // حفظ الرسالة في قاعدة البيانات
  const message = await prisma.chatMessage.create({
    data: {
      matchId,
      senderId: session.userId,
      content: content.trim(),
      isSystem: false,
    },
    include: {
      sender: {
        select: {
          id: true,
          gender: true,
        }
      }
    }
  });

  return NextResponse.json({ success: true, message });
}
