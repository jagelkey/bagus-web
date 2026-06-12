import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { createInvoiceAction, generateMonthlyInvoicesAction } from "@/app/actions";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; month?: string; year?: string }>;
}) {
  const owner = await requireOwner();
  const params = await searchParams;
  const now = new Date();
  const periodMonth = Number(params.month || now.getMonth() + 1);
  const periodYear = Number(params.year || now.getFullYear());
  const members = await prisma.member.findMany({
    where: { ownerId: owner.id, status: "active" },
    orderBy: { name: "asc" },
  });
  const selectedMember = members.find((member) => member.id === params.member);
  const monthlyProjection = members.reduce((sum, member) => sum + Number(member.monthlyPrice), 0);

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader title="Buat Tagihan" description="Invoice tidak akan dibuat ganda untuk member dan periode yang sama." />

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form action={createInvoiceAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Invoice Manual</h2>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Member
            <select name="memberId" required defaultValue={selectedMember?.id || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
              <option value="">Pilih member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} - {formatCurrency(member.monthlyPrice)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Bulan
              <input name="periodMonth" type="number" min="1" max="12" defaultValue={periodMonth} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Tahun
              <input name="periodYear" type="number" min="2020" defaultValue={periodYear} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Nominal Custom
              <input name="amount" type="number" min="0" placeholder="Kosongkan untuk harga member" className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Jatuh Tempo Custom
              <input name="dueDate" type="date" className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Catatan
            <textarea name="notes" rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <div className="flex justify-end">
            <SubmitButton>Buat Invoice</SubmitButton>
          </div>
        </form>

        <form action={generateMonthlyInvoicesAction} className="grid content-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Generate Bulanan</h2>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">{members.length} member aktif siap diproses</p>
            <p className="mt-1 text-sm text-blue-700">Estimasi tagihan baru: {formatCurrency(monthlyProjection)}</p>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Bulan
            <input name="periodMonth" type="number" min="1" max="12" defaultValue={periodMonth} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Tahun
            <input name="periodYear" type="number" min="2020" defaultValue={periodYear} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <SubmitButton pendingLabel="Generate...">Generate Semua Aktif</SubmitButton>
        </form>
      </section>
    </div>
  );
}
