import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// جلب التوافقات المكتملة للمستخدم
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ maleId: session.userId }, { femaleId: session.userId }],
      status: { in: ["CHAT_PHASE", "FULLY_MATCHED", "UNDER_FOLLOWUP"] },
    },
    include: {
      male: { include: { profile: true } },
      female: { include: { profile: true } },
      femaleRating: true,
      maleRating: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ matches });
}
