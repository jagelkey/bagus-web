import { CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { rejectPaymentAction, verifyPaymentAction } from "@/app/actions";
import { PAYMENT_STATUSES } from "@/lib/constants";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const owner = await requireOwner();
  const params = await searchParams;
  const status =
    params.status === undefined
      ? "pending_verification"
      : PAYMENT_STATUSES.includes(params.status as (typeof PAYMENT_STATUSES)[number])
        ? params.status
        : "";
  const payments = await prisma.payment.findMany({
    where: {
      ...(status ? { status } : {}),
      invoice: { ownerId: owner.id },
    },
    include: {
      invoice: true,
      member: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const proofLinks = new Map(
    await Promise.all(
      payments.map(async (payment) => [
        payment.id,
        await getSignedUrl(process.env.STORAGE_BUCKET_PAYMENT_PROOFS || "payment-proofs", payment.proofFileUrl),
      ] as const),
    ),
  );

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader title="Pembayaran" description="Verifikasi bukti pembayaran yang dikirim dari halaman publik." />

      <form className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
          <option value="">Semua status</option>
          <option value="pending_verification">Menunggu verifikasi</option>
          <option value="accepted">Diterima</option>
          <option value="rejected">Ditolak</option>
        </select>
        <button type="submit" className="h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      <div className="grid gap-4">
        {payments.map((payment) => {
          const proof = proofLinks.get(payment.id);
          return (
            <article key={payment.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-950">{payment.invoice.invoiceNumber}</h2>
                    <StatusBadge status={payment.status} />
                  </div>
                  <p className="text-sm text-slate-600">{payment.member.name} - {formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-slate-500">{payment.paymentMethod} - {formatDateTime(payment.createdAt)}</p>
                  <p className="text-sm text-slate-600">Pengirim: {payment.payerName || "-"}</p>
                  {payment.notes ? <p className="text-sm text-slate-600">Catatan: {payment.notes}</p> : null}
                  {payment.proofFileUrl ? (
                    proof ? (
                      <a href={proof} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-700 hover:underline">
                        Buka bukti pembayaran
                      </a>
                    ) : (
                      <p className="text-sm text-slate-500">Bukti tersimpan: {payment.proofFileUrl}</p>
                    )
                  ) : null}
                </div>
                {payment.status === "pending_verification" ? (
                  <div className="grid gap-2 lg:w-80">
                    <form action={verifyPaymentAction} className="grid gap-2">
                      <input type="hidden" name="id" value={payment.id} />
                      <input name="notes" placeholder="Catatan verifikasi" className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                      <SubmitButton className="bg-emerald-700 hover:bg-emerald-800" pendingLabel="Memverifikasi...">
                        Terima
                      </SubmitButton>
                    </form>
                    <form action={rejectPaymentAction} className="grid gap-2">
                      <input type="hidden" name="id" value={payment.id} />
                      <input name="notes" placeholder="Alasan ditolak" className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                      <SubmitButton className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" pendingLabel="Menolak...">
                        Tolak
                      </SubmitButton>
                    </form>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
        {payments.length === 0 ? (
          <EmptyState icon={CreditCard} title="Tidak ada pembayaran yang menunggu verifikasi.">
            Ubah filter untuk melihat pembayaran diterima atau ditolak.
          </EmptyState>
        ) : null}
      </div>
    </div>
  );
}
