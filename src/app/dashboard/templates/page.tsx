import { Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { DEFAULT_TEMPLATES, renderTemplate } from "@/lib/templates";
import { saveTemplateAction } from "@/app/actions";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const owner = await requireOwner();
  const params = await searchParams;
  const templates = await prisma.messageTemplate.findMany({
    where: { ownerId: owner.id },
    orderBy: { type: "asc" },
  });
  const merged = Object.entries(DEFAULT_TEMPLATES).map(([type, fallback]) => ({
    type,
    ...(templates.find((item) => item.type === type) || fallback),
  }));
  const previewVariables = {
    nama_member: "Bagus Studio",
    periode: "Juni 2026",
    nomor_invoice: "INV-2026-06-0001",
    nominal: "Rp 150.000",
    tanggal_jatuh_tempo: "10 Jun 2026",
    link_pembayaran: "https://domainanda.com/pay/inv_contoh",
    nama_owner: owner.name,
    nomor_wa_owner: owner.phone || "628xxxxxxxxxx",
  };

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader title="Template Pesan" description="Variabel tersedia: {{nama_member}}, {{periode}}, {{nomor_invoice}}, {{nominal}}, {{tanggal_jatuh_tempo}}, {{link_pembayaran}}, {{nama_owner}}, {{nomor_wa_owner}}." />
      {params.saved ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Template berhasil disimpan.</div> : null}

      <div className="grid gap-4">
        {merged.map((template) => (
          <form key={template.type} action={saveTemplateAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="id" value={"id" in template ? String(template.id) : ""} />
            <input type="hidden" name="type" value={template.type} />
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-950">{template.name}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Nama
                <input name="name" defaultValue={template.name} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Subject
                <input name="subject" defaultValue={template.subject || ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Isi Template
              <textarea name="body" rows={7} defaultValue={template.body} className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Preview</p>
              {template.subject ? (
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {renderTemplate(template.subject, previewVariables)}
                </p>
              ) : null}
              <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">
                {renderTemplate(template.body, previewVariables)}
              </pre>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input name="isActive" type="checkbox" defaultChecked={"isActive" in template ? Boolean(template.isActive) : true} className="size-4" />
              Aktif
            </label>
            <div className="flex justify-end">
              <SubmitButton>Simpan Template</SubmitButton>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
