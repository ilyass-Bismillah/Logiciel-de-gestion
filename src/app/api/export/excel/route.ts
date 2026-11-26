import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getOptionalAuthContext } from "@/lib/auth";
import { getMonthlyOverviewData } from "@/lib/data-service";
import { formatMonthYearFR, RESTAURANT_DEFAULT_INFO } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const ctx = await getOptionalAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;

  if (month < 1 || month > 12 || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Période invalide." }, { status: 400 });
  }

  const overview = await getMonthlyOverviewData(year, month);
  const periodLabel = formatMonthYearFR(year, month);

  const wb = XLSX.utils.book_new();

  // 1. Feuille Récapitulatif
  const summaryRows = [
    ["DOSSIER DE PRÉ-COMPTABILITÉ MENSUEL — " + RESTAURANT_DEFAULT_INFO.name.toUpperCase()],
    ["Raison sociale", RESTAURANT_DEFAULT_INFO.legal_name],
    ["ICE", RESTAURANT_DEFAULT_INFO.ice, "IF", RESTAURANT_DEFAULT_INFO.if_number],
    ["RC", RESTAURANT_DEFAULT_INFO.rc, "Patente", RESTAURANT_DEFAULT_INFO.patente],
    ["Période comptable", periodLabel],
    ["Généré le", new Date().toLocaleDateString("fr-FR")],
    [],
    ["INDICATEUR FINANCIER", "MONTANT (MAD)", "OBSERVATIONS"],
    ["Chiffre d'Affaires Caisse (Z)", overview.kpis.totalRegisterRevenue, `${overview.cashRegisters.length} / ${overview.daysInMonth} jours saisis`],
    ["  dont Recettes Espèces", overview.kpis.totalCashSales, ""],
    ["  dont Recettes TPE (Carte)", overview.kpis.totalCardSales, ""],
    ["  dont Livraison / Autres", overview.kpis.totalDeliverySales, ""],
    ["Factures Clients B2B (Payées)", overview.kpis.paidInvoicesTotal, `${overview.invoices.filter((i) => i.status === "paid").length} facture(s) réglée(s)`],
    ["TOTAL CHIFFRE D'AFFAIRES MENSUEL", overview.kpis.totalRevenue, "Caisse + Factures payées"],
    [],
    ["Total Dépenses & Achats TTC", overview.kpis.totalExpenses, `${overview.expenses.length} pièce(s) enregistrée(s)`],
    ["Solde Net de Caisse (Espèces)", overview.kpis.netCashBalance, "Espèces encaissées - sorties caisse - achats espèces"],
    ["Pièces justificatives manquantes", overview.kpis.missingJustificatifsCount, `${overview.kpis.missingZTickets} ticket(s) Z, ${overview.kpis.missingReceiptFiles} facture(s) fournisseur`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 36 }, { wch: 22 }, { wch: 44 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Récapitulatif");

  // 2. Feuille États de Caisse
  const cashHeaders = [
    "Date",
    "Statut",
    "Fond Initial (MAD)",
    "Recette Espèces (MAD)",
    "Recette TPE (MAD)",
    "Livraison / Autres (MAD)",
    "Total CA Jour (MAD)",
    "Sorties Caisse (MAD)",
    "Espèces Comptées (MAD)",
    "Écart Caisse (MAD)",
    "Ticket Z Joint",
    "Notes",
  ];
  const cashRows = overview.cashRegisters.map((r) => [
    r.register_date,
    r.status === "validated" ? "Validé" : "Brouillon",
    Number(r.opening_balance),
    Number(r.cash_sales),
    Number(r.card_sales),
    Number(r.delivery_other_sales),
    Number(r.total_revenue),
    Number(r.cash_outflows),
    Number(r.counted_cash),
    Number(r.cash_variance),
    r.z_ticket_path ? "Oui" : "Manquant",
    r.notes ?? "",
  ]);
  const wsCash = XLSX.utils.aoa_to_sheet([cashHeaders, ...cashRows]);
  wsCash["!cols"] = [
    { wch: 12 },
    { wch: 11 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 36 },
  ];
  XLSX.utils.book_append_sheet(wb, wsCash, "États de Caisse");

  // 3. Feuille Factures Clients
  const invHeaders = [
    "N° Facture",
    "Date Émission",
    "Échéance",
    "Client",
    "ICE Client",
    "IF Client",
    "Total HT (MAD)",
    "Total TVA (MAD)",
    "Total TTC (MAD)",
    "Statut",
    "Mode Règlement",
  ];
  const invRows = overview.invoices.map((i) => [
    i.invoice_number,
    i.issue_date,
    i.due_date ?? "",
    i.client_name,
    i.client_ice ?? "",
    i.client_if ?? "",
    Number(i.total_ht),
    Number(i.total_tva),
    Number(i.total_ttc),
    i.status === "paid" ? "Payée" : i.status === "pending" ? "En attente" : "Annulée",
    i.payment_method ?? "",
  ]);
  const wsInvoices = XLSX.utils.aoa_to_sheet([invHeaders, ...invRows]);
  wsInvoices["!cols"] = [
    { wch: 15 },
    { wch: 14 },
    { wch: 14 },
    { wch: 30 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInvoices, "Factures Clients");

  // 4. Feuille Achats & Justificatifs
  const expHeaders = [
    "Date",
    "Fournisseur",
    "ICE Fournisseur",
    "Catégorie",
    "Référence",
    "Montant TTC (MAD)",
    "Taux TVA (%)",
    "TVA Estimée (MAD)",
    "Mode Paiement",
    "Statut",
    "Justificatif Joint",
    "Notes",
  ];
  const expRows = overview.expenses.map((e) => {
    const ht = Number(e.amount_ttc) / (1 + Number(e.vat_rate) / 100);
    const tva = Math.round((Number(e.amount_ttc) - ht) * 100) / 100;
    return [
      e.expense_date,
      e.supplier_name,
      e.supplier_ice ?? "",
      e.category,
      e.reference_number ?? "",
      Number(e.amount_ttc),
      Number(e.vat_rate),
      tva,
      e.payment_method,
      e.status === "validated" ? "Validé" : "Enregistré",
      e.file_path ? "Oui" : "Manquant",
      e.notes ?? "",
    ];
  });
  const wsExpenses = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
  wsExpenses["!cols"] = [
    { wch: 12 },
    { wch: 26 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 36 },
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, "Achats & Justificatifs");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const mm = String(month).padStart(2, "0");
  const filename = `Tylias_PreComptabilite_${year}-${mm}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
