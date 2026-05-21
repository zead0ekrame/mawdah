import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const complaints = await prisma.complaint.findMany({
    include: {
      complainant: { select: { phone: true, gender: true, reputationScore: true } },
      respondent: { select: { phone: true, gender: true, reputationScore: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ complaints });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { complaintId, action, note } = await request.json();

  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const statusMap: Record<string, "WARNED" | "SUSPENDED" | "BANNED" | "DISMISSED"> = {
    WARN: "WARNED", SUSPEND: "SUSPENDED", BAN: "BANNED", DISMISS: "DISMISSED",
  };

  await prisma.complaint.update({
    where: { id: complaintId },
    data: { status: statusMap[action] ?? "DISMISSED", adminNote: note ?? null, resolvedAt: new Date() },
  });

  if (action === "BAN") {
    await prisma.user.update({ where: { id: complaint.respondentId }, data: { status: "BANNED" } });
  } else if (action === "SUSPEND") {
    await prisma.user.update({ where: { id: complaint.respondentId }, data: { status: "PAUSED" } });
  } else if (action === "WARN") {
    await prisma.botMessage.create({
      data: {
        userId: complaint.respondentId, isFromBot: true, messageType: "REPUTATION_WARNING",
        content: "⚠️ تنبيه من إدارة أنيس\nتلقينا شكوى بشأن تصرفاتك.\nيرجى الالتزام بآداب السلوك المحترم.",
      },
    });
  }

  return NextResponse.json({ success: true });
}
