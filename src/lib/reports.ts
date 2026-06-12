import { prisma } from "@/lib/prisma";
import { INVOICE_STATUSES } from "@/lib/constants";

export function normalizeReportMonth(value: string | number | null | undefined, fallback: number) {
  const month = Number(value);
  if (!Number.isInteger(month) || month < 1 || month > 12) return fallback;
  return month;
}

export function normalizeReportYear(value: string | number | null | undefined, fallback: number) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return fallback;
  return year;
}

export function normalizeReportStatus(value: string | null | undefined) {
  return INVOICE_STATUSES.includes(value as (typeof INVOICE_STATUSES)[number]) ? value || undefined : undefined;
}

export async function getMonthlyReport(input: {
  ownerId: string;
  month: number;
  year: number;
  status?: string;
  member?: string;
  packageId?: string;
}) {
  const memberFilter = {
    ...(input.member ? { name: { contains: input.member, mode: "insensitive" as const } } : {}),
    ...(input.packageId ? { packageId: input.packageId } : {}),
  };
  const invoices = await prisma.invoice.findMany({
    where: {
      ownerId: input.ownerId,
      periodMonth: input.month,
      periodYear: input.year,
      ...(input.status ? { status: input.status } : {}),
      ...(Object.keys(memberFilter).length ? { member: memberFilter } : {}),
    },
    include: {
      member: { include: { package: true } },
      payments: { where: { status: "accepted" }, take: 1, orderBy: { verifiedAt: "desc" } },
    },
    orderBy: { dueDate: "asc" },
  });
  const paid = invoices.filter((invoice) => invoice.status === "paid");
  const unpaid = invoices.filter((invoice) => ["unpaid", "pending_verification", "overdue"].includes(invoice.status));
  const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const revenue = paid.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const arrears = unpaid.reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return {
    invoices,
    summary: {
      totalInvoices: invoices.length,
      totalAmount,
      paidInvoices: paid.length,
      unpaidInvoices: unpaid.length,
      revenue,
      arrears,
      overdueCount: invoices.filter((invoice) => invoice.status === "overdue").length,
    },
  };
}
