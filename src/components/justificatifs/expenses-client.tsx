"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Camera,
  Plus,
  Eye,
  Trash2,
  CheckCircle2,
  Upload,
  Filter,
  Loader2,
  FileWarning,
  Search,
  Sparkles,
  ScanText,
  RefreshCw,
} from "lucide-react";
import {
  attachExpenseFileAction,
  createExpenseReceiptAction,
  deleteExpenseReceiptAction,
  validateExpenseReceiptAction,
} from "@/app/actions/expenses";
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
import {
  parseReceiptOcrText,
  type OcrExtractedFields,
} from "@/lib/ocr-parser";
import {
  cn,
  formatDateFR,
  formatMAD,
  MOROCCAN_SUPPLIERS_PRESETS,
} from "@/lib/utils";
import type {
  ExpenseCategory,
  ExpenseReceipt,
  UserRole,
} from "@/types/database";

interface ExpensesClientProps {
  expenses: ExpenseReceipt[];
  year: number;
  month: number;
  role: UserRole;
  openCreateInitially?: boolean;
}

const CATEGORIES: ExpenseCategory[] = [
  "Marchandises/Food",
  "Boissons",
  "Énergie/Eau",
  "Entretien",
  "Autre",
];

export function ExpensesClient({
  expenses,
  year,
  month,
  role,
  openCreateInitially = false,
}: ExpensesClientProps) {
  const router = useRouter();
  const canCreate = role === "admin" || role === "manager";
  const canValidate = role === "admin";

  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(
    openCreateInitially && canCreate
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [previewFile, setPreviewFile] =
    React.useState<PreviewFilePayload | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);

  const [supplierName, setSupplierName] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState(todayIso);
  const [category, setCategory] = React.useState<ExpenseCategory>(
    "Marchandises/Food"
  );
  const [amountTtc, setAmountTtc] = React.useState("");
  const [vatRate, setVatRate] = React.useState("20");
  const [paymentMethod, setPaymentMethod] = React.useState("Espèces");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [supplierIce, setSupplierIce] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState<string | null>(
    null
  );

  // États OCR Tesseract.js
  const [ocrStatus, setOcrStatus] = React.useState<
    "idle" | "scanning" | "done" | "pdf" | "error"
  >("idle");
  const [ocrProgress, setOcrProgress] = React.useState(0);
  const [ocrRawText, setOcrRawText] = React.useState("");
  const [showRawOcr, setShowRawOcr] = React.useState(false);
  const [detectedFields, setDetectedFields] = React.useState<
    Set<OcrExtractedFields["detectedFieldKeys"][number]>
  >(new Set());
  const ocrRunIdRef = React.useRef(0);

  const resetFormFields = React.useCallback(() => {
    ocrRunIdRef.current += 1;
    setSupplierName("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setCategory("Marchandises/Food");
    setAmountTtc("");
    setVatRate("20");
    setPaymentMethod("Espèces");
    setReferenceNumber("");
    setSupplierIce("");
    setNotes("");
    setSelectedFile(null);
    setOcrStatus("idle");
    setOcrProgress(0);
    setOcrRawText("");
    setShowRawOcr(false);
    setDetectedFields(new Set());
  }, []);

  const runOcrScan = React.useCallback(async (file: File) => {
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name);

    if (!isImage) {
      setOcrStatus(
        file.type === "application/pdf" || /\.pdf$/i.test(file.name)
          ? "pdf"
          : "idle"
      );
      setOcrProgress(0);
      setOcrRawText("");
      setDetectedFields(new Set());
      return;
    }

    const runId = ++ocrRunIdRef.current;
    setOcrStatus("scanning");
    setOcrProgress(5);
    setOcrRawText("");
    setDetectedFields(new Set());

    let worker: Awaited<
      ReturnType<typeof import("tesseract.js")["createWorker"]>
    > | null = null;

    try {
      const { createWorker } = await import("tesseract.js");
      if (ocrRunIdRef.current !== runId) return;

      worker = await createWorker("fra+eng", 1, {
        logger: (m) => {
          if (ocrRunIdRef.current !== runId) return;
          if (m.status === "recognizing text") {
            setOcrProgress(Math.max(10, Math.round(m.progress * 100)));
          } else if (m.status === "loading language traineddata") {
            setOcrProgress((prev) => Math.max(prev, Math.round(m.progress * 30)));
          }
        },
      });

      if (ocrRunIdRef.current !== runId) return;

      const result = await worker.recognize(file);
      if (ocrRunIdRef.current !== runId) return;

      const text = result.data.text ?? "";
      setOcrRawText(text.trim());

      const parsed = parseReceiptOcrText(text);
      if (parsed.supplierName) setSupplierName(parsed.supplierName);
      if (parsed.amountTtc) setAmountTtc(parsed.amountTtc);
      if (parsed.vatRate) setVatRate(parsed.vatRate);
      if (parsed.expenseDate) setExpenseDate(parsed.expenseDate);
      if (parsed.supplierIce) setSupplierIce(parsed.supplierIce);
      if (parsed.referenceNumber) setReferenceNumber(parsed.referenceNumber);
      if (parsed.category) setCategory(parsed.category);

      setDetectedFields(new Set(parsed.detectedFieldKeys));
      setOcrProgress(100);
      setOcrStatus("done");

      if (parsed.detectedFieldKeys.length > 0) {
        toast.success(
          `OCR terminé : ${parsed.detectedFieldKeys.length} champ(s) pré-rempli(s).`
        );
      } else {
        toast.info(
          "Image lue par OCR, veuillez compléter manuellement les champs manquants."
        );
      }
    } catch {
      if (ocrRunIdRef.current !== runId) return;
      setOcrStatus("error");
      toast.error(
        "L'analyse OCR n'a pas pu lire cette image. Vous pouvez saisir les champs manuellement."
      );
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // ignore worker cleanup error
        }
      }
    }
  }, []);

  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      void runOcrScan(file);
    } else {
      setOcrStatus("idle");
      setOcrProgress(0);
      setOcrRawText("");
      setDetectedFields(new Set());
    }
  };

  React.useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setLocalPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const filtered = expenses.filter((e) => {
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.supplier_name.toLowerCase().includes(q) ||
        (e.reference_number ?? "").toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalTtc = filtered.reduce((s, e) => s + Number(e.amount_ttc), 0);
  const missingCount = filtered.filter((e) => !e.file_path).length;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("supplier_name", supplierName);
      formData.set("expense_date", expenseDate);
      formData.set("category", category);
      formData.set("amount_ttc", amountTtc);
      formData.set("vat_rate", vatRate);
      formData.set("payment_method", paymentMethod);
      formData.set("reference_number", referenceNumber);
      formData.set("supplier_ice", supplierIce);
      formData.set("notes", notes);
      const res = await createExpenseReceiptAction(formData);
      if (!res.success) {
        toast.error(res.error ?? "Impossible d'enregistrer le justificatif.");
      } else {
        toast.success("Justificatif fournisseur enregistré.");
        setModalOpen(false);
        resetFormFields();
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAttach = async (id: string, file: File) => {
    const fd = new FormData();
    fd.set("receipt_file", file);
    const res = await attachExpenseFileAction(id, fd);
    if (!res.success) toast.error(res.error ?? "Échec du téléversement.");
    else {
      toast.success("Justificatif attaché avec succès.");
      router.refresh();
    }
  };

  const handleValidate = async (id: string) => {
    const res = await validateExpenseReceiptAction(id);
    if (!res.success) toast.error(res.error ?? "Erreur de validation.");
    else {
      toast.success("Dépense validée.");
      router.refresh();
    }
  };

  const handleDelete = async (exp: ExpenseReceipt) => {
    if (
      !window.confirm(
        `Supprimer la dépense "${exp.supplier_name}" du ${formatDateFR(
          exp.expense_date
        )} ?`
      )
    ) {
      return;
    }
    const res = await deleteExpenseReceiptAction(exp.id);
    if (!res.success) toast.error(res.error ?? "Suppression impossible.");
    else {
      toast.success("Justificatif supprimé.");
      router.refresh();
    }
  };

  const fieldHighlightClass = (
    key: OcrExtractedFields["detectedFieldKeys"][number]
  ) =>
    detectedFields.has(key)
      ? "border-emerald-400 bg-emerald-50/30 ring-2 ring-emerald-500/20"
      : "";

  const ocrFieldBadge = (
    key: OcrExtractedFields["detectedFieldKeys"][number]
  ) =>
    detectedFields.has(key) ? (
      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
        <Sparkles className="h-2.5 w-2.5" />
        OCR
      </span>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Justificatifs &amp; Dépenses Fournisseurs
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Coffre-fort numérique des factures d&apos;achats, bons de livraison et
            frais généraux.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <MonthSelector year={year} month={month} />

          {canCreate && (
            <Button
              variant="primary"
              onClick={() => {
                resetFormFields();
                setModalOpen(true);
              }}
            >
              <Camera className="h-4 w-4" />
              Scanner / Ajouter
            </Button>
          )}
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-500">
              Total Achats &amp; Dépenses TTC
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
              {formatMAD(totalTtc)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-500">
              Nombre de pièces
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
              {filtered.length} dépense(s)
            </p>
          </CardContent>
        </Card>
        <Card
          className={
            missingCount > 0
              ? "border-amber-200 bg-amber-50/40"
              : "border-emerald-200 bg-emerald-50/30"
          }
        >
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-slate-600">
              Pièces manquantes à scanner
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
              {missingCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 w-52 text-xs"
            aria-label="Filtrer par catégorie"
          >
            <option value="all">Toutes les catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Rechercher fournisseur, réf..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Tableau Desktop */}
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Paiement</th>
                <th className="px-4 py-3 text-right">Montant TTC</th>
                <th className="px-4 py-3 text-center">Justificatif</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((exp) => {
                const canDeleteRow =
                  role === "admin" ||
                  (role === "manager" && exp.status === "recorded");

                return (
                  <tr
                    key={exp.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {formatDateFR(exp.expense_date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {exp.supplier_name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {exp.reference_number
                          ? `Réf : ${exp.reference_number}`
                          : "Sans réf"}
                        {exp.supplier_ice ? ` • ICE ${exp.supplier_ice}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="slate">{exp.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {exp.payment_method}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                      {formatMAD(exp.amount_ttc)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {exp.file_signed_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewFile({
                              url: exp.file_signed_url!,
                              title: `${exp.supplier_name} — ${formatMAD(
                                exp.amount_ttc
                              )}`,
                              subtitle: `${formatDateFR(
                                exp.expense_date
                              )} • ${exp.category}`,
                              mimeType: exp.file_mime_type,
                              fileName: exp.file_name,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Aperçu
                        </button>
                      ) : canCreate ? (
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100">
                          <Upload className="h-3 w-3" />
                          Joindre
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleQuickAttach(exp.id, f);
                            }}
                          />
                        </label>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-600">
                          <FileWarning className="h-3.5 w-3.5" />
                          Manquant
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          exp.status === "validated" ? "emerald" : "indigo"
                        }
                      >
                        {exp.status === "validated" ? "Validé" : "Enregistré"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canValidate && exp.status === "recorded" && (
                          <button
                            type="button"
                            onClick={() => handleValidate(exp.id)}
                            title="Valider la pièce"
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {canDeleteRow && (
                          <button
                            type="button"
                            onClick={() => handleDelete(exp)}
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
                    colSpan={8}
                    className="px-4 py-12 text-center text-xs text-slate-500"
                  >
                    Aucun justificatif fournisseur pour cette sélection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cartes Mobile */}
      <div className="space-y-3 md:hidden">
        {filtered.map((exp) => {
          const canDeleteRow =
            role === "admin" ||
            (role === "manager" && exp.status === "recorded");

          return (
            <Card key={exp.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {exp.supplier_name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatDateFR(exp.expense_date)} • {exp.category} •{" "}
                      {exp.payment_method}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {formatMAD(exp.amount_ttc)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge
                    variant={exp.status === "validated" ? "emerald" : "indigo"}
                  >
                    {exp.status === "validated" ? "Validé" : "Enregistré"}
                  </Badge>

                  <div className="flex items-center gap-1.5">
                    {exp.file_signed_url ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPreviewFile({
                            url: exp.file_signed_url!,
                            title: `${exp.supplier_name} — ${formatMAD(
                              exp.amount_ttc
                            )}`,
                            mimeType: exp.file_mime_type,
                            fileName: exp.file_name,
                          })
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir pièce
                      </Button>
                    ) : canCreate ? (
                      <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-amber-100 px-2.5 text-xs font-medium text-amber-900">
                        <Camera className="h-3.5 w-3.5" />
                        Prendre photo
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleQuickAttach(exp.id, f);
                          }}
                        />
                      </label>
                    ) : null}

                    {canValidate && exp.status === "recorded" && (
                      <Button
                        type="button"
                        variant="emerald"
                        size="sm"
                        onClick={() => handleValidate(exp.id)}
                      >
                        Valider
                      </Button>
                    )}

                    {canDeleteRow && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(exp)}
                        className="text-red-600"
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
              Aucun justificatif fournisseur pour cette sélection.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Ajout Justificatif Mobile-First */}
      <Modal
        open={modalOpen}
        onClose={() => {
          ocrRunIdRef.current += 1;
          setModalOpen(false);
        }}
        title="Scanner / Ajouter un justificatif fournisseur"
        description="Photographiez la facture ou importez une image : l'OCR pré-remplit automatiquement les champs."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Capture Caméra / Fichier optimisée Mobile */}
          <div className="space-y-2">
            <Label htmlFor="receipt_file">
              Photo de la facture ou document PDF
            </Label>
            <label
              htmlFor="receipt_file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-5 text-center transition-colors hover:bg-indigo-50"
            >
              {localPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={localPreviewUrl}
                  alt="Aperçu facture"
                  className="max-h-40 rounded-lg object-contain shadow-sm"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <Camera className="h-5 w-5" />
                </div>
              )}
              <div className="text-xs">
                <p className="font-semibold text-indigo-950">
                  {selectedFile
                    ? selectedFile.name
                    : "Ouvrir l'appareil photo ou choisir un fichier"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  JPG, PNG, WEBP (analyse OCR auto) ou PDF — max 15 Mo
                </p>
              </div>
              <input
                id="receipt_file"
                name="receipt_file"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={(e) =>
                  handleFileSelected(e.target.files?.[0] ?? null)
                }
              />
            </label>

            {/* Statut et progression OCR en direct */}
            {ocrStatus === "scanning" && (
              <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/80 p-3">
                <div className="flex items-center justify-between text-xs font-medium text-indigo-900">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    Analyse OCR en cours... {ocrProgress}%
                  </span>
                  <span className="font-mono text-[11px] text-indigo-600">
                    fra+eng
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-200/70">
                  <div
                    style={{ width: `${ocrProgress}%` }}
                    className="h-full bg-indigo-600 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {ocrStatus === "done" && (
              <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Extraction OCR terminée — vérifiez les champs pré-remplis
                  </span>
                  <div className="flex items-center gap-2">
                    {ocrRawText && (
                      <button
                        type="button"
                        onClick={() => setShowRawOcr((v) => !v)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"
                      >
                        <ScanText className="h-3 w-3" />
                        {showRawOcr ? "Masquer texte" : "Voir texte"}
                      </button>
                    )}
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => void runOcrScan(selectedFile)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:underline"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Relancer
                      </button>
                    )}
                  </div>
                </div>
                {showRawOcr && ocrRawText && (
                  <pre className="max-h-28 overflow-auto rounded-lg border border-emerald-200/80 bg-white p-2 font-mono text-[10px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {ocrRawText}
                  </pre>
                )}
              </div>
            )}

            {ocrStatus === "pdf" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                Document PDF importé — complétez les champs ci-dessous
                manuellement.
              </div>
            )}

            {ocrStatus === "error" && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                <span>
                  Lecture OCR impossible sur cette image. Saisie manuelle active.
                </span>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => void runOcrScan(selectedFile)}
                    className="font-semibold underline"
                  >
                    Réessayer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Fournisseur + suggestions rapides */}
          <div className="space-y-2">
            <Label htmlFor="supplier_name">
              Fournisseur *{ocrFieldBadge("supplier_name")}
            </Label>
            <Input
              id="supplier_name"
              required
              placeholder="Ex: Metro Maroc"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className={fieldHighlightClass("supplier_name")}
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {MOROCCAN_SUPPLIERS_PRESETS.slice(0, 6).map((sup) => (
                <button
                  key={sup}
                  type="button"
                  onClick={() => setSupplierName(sup)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  + {sup}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="expense_date">
                Date de la pièce *{ocrFieldBadge("expense_date")}
              </Label>
              <Input
                id="expense_date"
                name="expense_date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className={fieldHighlightClass("expense_date")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">
                Catégorie *{ocrFieldBadge("category")}
              </Label>
              <Select
                id="category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className={fieldHighlightClass("category")}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount_ttc">
                Montant TTC (MAD) *{ocrFieldBadge("amount_ttc")}
              </Label>
              <Input
                id="amount_ttc"
                name="amount_ttc"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amountTtc}
                onChange={(e) => setAmountTtc(e.target.value)}
                className={cn("tabular-nums", fieldHighlightClass("amount_ttc"))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vat_rate">
                Taux de TVA (%){ocrFieldBadge("vat_rate")}
              </Label>
              <Select
                id="vat_rate"
                name="vat_rate"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className={fieldHighlightClass("vat_rate")}
              >
                <option value="20">20% (Standard / Boissons)</option>
                <option value="14">14% (Énergie / Transport)</option>
                <option value="10">10% (Restauration / Eau)</option>
                <option value="7">7% (Produits laitiers / Sucre)</option>
                <option value="0">0% (Exonéré / Marché de Gros)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment_method">Mode de paiement *</Label>
              <Select
                id="payment_method"
                name="payment_method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Espèces">Espèces</option>
                <option value="Virement">Virement</option>
                <option value="Chèque">Chèque</option>
                <option value="Carte">Carte</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reference_number">
                N° Facture / BL{ocrFieldBadge("reference_number")}
              </Label>
              <Input
                id="reference_number"
                name="reference_number"
                placeholder="Ex: BL-2026-4412"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className={fieldHighlightClass("reference_number")}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="supplier_ice">
                ICE Fournisseur (optionnel){ocrFieldBadge("supplier_ice")}
              </Label>
              <Input
                id="supplier_ice"
                name="supplier_ice"
                maxLength={15}
                placeholder="15 chiffres"
                value={supplierIce}
                onChange={(e) => setSupplierIce(e.target.value)}
                className={cn("font-mono", fieldHighlightClass("supplier_ice"))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Détail des marchandises ou remarque pour le comptable..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                ocrRunIdRef.current += 1;
                setModalOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || ocrStatus === "scanning"}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Enregistrer la pièce
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
