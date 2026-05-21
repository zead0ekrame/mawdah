import { NextResponse } from "next/server";
import { getSession, clearSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const [user, profile, preferences, matches, ratingsGiven, complaintsFiled] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          phone: true,
          gender: true,
          status: true,
          reputationScore: true,
          createdAt: true,
          updatedAt: true,
          lastActiveAt: true,
        },
      }),
      prisma.profile.findUnique({ where: { userId: session.userId } }),
      prisma.preference.findMany({ where: { userId: session.userId } }),
      prisma.match.findMany({
        where: { OR: [{ maleId: session.userId }, { femaleId: session.userId }] },
        select: {
          id: true,
          compatibilityScore: true,
          status: true,
          appearanceCount: true,
          femaleDecision: true,
          maleDecision: true,
          contactsRevealedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.rating.findMany({ where: { raterId: session.userId } }),
      prisma.complaint.findMany({ where: { complainantId: session.userId } }),
    ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user,
    profile,
    preferences,
    matches,
    ratingsGiven,
    complaintsFiled,
  });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const userId = session.userId;
  const matches = await prisma.match.findMany({
    where: { OR: [{ maleId: userId }, { femaleId: userId }] },
    select: { id: true },
  });
  const matchIds = matches.map((match) => match.id);

  await prisma.$transaction([
    prisma.contactRevealLog.deleteMany({
      where: { OR: [{ revealedToUserId: userId }, { matchId: { in: matchIds } }] },
    }),
    prisma.followUpLog.deleteMany({
      where: { OR: [{ userId }, { matchId: { in: matchIds } }] },
    }),
    prisma.rating.deleteMany({
      where: {
        OR: [
          { raterId: userId },
          { ratedId: userId },
          { femaleMatchId: { in: matchIds } },
          { maleMatchId: { in: matchIds } },
        ],
      },
    }),
    prisma.complaint.deleteMany({
      where: { OR: [{ complainantId: userId }, { respondentId: userId }] },
    }),
    prisma.match.deleteMany({
      where: { id: { in: matchIds } },
    }),
    prisma.pushSubscription.deleteMany({ where: { userId } }),
    prisma.botMessage.deleteMany({ where: { userId } }),
    prisma.preference.deleteMany({ where: { userId } }),
    prisma.profile.deleteMany({ where: { userId } }),
    prisma.otpCode.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  await clearSession();
  return NextResponse.json({ success: true });
}
