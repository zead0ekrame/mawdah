import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { preferences } = await request.json();
  if (!Array.isArray(preferences)) {
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
  }

  // حذف القديمة وإعادة الإنشاء
  await prisma.preference.deleteMany({ where: { userId: session.userId } });

  if (preferences.length > 0) {
    await prisma.preference.createMany({
      data: preferences.map((p: { trait: string; value: string; weight: number }) => ({
        userId: session.userId,
        trait: p.trait as any,
        value: p.value,
        weight: p.weight,
      })),
    });
  }

  return NextResponse.json({ success: true, count: preferences.length });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const preferences = await prisma.preference.findMany({
    where: { userId: session.userId },
  });

  return NextResponse.json({ preferences });
}
