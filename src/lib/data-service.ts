import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readDemoDb } from "@/lib/demo-store";
import { getMonthDateRange, isSupabaseConfigured } from "@/lib/utils";
import type {
  ClientInvoice,
  DailyCashRegister,
  ExpenseReceipt,
  Profile,
} from "@/types/database";

export async function listCashRegisters(filters?: {
  year?: number;
  month?: number;
  status?: string;
}): Promise<DailyCashRegister[]> {
  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    return db.cashRegisters
      .filter((r) => {
        if (filters?.year && filters?.month) {
          const { start, end } = getMonthDateRange(filters.year, filters.month);
          if (r.register_date < start || r.register_date > end) return false;
        }
        if (filters?.status && filters.status !== "all" && r.status !== filters.status) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.register_date.localeCompare(a.register_date));
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("daily_cash_registers")
    .select("*")
    .order("register_date", { ascending: false });

  if (filters?.year && filters?.month) {
    const { start, end } = getMonthDateRange(filters.year, filters.month);
    query = query.gte("register_date", start).lte("register_date", end);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DailyCashRegister[];
  // Signer les URLs des tickets Z stockés dans le bucket privé
  const withUrls = await Promise.all(
    rows.map(async (row) => {
      if (row.z_ticket_path) {
        const { data: signed } = await supabase.storage
          .from("justificatifs")
          .createSignedUrl(row.z_ticket_path, 3600);
        return { ...row, z_ticket_signed_url: signed?.signedUrl ?? null };
      }
      return { ...row, z_ticket_signed_url: null };
    })
  );

  return withUrls;
}

export async function listClientInvoices(filters?: {
  year?: number;
  month?: number;
  status?: string;
}): Promise<ClientInvoice[]> {
  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    return db.invoices
      .filter((inv) => {
        if (filters?.year && filters?.month) {
          const { start, end } = getMonthDateRange(filters.year, filters.month);
          if (inv.issue_date < start || inv.issue_date > end) return false;
        }
        if (filters?.status && filters.status !== "all" && inv.status !== filters.status) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.issue_date.localeCompare(a.issue_date));
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("client_invoices")
    .select("*")
    .order("issue_date", { ascending: false });

  if (filters?.year && filters?.month) {
    const { start, end } = getMonthDateRange(filters.year, filters.month);
    query = query.gte("issue_date", start).lte("issue_date", end);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientInvoice[];
}

export async function getClientInvoiceById(
  id: string
): Promise<ClientInvoice | null> {
  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    return db.invoices.find((i) => i.id === id) ?? null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("client_invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as ClientInvoice;
}

export async function getNextInvoiceNumber(year = new Date().getFullYear()): Promise<string> {
  const prefix = `FAC-${year}-`;
  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    const nums = db.invoices
      .filter((i) => i.invoice_number.startsWith(prefix))
      .map((i) => Number.parseInt(i.invoice_number.replace(prefix, ""), 10))
      .filter((n) => Number.isFinite(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("generate_next_invoice_number", {
    p_year: year,
  });

  if (typeof data === "string" && data.startsWith("FAC-")) {
    return data;
  }

  const { data: existing } = await supabase
    .from("client_invoices")
    .select("invoice_number")
    .ilike("invoice_number", `${prefix}%`);

  const nums = (existing ?? [])
    .map((r) => Number.parseInt((r.invoice_number as string).replace(prefix, ""), 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function listExpenseReceipts(filters?: {
  year?: number;
  month?: number;
  category?: string;
}): Promise<ExpenseReceipt[]> {
  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    return db.expenses
      .filter((e) => {
        if (filters?.year && filters?.month) {
          const { start, end } = getMonthDateRange(filters.year, filters.month);
          if (e.expense_date < start || e.expense_date > end) return false;
        }
        if (
          filters?.category &&
          filters.category !== "all" &&
          e.category !== filters.category
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("expense_receipts")
    .select("*")
    .order("expense_date", { ascending: false });

  if (filters?.year && filters?.month) {
    const { start, end } = getMonthDateRange(filters.year, filters.month);
    query = query.gte("expense_date", start).lte("expense_date", end);
  }
  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ExpenseReceipt[];
  const withUrls = await Promise.all(
    rows.map(async (row) => {
      if (row.file_path) {
        const { data: signed } = await supabase.storage
          .from("justificatifs")
          .createSignedUrl(row.file_path, 3600);
        return { ...row, file_signed_url: signed?.signedUrl ?? null };
      }
      return { ...row, file_signed_url: null };
    })
  );

  return withUrls;
}

export async function listTeamProfiles(): Promise<Profile[]> {
  if (!isSupabaseConfigured()) {
    return readDemoDb().profiles;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function getMonthlyOverviewData(year: number, month: number) {
  const [cashRegisters, invoices, expenses] = await Promise.all([
    listCashRegisters({ year, month }),
    listClientInvoices({ year, month }),
    listExpenseReceipts({ year, month }),
  ]);

  const totalCashSales = cashRegisters.reduce(
    (sum, r) => sum + Number(r.cash_sales),
    0
  );
  const totalCardSales = cashRegisters.reduce(
    (sum, r) => sum + Number(r.card_sales),
    0
  );
  const totalDeliverySales = cashRegisters.reduce(
    (sum, r) => sum + Number(r.delivery_other_sales),
    0
  );
  const totalCashOutflows = cashRegisters.reduce(
    (sum, r) => sum + Number(r.cash_outflows),
    0
  );
  const totalRegisterRevenue = totalCashSales + totalCardSales + totalDeliverySales;

  const paidInvoicesTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.total_ttc), 0);

  const totalRevenue = totalRegisterRevenue + paidInvoicesTotal;

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount_ttc),
    0
  );

  const cashExpenses = expenses
    .filter((e) => e.payment_method === "Espèces")
    .reduce((sum, e) => sum + Number(e.amount_ttc), 0);

  // Solde Net de Caisse = Total Espèces encaissées - Sorties de caisse - Dépenses payées en espèces
  const netCashBalance = totalCashSales - totalCashOutflows - cashExpenses;

  const missingReceiptFiles = expenses.filter((e) => !e.file_path).length;
  const missingZTickets = cashRegisters.filter((r) => !r.z_ticket_path).length;
  const missingJustificatifsCount = missingReceiptFiles + missingZTickets;

  const { daysInMonth } = getMonthDateRange(year, month);
  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month;
  const expectedDays = isCurrentMonth ? now.getDate() : daysInMonth;

  return {
    year,
    month,
    daysInMonth,
    expectedDays,
    cashRegisters,
    invoices,
    expenses,
    kpis: {
      totalRevenue,
      totalRegisterRevenue,
      paidInvoicesTotal,
      totalCashSales,
      totalCardSales,
      totalDeliverySales,
      totalExpenses,
      netCashBalance,
      missingJustificatifsCount,
      missingReceiptFiles,
      missingZTickets,
      draftCashCount: cashRegisters.filter((r) => r.status === "draft").length,
      pendingInvoicesCount: invoices.filter((i) => i.status === "pending").length,
    },
  };
}
