import Link from "next/link";
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Receipt,
  Wallet,
  AlertTriangle,
  Plus,
  Camera,
  FilePlus2,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { requireAuthContext, getPermissions } from "@/lib/auth";
import { getMonthlyOverviewData } from "@/lib/data-service";
import { formatDateFR, formatMAD, formatMonthYearFR } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonthSelector } from "@/components/shared/month-selector";
import { RevenueExpenseChart } from "@/components/dashboard/revenue-expense-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const ctx = await requireAuthContext();
  const perms = getPermissions(ctx.profile.role);

  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;

  const overview = await getMonthlyOverviewData(year, month);
  const { kpis } = overview;

  const cashShare =
    kpis.totalRegisterRevenue > 0
      ? Math.round((kpis.totalCashSales / kpis.totalRegisterRevenue) * 100)
      : 0;
  const cardShare =
    kpis.totalRegisterRevenue > 0
      ? Math.round((kpis.totalCardSales / kpis.totalRegisterRevenue) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* En-tête + Actions rapides */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Tableau de bord financier
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Synthèse pré-comptable de{" "}
            <span className="font-medium text-slate-700">Tylias</span>{" "}
            pour {formatMonthYearFR(year, month)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <MonthSelector year={year} month={month} />

          {perms.canCreateCash && (
            <Link
              href="/caisse?action=nouveau"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 sm:text-sm"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              <span>Saisir Caisse du Jour</span>
            </Link>
          )}

          {perms.canCreateExpense && (
            <Link
              href="/justificatifs?action=nouveau"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 sm:text-sm"
            >
              <Camera className="h-4 w-4" />
              <span>Scanner un Justificatif</span>
            </Link>
          )}

          {perms.canManageInvoices && (
            <Link
              href="/factures?action=nouveau"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:text-sm"
            >
              <FilePlus2 className="h-4 w-4 text-indigo-600" />
              <span>Nouvelle Facture</span>
            </Link>
          )}
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-slate-200/90">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Chiffre d&apos;Affaires Total
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2.5 text-xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-2xl">
              {formatMAD(kpis.totalRevenue)}
            </p>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Caisse Z : {formatMAD(kpis.totalRegisterRevenue, false)} • Factures
              payées : {formatMAD(kpis.paidInvoicesTotal, false)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Espèces vs TPE / Carte
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <CreditCard className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2 tabular-nums">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {formatMAD(kpis.totalCashSales, false)}
                </p>
                <p className="text-[11px] text-slate-500">
                  Espèces ({cashShare}%)
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-indigo-700">
                  {formatMAD(kpis.totalCardSales, false)}
                </p>
                <p className="text-[11px] text-slate-500">TPE ({cardShare}%)</p>
              </div>
            </div>
            <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{ width: `${cashShare}%` }}
                className="bg-emerald-500"
              />
              <div
                style={{ width: `${cardShare}%` }}
                className="bg-indigo-500"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Total Dépenses &amp; Achats
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2.5 text-xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-2xl">
              {formatMAD(kpis.totalExpenses)}
            </p>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {overview.expenses.length} facture(s) fournisseur enregistrée(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Solde Net de Caisse
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <p
              className={`mt-2.5 text-xl font-bold tracking-tight tabular-nums sm:text-2xl ${
                kpis.netCashBalance >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {formatMAD(kpis.netCashBalance)}
            </p>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Espèces nettes après sorties &amp; achats cash
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            kpis.missingJustificatifsCount > 0
              ? "border-amber-200 bg-amber-50/40"
              : "border-emerald-200 bg-emerald-50/30"
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                Justificatifs Manquants
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  kpis.missingJustificatifsCount > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {kpis.missingJustificatifsCount > 0 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </span>
            </div>
            <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {kpis.missingJustificatifsCount}
            </p>
            <p className="mt-1.5 text-[11px] text-slate-600">
              {kpis.missingZTickets} ticket(s) Z • {kpis.missingReceiptFiles}{" "}
              facture(s) achat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique + État de clôture */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Évolution Recettes vs Dépenses</CardTitle>
              <CardDescription>
                Survolez ou touchez une journée pour afficher le détail Espèces /
                TPE / Achats.
              </CardDescription>
            </div>
            <Link
              href={`/export?year=${year}&month=${month}`}
              className="hidden items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 sm:inline-flex"
            >
              Centre d&apos;export
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <RevenueExpenseChart
              year={year}
              month={month}
              daysInMonth={overview.daysInMonth}
              cashRegisters={overview.cashRegisters}
              expenses={overview.expenses}
            />
          </CardContent>
        </Card>

        {/* Panneau Suivi de Clôture */}
        <Card>
          <CardHeader>
            <CardTitle>Contrôle Pré-comptable</CardTitle>
            <CardDescription>
              Avancement du dossier pour {formatMonthYearFR(year, month)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  Journées de caisse saisies
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {overview.cashRegisters.length} / {overview.daysInMonth}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (overview.cashRegisters.length / overview.daysInMonth) *
                          100
                      )
                    )}%`,
                  }}
                  className="h-full bg-indigo-600"
                />
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                <span className="flex items-center gap-2 text-slate-700">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Caisses en brouillon
                </span>
                <Badge variant={kpis.draftCashCount > 0 ? "amber" : "emerald"}>
                  {kpis.draftCashCount}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                <span className="flex items-center gap-2 text-slate-700">
                  <Banknote className="h-4 w-4 text-indigo-500" />
                  Factures B2B en attente
                </span>
                <Badge
                  variant={kpis.pendingInvoicesCount > 0 ? "indigo" : "emerald"}
                >
                  {kpis.pendingInvoicesCount}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                <span className="flex items-center gap-2 text-slate-700">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Pièces sans scan PDF/Photo
                </span>
                <Badge
                  variant={
                    kpis.missingJustificatifsCount > 0 ? "red" : "emerald"
                  }
                >
                  {kpis.missingJustificatifsCount}
                </Badge>
              </div>
            </div>

            <Link
              href={`/export?year=${year}&month=${month}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            >
              Préparer le pack comptable
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Dernières opérations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Derniers Rapports Z</CardTitle>
              <CardDescription>Clôtures journalières récentes</CardDescription>
            </div>
            <Link
              href="/caisse"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Voir tout
            </Link>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            {overview.cashRegisters.slice(0, 5).map((reg) => (
              <div
                key={reg.id}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDateFR(reg.register_date)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Esp. {formatMAD(reg.cash_sales, false)} • TPE{" "}
                    {formatMAD(reg.card_sales, false)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatMAD(reg.total_revenue)}
                  </p>
                  <Badge
                    variant={reg.status === "validated" ? "emerald" : "amber"}
                    className="mt-0.5 text-[10px]"
                  >
                    {reg.status === "validated" ? "Validé" : "Brouillon"}
                  </Badge>
                </div>
              </div>
            ))}
            {overview.cashRegisters.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">
                Aucune caisse saisie pour cette période.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Derniers Justificatifs Fournisseurs</CardTitle>
              <CardDescription>Achats et frais généraux</CardDescription>
            </div>
            <Link
              href="/justificatifs"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Voir tout
            </Link>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            {overview.expenses.slice(0, 5).map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 pr-3">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {exp.supplier_name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatDateFR(exp.expense_date)} • {exp.category} •{" "}
                    {exp.payment_method}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatMAD(exp.amount_ttc)}
                  </p>
                  <Badge
                    variant={exp.file_path ? "emerald" : "red"}
                    className="mt-0.5 text-[10px]"
                  >
                    {exp.file_path ? "Pièce jointe" : "Justificatif manquant"}
                  </Badge>
                </div>
              </div>
            ))}
            {overview.expenses.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">
                Aucune dépense enregistrée pour cette période.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
