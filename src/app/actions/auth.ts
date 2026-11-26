"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEMO_COOKIE_NAME, isSupabaseConfigured } from "@/lib/utils";
import { loginSchema } from "@/lib/validations";
import type { UserRole } from "@/types/database";

export interface AuthActionResult {
  error?: string;
}

export async function signInWithEmail(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Identifiants invalides." };
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        "Veuillez utiliser l'Accès Démonstration Interactive ci-dessous pour explorer l'application.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("invalid login")) {
      return { error: "E-mail ou mot de passe incorrect." };
    }
    return { error: `Erreur de connexion : ${error.message}` };
  }

  redirect("/");
}

export async function signInDemoRole(role: UserRole): Promise<AuthActionResult> {
  if (isSupabaseConfigured()) {
    return { error: "Le mode démonstration est désactivé en production." };
  }
  const cookieStore = await cookies();
  cookieStore.set(DEMO_COOKIE_NAME, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    cookieStore.delete(DEMO_COOKIE_NAME);
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
