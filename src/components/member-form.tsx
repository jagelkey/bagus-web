import { saveMemberAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";

type MemberValue = {
  id?: string;
  name?: string;
  email?: string;
  phoneWa?: string;
  businessName?: string | null;
  playConsoleEmail?: string | null;
  packageId?: string | null;
  monthlyPrice?: unknown;
  billingDueDay?: number;
  startDate?: Date | string;
  endDate?: Date | string | null;
  status?: string;
  notes?: string | null;
};

type PackageValue = {
  id: string;
  name: string;
  price: unknown;
};

function inputDate(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function MemberForm({ member, packages }: { member?: MemberValue; packages: PackageValue[] }) {
  return (
    <form action={saveMemberAction} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {member?.id ? <input type="hidden" name="id" value={member.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Nama Member
          <input name="name" required defaultValue={member?.name || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Email
          <input name="email" type="email" required defaultValue={member?.email || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Nomor WhatsApp
          <input name="phoneWa" required placeholder="628xxxxxxxxxx" defaultValue={member?.phoneWa || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Nama Bisnis
          <input name="businessName" defaultValue={member?.businessName || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Email Akses Play Console
          <input name="playConsoleEmail" type="email" defaultValue={member?.playConsoleEmail || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Paket Langganan
          <select name="packageId" defaultValue={member?.packageId || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            <option value="">Custom</option>
            {packages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Harga Bulanan
          <input name="monthlyPrice" type="number" min="0" required defaultValue={String(member?.monthlyPrice ?? "")} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Tanggal Jatuh Tempo
          <input name="billingDueDay" type="number" min="1" max="31" required defaultValue={member?.billingDueDay || 10} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Tanggal Mulai
          <input name="startDate" type="date" required defaultValue={inputDate(member?.startDate) || new Date().toISOString().slice(0, 10)} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Tanggal Berakhir
          <input name="endDate" type="date" defaultValue={inputDate(member?.endDate)} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Status
          <select name="status" defaultValue={member?.status || "active"} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            <option value="active">Aktif</option>
            <option value="suspended">Suspend</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Catatan
        <textarea name="notes" rows={4} defaultValue={member?.notes || ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      </label>
      <div className="flex justify-end">
        <SubmitButton>{member?.id ? "Simpan Perubahan" : "Tambah Member"}</SubmitButton>
      </div>
    </form>
  );
}
