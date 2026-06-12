import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "blue",
}: {
  title: string;
  value: ReactNode;
  helper?: string;
  icon: LucideIcon;
  tone?: "blue" | "emerald" | "amber" | "rose" | "slate";
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-normal text-slate-950">{value}</p>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-md", toneClasses[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      {helper ? <p className="mt-3 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}
