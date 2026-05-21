import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET: قائمة المستخدمين
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { isAdmin: false },
      include: { profile: { select: { completenessScore: true, age: true, currentGovernorate: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where: { isAdmin: false } }),
  ]);

  return NextResponse.json({ users, total, pages: Math.ceil(total / limit) });
}

// PATCH: تعديل حالة مستخدم
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { userId, status } = await request.json();

  if (!["ACTIVE", "PAUSED", "STOPPED", "UNDER_FOLLOWUP", "BANNED"].includes(status)) {
    return NextResponse.json({ error: "حالة غير صحيحة" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  return NextResponse.json({ success: true });
}
