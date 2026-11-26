"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateFR, formatMAD, RESTAURANT_DEFAULT_INFO } from "@/lib/utils";
import type { ClientInvoice } from "@/types/database";

export function PrintInvoiceView({ invoice }: { invoice: ClientInvoice }) {
  const tva10 = invoice.items
    .filter((it) => Number(it.vat_rate) === 10)
    .reduce((s, it) => s + it.quantity * it.unit_price_ht * 0.1, 0);
  const tva20 = invoice.items
    .filter((it) => Number(it.vat_rate) === 20)
    .reduce((s, it) => s + it.quantity * it.unit_price_ht * 0.2, 0);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:p-0">
      {/* Barre d'actions hors impression */}
      <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3">
        <Link
          href="/factures"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux factures
        </Link>

        <Button
          type="button"
          variant="primary"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Imprimer / Télécharger PDF
        </Button>
      </div>

      {/* Feuille A4 */}
      <div className="print-invoice-sheet mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        {/* En-tête Émetteur & Facture */}
        <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 sm:flex-row">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-base font-bold text-white">
                T
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {RESTAURANT_DEFAULT_INFO.name}
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  {RESTAURANT_DEFAULT_INFO.legal_name}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-0.5 text-xs text-slate-600">
              <p>{RESTAURANT_DEFAULT_INFO.address}</p>
              <p>{RESTAURANT_DEFAULT_INFO.city}</p>
              <p>Tél : {RESTAURANT_DEFAULT_INFO.phone}</p>
              <p>E-mail : {RESTAURANT_DEFAULT_INFO.email}</p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Facture Officielle
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900">
              {invoice.invoice_number}
            </p>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <p>
                Date d&apos;émission :{" "}
                <strong className="text-slate-900">
                  {formatDateFR(invoice.issue_date)}
                </strong>
              </p>
              {invoice.due_date && (
                <p>
                  Date d&apos;échéance :{" "}
                  <strong className="text-slate-900">
                    {formatDateFR(invoice.due_date)}
                  </strong>
                </p>
              )}
              <div className="pt-1">
                <Badge
                  variant={
                    invoice.status === "paid"
                      ? "emerald"
                      : invoice.status === "pending"
                      ? "indigo"
                      : "red"
                  }
                >
                  {invoice.status === "paid"
                    ? "PAYÉE"
                    : invoice.status === "pending"
                    ? "EN ATTENTE DE RÈGLEMENT"
                    : "ANNULÉE"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Bloc Client */}
        <div className="my-8 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Facturé à
          </p>
          <p className="mt-1 text-base font-bold text-slate-900">
            {invoice.client_name}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
            {invoice.client_address && <p>Adresse : {invoice.client_address}</p>}
            {invoice.client_phone && <p>Tél : {invoice.client_phone}</p>}
            <p className="font-mono">
              ICE : <strong>{invoice.client_ice || "Non communiqué"}</strong>
            </p>
            {invoice.client_if && (
              <p className="font-mono">
                IF : <strong>{invoice.client_if}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Tableau Lignes */}
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-y border-slate-200 bg-slate-900 text-[11px] font-semibold uppercase tracking-wider text-white">
              <th className="px-3 py-2.5">Désignation</th>
              <th className="px-3 py-2.5 text-right">Qté</th>
              <th className="px-3 py-2.5 text-right">P.U. HT</th>
              <th className="px-3 py-2.5 text-right">TVA</th>
              <th className="px-3 py-2.5 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items.map((item, idx) => {
              const lineHt = item.quantity * item.unit_price_ht;
              return (
                <tr key={idx}>
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {item.description}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                    {formatMAD(item.unit_price_ht)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                    {item.vat_rate}%
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">
                    {formatMAD(lineHt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Récapitulatif Financier */}
        <div className="mt-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-sm space-y-2 text-xs text-slate-600">
            {invoice.payment_method && (
              <p>
                Mode de règlement :{" "}
                <strong className="text-slate-900">
                  {invoice.payment_method}
                </strong>
              </p>
            )}
            {invoice.notes && (
              <p className="rounded-lg bg-slate-50 p-3 text-slate-600">
                <strong>Notes :</strong> {invoice.notes}
              </p>
            )}
          </div>

          <div className="w-full max-w-xs space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs tabular-nums">
            <div className="flex justify-between text-slate-600">
              <span>Total Hors Taxes (HT)</span>
              <span className="font-semibold text-slate-900">
                {formatMAD(invoice.total_ht)}
              </span>
            </div>
            {tva10 > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>TVA 10%</span>
                <span>{formatMAD(tva10)}</span>
              </div>
            )}
            {tva20 > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>TVA 20%</span>
                <span>{formatMAD(tva20)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Total TVA</span>
              <span className="font-medium text-slate-800">
                {formatMAD(invoice.total_tva)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-300 pt-2.5 text-sm font-bold text-slate-900">
              <span>NET À PAYER TTC</span>
              <span className="text-base text-emerald-700">
                {formatMAD(invoice.total_ttc)}
              </span>
            </div>
          </div>
        </div>

        {/* Mentions légales marocaines obligatoires */}
        <div className="mt-12 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500">
          {RESTAURANT_DEFAULT_INFO.legal_name} • ICE :{" "}
          {RESTAURANT_DEFAULT_INFO.ice} • IF :{" "}
          {RESTAURANT_DEFAULT_INFO.if_number} • RC :{" "}
          {RESTAURANT_DEFAULT_INFO.rc} • Patente :{" "}
          {RESTAURANT_DEFAULT_INFO.patente}
        </div>
      </div>
    </div>
  );
}
