"use server";

import { revalidatePath } from "next/cache";
import { getPermissions, requireAuthContext } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getNextInvoiceNumber } from "@/lib/data-service";
import { readDemoDb, writeDemoDb } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/utils";
import { clientInvoiceSchema } from "@/lib/validations";
import type { ClientInvoice, InvoiceStatus } from "@/types/database";

export interface InvoiceActionResponse {
  success: boolean;
  error?: string;
  data?: ClientInvoice;
}

export async function saveClientInvoiceAction(
  rawInput: unknown
): Promise<InvoiceActionResponse> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canManageInvoices) {
    return {
      success: false,
      error: "Seul l'Admin / Gérant peut créer ou modifier des factures clients.",
    };
  }

  const parsed = clientInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données de facture invalides.",
    };
  }

  const data = parsed.data;
  const total_ht = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_ht,
    0
  );
  const total_tva = data.items.reduce(
    (sum, item) =>
      sum + item.quantity * item.unit_price_ht * (item.vat_rate / 100),
    0
  );
  const total_ttc = Math.round((total_ht + total_tva) * 100) / 100;
  const roundedHt = Math.round(total_ht * 100) / 100;
  const roundedTva = Math.round(total_tva * 100) / 100;

  const year = Number(data.issue_date.slice(0, 4)) || new Date().getFullYear();
  const invoiceNumber =
    data.invoice_number && data.invoice_number.trim().length > 0
      ? data.invoice_number.trim()
      : await getNextInvoiceNumber(year);

  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    const now = new Date().toISOString();
    const existingIdx = data.id
      ? db.invoices.findIndex((i) => i.id === data.id)
      : -1;
    const existing = existingIdx !== -1 ? db.invoices[existingIdx] : null;

    const record: ClientInvoice = {
      id: existing?.id ?? `demo-inv-${Date.now()}`,
      invoice_number: existing?.invoice_number ?? invoiceNumber,
      issue_date: data.issue_date,
      due_date: data.due_date || null,
      client_name: data.client_name,
      client_ice: data.client_ice || null,
      client_if: data.client_if || null,
      client_address: data.client_address || null,
      client_phone: data.client_phone || null,
      items: data.items,
      total_ht: roundedHt,
      total_tva: roundedTva,
      total_ttc,
      status: data.status,
      payment_method: data.payment_method ?? null,
      notes: data.notes ?? null,
      created_by: existing?.created_by ?? ctx.userId,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    if (existingIdx !== -1) {
      db.invoices[existingIdx] = record;
    } else {
      db.invoices.unshift(record);
    }
    writeDemoDb(db);
    revalidatePath("/");
    revalidatePath("/factures");
    revalidatePath("/export");
    return { success: true, data: record };
  }

  const supabase = await createServerSupabaseClient();
  const payload = {
    invoice_number: invoiceNumber,
    issue_date: data.issue_date,
    due_date: data.due_date || null,
    client_name: data.client_name,
    client_ice: data.client_ice || null,
    client_if: data.client_if || null,
    client_address: data.client_address || null,
    client_phone: data.client_phone || null,
    items: data.items,
    total_ht: roundedHt,
    total_tva: roundedTva,
    total_ttc,
    status: data.status,
    payment_method: data.payment_method ?? null,
    notes: data.notes ?? null,
  };

  const result = data.id
    ? await supabase
        .from("client_invoices")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single()
    : await supabase
        .from("client_invoices")
        .insert({ ...payload, created_by: ctx.userId })
        .select()
        .single();

  if (result.error) {
    return { success: false, error: result.error.message };
  }

  revalidatePath("/");
  revalidatePath("/factures");
  revalidatePath("/export");
  return { success: true, data: result.data as ClientInvoice };
}

export async function updateInvoiceStatusAction(
  id: string,
  status: InvoiceStatus,
  paymentMethod?: string | null
): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canManageInvoices) {
    return { success: false, error: "Action réservée à l'Admin / Gérant." };
  }

  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    const inv = db.invoices.find((i) => i.id === id);
    if (!inv) return { success: false, error: "Facture introuvable." };
    inv.status = status;
    if (paymentMethod !== undefined) inv.payment_method = paymentMethod;
    inv.updated_at = new Date().toISOString();
    writeDemoDb(db);
    revalidatePath("/");
    revalidatePath("/factures");
    revalidatePath("/export");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("client_invoices")
    .update({
      status,
      ...(paymentMethod !== undefined ? { payment_method: paymentMethod } : {}),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/factures");
  revalidatePath("/export");
  return { success: true };
}

export async function deleteInvoiceAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canManageInvoices) {
    return { success: false, error: "Action réservée à l'Admin / Gérant." };
  }

  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    db.invoices = db.invoices.filter((i) => i.id !== id);
    writeDemoDb(db);
    revalidatePath("/");
    revalidatePath("/factures");
    revalidatePath("/export");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("client_invoices").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/factures");
  revalidatePath("/export");
  return { success: true };
}
