"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  CheckCircle2,
  Trash2,
  Eye,
  Upload,
  Camera,
  Edit3,
  AlertCircle,
  Loader2,
  Filter,
} from "lucide-react";
import {
  deleteCashRegisterAction,
  upsertCashRegisterAction,
  validateCashRegisterAction,
} from "@/app/actions/cash-register";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MonthSelector } from "@/components/shared/month-selector";
import {
  FilePreviewModal,
  type PreviewFilePayload,
} from "@/components/shared/file-preview-modal";
import { formatDateFR, formatMAD } from "@/lib/utils";
import type { DailyCashRegister, UserRole } from "@/types/database";

interface CashRegisterClientProps {
  registers: DailyCashRegister[];
  year: number;
  month: number;
  role: UserRole;
  openCreateInitially?: boolean;
}

export function CashRegisterClient({
  registers,
  year,
  month,
  role,
  openCreateInitially = false,
}: CashRegisterClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [modalOpen, setModalOpen] = React.useState(openCreateInitially);
  const [editing, setEditing] = React.useState<DailyCashRegister | null>(null);
  const [previewFile, setPreviewFile] =
    React.useState<PreviewFilePayload | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Champs contrôlés pour calcul live de l'écart de caisse
  const todayIso = new Date().toISOString().slice(0, 10);
  const [registerDate, setRegisterDate] = React.useState(todayIso);
  const [openingBalance, setOpeningBalance] = React.useState("1500");
  const [cashSales, setCashSales] = React.useState("");
  const [cardSales, setCardSales] = React.useState("");
  const [deliverySales, setDeliverySales] = React.useState("0");
  const [cashOutflows, setCashOutflows] = React.useState("0");
  const [countedCash, setCountedCash] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saveAsValidated, setSaveAsValidated] = React.useState(false);
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(
    null
  );

  const canCreate = role === "admin" || role === "manager";
  const canValidate = role === "admin";

  const openNewModal = () => {
    setEditing(null);
    setRegisterDate(todayIso);
    setOpeningBalance("1500");
    setCashSales("");
    setCardSales("");
    setDeliverySales("0");
    setCashOutflows("0");
    setCountedCash("");
    setNotes("");
    setSaveAsValidated(false);
    setSelectedFileName(null);
    setModalOpen(true);
  };

  const openEditModal = (reg: DailyCashRegister) => {
    setEditing(reg);
    setRegisterDate(reg.register_date);
    setOpeningBalance(String(reg.opening_balance));
    setCashSales(String(reg.cash_sales));
    setCardSales(String(reg.card_sales));
    setDeliverySales(String(reg.delivery_other_sales));
    setCashOutflows(String(reg.cash_outflows));
    setCountedCash(String(reg.counted_cash));
    setNotes(reg.notes ?? "");
    setSaveAsValidated(reg.status === "validated");
    setSelectedFileName(reg.z_ticket_name);
    setModalOpen(true);
  };

  // Calculs automatiques en temps réel
  const nOpening = Number(openingBalance) || 0;
  const nCash = Number(cashSales) || 0;
  const nCard = Number(cardSales) || 0;
  const nDeliv = Number(deliverySales) || 0;
  const nOutflows = Number(cashOutflows) || 0;
  const expectedCash = nOpening + nCash - nOutflows;
  const nCounted =
    countedCash === "" ? expectedCash : Number(countedCash) || 0;
  const liveVariance = Math.round((nCounted - expectedCash) * 100) / 100;
  const liveTotalRevenue = Math.round((nCash + nCard + nDeliv) * 100) / 100;

  const filtered = registers.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  );

  const totals = filtered.reduce(
    (acc, r) => ({
      revenue: acc.revenue + Number(r.total_revenue),
      cash: acc.cash + Number(r.cash_sales),
      card: acc.card + Number(r.card_sales),
      outflows: acc.outflows + Number(r.cash_outflows),
      variance: acc.variance + Number(r.cash_variance),
    }),
    { revenue: 0, cash: 0, card: 0, outflows: 0, variance: 0 }
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      if (editing) formData.set("id", editing.id);
      if (!formData.get("counted_cash")) {
        formData.set("counted_cash", String(nCounted));
      }
      formData.set(
        "status",
        saveAsValidated && canValidate ? "validated" : "draft"
      );

      const res = await upsertCashRegisterAction(formData);
      if (!res.success) {
        toast.error(res.error ?? "Erreur lors de l'enregistrement.");
      } else {
        toast.success(
          editing
            ? "État de caisse mis à jour."
            : "Rapport Z journalier enregistré."
        );
        setModalOpen(false);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidate = async (id: string) => {
    const res = await validateCashRegisterAction(id);
    if (!res.success) toast.error(res.error ?? "Erreur de validation.");
    else {
      toast.success("Journée de caisse validée et verrouillée.");
      router.refresh();
    }
  };

  const handleDelete = async (reg: DailyCashRegister) => {
    if (
      !window.confirm(
        `Supprimer la saisie de caisse du ${formatDateFR(reg.register_date)} ?`
      )
    ) {
      return;
    }
    const res = await deleteCashRegisterAction(reg.id);
    if (!res.success) toast.error(res.error ?? "Suppression impossible.");
    else {
      toast.success("État de caisse supprimé.");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Recettes Journalières &amp; États de Caisse
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Clôture quotidienne (Rapport Z), contrôle des espèces et suivi des
            écarts de caisse.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <MonthSelector year={year} month={month} />

          {canCreate && (
            <Button variant="primary" onClick={openNewModal}>
              <Plus className="h-4 w-4" />
              Saisir Caisse du Jour
            </Button>
          )}
        </div>
      </div>

      {/* Synthèse du mois filtré */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-500">
              Total CA Période
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
              {formatMAD(totals.revenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-500">
              Total Espèces
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-700 tabular-nums">
              {formatMAD(totals.cash)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-500">
              Total TPE (Carte)
            </p>
            <p className="mt-1 text-lg font-bold text-indigo-700 tabular-nums">
              {formatMAD(totals.card)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-500">
              Cumul Écarts Caisse
            </p>
            <p
              className={`mt-1 text-lg font-bold tabular-nums ${
                totals.variance === 0
                  ? "text-emerald-700"
                  : totals.variance < 0
                  ? "text-red-600"
                  : "text-amber-700"
              }`}
            >
              {totals.variance > 0 ? "+" : ""}
              {formatMAD(totals.variance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-44 text-xs"
            aria-label="Filtrer par statut"
          >
            <option value="all">Tous les statuts ({registers.length})</option>
            <option value="draft">Brouillon uniquement</option>
            <option value="validated">Validé uniquement</option>
          </Select>
        </div>

        <p className="text-xs text-slate-500">
          {filtered.length} clôture(s) affichée(s)
        </p>
      </div>

      {/* Tableau Desktop */}
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Espèces</th>
                <th className="px-4 py-3 text-right">TPE (Carte)</th>
                <th className="px-4 py-3 text-right">Livraison</th>
                <th className="px-4 py-3 text-right">Sorties</th>
                <th className="px-4 py-3 text-right">Total CA</th>
                <th className="px-4 py-3 text-right">Écart</th>
                <th className="px-4 py-3 text-center">Ticket Z</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((reg) => {
                const canEditRow =
                  canCreate && (reg.status === "draft" || canValidate);
                const canDeleteRow =
                  role === "admin" ||
                  (role === "manager" && reg.status === "draft");

                return (
                  <tr
                    key={reg.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatDateFR(reg.register_date)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatMAD(reg.cash_sales, false)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatMAD(reg.card_sales, false)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {formatMAD(reg.delivery_other_sales, false)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-600">
                      -{formatMAD(reg.cash_outflows, false)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                      {formatMAD(reg.total_revenue)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums ${
                        Number(reg.cash_variance) === 0
                          ? "text-emerald-600"
                          : Number(reg.cash_variance) < 0
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    >
                      {Number(reg.cash_variance) > 0 ? "+" : ""}
                      {Number(reg.cash_variance).toFixed(2)} MAD
                    </td>
                    <td className="px-4 py-3 text-center">
                      {reg.z_ticket_signed_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewFile({
                              url: reg.z_ticket_signed_url!,
                              title: `Ticket Z — ${formatDateFR(
                                reg.register_date
                              )}`,
                              fileName: reg.z_ticket_name,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Voir
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-600">
                          Manquant
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          reg.status === "validated" ? "emerald" : "amber"
                        }
                      >
                        {reg.status === "validated" ? "Validé" : "Brouillon"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canValidate && reg.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => handleValidate(reg.id)}
                            title="Valider la journée"
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {canEditRow && (
                          <button
                            type="button"
                            onClick={() => openEditModal(reg)}
                            title="Modifier"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                        {canDeleteRow && (
                          <button
                            type="button"
                            onClick={() => handleDelete(reg)}
                            title="Supprimer"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-xs text-slate-500"
                  >
                    Aucun état de caisse trouvé pour cette sélection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cartes Mobile */}
      <div className="space-y-3 md:hidden">
        {filtered.map((reg) => {
          const canEditRow =
            canCreate && (reg.status === "draft" || canValidate);
          const canDeleteRow =
            role === "admin" || (role === "manager" && reg.status === "draft");

          return (
            <Card key={reg.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {formatDateFR(reg.register_date)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Total CA :{" "}
                      <span className="font-semibold text-slate-900">
                        {formatMAD(reg.total_revenue)}
                      </span>
                    </p>
                  </div>
                  <Badge
                    variant={reg.status === "validated" ? "emerald" : "amber"}
                  >
                    {reg.status === "validated" ? "Validé" : "Brouillon"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs tabular-nums">
                  <div>
                    <p className="text-[10px] text-slate-500">Espèces</p>
                    <p className="font-semibold text-slate-800">
                      {formatMAD(reg.cash_sales, false)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">TPE</p>
                    <p className="font-semibold text-indigo-700">
                      {formatMAD(reg.card_sales, false)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Écart</p>
                    <p
                      className={`font-semibold ${
                        Number(reg.cash_variance) === 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {Number(reg.cash_variance) > 0 ? "+" : ""}
                      {Number(reg.cash_variance).toFixed(0)} MAD
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {reg.z_ticket_signed_url ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewFile({
                          url: reg.z_ticket_signed_url!,
                          title: `Ticket Z — ${formatDateFR(reg.register_date)}`,
                          fileName: reg.z_ticket_name,
                        })
                      }
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ticket Z
                    </Button>
                  ) : (
                    <span className="text-xs font-medium text-amber-600">
                      Ticket Z manquant
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    {canValidate && reg.status === "draft" && (
                      <Button
                        type="button"
                        variant="emerald"
                        size="sm"
                        onClick={() => handleValidate(reg.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Valider
                      </Button>
                    )}
                    {canEditRow && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(reg)}
                      >
                        Modifier
                      </Button>
                    )}
                    {canDeleteRow && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(reg)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-xs text-slate-500">
              Aucun état de caisse trouvé pour cette sélection.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Saisie / Modification Rapport Z */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? `Modifier caisse du ${formatDateFR(editing.register_date)}`
            : "Saisir l'état de caisse (Rapport Z)"
        }
        description="Renseignez les encaissements du jour et joignez la photo ou le PDF du Ticket Z."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="register_date">Date de clôture *</Label>
              <Input
                id="register_date"
                name="register_date"
                type="date"
                required
                value={registerDate}
                onChange={(e) => setRegisterDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opening_balance">
                Fond de caisse initial (MAD) *
              </Label>
              <Input
                id="opening_balance"
                name="opening_balance"
                type="number"
                step="0.01"
                min="0"
                required
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cash_sales">Recette Espèces (MAD) *</Label>
              <Input
                id="cash_sales"
                name="cash_sales"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={cashSales}
                onChange={(e) => setCashSales(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card_sales">Recette TPE / Carte (MAD) *</Label>
              <Input
                id="card_sales"
                name="card_sales"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={cardSales}
                onChange={(e) => setCardSales(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delivery_other_sales">
                Ventes Livraison / Autres (MAD)
              </Label>
              <Input
                id="delivery_other_sales"
                name="delivery_other_sales"
                type="number"
                step="0.01"
                min="0"
                value={deliverySales}
                onChange={(e) => setDeliverySales(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cash_outflows">
                Sorties de caisse (petites dépenses MAD)
              </Label>
              <Input
                id="cash_outflows"
                name="cash_outflows"
                type="number"
                step="0.01"
                min="0"
                value={cashOutflows}
                onChange={(e) => setCashOutflows(e.target.value)}
              />
            </div>
          </div>

          {/* Calcul en direct */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="counted_cash">
                  Espèces réelles comptées en tiroir (MAD)
                </Label>
                <Input
                  id="counted_cash"
                  name="counted_cash"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={expectedCash.toFixed(2)}
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                />
                <p className="text-[11px] text-slate-500">
                  Attendu théorique :{" "}
                  <span className="font-mono font-semibold text-slate-800">
                    {formatMAD(expectedCash)}
                  </span>
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Total CA du jour</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatMAD(liveTotalRevenue)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-xs font-medium text-slate-700">
                    Écart de caisse calculé
                  </span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      liveVariance === 0
                        ? "text-emerald-600"
                        : liveVariance < 0
                        ? "text-red-600"
                        : "text-amber-600"
                    }`}
                  >
                    {liveVariance > 0 ? "+" : ""}
                    {formatMAD(liveVariance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Ticket Z */}
          <div className="space-y-1.5">
            <Label htmlFor="z_ticket_file">
              Ticket Z (Photo ou PDF)
            </Label>
            <label
              htmlFor="z_ticket_file"
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-3 text-xs transition-colors hover:border-indigo-400 hover:bg-indigo-50/30"
            >
              <div className="flex items-center gap-2.5 text-slate-600">
                <Camera className="h-4 w-4 text-indigo-600" />
                <span className="truncate font-medium">
                  {selectedFileName
                    ? selectedFileName
                    : "Prendre une photo ou importer le Ticket Z"}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm border border-slate-200">
                <Upload className="h-3 w-3" />
                Parcourir
              </span>
              <input
                id="z_ticket_file"
                name="z_ticket_file"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={(e) =>
                  setSelectedFileName(e.target.files?.[0]?.name ?? null)
                }
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observations / Détail sorties</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Ex: Achat glaçons / menthe en espèces, incident TPE..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {canValidate ? (
            <label className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-xs text-emerald-900 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsValidated}
                onChange={(e) => setSaveAsValidated(e.target.checked)}
                className="h-4 w-4 rounded border-emerald-300 text-emerald-600"
              />
              <span>
                Valider et verrouiller immédiatement cette clôture (statut{" "}
                <strong>Validé</strong>)
              </span>
            </label>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Enregistrée en <strong>Brouillon</strong> jusqu&apos;à validation
                par l&apos;Admin / Gérant.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Mettre à jour" : "Enregistrer la caisse"}
            </Button>
          </div>
        </form>
      </Modal>

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
