"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Printer,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  Building2,
} from "lucide-react";
import {
  deleteInvoiceAction,
  saveClientInvoiceAction,
  updateInvoiceStatusAction,
} from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MonthSelector } from "@/components/shared/month-selector";
import { formatDateFR, formatMAD } from "@/lib/utils";
import type {
  ClientInvoice,
  InvoiceLineItem,
  InvoiceStatus,
  UserRole,
} from "@/types/database";

interface InvoicesClientProps {
  invoices: ClientInvoice[];
  nextInvoiceNumber: string;
  year: number;
  month: number;
  role: UserRole;
  openCreateInitially?: boolean;
}

const EMPTY_ITEM: InvoiceLineItem = {
  description: "",
  quantity: 1,
  unit_price_ht: 0,
  vat_rate: 10,
};

export function InvoicesClient({
  invoices,
  nextInvoiceNumber,
  year,
  month,
  role,
  openCreateInitially = false,
}: InvoicesClientProps) {
  const router = useRouter();
  const canManage = role === "admin";
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [modalOpen, setModalOpen] = React.useState(
    openCreateInitially && canManage
  );
  const [editing, setEditing] = React.useState<ClientInvoice | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const [invoiceNumber, setInvoiceNumber] = React.useState(nextInvoiceNumber);
  const [issueDate, setIssueDate] = React.useState(todayIso);
  const [dueDate, setDueDate] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [clientIce, setClientIce] = React.useState("");
  const [clientIf, setClientIf] = React.useState("");
  const [clientAddress, setClientAddress] = React.useState("");
  const [clientPhone, setClientPhone] = React.useState("");
  const [status, setStatus] = React.useState<InvoiceStatus>("pending");
  const [paymentMethod, setPaymentMethod] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<InvoiceLineItem[]>([
    { ...EMPTY_ITEM },
  ]);

  const openNew = () => {
    setEditing(null);
    setInvoiceNumber(nextInvoiceNumber);
    setIssueDate(todayIso);
    setDueDate("");
    setClientName("");
    setClientIce("");
    setClientIf("");
    setClientAddress("");
    setClientPhone("");
    setStatus("pending");
    setPaymentMethod("");
    setNotes("");
    setItems([{ ...EMPTY_ITEM }]);
    setModalOpen(true);
  };

  const openEdit = (inv: ClientInvoice) => {
    setEditing(inv);
    setInvoiceNumber(inv.invoice_number);
    setIssueDate(inv.issue_date);
    setDueDate(inv.due_date ?? "");
    setClientName(inv.client_name);
    setClientIce(inv.client_ice ?? "");
    setClientIf(inv.client_if ?? "");
    setClientAddress(inv.client_address ?? "");
    setClientPhone(inv.client_phone ?? "");
    setStatus(inv.status);
    setPaymentMethod(inv.payment_method ?? "");
    setNotes(inv.notes ?? "");
    setItems(
      inv.items.length > 0
        ? inv.items.map((it) => ({ ...it }))
        : [{ ...EMPTY_ITEM }]
    );
    setModalOpen(true);
  };

  const updateItem = (
    idx: number,
    field: keyof InvoiceLineItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalHt = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price_ht) || 0),
    0
  );
  const totalTva10 = items
    .filter((it) => Number(it.vat_rate) === 10)
    .reduce(
      (sum, it) =>
        sum + (Number(it.quantity) || 0) * (Number(it.unit_price_ht) || 0) * 0.1,
      0
    );
  const totalTva20 = items
    .filter((it) => Number(it.vat_rate) === 20)
    .reduce(
      (sum, it) =>
        sum + (Number(it.quantity) || 0) * (Number(it.unit_price_ht) || 0) * 0.2,
      0
    );
  const totalTva = totalTva10 + totalTva20;
  const totalTtc = totalHt + totalTva;

  const filtered = invoices.filter((inv) =>
    statusFilter === "all" ? true : inv.status === statusFilter
  );

  const paidSum = filtered
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total_ttc), 0);
  const pendingSum = filtered
    .filter((i) => i.status === "pending")
    .reduce((s, i) => s + Number(i.total_ttc), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await saveClientInvoiceAction({
        id: editing?.id,
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: dueDate || null,
        client_name: clientName,
        client_ice: clientIce || null,
        client_if: clientIf || null,
        client_address: clientAddress || null,
        client_phone: clientPhone || null,
        items: items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price_ht: Number(it.unit_price_ht),
          vat_rate: Number(it.vat_rate) === 20 ? 20 : 10,
        })),
        status,
        payment_method: paymentMethod ? paymentMethod : null,
        notes: notes || null,
      });

      if (!res.success) {
        toast.error(res.error ?? "Erreur lors de l'enregistrement.");
      } else {
        toast.success(
          editing
            ? `Facture ${res.data?.invoice_number} mise à jour.`
            : `Facture ${res.data?.invoice_number} créée.`
        );
        setModalOpen(false);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    inv: ClientInvoice,
    nextStatus: InvoiceStatus
  ) => {
    const res = await updateInvoiceStatusAction(
      inv.id,
      nextStatus,
      nextStatus === "paid" ? inv.payment_method || "Virement" : inv.payment_method
    );
    if (!res.success) toast.error(res.error ?? "Erreur de mise à jour.");
    else {
      toast.success(`Statut facture ${inv.invoice_number} mis à jour.`);
      router.refresh();
    }
  };

  const handleDelete = async (inv: ClientInvoice) => {
    if (!window.confirm(`Supprimer la facture ${inv.invoice_number} ?`)) return;
    const res = await deleteInvoiceAction(inv.id);
    if (!res.success) toast.error(res.error ?? "Suppression impossible.");
    else {
      toast.success("Facture supprimée.");
      router.refresh();
    }
  };

  const statusBadge = (st: InvoiceStatus) => {
    if (st === "paid") return <Badge variant="emerald">Payée</Badge>;
    if (st === "pending") return <Badge variant="indigo">En attente</Badge>;
    return <Badge variant="red">Annulée</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Factures Clients B2B &amp; Groupes
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Facturation officielle avec ICE, IF, TVA 10% / 20% en MAD et
            export PDF prêt pour remise client.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <MonthSelector year={year} month={month} />

          {canManage && (
            <Button variant="primary" onClick={openNew}>
              <Plus className="h-4 w-4" />
              Nouvelle Facture
            </Button>
          )}
        </div>
      </div>

      {/* Résumé facturation */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-500">
              Factures émises (période)
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
              {filtered.length} facture(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-500">
              Encaissé (Payées TTC)
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-700 tabular-nums">
              {formatMAD(paidSum)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-500">
              En attente de règlement
            </p>
            <p className="mt-1 text-lg font-bold text-indigo-700 tabular-nums">
              {formatMAD(pendingSum)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtre */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-48 text-xs"
            aria-label="Filtrer par statut de facture"
          >
            <option value="all">Tous les statuts ({invoices.length})</option>
            <option value="paid">Payée</option>
            <option value="pending">En attente</option>
            <option value="cancelled">Annulée</option>
          </Select>
        </div>
      </div>

      {/* Tableau Desktop */}
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">N° Facture</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Client / ICE</th>
                <th className="px-4 py-3 text-right">Total HT</th>
                <th className="px-4 py-3 text-right">TVA</th>
                <th className="px-4 py-3 text-right">Total TTC</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                    {inv.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatDateFR(inv.issue_date)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {inv.client_name}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      ICE : {inv.client_ice || "Non renseigné"}
                      {inv.client_if ? ` • IF : ${inv.client_if}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatMAD(inv.total_ht, false)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {formatMAD(inv.total_tva, false)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                    {formatMAD(inv.total_ttc)}
                  </td>
                  <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/factures/${inv.id}/imprimer`}
                        title="Imprimer / PDF"
                        className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50"
                      >
                        <Printer className="h-4 w-4" />
                      </Link>
                      {canManage && inv.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(inv, "paid")}
                          title="Marquer comme Payée"
                          className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      {canManage && inv.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(inv, "cancelled")}
                          title="Annuler la facture"
                          className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => openEdit(inv)}
                          title="Modifier"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDelete(inv)}
                          title="Supprimer"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-xs text-slate-500"
                  >
                    Aucune facture client sur cette période.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cartes Mobile */}
      <div className="space-y-3 md:hidden">
        {filtered.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-700">
                    {inv.invoice_number}
                  </span>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {inv.client_name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatDateFR(inv.issue_date)} • ICE{" "}
                    {inv.client_ice || "N/A"}
                  </p>
                </div>
                {statusBadge(inv.status)}
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs tabular-nums">
                <span className="text-slate-600">
                  HT {formatMAD(inv.total_ht, false)} + TVA{" "}
                  {formatMAD(inv.total_tva, false)}
                </span>
                <span className="font-bold text-slate-900">
                  {formatMAD(inv.total_ttc)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link
                  href={`/factures/${inv.id}/imprimer`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 text-xs font-medium text-indigo-700"
                >
                  <Printer className="h-3.5 w-3.5" />
                  PDF / Imprimer
                </Link>
                {canManage && inv.status === "pending" && (
                  <Button
                    type="button"
                    variant="emerald"
                    size="sm"
                    onClick={() => handleStatusChange(inv, "paid")}
                  >
                    Marquer Payée
                  </Button>
                )}
                {canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(inv)}
                  >
                    Modifier
                  </Button>
                )}
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(inv)}
                    className="text-red-600"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-xs text-slate-500">
              Aucune facture client sur cette période.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Création / Édition Facture */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? `Modifier la facture ${editing.invoice_number}`
            : `Nouvelle Facture Client (${nextInvoiceNumber})`
        }
        description="Facture conforme aux exigences fiscales marocaines (ICE, IF, TVA 10% restauration / 20% boissons & services)."
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="invoice_number">N° Facture *</Label>
              <Input
                id="invoice_number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue_date">Date d&apos;émission *</Label>
              <Input
                id="issue_date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Date d&apos;échéance</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <span>Informations Fiscales Client</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="client_name">
                  Raison sociale / Nom du client *
                </Label>
                <Input
                  id="client_name"
                  required
                  placeholder="Ex: Attijari Business Services SARL"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_ice">ICE (15 chiffres)</Label>
                <Input
                  id="client_ice"
                  placeholder="001548923000047"
                  maxLength={15}
                  className="font-mono"
                  value={clientIce}
                  onChange={(e) => setClientIce(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_if">Identifiant Fiscal (IF)</Label>
                <Input
                  id="client_if"
                  placeholder="40219854"
                  className="font-mono"
                  value={clientIf}
                  onChange={(e) => setClientIf(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_address">Adresse</Label>
                <Input
                  id="client_address"
                  placeholder="Boulevard d'Anfa, Casablanca"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_phone">Téléphone</Label>
                <Input
                  id="client_phone"
                  placeholder="+212 5 22 ..."
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Lignes de facturation */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label>Prestations &amp; Lignes de facturation</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="col-span-12 sm:col-span-5">
                    <Label className="text-[11px]">Désignation *</Label>
                    <Input
                      required
                      placeholder="Ex: Déjeuner groupe 20 couverts"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(idx, "description", e.target.value)
                      }
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-[11px]">Qté</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, "quantity", Number(e.target.value))
                      }
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-[11px]">PU HT (MAD)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unit_price_ht}
                      onChange={(e) =>
                        updateItem(idx, "unit_price_ht", Number(e.target.value))
                      }
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-[11px]">TVA</Label>
                    <Select
                      value={item.vat_rate}
                      onChange={(e) =>
                        updateItem(
                          idx,
                          "vat_rate",
                          Number(e.target.value) === 20 ? 20 : 10
                        )
                      }
                      className="mt-1 h-9 text-xs"
                    >
                      <option value={10}>10%</option>
                      <option value={20}>20%</option>
                    </Select>
                  </div>
                  <div className="col-span-1 flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="mb-1 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totaux & Statut */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inv_status">Statut</Label>
                  <Select
                    id="inv_status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                  >
                    <option value="pending">En attente</option>
                    <option value="paid">Payée</option>
                    <option value="cancelled">Annulée</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payment_method">Mode règlement</Label>
                  <Select
                    id="payment_method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="">Non défini</option>
                    <option value="Virement">Virement</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Espèces">Espèces</option>
                    <option value="TPE / Carte">TPE / Carte</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv_notes">Mentions / Bon de commande</Label>
                <Textarea
                  id="inv_notes"
                  rows={2}
                  placeholder="Ex: BC n° 2026-104, règlement à réception..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs tabular-nums">
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Total Hors Taxes (HT)</span>
                  <span className="font-semibold text-slate-900">
                    {formatMAD(totalHt)}
                  </span>
                </div>
                {totalTva10 > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>TVA 10% (Restauration)</span>
                    <span>{formatMAD(totalTva10)}</span>
                  </div>
                )}
                {totalTva20 > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>TVA 20% (Boissons / Services)</span>
                    <span>{formatMAD(totalTva20)}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-bold text-slate-900">
                  Net à payer TTC
                </span>
                <span className="text-lg font-bold text-emerald-700">
                  {formatMAD(totalTtc)}
                </span>
              </div>
            </div>
          </div>

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
              {editing ? "Enregistrer les modifications" : "Créer la facture"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
