import { BarChart3, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { getMonthlyReport, normalizeReportMonth, normalizeReportStatus, normalizeReportYear } from "@/lib/reports";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; status?: string; member?: string; package?: string }>;
}) {
  const owner = await requireOwner();
  const params = await searchParams;
  const now = new Date();
  const month = normalizeReportMonth(params.month, now.getMonth() + 1);
  const year = normalizeReportYear(params.year, now.getFullYear());
  const status = normalizeReportStatus(params.status);
  const report = await getMonthlyReport({
    ownerId: owner.id,
    month,
    year,
    status,
    member: params.member,
    packageId: params.package,
  });
  const invoices = report.invoices;
  const packages = await prisma.package.findMany({ where: { ownerId: owner.id }, orderBy: { name: "asc" } });
  const activeMembers = await prisma.member.count({ where: { ownerId: owner.id, status: "active" } });
  const query = new URLSearchParams();
  query.set("month", String(month));
  query.set("year", String(year));
  if (status) query.set("status", status);
  if (params.member) query.set("member", params.member);
  if (params.package) query.set("package", params.package);
  const queryString = query.toString();

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader
        title="Rekap Bulanan"
        description={`Ringkasan tagihan dan pembayaran ${formatPeriod(month, year)}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/reports/monthly/export-excel?${queryString}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Download className="size-4" />
              Excel
            </a>
            <a
              href={`/api/reports/monthly/export-pdf?${queryString}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Download className="size-4" />
              PDF
            </a>
          </div>
        }
      />

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[120px_120px_1fr_1fr_1fr_auto]">
        <input name="month" type="number" min="1" max="12" defaultValue={month} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        <input name="year" type="number" min="2020" defaultValue={year} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        <select name="status" defaultValue={status || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
          <option value="">Semua status</option>
          <option value="paid">Sudah bayar</option>
          <option value="unpaid">Belum bayar</option>
          <option value="pending_verification">Menunggu verifikasi</option>
          <option value="overdue">Terlambat</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
        <input name="member" placeholder="Nama member" defaultValue={params.member || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        <select name="package" defaultValue={params.package || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
          <option value="">Semua paket</option>
          {packages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Member Aktif" value={activeMembers} icon={BarChart3} tone="slate" />
        <StatCard title="Total Invoice" value={report.summary.totalInvoices} helper={formatCurrency(report.summary.totalAmount)} icon={BarChart3} />
        <StatCard title="Pemasukan" value={formatCurrency(report.summary.revenue)} helper={`${report.summary.paidInvoices} invoice lunas`} icon={BarChart3} tone="emerald" />
        <StatCard title="Tunggakan" value={formatCurrency(report.summary.arrears)} helper={`${report.summary.unpaidInvoices} invoice belum final`} icon={BarChart3} tone="amber" />
      </section>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Paket</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Jatuh Tempo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tanggal Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-semibold text-slate-950">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{invoice.member.name}</td>
                  <td className="px-4 py-3 text-slate-600">{invoice.member.package?.name || "Custom"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(invoice.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(invoice.dueDate)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(invoice.paidAt || invoice.payments[0]?.verifiedAt)}</td>
                </tr>
              ))}
              {invoices.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    Belum ada invoice untuk filter ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
