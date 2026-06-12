"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems } from "@/lib/dashboard-navigation";
import { cn } from "@/lib/utils";

type DashboardNavProps = {
  variant: "sidebar" | "mobile-strip" | "bottom";
};

export function DashboardNav({ variant }: DashboardNavProps) {
  const pathname = usePathname();
  const items = variant === "bottom" ? dashboardNavItems.slice(0, 5) : dashboardNavItems;

  if (variant === "sidebar") {
    return (
      <nav className="mt-4 grid gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950",
                active && "bg-blue-50 text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50 hover:text-blue-700",
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  if (variant === "mobile-strip") {
    return (
      <nav className="border-b border-slate-200 bg-white lg:hidden">
        <div className="flex gap-1 overflow-x-auto px-4 py-2">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700",
                  active && "border-slate-900 bg-slate-900 text-white",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-slate-600",
              active && "bg-blue-50 text-blue-700",
            )}
          >
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
