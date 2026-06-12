import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  unpaid: "border-amber-200 bg-amber-50 text-amber-700",
  pending_verification: "border-blue-200 bg-blue-50 text-blue-700",
  overdue: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-600",
  suspended: "border-orange-200 bg-orange-50 text-orange-700",
  inactive: "border-slate-200 bg-slate-50 text-slate-600",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold",
        variants[status] || variants.inactive,
        className,
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
