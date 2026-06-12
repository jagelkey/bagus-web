import Link from "next/link";
import { ExternalLink, FileText, Mail, MessageCircle, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { refreshOverdueInvoices } from "@/lib/billing";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { normalizeReportMonth, normalizeReportStatus, normalizeReportYear } from "@/lib/reports";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { sendBulkInvoiceEmailsAction, sendInvoiceEmailAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    year?: string;
    status?: string;
    member?: string;
    generated?: string;
    bulk_email_sent?: string;
    bulk_email_failed?: string;
  }>;
}) {
  const owner = await requireOwner();
  await refreshOverdueInvoices(owner.id);
  const params = await searchParams;
  const now = new Date();
  const month = normalizeReportMonth(params.month, now.getMonth() + 1);
  const year = normalizeReportYear(params.year, now.getFullYear());
  const status = normalizeReportStatus(params.status);
  const invoices = await prisma.invoice.findMany({
    where: {
      ownerId: owner.id,
      periodMonth: month,
      periodYear: year,
      ...(status ? { status } : {}),
      ...(params.member ? { member: { name: { contains: params.member, mode: "insensitive" } } } : {}),
    },
    include: { member: { include: { package: true } } },
    orderBy: { createdAt: "desc" },
  });
  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader
        title="Tagihan"
        description={`Periode ${formatPeriod(month, year)}. Total hasil filter ${formatCurrency(total)}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <form action={sendBulkInvoiceEmailsAction}>
              <input type="hidden" name="periodMonth" value={month} />
              <input type="hidden" name="periodYear" value={year} />
              <SubmitButton className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" pendingLabel="Mengirim...">
                Email Belum Lunas
              </SubmitButton>
            </form>
            <Link href="/dashboard/invoices/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">
              <Plus className="size-4" />
              Buat
            </Link>
          </div>
        }
      />

      {params.generated ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Generate selesai. Invoice baru: {params.generated}.
        </div>
      ) : null}
      {params.bulk_email_sent || params.bulk_email_failed ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Email massal selesai. Berhasil: {params.bulk_email_sent || 0}, gagal: {params.bulk_email_failed || 0}.
        </div>
      ) : null}

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[120px_120px_1fr_1fr_auto]">
        <select name="month" defaultValue={month} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
          {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input name="year" type="number" defaultValue={year} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        <select name="status" defaultValue={status || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
          <option value="">Semua status</option>
          <option value="paid">Sudah bayar</option>
          <option value="unpaid">Belum bayar</option>
          <option value="pending_verification">Menunggu verifikasi</option>
          <option value="overdue">Terlambat</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
        <input name="member" placeholder="Nama member" defaultValue={params.member || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        <button type="submit" className="h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {invoices.length ? (
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
                  <th className="px-4 py-3 text-right">Aksi</th>
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
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          title="Detail invoice"
                          className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                        >
                          <FileText className="size-4" aria-hidden="true" />
                          <span className="sr-only">Detail invoice</span>
                        </Link>
                        <a
                          href={`/pay/${invoice.paymentToken}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Buka halaman bayar publik"
                          className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                        >
                          <ExternalLink className="size-4" aria-hidden="true" />
                          <span className="sr-only">Buka halaman bayar publik</span>
                        </a>
                        <form action={sendInvoiceEmailAction}>
                          <input type="hidden" name="id" value={invoice.id} />
                          <SubmitButton
                            title="Kirim email tagihan"
                            ariaLabel="Kirim email tagihan"
                            pendingLabel=""
                            className="size-9 border border-slate-200 bg-white px-0 text-slate-700 shadow-none hover:bg-slate-50"
                          >
                            <Mail className="size-4" aria-hidden="true" />
                            <span className="sr-only">Kirim email tagihan</span>
                          </SubmitButton>
                        </form>
                        <a
                          href={`/api/invoices/${invoice.id}/whatsapp-link`}
                          target="_blank"
                          rel="noreferrer"
                          title="Kirim WhatsApp tagihan"
                          className="inline-flex size-9 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800"
                        >
                          <MessageCircle className="size-4" aria-hidden="true" />
                          <span className="sr-only">Kirim WhatsApp tagihan</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={FileText} title="Belum ada invoice untuk filter ini.">
            Buat invoice manual atau generate bulanan untuk member aktif.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
