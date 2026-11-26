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

const DEMO_EMAIL_ROLE_MAP: Record<string, UserRole> = {
  "gerant@tylias.ma": "admin",
  "admin@tylias.ma": "admin",
  "karim.bennani@tylias.ma": "admin",
  "caissier@tylias.ma": "manager",
  "manager@tylias.ma": "manager",
  "salma.idrissi@tylias.ma": "manager",
  "comptable@tylias.ma": "accountant",
  "accountant@tylias.ma": "accountant",
  "cabinet.tazi@fiduciaire.ma": "accountant",
};

export async function signInWithEmail(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const demoRole = DEMO_EMAIL_ROLE_MAP[email];
  if (demoRole) {
    const cookieStore = await cookies();
    cookieStore.set(DEMO_COOKIE_NAME, demoRole, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    redirect("/");
  }

  const parsed = loginSchema.safeParse({ email, password });
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

  const cookieStore = await cookies();
  cookieStore.delete(DEMO_COOKIE_NAME);
  redirect("/");
}

export async function signInDemoRole(role: UserRole): Promise<AuthActionResult> {
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
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_COOKIE_NAME);

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
