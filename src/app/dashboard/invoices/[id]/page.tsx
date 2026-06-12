import { ExternalLink, Mail, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { absoluteUrl } from "@/lib/utils";
import { cancelInvoiceAction, markInvoicePaidAction, sendInvoiceEmailAction } from "@/app/actions";
import { formatCurrency, formatDate, formatDateTime, formatPeriod } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { PrintButton } from "@/components/print-button";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const owner = await requireOwner();
  const { id } = await params;
  const query = await searchParams;
  const invoice = await prisma.invoice.findFirst({
    where: { id, ownerId: owner.id },
    include: {
      member: true,
      payments: { orderBy: { createdAt: "desc" } },
      messageLogs: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  if (!invoice) notFound();
  const publicUrl = absoluteUrl(`/pay/${invoice.paymentToken}`);

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader title={invoice.invoiceNumber} description={`${invoice.member.name} - ${formatPeriod(invoice.periodMonth, invoice.periodYear)}`} />

      {query.email ? (
        <div className={`rounded-md border px-4 py-3 text-sm ${query.email === "sent" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {query.email === "sent" ? "Email tagihan berhasil dikirim." : "Email gagal dikirim. Cek konfigurasi Resend dan log pesan."}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Member" value={invoice.member.name} />
            <Info label="Email" value={invoice.member.email} />
            <Info label="WhatsApp" value={invoice.member.phoneWa} />
            <Info label="Nominal" value={formatCurrency(invoice.amount)} />
            <Info label="Periode" value={formatPeriod(invoice.periodMonth, invoice.periodYear)} />
            <Info label="Jatuh Tempo" value={formatDate(invoice.dueDate)} />
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
              <div className="mt-1">
                <StatusBadge status={invoice.status} />
              </div>
            </div>
            <Info label="Link Publik" value={publicUrl} />
          </div>
        </div>

        <div className="grid content-start gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <PrintButton label="Cetak Invoice" />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <ExternalLink className="size-4" />
            Buka Halaman Bayar
          </a>
          <form action={sendInvoiceEmailAction}>
            <input type="hidden" name="id" value={invoice.id} />
            <SubmitButton className="w-full bg-slate-900 hover:bg-slate-800" pendingLabel="Mengirim...">
              <Mail className="size-4" />
              Kirim Email
            </SubmitButton>
          </form>
          <a href={`/api/invoices/${invoice.id}/whatsapp-link`} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
            <MessageCircle className="size-4" />
            Kirim WhatsApp
          </a>
          {invoice.status !== "paid" && invoice.status !== "cancelled" ? (
            <form action={markInvoicePaidAction}>
              <input type="hidden" name="id" value={invoice.id} />
              <SubmitButton className="w-full bg-blue-700 hover:bg-blue-800" pendingLabel="Menandai...">
                Tandai Sudah Bayar
              </SubmitButton>
            </form>
          ) : null}
          {invoice.status !== "paid" && invoice.status !== "cancelled" ? (
            <form action={cancelInvoiceAction} className="grid gap-2">
              <input type="hidden" name="id" value={invoice.id} />
              <input name="notes" placeholder="Alasan pembatalan" className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              <SubmitButton className="w-full border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" pendingLabel="Membatalkan...">
                Batalkan Invoice
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <History title="Riwayat Pembayaran">
          {invoice.payments.map((payment) => (
            <div key={payment.id} className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0">
              <div>
                <p className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                <p className="text-xs text-slate-500">{payment.paymentMethod} - {formatDateTime(payment.createdAt)}</p>
              </div>
              <StatusBadge status={payment.status} />
            </div>
          ))}
          {invoice.payments.length === 0 ? <div className="px-4 py-6 text-sm text-slate-500">Belum ada pembayaran.</div> : null}
        </History>
        <History title="Log Komunikasi">
          {invoice.messageLogs.map((log) => (
            <div key={log.id} className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0">
              <div>
                <p className="font-semibold text-slate-900">{log.channel}</p>
                <p className="text-xs text-slate-500">{log.recipient} - {formatDateTime(log.createdAt)}</p>
              </div>
              <StatusBadge status={log.status} />
            </div>
          ))}
          {invoice.messageLogs.length === 0 ? <div className="px-4 py-6 text-sm text-slate-500">Belum ada log pesan.</div> : null}
        </History>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function History({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}
