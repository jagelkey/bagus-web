import Link from "next/link";
import { Banknote, CalendarClock, CreditCard, ExternalLink, FileText, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { MemberForm } from "@/components/member-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  const { id } = await params;
  const [member, packages] = await Promise.all([
    prisma.member.findFirst({
      where: { id, ownerId: owner.id },
      include: {
        package: true,
        invoices: { orderBy: { createdAt: "desc" }, take: 12 },
        payments: { include: { invoice: true }, orderBy: { createdAt: "desc" }, take: 12 },
      },
    }),
    prisma.package.findMany({ where: { ownerId: owner.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!member) notFound();
  const openInvoices = member.invoices.filter((invoice) => ["unpaid", "pending_verification", "overdue"].includes(invoice.status));
  const openAmount = openInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const paidAmount = member.invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader
        title={member.name}
        description={`${member.businessName || "Member"} - ${member.package?.name || "Custom"}`}
        action={
          <Link
            href={`/dashboard/invoices/new?member=${member.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            <Plus className="size-4" aria-hidden="true" />
            Buat Tagihan
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Harga Bulanan" value={formatCurrency(member.monthlyPrice)} helper={`Jatuh tempo tanggal ${member.billingDueDay}`} icon={Banknote} />
        <StatCard title="Invoice Terbuka" value={openInvoices.length} helper={formatCurrency(openAmount)} icon={CalendarClock} tone="amber" />
        <StatCard title="Total Lunas" value={formatCurrency(paidAmount)} helper={`${member.payments.filter((payment) => payment.status === "accepted").length} pembayaran diterima`} icon={CreditCard} tone="emerald" />
        <StatCard title="Status Member" value={<StatusBadge status={member.status} />} helper={member.email} icon={FileText} tone="slate" />
      </section>

      <MemberForm member={member} packages={packages} />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Riwayat Invoice</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Periode</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Jatuh Tempo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {member.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-semibold text-slate-950">
                    <Link href={`/dashboard/invoices/${invoice.id}`} className="hover:text-blue-700">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatPeriod(invoice.periodMonth, invoice.periodYear)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(invoice.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(invoice.dueDate)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                        title="Detail invoice"
                      >
                        <FileText className="size-4" aria-hidden="true" />
                        <span className="sr-only">Detail invoice</span>
                      </Link>
                      <a
                        href={`/pay/${invoice.paymentToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                        title="Buka halaman bayar"
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                        <span className="sr-only">Buka halaman bayar</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {member.invoices.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                    Belum ada invoice untuk member ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Riwayat Pembayaran</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Metode</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {member.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 font-semibold text-slate-950">
                    <Link href={`/dashboard/invoices/${payment.invoiceId}`} className="hover:text-blue-700">
                      {payment.invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{payment.paymentMethod}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(payment.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} />
                  </td>
                </tr>
              ))}
              {member.payments.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    Belum ada pembayaran untuk member ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
