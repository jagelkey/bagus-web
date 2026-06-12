import { Banknote } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";
import { savePaymentSettingsAction } from "@/app/actions";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function PaymentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const owner = await requireOwner();
  const params = await searchParams;
  const setting = await prisma.paymentSetting.findFirst({
    where: { ownerId: owner.id },
    orderBy: { updatedAt: "desc" },
  });
  const qrisUrl = await getSignedUrl(process.env.STORAGE_BUCKET_QRIS || "qris", setting?.qrisImageUrl);

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader title="Pengaturan Pembayaran" description="Data ini tampil di halaman pembayaran publik." />
      {params.saved ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Pengaturan pembayaran berhasil disimpan.</div> : null}
      {params.error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</div> : null}

      <form action={savePaymentSettingsAction} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <input type="hidden" name="existingQrisImageUrl" value={setting?.qrisImageUrl || ""} />
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Nama Bank
            <input name="bankName" required defaultValue={setting?.bankName || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Nomor Rekening
            <input name="bankAccountNumber" required defaultValue={setting?.bankAccountNumber || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Atas Nama
            <input name="bankAccountHolder" required defaultValue={setting?.bankAccountHolder || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Nomor WhatsApp Konfirmasi
            <input name="whatsappConfirmationNumber" required placeholder="628xxxxxxxxxx" defaultValue={setting?.whatsappConfirmationNumber || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
            QRIS
            <input name="qris" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
          </label>
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Instruksi Pembayaran
          <textarea name="paymentInstruction" rows={4} defaultValue={setting?.paymentInstruction || ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        {qrisUrl ? (
          <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrisUrl} alt="QRIS aktif" className="size-24 rounded-md object-contain" />
            <p className="text-sm text-slate-600">QRIS aktif tersimpan.</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            <Banknote className="size-5 text-slate-400" />
            QRIS belum diupload.
          </div>
        )}
        <div className="flex justify-end">
          <SubmitButton>Save Pengaturan</SubmitButton>
        </div>
      </form>
    </div>
  );
}
