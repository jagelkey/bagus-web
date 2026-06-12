import { CreditCard } from "lucide-react";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/auth-actions";
import { getCurrentUser } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="grid min-h-screen bg-slate-50 px-4 py-8 md:grid-cols-[1fr_1.1fr] md:px-8">
      <section className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-blue-700 text-white">
              <CreditCard className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950">Member Billing</h1>
              <p className="text-sm text-slate-600">Login owner</p>
            </div>
          </div>
          {params.error ? (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {params.error}
            </div>
          ) : null}
          <form action={signInAction} className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Email
              <input
                name="email"
                type="email"
                required
                className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Password
              <input
                name="password"
                type="password"
                required
                className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <SubmitButton className="mt-2 w-full" pendingLabel="Masuk...">
              Masuk
            </SubmitButton>
          </form>
        </div>
      </section>
      <section className="hidden items-center justify-center md:flex">
        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase text-blue-700">Single owner billing</p>
          <h2 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">
            Kelola member, tagihan, bukti bayar, dan rekap bulanan dari satu tempat.
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-white p-4">Invoice token publik</div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">QRIS dan rekening</div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">Verifikasi pembayaran</div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">WhatsApp manual</div>
          </div>
        </div>
      </section>
    </main>
  );
}
