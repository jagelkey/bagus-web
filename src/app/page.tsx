import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  LogIn,
  ReceiptText,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { INVOICE_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";

type HomeSearchParams = {
  q?: string;
  status?: string;
  month?: string;
  year?: string;
};

const configuredPublicOwnerId = process.env.PUBLIC_OWNER_ID?.trim();

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = clampNumber(Number(params.month || now.getMonth() + 1), 1, 12, now.getMonth() + 1);
  const year = clampNumber(Number(params.year || now.getFullYear()), 2020, 2100, now.getFullYear());
  const q = String(params.q || "").trim();
  const status = INVOICE_STATUSES.includes(params.status as (typeof INVOICE_STATUSES)[number])
    ? params.status
    : "";
  const publicOwner =
    configuredPublicOwnerId ||
    (
      await prisma.owner.findFirst({
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
    )?.id;
  const ownerWhere = publicOwner ? { ownerId: publicOwner } : {};
  const periodWhere = { ...ownerWhere, periodMonth: month, periodYear: year };

  await prisma.invoice.updateMany({
    where: {
      ...ownerWhere,
      status: "unpaid",
      dueDate: { lt: now },
    },
    data: { status: "overdue" },
  });

  const invoiceWhere = {
    ...periodWhere,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { invoiceNumber: { contains: q, mode: "insensitive" as const } },
            { member: { name: { contains: q, mode: "insensitive" as const } } },
            { member: { businessName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [
    invoices,
    totalInvoices,
    paidInvoices,
    unpaidInvoices,
    pendingInvoices,
    overdueInvoices,
    cancelledInvoices,
    revenue,
    outstanding,
  ] =
    await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        include: {
          member: { include: { package: true } },
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        take: 120,
      }),
      prisma.invoice.count({ where: periodWhere }),
      prisma.invoice.count({ where: { ...periodWhere, status: "paid" } }),
      prisma.invoice.count({ where: { ...periodWhere, status: "unpaid" } }),
      prisma.invoice.count({ where: { ...periodWhere, status: "pending_verification" } }),
      prisma.invoice.count({ where: { ...periodWhere, status: "overdue" } }),
      prisma.invoice.count({ where: { ...periodWhere, status: "cancelled" } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { ...periodWhere, status: "paid" } }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { ...periodWhere, status: { in: ["unpaid", "overdue", "pending_verification"] } },
      }),
    ]);

  const paidPercent = totalInvoices ? Math.round((paidInvoices / totalInvoices) * 100) : 0;
  const openInvoices = unpaidInvoices + pendingInvoices + overdueInvoices;
  const statusCounts = [
    { value: "", label: "Semua", count: totalInvoices },
    { value: "unpaid", label: STATUS_LABELS.unpaid, count: unpaidInvoices },
    { value: "pending_verification", label: STATUS_LABELS.pending_verification, count: pendingInvoices },
    { value: "paid", label: STATUS_LABELS.paid, count: paidInvoices },
    { value: "overdue", label: STATUS_LABELS.overdue, count: overdueInvoices },
    { value: "cancelled", label: STATUS_LABELS.cancelled, count: cancelledInvoices },
  ];
  const selectedPeriod = new Date(year, month - 1, 1);
  const previousPeriod = new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() - 1, 1);
  const nextPeriod = new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() + 1, 1);
  const hasFilters = Boolean(q || status || month !== now.getMonth() + 1 || year !== now.getFullYear());
  const makeHref = (updates: Record<string, string | number | null | undefined>) => {
    const nextParams = new URLSearchParams();
    const values = {
      q,
      status,
      month,
      year,
      ...updates,
    };

    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        nextParams.set(key, String(value));
      }
    });

    const query = nextParams.toString();
    return query ? `/?${query}` : "/";
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-blue-700 text-white">
              <ReceiptText className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-950">Member Billing</span>
              <span className="block text-xs text-slate-500">Info tagihan member</span>
            </span>
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Login Admin
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[1fr_380px] lg:py-10">
          <div className="content-center">
            <p className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-semibold text-blue-100">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Portal informasi tagihan
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-normal text-white md:text-5xl">
              Cek status tagihan member dengan cepat.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Gunakan nama member, nama bisnis, atau nomor invoice untuk melihat apakah tagihan periode ini sudah lunas, masih menunggu verifikasi, atau perlu dibayar.
            </p>
          </div>
          <div className="grid gap-3 rounded-lg border border-white/10 bg-white/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-300">Periode</p>
                <p className="mt-1 text-2xl font-bold text-white">{formatPeriod(month, year)}</p>
              </div>
              <CalendarDays className="size-10 text-blue-200" aria-hidden="true" />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${paidPercent}%` }} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{paidPercent}% lunas</span>
              <span className="font-semibold text-white">{paidInvoices}/{totalInvoices} invoice</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={makeHref({ month: previousPeriod.getMonth() + 1, year: previousPeriod.getFullYear() })}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Sebelumnya
              </Link>
              <Link
                href={makeHref({ month: nextPeriod.getMonth() + 1, year: nextPeriod.getFullYear() })}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Berikutnya
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Invoice" value={totalInvoices} helper={formatPeriod(month, year)} icon={ReceiptText} tone="blue" />
          <SummaryCard title="Sudah Lunas" value={paidInvoices} helper={formatCurrency(revenue._sum.amount)} icon={CheckCircle2} tone="emerald" />
          <SummaryCard title="Perlu Dicek" value={openInvoices} helper={`Tunggakan ${formatCurrency(outstanding._sum.amount)}`} icon={Clock3} tone="amber" />
          <SummaryCard title="Terlambat" value={overdueInvoices} helper="Prioritas pembayaran" icon={AlertTriangle} tone="rose" />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Ringkas berdasarkan status</h2>
            <p className="mt-1 text-sm text-slate-500">Pilih status untuk langsung menyaring daftar tagihan periode ini.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusCounts.map((item) => {
              const active = status === item.value;
              return (
                <Link
                  key={item.value || "all"}
                  href={makeHref({ status: item.value })}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                  <span className={`rounded-full px-2 py-0.5 ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {item.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_120px_120px_210px_auto]">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Cari Tagihan
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Nama member, bisnis, atau invoice"
                className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Bulan
            <input
              name="month"
              type="number"
              min="1"
              max="12"
              defaultValue={month}
              className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Tahun
            <input
              name="year"
              type="number"
              min="2020"
              max="2100"
              defaultValue={year}
              className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Status
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Semua status</option>
              <option value="unpaid">Belum Bayar</option>
              <option value="pending_verification">Menunggu Verifikasi</option>
              <option value="paid">Sudah Bayar</option>
              <option value="overdue">Terlambat</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">
              Terapkan
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Daftar Tagihan Member</h2>
              <p className="mt-1 text-sm text-slate-500">
                {invoices.length} tagihan ditemukan untuk {formatPeriod(month, year)}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasFilters ? (
                <Link
                  href="/"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <X className="size-4" aria-hidden="true" />
                  Reset
                </Link>
              ) : null}
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                <CreditCard className="size-4" aria-hidden="true" />
                Bayar via halaman invoice
              </div>
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Paket</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3">Jatuh Tempo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{invoice.member.name}</p>
                      <p className="text-xs text-slate-500">{invoice.member.businessName || "Member"}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{invoice.member.package?.name || "Custom"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-950">{formatCurrency(invoice.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(invoice.dueDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PayLink token={invoice.paymentToken} status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-4 md:hidden">
            {invoices.map((invoice) => (
              <article key={invoice.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{invoice.member.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{invoice.invoiceNumber}</p>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Info label="Nominal" value={formatCurrency(invoice.amount)} />
                  <Info label="Jatuh Tempo" value={formatDate(invoice.dueDate)} />
                  <Info label="Paket" value={invoice.member.package?.name || "Custom"} />
                  <Info label="Bisnis" value={invoice.member.businessName || "-"} />
                </div>
                <div className="mt-4">
                  <PayLink token={invoice.paymentToken} status={invoice.status} wide />
                </div>
              </article>
            ))}
          </div>

          {invoices.length === 0 ? (
            <div className="grid min-h-64 place-items-center px-4 py-10 text-center">
              <div>
                <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                  <Search className="size-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950">Tagihan tidak ditemukan.</h3>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Coba gunakan nama member, nama bisnis, nomor invoice, atau pilih periode lain.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function SummaryCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone: "blue" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-normal text-slate-950">{value}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function PayLink({ token, status, wide = false }: { token: string; status: string; wide?: boolean }) {
  const canPay = ["unpaid", "overdue"].includes(status);
  const pending = status === "pending_verification";
  const label = pending ? "Cek Status" : canPay ? "Bayar Sekarang" : "Lihat Detail";
  return (
    <Link
      href={`/pay/${token}`}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
        wide ? "w-full" : ""
      } ${
        canPay
          ? "bg-blue-700 text-white shadow-sm hover:bg-blue-800"
          : pending
            ? "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
