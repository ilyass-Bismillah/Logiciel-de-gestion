import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEMO_COOKIE_NAME, isSupabaseConfigured } from "@/lib/utils";
import { getDemoProfileByRole } from "@/lib/demo-store";
import type { Profile, UserRole } from "@/types/database";

export interface AuthContext {
  userId: string;
  email: string;
  profile: Profile;
  isDemoMode: boolean;
}

export async function getOptionalAuthContext(): Promise<AuthContext | null> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const demoRole = cookieStore.get(DEMO_COOKIE_NAME)?.value as
      | UserRole
      | undefined;
    if (!demoRole || !["admin", "manager", "accountant"].includes(demoRole)) {
      return null;
    }
    const profile = getDemoProfileByRole(demoRole);
    return {
      userId: profile.id,
      email: profile.email,
      profile,
      isDemoMode: true,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const resolvedProfile: Profile = profile ?? {
    id: user.id,
    email: user.email ?? "",
    full_name:
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Utilisateur",
    role:
      (user.user_metadata?.role as UserRole | undefined) ?? "manager",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (!resolvedProfile.is_active) {
    return null;
  }

  return {
    userId: user.id,
    email: resolvedProfile.email,
    profile: resolvedProfile,
    isDemoMode: false,
  };
}

export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getOptionalAuthContext();
  if (!ctx) {
    redirect("/login");
  }
  return ctx;
}

export function getPermissions(role: UserRole) {
  return {
    canCreateCash: role === "admin" || role === "manager",
    canEditDraftCash: role === "admin" || role === "manager",
    canValidateCash: role === "admin",
    canDeleteValidatedCash: role === "admin",
    canDeleteDraftCash: role === "admin" || role === "manager",
    canManageInvoices: role === "admin",
    canCreateExpense: role === "admin" || role === "manager",
    canValidateExpense: role === "admin",
    canDeleteValidatedExpense: role === "admin",
    canDeleteRecordedExpense: role === "admin" || role === "manager",
    canExportMonthly: role === "admin" || role === "accountant" || role === "manager",
    canManageUsers: role === "admin",
    isReadOnly: role === "accountant",
  };
}
