"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { getPermissions, requireAuthContext } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEMO_FILES_DIR, readDemoDb, writeDemoDb } from "@/lib/demo-store";
import { isSupabaseConfigured, sanitizeFilenameSegment } from "@/lib/utils";
import { cashRegisterSchema } from "@/lib/validations";
import type { DailyCashRegister } from "@/types/database";

export interface ActionResponse<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function upsertCashRegisterAction(
  formData: FormData
): Promise<ActionResponse<DailyCashRegister>> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canCreateCash) {
    return { success: false, error: "Accès refusé : rôle en lecture seule." };
  }

  const raw = {
    id: (formData.get("id") as string) || undefined,
    register_date: String(formData.get("register_date") ?? ""),
    opening_balance: formData.get("opening_balance"),
    cash_sales: formData.get("cash_sales"),
    card_sales: formData.get("card_sales"),
    delivery_other_sales: formData.get("delivery_other_sales"),
    cash_outflows: formData.get("cash_outflows"),
    counted_cash: formData.get("counted_cash"),
    notes: (formData.get("notes") as string) || null,
    status: (formData.get("status") as string) || "draft",
  };

  const parsed = cashRegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données de caisse invalides.",
    };
  }

  const targetStatus =
    parsed.data.status === "validated" && perms.canValidateCash
      ? "validated"
      : "draft";

  const file = formData.get("z_ticket_file") as File | null;
  let uploadedPath: string | null = null;
  let uploadedName: string | null = null;

  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    const existingIdx = parsed.data.id
      ? db.cashRegisters.findIndex((r) => r.id === parsed.data.id)
      : db.cashRegisters.findIndex(
          (r) => r.register_date === parsed.data.register_date
        );

    if (
      existingIdx !== -1 &&
      db.cashRegisters[existingIdx].status === "validated" &&
      !perms.canValidateCash
    ) {
      return {
        success: false,
        error: "Impossible de modifier un état de caisse déjà validé.",
      };
    }

    if (file && file.size > 0) {
      fs.mkdirSync(DEMO_FILES_DIR, { recursive: true });
      const ext = path.extname(file.name) || ".jpg";
      const safeName = `${parsed.data.register_date}_TicketZ_Tylias${ext}`;
      const diskPath = path.join(DEMO_FILES_DIR, safeName);
      const buf = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(diskPath, buf);
      uploadedPath = `local/${safeName}`;
      uploadedName = file.name;
    }

    const now = new Date().toISOString();
    const existing = existingIdx !== -1 ? db.cashRegisters[existingIdx] : null;
    const expectedCash =
      parsed.data.opening_balance +
      parsed.data.cash_sales -
      parsed.data.cash_outflows;
    const cashVariance = parsed.data.counted_cash - expectedCash;
    const totalRevenue =
      parsed.data.cash_sales +
      parsed.data.card_sales +
      parsed.data.delivery_other_sales;

    const record: DailyCashRegister = {
      id: existing?.id ?? `demo-cash-${Date.now()}`,
      register_date: parsed.data.register_date,
      opening_balance: parsed.data.opening_balance,
      cash_sales: parsed.data.cash_sales,
      card_sales: parsed.data.card_sales,
      delivery_other_sales: parsed.data.delivery_other_sales,
      cash_outflows: parsed.data.cash_outflows,
      counted_cash: parsed.data.counted_cash,
      cash_variance: cashVariance,
      total_revenue: totalRevenue,
      z_ticket_path: uploadedPath ?? existing?.z_ticket_path ?? null,
      z_ticket_name: uploadedName ?? existing?.z_ticket_name ?? null,
      z_ticket_signed_url: uploadedPath
        ? `/api/demo-file?type=local&name=${encodeURIComponent(path.basename(uploadedPath))}`
        : existing?.z_ticket_signed_url ?? null,
      notes: parsed.data.notes ?? null,
      status: targetStatus,
      created_by: existing?.created_by ?? ctx.userId,
      validated_by: targetStatus === "validated" ? ctx.userId : null,
      validated_at: targetStatus === "validated" ? now : null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    if (existingIdx !== -1) {
      db.cashRegisters[existingIdx] = record;
    } else {
      db.cashRegisters.unshift(record);
    }
    writeDemoDb(db);
    revalidatePath("/");
    revalidatePath("/caisse");
    revalidatePath("/export");
    return { success: true, data: record };
  }

  const supabase = await createServerSupabaseClient();

  if (parsed.data.id) {
    const { data: existing } = await supabase
      .from("daily_cash_registers")
      .select("status")
      .eq("id", parsed.data.id)
      .single();

    if (existing?.status === "validated" && !perms.canValidateCash) {
      return {
        success: false,
        error: "Seul l'administrateur peut modifier un état de caisse validé.",
      };
    }
  }

  if (file && file.size > 0) {
    const ext = file.name.split(".").pop() || "jpg";
    const ym = parsed.data.register_date.slice(0, 7);
    const storagePath = `tickets-z/${ym}/${parsed.data.register_date}_TicketZ_${sanitizeFilenameSegment(
      String(Date.now())
    )}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("justificatifs")
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      return {
        success: false,
        error: `Échec de l'envoi du Ticket Z : ${uploadError.message}`,
      };
    }

    uploadedPath = storagePath;
    uploadedName = file.name;
  }

  const payload: Record<string, unknown> = {
    register_date: parsed.data.register_date,
    opening_balance: parsed.data.opening_balance,
    cash_sales: parsed.data.cash_sales,
    card_sales: parsed.data.card_sales,
    delivery_other_sales: parsed.data.delivery_other_sales,
    cash_outflows: parsed.data.cash_outflows,
    counted_cash: parsed.data.counted_cash,
    notes: parsed.data.notes ?? null,
    status: targetStatus,
    validated_by: targetStatus === "validated" ? ctx.userId : null,
    validated_at: targetStatus === "validated" ? new Date().toISOString() : null,
  };

  if (uploadedPath) {
    payload.z_ticket_path = uploadedPath;
    payload.z_ticket_name = uploadedName;
  }

  let result;
  if (parsed.data.id) {
    result = await supabase
      .from("daily_cash_registers")
      .update(payload)
      .eq("id", parsed.data.id)
      .select()
      .single();
  } else {
    payload.created_by = ctx.userId;
    result = await supabase
      .from("daily_cash_registers")
      .upsert(payload, { onConflict: "register_date" })
      .select()
      .single();
  }

  if (result.error) {
    return { success: false, error: result.error.message };
  }

  revalidatePath("/");
  revalidatePath("/caisse");
  revalidatePath("/export");
  return { success: true, data: result.data as DailyCashRegister };
}

