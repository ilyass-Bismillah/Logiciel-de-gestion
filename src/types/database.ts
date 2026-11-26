export type UserRole = "admin" | "manager" | "accountant";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export type CashRegisterStatus = "draft" | "validated";

export interface DailyCashRegister {
  id: string;
  register_date: string; // YYYY-MM-DD
  opening_balance: number;
  cash_sales: number;
  card_sales: number;
  delivery_other_sales: number;
  cash_outflows: number;
  counted_cash: number;
  cash_variance: number;
  total_revenue: number;
  z_ticket_path: string | null;
  z_ticket_name: string | null;
  z_ticket_signed_url?: string | null;
  notes: string | null;
  status: CashRegisterStatus;
  created_by: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = "paid" | "pending" | "cancelled";
export type VatRate = 0 | 7 | 10 | 14 | 20;

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: 10 | 20;
}

export interface ClientInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  client_name: string;
  client_ice: string | null;
  client_if: string | null;
  client_address: string | null;
  client_phone: string | null;
  items: InvoiceLineItem[];
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  status: InvoiceStatus;
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory =
  | "Marchandises/Food"
  | "Boissons"
  | "Énergie/Eau"
  | "Entretien"
  | "Autre";

export type ExpensePaymentMethod = "Espèces" | "Virement" | "Chèque" | "Carte";
export type ExpenseStatus = "recorded" | "validated";

export interface ExpenseReceipt {
  id: string;
  expense_date: string;
  supplier_name: string;
  supplier_ice: string | null;
  category: ExpenseCategory;
  amount_ttc: number;
  vat_rate: VatRate;
  payment_method: ExpensePaymentMethod;
  reference_number: string | null;
  file_path: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_signed_url?: string | null;
  status: ExpenseStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RestaurantSettings {
  name: string;
  legal_name: string;
  ice: string;
  if_number: string;
  rc: string;
  patente: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}
