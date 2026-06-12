import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { deactivateMemberAction } from "@/app/actions";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const owner = await requireOwner();
  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status?.trim();
  const members = await prisma.member.findMany({
    where: {
      ownerId: owner.id,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phoneWa: { contains: q, mode: "insensitive" } },
              { businessName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { package: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader
        title="Member"
        description="Kelola data member, paket, harga bulanan, dan status langganan."
        action={
          <Link href="/dashboard/members/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">
            <Plus className="size-4" />
            Tambah
          </Link>
        }
      />

      <form className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q || ""} placeholder="Cari nama, email, WA, bisnis" className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <select name="status" defaultValue={status || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="suspended">Suspend</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <button className="h-10 rounded-md border border-slate-200 bg-slate-900 px-4 text-sm font-semibold text-white" type="submit">
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {members.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3">Paket</th>
                  <th className="px-4 py-3">Harga</th>
                  <th className="px-4 py-3">Jatuh Tempo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/members/${member.id}`} className="font-semibold text-slate-950">
                        {member.name}
                      </Link>
                      <p className="text-xs text-slate-500">{member.businessName || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{member.email}</p>
                      <p className="text-xs">{member.phoneWa}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{member.package?.name || "Custom"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(member.monthlyPrice)}</td>
                    <td className="px-4 py-3 text-slate-600">Tanggal {member.billingDueDay}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/members/${member.id}`} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Detail
                        </Link>
                        {member.status !== "inactive" ? (
                          <form action={deactivateMemberAction}>
                            <input type="hidden" name="id" value={member.id} />
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
          <EmptyState icon={Users} title="Belum ada member. Tambahkan member pertama Anda.">
            Data member akan muncul di sini setelah dibuat.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
