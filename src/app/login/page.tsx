import { redirect } from "next/navigation";
import { UtensilsCrossed, CheckCircle2 } from "lucide-react";
import { getOptionalAuthContext } from "@/lib/auth";
import { RESTAURANT_DEFAULT_INFO } from "@/lib/utils";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const ctx = await getOptionalAuthContext();
  if (ctx) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Panneau gauche exécutif */}
      <div className="hidden bg-slate-950 p-10 text-white lg:flex lg:w-[44%] lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/30">
            T
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight">
              {RESTAURANT_DEFAULT_INFO.name}
            </p>
            <p className="text-xs text-slate-400">
              Gestion &amp; Pré-comptabilité
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs text-emerald-400">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            <span>Hospitalité &amp; Restauration — Maroc</span>
          </div>

          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Pilotage financier quotidien et clôture comptable sans friction.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            Centralisez vos Rapports Z, factures clients ICE/IF, justificatifs
            fournisseurs photographiés sur le terrain et exportez votre dossier
            mensuel prêt pour votre cabinet comptable.
          </p>

          <ul className="space-y-3 pt-2 text-xs text-slate-300">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Contrôle des écarts de caisse (Espèces, TPE, Livraisons)</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Facturation B2B conforme (ICE, IF, TVA 10% &amp; 20% en MAD)</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Exports Excel multi-feuilles &amp; archive ZIP renommée</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-slate-800/90 pt-5 text-xs text-slate-500">
          {RESTAURANT_DEFAULT_INFO.legal_name} • ICE {RESTAURANT_DEFAULT_INFO.ice}
        </div>
      </div>

      {/* Formulaire de connexion */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-bold text-white">
              T
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Tylias
              </h1>
              <p className="text-xs text-slate-500">
                Gestion &amp; Pré-comptabilité
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                Connexion à l&apos;espace gestion
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Identifiez-vous pour accéder aux caisses, factures et pièces
                justificatives.
              </p>
            </div>

            <LoginForm />
          </div>

          <p className="text-center text-[11px] text-slate-400">
            Devise : Dirham Marocain (MAD) • Espace Sécurisé
          </p>
        </div>
      </div>
    </div>
  );
}
