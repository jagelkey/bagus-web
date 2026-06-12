import { UserRound } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { saveOwnerProfileAction } from "@/app/actions";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function OwnerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const owner = await requireOwner();
  const params = await searchParams;

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader title="Profil Owner" description="Data owner dipakai untuk template pesan dan identitas dashboard." />
      {params.saved ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Profil owner berhasil disimpan.
        </div>
      ) : null}
      {params.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</div>
      ) : null}

      <form action={saveOwnerProfileAction} className="grid max-w-2xl gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <UserRound className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">{owner.email}</p>
            <p className="text-xs text-slate-500">Email mengikuti akun Supabase Auth.</p>
          </div>
        </div>

        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Nama Owner
          <input
            name="name"
            required
            defaultValue={owner.name}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Nomor WhatsApp Owner
          <input
            name="phone"
            placeholder="628xxxxxxxxxx"
            defaultValue={owner.phone || ""}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <div className="flex justify-end">
          <SubmitButton>Simpan Profil</SubmitButton>
        </div>
      </form>
    </div>
  );
}
