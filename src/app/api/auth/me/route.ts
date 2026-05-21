import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      phone: true,
      gender: true,
      status: true,
      reputationScore: true,
      createdAt: true,
      isAdmin: true,
    },
  });

  return NextResponse.json(user);
}
