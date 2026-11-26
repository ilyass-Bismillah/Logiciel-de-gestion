"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  Calculator,
} from "lucide-react";
import {
  signInDemoRole,
  signInWithEmail,
  type AuthActionResult,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { UserRole } from "@/types/database";

const initialState: AuthActionResult = {};

export function LoginForm({ supabaseReady }: { supabaseReady: boolean }) {
  const [state, formAction, isPending] = useActionState(
    signInWithEmail,
    initialState
  );
  const [showPassword, setShowPassword] = React.useState(false);
  const [demoPending, startDemoTransition] = useTransition();
  const [demoRoleLoading, setDemoRoleLoading] = React.useState<UserRole | null>(
    null
  );

  const handleDemo = (role: UserRole) => {
    setDemoRoleLoading(role);
    startDemoTransition(async () => {
      await signInDemoRole(role);
    });
  };

  return (
    <div className="space-y-6">
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse e-mail professionnelle</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="gerant@tylias.ma"
              className="pl-9"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <span className="text-[11px] text-slate-400">
              Accès sécurisé RBAC
            </span>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="pl-9 pr-10"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
              aria-label={
                showPassword
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            "Se connecter à Tylias"
          )}
        </Button>
      </form>

      {!supabaseReady && (
        <div className="space-y-3 rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-indigo-950">
                Accès Démonstration Interactive
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-800/80">
                Explorez l&apos;ensemble des modules en un clic selon votre profil :
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={demoPending}
              onClick={() => handleDemo("admin")}
              className="justify-between border-indigo-200 bg-white hover:bg-indigo-50"
            >
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                Gérant / Admin (Karim Bennani)
              </span>
              {demoPending && demoRoleLoading === "admin" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              ) : (
                <span className="text-[11px] text-indigo-600">Accès complet</span>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={demoPending}
              onClick={() => handleDemo("manager")}
              className="justify-between border-indigo-200 bg-white hover:bg-indigo-50"
            >
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                Caissier / Manager (Salma Idrissi)
              </span>
              {demoPending && demoRoleLoading === "manager" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              ) : (
                <span className="text-[11px] text-emerald-700">
                  Caisse &amp; Pièces
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={demoPending}
              onClick={() => handleDemo("accountant")}
              className="justify-between border-indigo-200 bg-white hover:bg-indigo-50"
            >
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <Calculator className="h-4 w-4 text-slate-600" />
                Comptable (Cabinet Tazi)
              </span>
              {demoPending && demoRoleLoading === "accountant" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
              ) : (
                <span className="text-[11px] text-slate-500">
                  Lecture &amp; Exports
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
