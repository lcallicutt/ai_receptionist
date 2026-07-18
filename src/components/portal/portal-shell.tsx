"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, PhoneCall } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PortalNavItem {
  href: string;
  label: string;
  iconName: string;
}

interface PortalShellProps {
  portalName: string;
  homeHref: string;
  nav: Array<{ heading: string; items: PortalNavItem[] }>;
  userName: string;
  orgName?: string;
  onLogout: () => void;
  children: React.ReactNode;
  icons: Record<string, LucideIcon>;
}

export function PortalShell({
  portalName,
  homeHref,
  nav,
  userName,
  orgName,
  onLogout,
  children,
  icons,
}: PortalShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href={homeHref} className="flex items-center gap-2 px-4 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
          <PhoneCall className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold text-ink-900">{portalName}</span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label={`${portalName} navigation`}>
        {nav.map((group) => (
          <div key={group.heading} className="mt-4 first:mt-0">
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-ink-300">
              {group.heading}
            </h3>
            <ul className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const Icon = icons[item.iconName];
                const active =
                  pathname === item.href ||
                  (item.href !== homeHref && pathname.startsWith(`${item.href}/`));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand-100 text-brand-800"
                          : "text-ink-500 hover:bg-surface-muted hover:text-ink-900",
                      )}
                    >
                      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-ink-300/20 p-4">
        <p className="truncate text-sm font-medium text-ink-900">{userName}</p>
        {orgName ? <p className="truncate text-xs text-ink-500">{orgName}</p> : null}
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface-muted">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-ink-300/20 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">{sidebar}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-ink-300/20 bg-white px-4 lg:hidden">
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-sm font-semibold">{portalName}</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
