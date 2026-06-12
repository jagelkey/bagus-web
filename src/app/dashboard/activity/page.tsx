import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ActivityPage() {
  const owner = await requireOwner();
  const logs = await prisma.activityLog.findMany({
    where: { ownerId: owner.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <PageHeader title="Riwayat Aktivitas" description="Catatan aksi penting owner seperti verifikasi pembayaran, pembuatan invoice, dan perubahan data." />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {logs.length ? (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <article key={log.id} className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr_160px] md:items-center md:gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{log.action}</p>
                  <p className="text-xs text-slate-500">{log.entityType || "-"}</p>
                </div>
                <p className="text-sm text-slate-600">{log.description || "-"}</p>
                <p className="text-xs text-slate-500 md:text-right">{formatDateTime(log.createdAt)}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={History} title="Belum ada aktivitas tercatat.">
            Aktivitas akan muncul setelah owner membuat atau mengubah data penting.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
