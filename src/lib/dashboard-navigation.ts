import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  FileText,
  History,
  Home,
  Mail,
  Package,
  Settings,
  Users,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/members", label: "Member", icon: Users },
  { href: "/dashboard/packages", label: "Paket", icon: Package },
  { href: "/dashboard/invoices", label: "Tagihan", icon: FileText },
  { href: "/dashboard/payments", label: "Pembayaran", icon: CreditCard },
  { href: "/dashboard/reports/monthly", label: "Rekap", icon: BarChart3 },
  { href: "/dashboard/templates", label: "Template", icon: Mail },
  { href: "/dashboard/activity", label: "Aktivitas", icon: History },
  { href: "/dashboard/settings/payment", label: "Rekening", icon: Settings },
  { href: "/dashboard/settings/profile", label: "Profil", icon: Settings },
];
