"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Receipt,
  FolderArchive,
  Settings,
  LogOut,
  Menu,
  X,
  Camera,
  Shield,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { cn, getRoleLabel } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Tableau de bord",
    shortLabel: "Accueil",
    icon: LayoutDashboard,
  },
  {
    href: "/caisse",
    label: "États de caisse (Z)",
    shortLabel: "Caisse",
    icon: Wallet,
  },
  {
    href: "/justificatifs",
    label: "Justificatifs & Achats",
    shortLabel: "Pièces",
    icon: Receipt,
  },
  {
    href: "/factures",
    label: "Factures clients",
    shortLabel: "Factures",
    icon: FileText,
  },
  {
    href: "/export",
    label: "Clôture & Export",
    shortLabel: "Export",
    icon: FolderArchive,
  },
  {
    href: "/parametres",
    label: "Paramètres & Équipe",
    shortLabel: "Équipe",
    icon: Settings,
  },
];

export function AppShell({
  profile,
  isDemoMode,
  children,
}: {
  profile: Profile;
  isDemoMode: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Mode impression pure (facture PDF)
  if (pathname.includes("/imprimer")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Desktop / Laptop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-sm">
            T
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">
              Tylias
            </p>
            <p className="truncate text-[11px] text-slate-500">
              Gestion &amp; Pré-comptabilité
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-emerald-400" : "text-slate-400"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4 space-y-3">
          {isDemoMode && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-[11px] text-indigo-950">
              <span className="font-semibold">Démonstration Interactive</span> —
              Données d&apos;essai actives.
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 border border-indigo-200/70">
              {profile.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">
                {profile.full_name}
              </p>
              <div className="mt-0.5">
                <Badge
                  variant={
                    profile.role === "admin"
                      ? "indigo"
                      : profile.role === "manager"
                      ? "emerald"
                      : "slate"
                  }
                  className="px-1.5 py-0 text-[10px]"
                >
                  {getRoleLabel(profile.role)}
                </Badge>
              </div>
            </div>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      {/* Header Mobile & Tablette */}
      <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
            T
          </div>
          <span className="text-sm font-bold text-slate-900">Tylias</span>
        </div>

        <div className="flex items-center gap-2">
          {profile.role !== "accountant" && (
            <Link
              href="/justificatifs?action=nouveau"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Scanner</span>
            </Link>
          )}
          <Badge
            variant={
              profile.role === "admin"
                ? "indigo"
                : profile.role === "manager"
                ? "emerald"
                : "slate"
            }
            className="text-[10px]"
          >
            <Shield className="h-3 w-3" />
            {profile.role === "admin"
              ? "Admin"
              : profile.role === "manager"
              ? "Manager"
              : "Comptable"}
          </Badge>
        </div>
      </header>

      {/* Drawer Mobile */}
      {drawerOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="flex h-full w-72 flex-col bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                  T
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Tylias</p>
                  <p className="text-[11px] text-slate-500">
                    {profile.full_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-4 flex-1 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <form action={signOutAction} className="border-t border-slate-100 pt-3">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-red-600"
              >
                <LogOut className="h-3.5 w-3.5" />
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-10">
          {children}
        </div>
      </main>

      {/* Bottom Navigation Mobile */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-indigo-600" : "text-slate-500"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                <span>{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
