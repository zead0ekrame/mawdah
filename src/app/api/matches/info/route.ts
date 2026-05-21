import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId مطلوب" }, { status: 400 });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  if (match.maleId !== session.userId && match.femaleId !== session.userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const hoursElapsed = match.contactsRevealedAt
    ? (Date.now() - match.contactsRevealedAt.getTime()) / 3600000
    : 0;

  return NextResponse.json({ matchId, status: match.status, hoursElapsed });
}
