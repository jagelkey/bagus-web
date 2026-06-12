import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOwner } from "@/lib/api";

export async function GET() {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return { month: date.getMonth() + 1, year: date.getFullYear() };
  });

  const data = await Promise.all(
    months.map(async (item) => {
      const result = await prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { ownerId: auth.owner.id, periodMonth: item.month, periodYear: item.year, status: "paid" },
      });
      return { ...item, revenue: result._sum.amount ?? 0 };
    }),
  );

  return NextResponse.json(data);
}
