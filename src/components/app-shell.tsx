import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/auth-actions";
import { DashboardNav } from "@/components/dashboard-nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white px-3 py-4 lg:block">
        <Link href="/dashboard" className="flex h-12 items-center rounded-md px-3 text-base font-bold text-slate-950">
          Member Billing
        </Link>
        <DashboardNav variant="sidebar" />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:px-6">
            <Link href="/dashboard" className="text-sm font-bold text-slate-950 lg:hidden">
              Member Billing
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden max-w-56 truncate text-sm text-slate-600 sm:block">{user.email}</span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  title="Logout"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </header>
        <DashboardNav variant="mobile-strip" />
        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>

      <DashboardNav variant="bottom" />
    </div>
  );
}