export async function validateCashRegisterAction(
  id: string
): Promise<ActionResponse> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canValidateCash) {
    return {
      success: false,
      error: "Seul l'Admin / Gérant peut valider un état de caisse.",
    };
  }

  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    const target = db.cashRegisters.find((r) => r.id === id);
    if (!target) return { success: false, error: "État de caisse introuvable." };
    target.status = "validated";
    target.validated_by = ctx.userId;
    target.validated_at = new Date().toISOString();
    target.updated_at = new Date().toISOString();
    writeDemoDb(db);
    revalidatePath("/");
    revalidatePath("/caisse");
    revalidatePath("/export");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("daily_cash_registers")
    .update({
      status: "validated",
      validated_by: ctx.userId,
      validated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/caisse");
  revalidatePath("/export");
  return { success: true };
}

export async function deleteCashRegisterAction(
  id: string
): Promise<ActionResponse> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canDeleteDraftCash && !perms.canDeleteValidatedCash) {
    return { success: false, error: "Accès refusé." };
  }

  if (!isSupabaseConfigured()) {
    const db = readDemoDb();
    const target = db.cashRegisters.find((r) => r.id === id);
    if (!target) return { success: false, error: "État de caisse introuvable." };
    if (target.status === "validated" && !perms.canDeleteValidatedCash) {
      return {
        success: false,
        error: "Un Manager ne peut pas supprimer un état de caisse validé.",
      };
    }
    db.cashRegisters = db.cashRegisters.filter((r) => r.id !== id);
    writeDemoDb(db);
    revalidatePath("/");
    revalidatePath("/caisse");
    revalidatePath("/export");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  const { data: target } = await supabase
    .from("daily_cash_registers")
    .select("status, z_ticket_path")
    .eq("id", id)
    .single();

  if (!target) {
    return { success: false, error: "État de caisse introuvable." };
  }

  if (target.status === "validated" && !perms.canDeleteValidatedCash) {
    return {
      success: false,
      error: "Impossible de supprimer une journée validée.",
    };
  }

  const { error } = await supabase
    .from("daily_cash_registers")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  if (target.z_ticket_path && perms.canDeleteValidatedCash) {
    await supabase.storage.from("justificatifs").remove([target.z_ticket_path]);
  }

  revalidatePath("/");
  revalidatePath("/caisse");
  revalidatePath("/export");
  return { success: true };
}
