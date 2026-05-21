import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// نظام المتابعة — يُرسل رسائل تلقائية بعد التوافق الكامل
// يُستدعى من cron job أو يدوياً
export async function POST() {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const fullyMatchedPairs = await prisma.match.findMany({
    where: { status: "FULLY_MATCHED" },
    include: { male: true, female: true },
  });

  let sent = 0;
  const now = Date.now();

  for (const match of fullyMatchedPairs) {
    if (!match.contactsRevealedAt) continue;
    const hoursSince = (now - match.contactsRevealedAt.getTime()) / 3600000;

    // بعد أسبوع (168 ساعة)
    if (hoursSince >= 168 && hoursSince < 192) {
      const alreadySent = await prisma.followUpLog.findFirst({
        where: { matchId: match.id, message: { contains: "أسبوع" } },
      });
      if (!alreadySent) {
        const msg = "كيف تسير الأمور معكم؟ 💚\nأنيس يتمنى لكم التوفيق!\nاكتب /rate لتقييم تجربتك.";
        await prisma.botMessage.createMany({
          data: [
            { userId: match.maleId, isFromBot: true, messageType: "FOLLOWUP_WEEK", content: msg },
            { userId: match.femaleId, isFromBot: true, messageType: "FOLLOWUP_WEEK", content: msg },
          ],
        });
        await prisma.followUpLog.createMany({
          data: [
            { matchId: match.id, userId: match.maleId, message: "متابعة أسبوع" },
            { matchId: match.id, userId: match.femaleId, message: "متابعة أسبوع" },
          ],
        });
        sent++;
      }
    }

    // بعد شهر (720 ساعة)
    if (hoursSince >= 720 && hoursSince < 744) {
      const alreadySent = await prisma.followUpLog.findFirst({
        where: { matchId: match.id, message: { contains: "شهر" } },
      });
      if (!alreadySent) {
        const msg = "مرّ شهر 💚\nهل وصلتم لقرار؟\nأخبرنا بـ /married أو /rate لنكمل مشوارك.";
        await prisma.botMessage.createMany({
          data: [
            { userId: match.maleId, isFromBot: true, messageType: "FOLLOWUP_MONTH", content: msg },
            { userId: match.femaleId, isFromBot: true, messageType: "FOLLOWUP_MONTH", content: msg },
          ],
        });
        await prisma.followUpLog.createMany({
          data: [
            { matchId: match.id, userId: match.maleId, message: "متابعة شهر" },
            { matchId: match.id, userId: match.femaleId, message: "متابعة شهر" },
          ],
        });
        sent++;
      }
    }

    // بعد 3 أشهر (2160 ساعة)
    if (hoursSince >= 2160 && hoursSince < 2184) {
      const alreadySent = await prisma.followUpLog.findFirst({
        where: { matchId: match.id, message: { contains: "3 أشهر" } },
      });
      if (!alreadySent) {
        const msg = "٣ أشهر مرّت 💚\nهل تريد الاستمرار في المتابعة؟\nأم تريد العودة للبحث مجدداً؟ اكتب /resume";
        await prisma.botMessage.createMany({
          data: [
            { userId: match.maleId, isFromBot: true, messageType: "FOLLOWUP_3MONTHS", content: msg },
            { userId: match.femaleId, isFromBot: true, messageType: "FOLLOWUP_3MONTHS", content: msg },
          ],
        });
        await prisma.followUpLog.createMany({
          data: [
            { matchId: match.id, userId: match.maleId, message: "متابعة 3 أشهر" },
            { matchId: match.id, userId: match.femaleId, message: "متابعة 3 أشهر" },
          ],
        });
        sent++;
      }
    }
  }

  return NextResponse.json({ success: true, followUpsSent: sent });
}
