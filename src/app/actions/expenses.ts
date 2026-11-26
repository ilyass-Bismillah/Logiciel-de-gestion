"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { getPermissions, requireAuthContext, shouldUseSupabase } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readDemoDb, saveDemoUploadedFile, writeDemoDb } from "@/lib/demo-store";
import { sanitizeFilenameSegment } from "@/lib/utils";
import { expenseReceiptSchema } from "@/lib/validations";
import type { ExpenseReceipt } from "@/types/database";

export async function createExpenseReceiptAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  data?: ExpenseReceipt;
}> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canCreateExpense) {
    return {
      success: false,
      error: "Accès refusé : votre rôle est en lecture seule.",
    };
  }

  const raw = {
    expense_date: String(formData.get("expense_date") ?? ""),
    supplier_name: String(formData.get("supplier_name") ?? ""),
    supplier_ice: (formData.get("supplier_ice") as string) || null,
    category: String(formData.get("category") ?? "Marchandises/Food"),
    amount_ttc: formData.get("amount_ttc"),
    vat_rate: formData.get("vat_rate") ?? 20,
    payment_method: String(formData.get("payment_method") ?? "Espèces"),
    reference_number: (formData.get("reference_number") as string) || null,
    notes: (formData.get("notes") as string) || null,
    status: "recorded",
  };

  const parsed = expenseReceiptSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Données du justificatif invalides.",
    };
  }

  const file = formData.get("receipt_file") as File | null;
  let uploadedPath: string | null = null;
  let uploadedName: string | null = null;
  let uploadedMime: string | null = null;

  if (!(await shouldUseSupabase())) {
    if (file && file.size > 0) {
      const ext = path.extname(file.name) || ".jpg";
      const safeName = `${parsed.data.expense_date}_${sanitizeFilenameSegment(
        parsed.data.supplier_name
      )}_${Math.round(parsed.data.amount_ttc)}MAD_${Date.now()}${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      saveDemoUploadedFile(safeName, buf, file.type || "application/octet-stream");
      uploadedPath = `local/${safeName}`;
      uploadedName = file.name;
      uploadedMime = file.type || "application/octet-stream";
    }

    const db = readDemoDb();
    const now = new Date().toISOString();
    const record: ExpenseReceipt = {
      id: `demo-exp-${Date.now()}`,
      expense_date: parsed.data.expense_date,
      supplier_name: parsed.data.supplier_name,
      supplier_ice: parsed.data.supplier_ice ?? null,
      category: parsed.data.category,
      amount_ttc: parsed.data.amount_ttc,
      vat_rate: parsed.data.vat_rate as ExpenseReceipt["vat_rate"],
      payment_method: parsed.data.payment_method,
      reference_number: parsed.data.reference_number ?? null,
      file_path: uploadedPath,
      file_name: uploadedName,
      file_mime_type: uploadedMime,
      file_signed_url: uploadedPath
        ? `/api/demo-file?type=local&name=${encodeURIComponent(path.basename(uploadedPath))}`
        : null,
      status: "recorded",
      notes: parsed.data.notes ?? null,
      created_by: ctx.userId,
      created_at: now,
      updated_at: now,
    };

    db.expenses.unshift(record);
    writeDemoDb(db);
    revalidatePath("/");
    revalidatePath("/justificatifs");
    revalidatePath("/export");
    return { success: true, data: record };
  }

  const supabase = await createServerSupabaseClient();

  if (file && file.size > 0) {
    const ext = file.name.split(".").pop() || "jpg";
    const ym = parsed.data.expense_date.slice(0, 7);
    const storagePath = `depenses/${ym}/${parsed.data.expense_date}_${sanitizeFilenameSegment(
      parsed.data.supplier_name
    )}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("justificatifs")
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: `Échec du téléversement : ${uploadError.message}`,
      };
    }

    uploadedPath = storagePath;
    uploadedName = file.name;
    uploadedMime = file.type || "application/octet-stream";
  }

  const { data, error } = await supabase
    .from("expense_receipts")
    .insert({
      expense_date: parsed.data.expense_date,
      supplier_name: parsed.data.supplier_name,
      supplier_ice: parsed.data.supplier_ice ?? null,
      category: parsed.data.category,
      amount_ttc: parsed.data.amount_ttc,
      vat_rate: parsed.data.vat_rate,
      payment_method: parsed.data.payment_method,
      reference_number: parsed.data.reference_number ?? null,
      file_path: uploadedPath,
      file_name: uploadedName,
      file_mime_type: uploadedMime,
      status: "recorded",
      notes: parsed.data.notes ?? null,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/justificatifs");
  revalidatePath("/export");
  return { success: true, data: data as ExpenseReceipt };
}

export async function attachExpenseFileAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canCreateExpense) {
    return { success: false, error: "Accès refusé." };
  }

  const file = formData.get("receipt_file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Veuillez sélectionner un fichier." };
  }

  if (!(await shouldUseSupabase())) {
    const db = readDemoDb();
    const target = db.expenses.find((e) => e.id === id);
    if (!target) return { success: false, error: "Dépense introuvable." };

    const ext = path.extname(file.name) || ".jpg";
    const safeName = `${target.expense_date}_${sanitizeFilenameSegment(
      target.supplier_name
    )}_${Date.now()}${ext}`;
    saveDemoUploadedFile(
      safeName,
      Buffer.from(await file.arrayBuffer()),
      file.type || "application/octet-stream"
    );
    target.file_path = `local/${safeName}`;
    target.file_name = file.name;
    target.file_mime_type = file.type || "application/octet-stream";
    target.file_signed_url = `/api/demo-file?type=local&name=${encodeURIComponent(
      safeName
    )}`;
    target.updated_at = new Date().toISOString();
    writeDemoDb(db);
    revalidatePath("/");
    revalidatePath("/justificatifs");
    revalidatePath("/export");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  const { data: target } = await supabase
    .from("expense_receipts")
    .select("expense_date, supplier_name")
    .eq("id", id)
    .single();

  if (!target) return { success: false, error: "Dépense introuvable." };

  const ext = file.name.split(".").pop() || "jpg";
  const ym = String(target.expense_date).slice(0, 7);
  const storagePath = `depenses/${ym}/${target.expense_date}_${sanitizeFilenameSegment(
    target.supplier_name
  )}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("justificatifs")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { error } = await supabase
    .from("expense_receipts")
    .update({
      file_path: storagePath,
      file_name: file.name,
      file_mime_type: file.type || "application/octet-stream",
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/justificatifs");
  revalidatePath("/export");
  return { success: true };
}

export async function validateExpenseReceiptAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canValidateExpense) {
    return {
      success: false,
      error: "Seul l'Admin / Gérant peut valider un justificatif.",
    };
  }

  if (!(await shouldUseSupabase())) {
    const db = readDemoDb();
    const item = db.expenses.find((e) => e.id === id);
    if (!item) return { success: false, error: "Dépense introuvable." };
    item.status = "validated";
    item.updated_at = new Date().toISOString();
    writeDemoDb(db);
    revalidatePath("/");
    revalidatePath("/justificatifs");
    revalidatePath("/export");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("expense_receipts")
    .update({ status: "validated" })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/justificatifs");
  revalidatePath("/export");
  return { success: true };
}

export async function deleteExpenseReceiptAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canDeleteRecordedExpense && !perms.canDeleteValidatedExpense) {
    return { success: false, error: "Accès refusé." };
  }

  if (!(await shouldUseSupabase())) {
    const db = readDemoDb();
    const target = db.expenses.find((e) => e.id === id);
    if (!target) return { success: false, error: "Justificatif introuvable." };
    if (target.status === "validated" && !perms.canDeleteValidatedExpense) {
      return {
        success: false,
        error: "Un Manager ne peut pas supprimer un justificatif validé.",
      };
    }
    db.expenses = db.expenses.filter((e) => e.id !== id);
    writeDemoDb(db);
    revalidatePath("/");
    revalidatePath("/justificatifs");
    revalidatePath("/export");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  const { data: target } = await supabase
    .from("expense_receipts")
    .select("status, file_path")
    .eq("id", id)
    .single();

  if (!target) return { success: false, error: "Justificatif introuvable." };

  if (target.status === "validated" && !perms.canDeleteValidatedExpense) {
    return {
      success: false,
      error: "Impossible de supprimer une pièce déjà validée.",
    };
  }

  const { error } = await supabase
    .from("expense_receipts")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  if (target.file_path && perms.canDeleteValidatedExpense) {
    await supabase.storage.from("justificatifs").remove([target.file_path]);
  }

  revalidatePath("/");
  revalidatePath("/justificatifs");
  revalidatePath("/export");
  return { success: true };
}
