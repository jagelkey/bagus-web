import { AppShell } from "@/components/app-shell";
import { ensureOwnerDefaults } from "@/lib/defaults";
import { requireOwner } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner();
  await ensureOwnerDefaults(owner.id);

  return <AppShell>{children}</AppShell>;
}
