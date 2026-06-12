import { Package as PackageIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { savePackageAction, deactivatePackageAction } from "@/app/actions";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const owner = await requireOwner();
  const params = await searchParams;
  const packages = await prisma.package.findMany({
    where: { ownerId: owner.id },
    orderBy: { createdAt: "desc" },
  });
  const editing = params.edit ? packages.find((item) => item.id === params.edit) : undefined;

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader title="Paket Langganan" description="Paket nonaktif tidak muncul sebagai pilihan member baru." />

      <form action={savePackageAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1.2fr_1fr_1fr_auto]">
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Nama Paket
          <input name="name" required defaultValue={editing?.name || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Harga
          <input name="price" type="number" min="0" required defaultValue={String(editing?.price ?? "")} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Siklus
          <select name="billingCycle" defaultValue={editing?.billingCycle || "monthly"} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <div className="flex items-end gap-3">
          <label className="flex h-10 items-center gap-2 text-sm font-medium text-slate-700">
            <input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} className="size-4" />
            Aktif
          </label>
          <SubmitButton>{editing ? "Simpan" : "Tambah"}</SubmitButton>
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-4">
          Deskripsi
          <textarea name="description" rows={3} defaultValue={editing?.description || ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {packages.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Harga</th>
                  <th className="px-4 py-3">Siklus</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packages.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-semibold text-slate-950">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.billingCycle}</td>
                    <td className="px-4 py-3 text-slate-600">{item.isActive ? "Aktif" : "Nonaktif"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a href={`/dashboard/packages?edit=${item.id}`} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Edit
                        </a>
                        {item.isActive ? (
                          <form action={deactivatePackageAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                              Nonaktif
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={PackageIcon} title="Belum ada paket langganan.">
            Buat paket Basic, Pro, atau Custom untuk mempercepat input member.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
