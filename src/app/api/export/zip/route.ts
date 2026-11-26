import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getOptionalAuthContext } from "@/lib/auth";
import { getMonthlyOverviewData } from "@/lib/data-service";
import { DEMO_FILES_DIR } from "@/lib/demo-store";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, sanitizeFilenameSegment } from "@/lib/utils";

function buildDemoSvgBuffer(title: string, subtitle: string, amount: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="#ffffff"/>
  <rect x="40" y="40" width="720" height="920" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <text x="80" y="110" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#0f172a">TYLIAS — PIECE JUSTIFICATIVE</text>
  <text x="80" y="150" font-family="Arial, sans-serif" font-size="18" fill="#475569">${title}</text>
  <line x1="80" y1="185" x2="720" y2="185" stroke="#cbd5e1" stroke-width="2"/>
  <text x="80" y="250" font-family="Arial, sans-serif" font-size="20" fill="#334155">${subtitle}</text>
  <text x="80" y="320" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#059669">${amount}</text>
  <text x="80" y="900" font-family="Arial, sans-serif" font-size="14" fill="#64748b">Archive comptable générée automatiquement — Tylias Casablanca</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

export async function GET(request: NextRequest) {
  const ctx = await getOptionalAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;

  const overview = await getMonthlyOverviewData(year, month);
  const zip = new JSZip();

  const depensesFolder = zip.folder("01_Factures_Fournisseurs");
  const ticketsZFolder = zip.folder("02_Tickets_Z_Caisse");

  const supabase = isSupabaseConfigured()
    ? await createServerSupabaseClient()
    : null;

  // 1. Justificatifs Fournisseurs
  for (const exp of overview.expenses) {
    if (!exp.file_path) continue;
    const ext = path.extname(exp.file_name || exp.file_path || ".jpg") || ".jpg";
    const cleanName = `${exp.expense_date}_${sanitizeFilenameSegment(
      exp.supplier_name
    )}_${Math.round(Number(exp.amount_ttc))}MAD${ext}`;

    if (supabase) {
      const { data: blob } = await supabase.storage
        .from("justificatifs")
        .download(exp.file_path);
      if (blob) {
        const arrBuf = await blob.arrayBuffer();
        depensesFolder?.file(cleanName, arrBuf);
      }
    } else if (exp.file_path.startsWith("local/")) {
      const diskPath = path.join(DEMO_FILES_DIR, path.basename(exp.file_path));
      if (fs.existsSync(diskPath)) {
        depensesFolder?.file(cleanName, fs.readFileSync(diskPath));
      }
    } else {
      depensesFolder?.file(
        cleanName,
        buildDemoSvgBuffer(
          exp.supplier_name,
          `Date: ${exp.expense_date} | Réf: ${exp.reference_number ?? "N/A"} | Mode: ${exp.payment_method}`,
          `${Number(exp.amount_ttc).toFixed(2)} MAD TTC`
        )
      );
    }
  }

  // 2. Tickets Z de caisse
  for (const reg of overview.cashRegisters) {
    if (!reg.z_ticket_path) continue;
    const ext =
      path.extname(reg.z_ticket_name || reg.z_ticket_path || ".pdf") || ".pdf";
    const cleanName = `${reg.register_date}_TicketZ_Tylias${ext}`;

    if (supabase) {
      const { data: blob } = await supabase.storage
        .from("justificatifs")
        .download(reg.z_ticket_path);
      if (blob) {
        const arrBuf = await blob.arrayBuffer();
        ticketsZFolder?.file(cleanName, arrBuf);
      }
    } else if (reg.z_ticket_path.startsWith("local/")) {
      const diskPath = path.join(
        DEMO_FILES_DIR,
        path.basename(reg.z_ticket_path)
      );
      if (fs.existsSync(diskPath)) {
        ticketsZFolder?.file(cleanName, fs.readFileSync(diskPath));
      }
    } else {
      ticketsZFolder?.file(
        `${reg.register_date}_TicketZ_Tylias.svg`,
        buildDemoSvgBuffer(
          `Rapport Z Journalier — ${reg.register_date}`,
          `Espèces: ${reg.cash_sales} MAD | TPE: ${reg.card_sales} MAD | Livraison: ${reg.delivery_other_sales} MAD`,
          `Total Jour: ${Number(reg.total_revenue).toFixed(2)} MAD`
        )
      );
    }
  }

  // Fichier manifeste texte
  const manifestLines = [
    `DOSSIER PIECES JUSTIFICATIVES - TYLIAS (${String(month).padStart(2, "0")}/${year})`,
    `Exporté le : ${new Date().toLocaleString("fr-FR")}`,
    `Justificatifs fournisseurs inclus : ${overview.expenses.filter((e) => e.file_path).length}/${overview.expenses.length}`,
    `Tickets Z inclus : ${overview.cashRegisters.filter((r) => r.z_ticket_path).length}/${overview.cashRegisters.length}`,
  ];
  zip.file("INDEX_CONTROLE.txt", manifestLines.join("\n"));

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const mm = String(month).padStart(2, "0");
  const filename = `Tylias_Justificatifs_${year}-${mm}.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
