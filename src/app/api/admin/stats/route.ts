import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const [totalUsers, totalMatches, totalMarriages, totalComplaints] =
    await Promise.all([
      prisma.user.count({ where: { isAdmin: false } }),
      prisma.match.count(),
      prisma.match.count({ where: { status: "COMPLETED_MARRIAGE" } }),
      prisma.complaint.count({ where: { status: "PENDING" } }),
    ]);

  return NextResponse.json({
    totalUsers,
    totalMatches,
    totalMarriages,
    totalComplaints,
  });
}
