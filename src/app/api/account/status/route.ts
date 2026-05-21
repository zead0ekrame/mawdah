import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const ACTION_TO_STATUS = {
  PAUSE: "PAUSED",
  RESUME: "ACTIVE",
  STOP: "STOPPED",
} as const;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { action } = await request.json();
  if (typeof action !== "string" || !(action in ACTION_TO_STATUS)) {
    return NextResponse.json({ error: "إجراء غير صحيح" }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });

  if (!currentUser) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }
  if (currentUser.status === "BANNED") {
    return NextResponse.json({ error: "لا يمكن تعديل حساب محظور" }, { status: 403 });
  }

  const status = ACTION_TO_STATUS[action as keyof typeof ACTION_TO_STATUS];
  await prisma.user.update({
    where: { id: session.userId },
    data: { status },
  });

  return NextResponse.json({ success: true, status });
}
