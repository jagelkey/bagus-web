import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOwner } from "@/lib/api";
import { refreshOverdueInvoices } from "@/lib/billing";

export async function GET() {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  await refreshOverdueInvoices(auth.owner.id);

  const [activeMembers, inactiveMembers, invoices, paid, unpaid, overdue, revenue, arrears] = await Promise.all([
    prisma.member.count({ where: { ownerId: auth.owner.id, status: "active" } }),
    prisma.member.count({ where: { ownerId: auth.owner.id, status: { not: "active" } } }),
    prisma.invoice.count({ where: { ownerId: auth.owner.id, periodMonth: month, periodYear: year } }),
    prisma.invoice.count({ where: { ownerId: auth.owner.id, periodMonth: month, periodYear: year, status: "paid" } }),
    prisma.invoice.count({ where: { ownerId: auth.owner.id, periodMonth: month, periodYear: year, status: { in: ["unpaid", "pending_verification"] } } }),
    prisma.invoice.count({ where: { ownerId: auth.owner.id, status: "overdue" } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { ownerId: auth.owner.id, periodMonth: month, periodYear: year, status: "paid" } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { ownerId: auth.owner.id, periodMonth: month, periodYear: year, status: { in: ["unpaid", "overdue", "pending_verification"] } } }),
  ]);

  return NextResponse.json({
    activeMembers,
    inactiveMembers,
    invoices,
    paid,
    unpaid,
    overdue,
    revenue: revenue._sum.amount ?? 0,
    arrears: arrears._sum.amount ?? 0,
  });
}
