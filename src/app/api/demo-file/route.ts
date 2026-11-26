import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuthContext } from "@/lib/auth";
import { DEMO_FILES_DIR, readDemoDb } from "@/lib/demo-store";
import { formatMAD, isSupabaseConfigured } from "@/lib/utils";

export async function GET(request: NextRequest) {
  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponible en production." }, { status: 404 });
  }

  const ctx = await getOptionalAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "local") {
    const rawName = searchParams.get("name") ?? "";
    const safeName = path.basename(rawName);
    const fullPath = path.join(DEMO_FILES_DIR, safeName);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
    }
    const ext = path.extname(safeName).toLowerCase();
    const mime =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
        ? "image/png"
        : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";
    const bytes = fs.readFileSync(fullPath);
    return new NextResponse(bytes, {
      status: 200,
      headers: { "Content-Type": mime, "Cache-Control": "no-store" },
    });
  }

  const db = readDemoDb();

  if (type === "z") {
    const date = searchParams.get("date") ?? "";
    const reg = db.cashRegisters.find((r) => r.register_date === date);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820" viewBox="0 0 600 820">
      <rect width="600" height="820" fill="#ffffff"/>
      <rect x="28" y="28" width="544" height="764" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="300" y="88" text-anchor="middle" font-family="monospace" font-size="24" font-weight="bold" fill="#0f172a">TYLIAS</text>
      <text x="300" y="118" text-anchor="middle" font-family="monospace" font-size="14" fill="#475569">20 Bd d'Anfa, Casablanca • ICE 002847591000038</text>
      <line x1="60" y1="145" x2="540" y2="145" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="300" y="185" text-anchor="middle" font-family="monospace" font-size="20" font-weight="bold" fill="#0f172a">TICKET DE CLOTURE Z — ${date}</text>
      <text x="70" y="250" font-family="monospace" font-size="16" fill="#334155">Fond de caisse initial :</text>
      <text x="530" y="250" text-anchor="end" font-family="monospace" font-size="16" font-weight="bold" fill="#0f172a">${reg ? formatMAD(reg.opening_balance) : "1 500,00 MAD"}</text>
      <text x="70" y="295" font-family="monospace" font-size="16" fill="#334155">Ventes Espèces :</text>
      <text x="530" y="295" text-anchor="end" font-family="monospace" font-size="16" font-weight="bold" fill="#0f172a">${reg ? formatMAD(reg.cash_sales) : "—"}</text>
      <text x="70" y="340" font-family="monospace" font-size="16" fill="#334155">Ventes TPE / Cartes :</text>
      <text x="530" y="340" text-anchor="end" font-family="monospace" font-size="16" font-weight="bold" fill="#0f172a">${reg ? formatMAD(reg.card_sales) : "—"}</text>
      <text x="70" y="385" font-family="monospace" font-size="16" fill="#334155">Livraison / Autres :</text>
      <text x="530" y="385" text-anchor="end" font-family="monospace" font-size="16" font-weight="bold" fill="#0f172a">${reg ? formatMAD(reg.delivery_other_sales) : "—"}</text>
      <text x="70" y="430" font-family="monospace" font-size="16" fill="#334155">Sorties espèces :</text>
      <text x="530" y="430" text-anchor="end" font-family="monospace" font-size="16" font-weight="bold" fill="#dc2626">-${reg ? formatMAD(reg.cash_outflows) : "0,00 MAD"}</text>
      <line x1="60" y1="470" x2="540" y2="470" stroke="#0f172a" stroke-width="2"/>
      <text x="70" y="520" font-family="monospace" font-size="20" font-weight="bold" fill="#0f172a">TOTAL CA TTC :</text>
      <text x="530" y="520" text-anchor="end" font-family="monospace" font-size="22" font-weight="bold" fill="#059669">${reg ? formatMAD(reg.total_revenue) : "—"}</text>
      <text x="70" y="575" font-family="monospace" font-size="15" fill="#475569">TVA 10% (Restauration) incluse</text>
      <text x="300" y="730" text-anchor="middle" font-family="monospace" font-size="13" fill="#64748b">Document justificatif dématérialisé — Caisse Principale</text>
    </svg>`;
    return new NextResponse(svg, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
    });
  }

  const id = searchParams.get("id") ?? "";
  const exp = db.expenses.find((e) => e.id === id);
  const ht = exp ? exp.amount_ttc / (1 + exp.vat_rate / 100) : 0;
  const tva = exp ? exp.amount_ttc - ht : 0;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="960" viewBox="0 0 760 960">
    <rect width="760" height="960" fill="#ffffff"/>
    <rect x="32" y="32" width="696" height="896" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="32" y="32" width="696" height="110" rx="10" fill="#0f172a"/>
    <text x="64" y="82" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#ffffff">${exp?.supplier_name ?? "FOURNISSEUR"}</text>
    <text x="64" y="114" font-family="Arial, sans-serif" font-size="14" fill="#cbd5e1">ICE : ${exp?.supplier_ice ?? "Non renseigné"} • Réf : ${exp?.reference_number ?? "N/A"}</text>
    <text x="64" y="200" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#475569">CLIENT FACTURÉ :</text>
    <text x="64" y="228" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0f172a">Tylias</text>
    <text x="64" y="255" font-family="Arial, sans-serif" font-size="14" fill="#475569">20, Boulevard d'Anfa, Casablanca • ICE : 002847591000038</text>
    <text x="64" y="300" font-family="Arial, sans-serif" font-size="15" fill="#334155">Date de pièce : ${exp?.expense_date ?? "—"}   |   Catégorie : ${exp?.category ?? "—"}</text>
    <rect x="64" y="340" width="632" height="44" fill="#f1f5f9"/>
    <text x="80" y="368" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">DESCRIPTION / NATURE DE LA DÉPENSE</text>
    <text x="680" y="368" text-anchor="end" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">MONTANT</text>
    <text x="80" y="425" font-family="Arial, sans-serif" font-size="16" fill="#0f172a">${exp?.notes ?? exp?.category ?? "Approvisionnement restaurant"}</text>
    <text x="680" y="425" text-anchor="end" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${exp ? formatMAD(ht) : "—"} HT</text>
    <line x1="64" y1="540" x2="696" y2="540" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="450" y="590" font-family="Arial, sans-serif" font-size="16" fill="#475569">Total HT :</text>
    <text x="680" y="590" text-anchor="end" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${exp ? formatMAD(ht) : "—"}</text>
    <text x="450" y="625" font-family="Arial, sans-serif" font-size="16" fill="#475569">TVA (${exp?.vat_rate ?? 20}%) :</text>
    <text x="680" y="625" text-anchor="end" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${exp ? formatMAD(tva) : "—"}</text>
    <rect x="430" y="655" width="266" height="56" rx="8" fill="#ecfdf5" stroke="#10b981"/>
    <text x="450" y="690" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#065f46">NET TTC :</text>
    <text x="680" y="690" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#059669">${exp ? formatMAD(exp.amount_ttc) : "—"}</text>
    <text x="64" y="860" font-family="Arial, sans-serif" font-size="14" fill="#64748b">Mode de règlement : ${exp?.payment_method ?? "—"} • Statut : ${exp?.status === "validated" ? "Validé" : "Enregistré"}</text>
  </svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
  });
}
