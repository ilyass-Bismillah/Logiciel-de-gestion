import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UserRole } from "@/types/database";

export const DEMO_COOKIE_NAME = "tylias_demo_role";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("votre-projet")
  );
}

export function formatMAD(amount: number, showDecimals = true): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return (
    new Intl.NumberFormat("fr-MA", {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(value) + " MAD"
  );
}

export function formatNumberFR(amount: number, decimals = 2): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDateFR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const parsed = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function formatMonthYearFR(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function sanitizeFilenameSegment(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "Piece";
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Admin / Gérant";
    case "manager":
      return "Manager / Caissier";
    case "accountant":
      return "Comptable";
  }
}

export function getMonthDateRange(year: number, month: number): {
  start: string;
  end: string;
  daysInMonth: number;
} {
  const daysInMonth = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  const dd = String(daysInMonth).padStart(2, "0");
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${dd}`,
    daysInMonth,
  };
}

export const RESTAURANT_DEFAULT_INFO = {
  name: "Tylias",
  legal_name: "Tylias",
  ice: "002847591000038",
  if_number: "50482913",
  rc: "519482 (Casablanca)",
  patente: "34709184",
  address: "20, Boulevard d'Anfa, Quartier Gautier",
  city: "20000 Casablanca, Maroc",
  phone: "+212 5 22 48 20 20",
  email: "comptabilite@tylias.ma",
};

export const MOROCCAN_SUPPLIERS_PRESETS = [
  "Metro Maroc",
  "Centrale Danone",
  "Coca-Cola (CBGN)",
  "Marché de Gros Casablanca",
  "Lydec",
  "Sidi Ali / Les Eaux Minérales d'Oulmès",
  "Koutoubia Charcuterie",
  "Lesaffre Maroc",
  "Hygiène Pro Maroc",
  "Afriquia Gaz",
];
