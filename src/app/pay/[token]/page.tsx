import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsApp } from "@/lib/billing";
import { getSignedUrl } from "@/lib/storage";
import { buildWhatsAppLink } from "@/lib/templates";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { uploadProofAction } from "@/app/actions";
import { CopyButton } from "@/components/public-payment-tools";
import { PrintButton } from "@/components/print-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function PublicPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const invoice = await prisma.invoice.findUnique({
    where: { paymentToken: token },
    include: { member: true, owner: true },
  });

  if (!invoice) notFound();
  const setting = await prisma.paymentSetting.findFirst({
    where: { ownerId: invoice.ownerId },
    orderBy: { updatedAt: "desc" },
  });
  const qrisUrl = await getSignedUrl(process.env.STORAGE_BUCKET_QRIS || "qris", setting?.qrisImageUrl);
  const whatsappUrl = setting?.whatsappConfirmationNumber
    ? buildWhatsAppLink(
        normalizeWhatsApp(setting.whatsappConfirmationNumber),
        `Halo, saya sudah melakukan pembayaran invoice ${invoice.invoiceNumber} atas nama ${invoice.member.name}.`,
      )
    : null;

  const locked = ["pending_verification", "paid", "cancelled"].includes(invoice.status);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-6">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-blue-700">Invoice Pembayaran</p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-slate-950">{invoice.invoiceNumber}</h1>
              <p className="mt-1 text-sm text-slate-600">{invoice.member.name} - {formatPeriod(invoice.periodMonth, invoice.periodYear)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={invoice.status} />
              <PrintButton />
            </div>
          </div>
        </header>

        {query.uploaded ? (
          <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 size-4" />
            Bukti pembayaran terkirim dan sedang menunggu verifikasi owner.
          </div>
        ) : null}
        {query.error ? (
          <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 size-4" />
            {query.error}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Detail Tagihan</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Nama Member" value={invoice.member.name} />
              <Info label="Nominal" value={formatCurrency(invoice.amount)} />
              <Info label="Periode" value={formatPeriod(invoice.periodMonth, invoice.periodYear)} />
              <Info label="Jatuh Tempo" value={formatDate(invoice.dueDate)} />
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Pembayaran</h2>
            {setting ? (
              <div className="mt-4 grid gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">{setting.bankName}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xl font-bold tracking-normal text-slate-950">{setting.bankAccountNumber}</p>
                    <CopyButton value={setting.bankAccountNumber} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">a.n. {setting.bankAccountHolder}</p>
                </div>
                {qrisUrl ? (
                  <div className="rounded-lg border border-slate-200 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrisUrl} alt="QRIS pembayaran" className="mx-auto aspect-square w-full max-w-72 rounded-md object-contain" />
                    <Link href={qrisUrl} target="_blank" className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <Download className="size-4" />
                      Download QRIS
                    </Link>
                  </div>
                ) : null}
                {setting.paymentInstruction ? <p className="text-sm text-slate-600">{setting.paymentInstruction}</p> : null}
                {whatsappUrl ? (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
                    <MessageCircle className="size-4" />
                    Konfirmasi WhatsApp
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Data rekening belum dikonfigurasi owner.</p>
            )}
          </aside>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Upload Bukti Pembayaran</h2>
          {locked ? (
            <p className="mt-3 text-sm text-slate-600">
              {invoice.status === "pending_verification"
                ? "Bukti pembayaran sudah terkirim dan sedang menunggu verifikasi owner."
                : "Invoice ini sudah final dan tidak menerima upload bukti baru."}
            </p>
          ) : (
            <form action={uploadProofAction} className="mt-4 grid gap-4">
              <input type="hidden" name="token" value={token} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Nama Pengirim
                  <input name="payerName" className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Metode Pembayaran
                  <select name="paymentMethod" required defaultValue="transfer_bank" className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    <option value="transfer_bank">Transfer Bank</option>
                    <option value="qris">QRIS</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Bukti Pembayaran
                <input name="proof" type="file" required accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Catatan
                <textarea name="notes" rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
              <div className="flex justify-end">
                <SubmitButton pendingLabel="Mengupload...">Kirim Bukti</SubmitButton>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
