import Link from "next/link";
import { AlertTriangle, Banknote, BarChart3, CheckCircle2, Clock, FileText, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { refreshOverdueInvoices } from "@/lib/billing";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function DashboardPage() {
  const owner = await requireOwner();
  await refreshOverdueInvoices(owner.id);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const chartMonths = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, month - 12 + index, 1);
    return { month: date.getMonth() + 1, year: date.getFullYear() };
  });

  const [
    activeMembers,
    inactiveMembers,
    currentInvoices,
    paidInvoices,
    unpaidInvoices,
    overdueInvoices,
    revenue,
    arrears,
    latestInvoices,
    dueSoonInvoices,
    revenueRows,
  ] = await Promise.all([
    prisma.member.count({ where: { ownerId: owner.id, status: "active" } }),
    prisma.member.count({ where: { ownerId: owner.id, status: { not: "active" } } }),
    prisma.invoice.count({ where: { ownerId: owner.id, periodMonth: month, periodYear: year } }),
    prisma.invoice.count({ where: { ownerId: owner.id, periodMonth: month, periodYear: year, status: "paid" } }),
    prisma.invoice.count({
      where: { ownerId: owner.id, periodMonth: month, periodYear: year, status: { in: ["unpaid", "pending_verification"] } },
    }),
    prisma.invoice.count({ where: { ownerId: owner.id, status: "overdue" } }),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { ownerId: owner.id, periodMonth: month, periodYear: year, status: "paid" },
    }),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { ownerId: owner.id, periodMonth: month, periodYear: year, status: { in: ["unpaid", "overdue", "pending_verification"] } },
    }),
    prisma.invoice.findMany({
      where: { ownerId: owner.id },
      include: { member: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.invoice.findMany({
      where: {
        ownerId: owner.id,
        status: { in: ["unpaid", "pending_verification"] },
        dueDate: { gte: now, lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7) },
      },
      include: { member: true },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    prisma.invoice.groupBy({
      by: ["periodYear", "periodMonth"],
      _sum: { amount: true },
      where: {
        ownerId: owner.id,
        status: "paid",
        OR: chartMonths.map((item) => ({ periodMonth: item.month, periodYear: item.year })),
      },
    }),
  ]);
  const revenueByPeriod = new Map(
    revenueRows.map((item) => [`${item.periodYear}-${item.periodMonth}`, Number(item._sum.amount ?? 0)]),
  );
  const monthlyRevenue = chartMonths.map((item) => ({
    ...item,
    revenue: revenueByPeriod.get(`${item.year}-${item.month}`) ?? 0,
  }));
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map((item) => item.revenue), 1);

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader
        title="Dashboard"
        description={`Ringkasan operasional ${formatPeriod(month, year)}.`}
        action={
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Buat Tagihan
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Member Aktif" value={activeMembers} helper={`${inactiveMembers} nonaktif/suspend`} icon={Users} />
        <StatCard title="Invoice Bulan Ini" value={currentInvoices} helper={`${paidInvoices} sudah bayar`} icon={FileText} tone="slate" />
        <StatCard title="Belum Bayar" value={unpaidInvoices} helper={`${overdueInvoices} invoice terlambat`} icon={Clock} tone="amber" />
        <StatCard title="Pemasukan" value={formatCurrency(revenue._sum.amount)} helper={`Tunggakan ${formatCurrency(arrears._sum.amount)}`} icon={Banknote} tone="emerald" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Grafik Pemasukan 12 Bulan</h2>
        </div>
        <div className="mt-5 flex h-56 items-end gap-2 overflow-x-auto pb-1">
          {monthlyRevenue.map((item) => (
            <div key={`${item.year}-${item.month}`} className="grid min-w-16 flex-1 gap-2">
              <div className="flex h-40 items-end rounded-md bg-slate-50 px-2">
                <div
                  className="w-full rounded-t-md bg-blue-700 transition"
                  style={{ height: `${Math.max(6, (item.revenue / maxMonthlyRevenue) * 100)}%` }}
                  title={formatCurrency(item.revenue)}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-700">{String(item.month).padStart(2, "0")}/{String(item.year).slice(2)}</p>
                <p className="text-[11px] text-slate-500">{formatCurrency(item.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <FileText className="size-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Tagihan Terbaru</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/dashboard/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{invoice.member.name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(invoice.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
                {latestInvoices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                      Belum ada invoice untuk bulan ini.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            {dueSoonInvoices.length ? <AlertTriangle className="size-4 text-amber-500" /> : <CheckCircle2 className="size-4 text-emerald-500" />}
            <h2 className="text-sm font-semibold text-slate-900">Mendekati Jatuh Tempo</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {dueSoonInvoices.map((invoice) => (
              <Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}`} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{invoice.member.name}</p>
                  <p className="text-xs text-slate-500">{invoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(invoice.amount)}</p>
                  <p className="text-xs text-slate-500">{formatDate(invoice.dueDate)}</p>
                </div>
              </Link>
            ))}
            {dueSoonInvoices.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Semua tagihan dekat jatuh tempo aman.</div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
