"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getPermissions, requireAuthContext, shouldUseSupabase } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readDemoDb, writeDemoDb } from "@/lib/demo-store";
import { userRoleUpdateSchema } from "@/lib/validations";
import type { UserRole } from "@/types/database";

export async function updateUserRoleAction(input: {
  userId: string;
  role: UserRole;
  is_active?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canManageUsers) {
    return {
      success: false,
      error: "Seul l'Admin / Gérant peut modifier les rôles.",
    };
  }

  const parsed = userRoleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Paramètres invalides." };
  }

  if (!(await shouldUseSupabase())) {
    const db = readDemoDb();
    const profile = db.profiles.find((p) => p.id === parsed.data.userId);
    if (!profile) return { success: false, error: "Utilisateur introuvable." };
    profile.role = parsed.data.role;
    if (parsed.data.is_active !== undefined) {
      profile.is_active = parsed.data.is_active;
    }
    writeDemoDb(db);
    revalidatePath("/parametres");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      role: parsed.data.role,
      ...(parsed.data.is_active !== undefined
        ? { is_active: parsed.data.is_active }
        : {}),
    })
    .eq("id", parsed.data.userId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/parametres");
  return { success: true };
}

export async function createTeamMemberAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  if (!perms.canManageUsers) {
    return { success: false, error: "Accès réservé à l'Admin / Gérant." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "manager") as UserRole;
  const password = String(formData.get("password") ?? "");

  if (!email || !fullName || password.length < 6) {
    return {
      success: false,
      error:
        "Veuillez renseigner un nom, un e-mail valide et un mot de passe (6+ car.).",
    };
  }

  if (!(await shouldUseSupabase())) {
    const db = readDemoDb();
    if (db.profiles.some((p) => p.email.toLowerCase() === email)) {
      return { success: false, error: "Cet e-mail existe déjà." };
    }
    db.profiles.push({
      id: `demo-user-${Date.now()}`,
      email,
      full_name: fullName,
      role,
      is_active: true,
      created_at: new Date().toISOString(),
    });
    writeDemoDb(db);
    revalidatePath("/parametres");
    return { success: true };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return {
      success: false,
      error:
        "La création directe de comptes nécessite la configuration administrateur serveur.",
    };
  }

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/parametres");
  return { success: true };
}
