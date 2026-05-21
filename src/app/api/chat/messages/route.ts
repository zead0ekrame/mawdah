import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  const since = searchParams.get("since");

  if (!matchId) {
    return NextResponse.json({ error: "معرف التوافق مطلوب" }, { status: 400 });
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

  // بناء شروط الفلترة
  const whereClause: Record<string, any> = { matchId };
  if (since) {
    whereClause.createdAt = { gt: new Date(since) };
  }

  // جلب الرسائل
  const messages = await prisma.chatMessage.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          gender: true,
        }
      }
    }
  });

  // تحديث حالة الرسائل غير المقروءة الواردة من الطرف الآخر لتصبح "مقروءة"
  const unreadMessagesFromOther = messages.filter(
    (msg) => !msg.isRead && !msg.isSystem && msg.senderId !== session.userId
  );

  if (unreadMessagesFromOther.length > 0) {
    await prisma.chatMessage.updateMany({
      where: {
        id: { in: unreadMessagesFromOther.map((m) => m.id) }
      },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ success: true, messages });
}
