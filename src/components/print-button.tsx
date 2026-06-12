"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Cetak" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      <Printer className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
