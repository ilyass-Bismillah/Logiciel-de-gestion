"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  FolderArchive,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSelector } from "@/components/shared/month-selector";
import { formatMAD, formatMonthYearFR } from "@/lib/utils";

interface ExportCenterProps {
  year: number;
  month: number;
  daysInMonth: number;
  cashDaysCount: number;
  draftCashCount: number;
  missingZTickets: number;
  expensesCount: number;
  missingReceiptFiles: number;
  invoicesCount: number;
  pendingInvoicesCount: number;
  totalRevenue: number;
  totalExpenses: number;
}

export function ExportCenterClient(props: ExportCenterProps) {
  const [downloadingExcel, setDownloadingExcel] = React.useState(false);
  const [downloadingZip, setDownloadingZip] = React.useState(false);

  const periodLabel = formatMonthYearFR(props.year, props.month);
  const totalMissingDocs = props.missingZTickets + props.missingReceiptFiles;
  const isCleanClosure =
    totalMissingDocs === 0 &&
    props.draftCashCount === 0 &&
    props.cashDaysCount > 0;

  const triggerDownload = async (
    endpoint: string,
    filename: string,
    setLoading: (v: boolean) => void
  ) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${endpoint}?year=${props.year}&month=${props.month}`
      );
      if (!res.ok) {
        throw new Error("Échec de la génération du fichier.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Téléchargement prêt : ${filename}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'export."
      );
    } finally {
      setLoading(false);
    }
  };

  const mm = String(props.month).padStart(2, "0");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Clôture &amp; Export Comptable Mensuel
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Contrôlez la complétude du dossier de {periodLabel} et exportez le
            pack complet pour votre expert-comptable.
          </p>
        </div>

        <MonthSelector year={props.year} month={props.month} />
      </div>

      {/* Checklist de préparation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Liste de contrôle avant clôture — {periodLabel}</CardTitle>
            <CardDescription>
              Vérification automatique des journées de caisse, factures et
              pièces numérisées.
            </CardDescription>
          </div>
          <Badge variant={isCleanClosure ? "emerald" : "amber"}>
            {isCleanClosure ? "Prêt pour clôture" : "Vérifications requises"}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              {props.cashDaysCount >= props.daysInMonth ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {props.cashDaysCount}/{props.daysInMonth} jours de caisse
                  saisis
                </p>
                <p className="text-xs text-slate-500">
                  {props.draftCashCount} clôture(s) encore en brouillon
                </p>
              </div>
            </div>
            <Link
              href={`/caisse?year=${props.year}&month=${props.month}`}
              className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              Caisse <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              {totalMissingDocs === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-500" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {totalMissingDocs === 0
                    ? "Tous les justificatifs sont joints"
                    : `${totalMissingDocs} justificatif(s) manquant(s)`}
                </p>
                <p className="text-xs text-slate-500">
                  {props.missingReceiptFiles} facture(s) fournisseur •{" "}
                  {props.missingZTickets} ticket(s) Z
                </p>
              </div>
            </div>
            <Link
              href={`/justificatifs?year=${props.year}&month=${props.month}`}
              className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              Pièces <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {props.invoicesCount} facture(s) client B2B émise(s)
                </p>
                <p className="text-xs text-slate-500">
                  {props.pendingInvoicesCount} en attente de règlement
                </p>
              </div>
            </div>
            <Link
              href={`/factures?year=${props.year}&month=${props.month}`}
              className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              Factures <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 tabular-nums">
            <div>
              <p className="text-xs text-slate-500">Volume mensuel synthétisé</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                CA : {formatMAD(props.totalRevenue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Achats TTC</p>
              <p className="mt-0.5 text-sm font-bold text-rose-700">
                {formatMAD(props.totalExpenses)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pack Comptable en 1 Clic */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-emerald-200/80">
          <CardHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <CardTitle className="pt-2">
              Export Excel Comptable (.xlsx)
            </CardTitle>
            <CardDescription>
              Classeur multi-feuilles prêt pour intégration en cabinet comptable
              marocain :
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li>• Onglet 1 : <strong>Récapitulatif</strong> (CA, TVA, Solde caisse)</li>
              <li>• Onglet 2 : <strong>États de Caisse</strong> ({props.cashDaysCount} journées)</li>
              <li>• Onglet 3 : <strong>Factures Clients</strong> ({props.invoicesCount} factures ICE/IF)</li>
              <li>• Onglet 4 : <strong>Achats &amp; Justificatifs</strong> ({props.expensesCount} pièces)</li>
            </ul>

            <Button
              type="button"
              variant="emerald"
              size="lg"
              className="w-full"
              disabled={downloadingExcel}
              onClick={() =>
                triggerDownload(
                  "/api/export/excel",
                  `Tylias_PreComptabilite_${props.year}-${mm}.xlsx`,
                  setDownloadingExcel
                )
              }
            >
              {downloadingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération du classeur...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Télécharger l&apos;Excel (.xlsx)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-indigo-200/80">
          <CardHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <FolderArchive className="h-6 w-6" />
            </div>
            <CardTitle className="pt-2">
              Archive Pièces Justificatives (.zip)
            </CardTitle>
            <CardDescription>
              Regroupe toutes les photos et PDFs du mois, automatiquement
              renommés et classés :
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li>
                • Dossier <code className="rounded bg-slate-100 px-1">01_Factures_Fournisseurs</code> :{" "}
                <span className="font-mono text-[11px]">
                  YYYY-MM-DD_Fournisseur_MontantMAD.ext
                </span>
              </li>
              <li>
                • Dossier <code className="rounded bg-slate-100 px-1">02_Tickets_Z_Caisse</code> :{" "}
                <span className="font-mono text-[11px]">
                  YYYY-MM-DD_TicketZ_Tylias.ext
                </span>
              </li>
              <li>
                • Inclut <strong>{props.expensesCount - props.missingReceiptFiles}</strong> facture(s)
                fournisseur et <strong>{props.cashDaysCount - props.missingZTickets}</strong> ticket(s) Z
              </li>
            </ul>

            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={downloadingZip}
              onClick={() =>
                triggerDownload(
                  "/api/export/zip",
                  `Tylias_Justificatifs_${props.year}-${mm}.zip`,
                  setDownloadingZip
                )
              }
            >
              {downloadingZip ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Compression de l&apos;archive ZIP...
                </>
              ) : (
                <>
                  <FolderArchive className="h-4 w-4" />
                  Télécharger le ZIP des pièces (.zip)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
