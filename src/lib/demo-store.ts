import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  ClientInvoice,
  DailyCashRegister,
  ExpenseReceipt,
  Profile,
  UserRole,
} from "@/types/database";

export const DEMO_COOKIE_NAME = "tylias_demo_role";

interface DemoDatabase {
  profiles: Profile[];
  cashRegisters: DailyCashRegister[];
  invoices: ClientInvoice[];
  expenses: ExpenseReceipt[];
}

const STORE_FILE = path.join(os.tmpdir(), "tylias-demo-v1.json");
export const DEMO_FILES_DIR = path.join(os.tmpdir(), "tylias-files");

function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function createInitialData(): DemoDatabase {
  const now = new Date().toISOString();

  const profiles: Profile[] = [
    {
      id: "demo-admin-1",
      email: "karim.bennani@tylias.ma",
      full_name: "Karim Bennani",
      role: "admin",
      is_active: true,
      created_at: now,
    },
    {
      id: "demo-manager-1",
      email: "salma.idrissi@tylias.ma",
      full_name: "Salma Idrissi",
      role: "manager",
      is_active: true,
      created_at: now,
    },
    {
      id: "demo-accountant-1",
      email: "cabinet.tazi@fiduciaire.ma",
      full_name: "Cabinet Tazi & Associés",
      role: "accountant",
      is_active: true,
      created_at: now,
    },
  ];

  // Générer 16 jours de caisse réalistes sur le mois en cours / récents
  const cashSeedSpec = [
    { daysAgo: 0, cash: 6950, card: 9840, deliv: 2340, out: 350, var: 0, status: "draft" as const, ticket: true, note: "Service midi complet, soirée en cours de clôture." },
    { daysAgo: 1, cash: 5430, card: 7890, deliv: 1940, out: 190, var: 0, status: "draft" as const, ticket: false, note: "Journée calme lundi. Ticket Z à numériser." },
    { daysAgo: 2, cash: 7650, card: 11200, deliv: 2890, out: 250, var: 0, status: "validated" as const, ticket: true, note: "Brunch dimanche + dîner." },
    { daysAgo: 3, cash: 9420, card: 15280, deliv: 3490, out: 450, var: 0, status: "validated" as const, ticket: true, note: "Samedi soir complet. Glovo & livraison en hausse." },
    { daysAgo: 4, cash: 8950, card: 13400, deliv: 3120, out: 580, var: -20, status: "validated" as const, ticket: true, note: "Soirée complète + groupe terrasse." },
    { daysAgo: 5, cash: 7210, card: 10890, deliv: 2650, out: 310, var: -10, status: "validated" as const, ticket: true, note: "Écart mineur -10 MAD sur caisse bar." },
    { daysAgo: 6, cash: 6840, card: 9450, deliv: 2180, out: 420, var: 0, status: "validated" as const, ticket: true, note: "Service fluide. Achat menthe et citron." },
    { daysAgo: 7, cash: 6120, card: 8740, deliv: 1890, out: 160, var: 0, status: "validated" as const, ticket: true, note: "Clôture normale." },
    { daysAgo: 8, cash: 7490, card: 11650, deliv: 2740, out: 290, var: 15, status: "validated" as const, ticket: true, note: "Excédent pourboire non ventilé (+15 MAD)." },
    { daysAgo: 9, cash: 8310, card: 12900, deliv: 3050, out: 410, var: 0, status: "validated" as const, ticket: true, note: "Réservation groupe entreprise midi." },
    { daysAgo: 10, cash: 9180, card: 14600, deliv: 3320, out: 520, var: 0, status: "validated" as const, ticket: true, note: "Vendredi soir très actif." },
    { daysAgo: 11, cash: 6540, card: 9320, deliv: 2110, out: 240, var: 0, status: "validated" as const, ticket: true, note: null },
    { daysAgo: 12, cash: 5980, card: 8410, deliv: 1750, out: 180, var: 0, status: "validated" as const, ticket: true, note: null },
    { daysAgo: 13, cash: 6390, card: 9150, deliv: 2040, out: 210, var: 0, status: "validated" as const, ticket: true, note: null },
    { daysAgo: 14, cash: 7820, card: 11980, deliv: 2680, out: 340, var: 0, status: "validated" as const, ticket: true, note: null },
    { daysAgo: 15, cash: 8640, card: 13720, deliv: 3190, out: 390, var: 0, status: "validated" as const, ticket: true, note: null },
  ];

  const cashRegisters: DailyCashRegister[] = cashSeedSpec.map((item, idx) => {
    const opening = 1500;
    const expected = opening + item.cash - item.out;
    const counted = expected + item.var;
    const dStr = isoDateDaysAgo(item.daysAgo);
    return {
      id: `demo-cash-${idx + 1}`,
      register_date: dStr,
      opening_balance: opening,
      cash_sales: item.cash,
      card_sales: item.card,
      delivery_other_sales: item.deliv,
      cash_outflows: item.out,
      counted_cash: counted,
      cash_variance: item.var,
      total_revenue: item.cash + item.card + item.deliv,
      z_ticket_path: item.ticket ? `demo/z-ticket-${dStr}.txt` : null,
      z_ticket_name: item.ticket ? `TicketZ_${dStr}.pdf` : null,
      z_ticket_signed_url: item.ticket ? `/api/demo-file?type=z&date=${dStr}` : null,
      notes: item.note,
      status: item.status,
      created_by: "demo-manager-1",
      validated_by: item.status === "validated" ? "demo-admin-1" : null,
      validated_at: item.status === "validated" ? now : null,
      created_at: now,
      updated_at: now,
    };
  });

  const invoices: ClientInvoice[] = [
    {
      id: "demo-inv-1",
      invoice_number: "FAC-2026-001",
      issue_date: isoDateDaysAgo(12),
      due_date: isoDateDaysAgo(2),
      client_name: "Attijari Business Services SARL",
      client_ice: "001548923000047",
      client_if: "40219854",
      client_address: "Boulevard Moulay Youssef, Casablanca",
      client_phone: "+212 5 22 29 88 10",
      items: [
        {
          description: "Déjeuner d'affaires Direction (28 couverts - Menu Dégustation)",
          quantity: 28,
          unit_price_ht: 320,
          vat_rate: 10,
        },
        {
          description: "Forfait Boissons & Eaux minérales",
          quantity: 28,
          unit_price_ht: 65,
          vat_rate: 20,
        },
      ],
      total_ht: 10780,
      total_tva: 1260,
      total_ttc: 12040,
      status: "paid",
      payment_method: "Virement",
      notes: "Règlement reçu par virement CIH Bank.",
      created_by: "demo-admin-1",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-inv-2",
      invoice_number: "FAC-2026-002",
      issue_date: isoDateDaysAgo(5),
      due_date: isoDateDaysAgo(-25),
      client_name: "Cabinet Mazars Conseil Maroc",
      client_ice: "000874125000019",
      client_if: "15287410",
      client_address: "Quartier Racine, Rue Abou Kacem Echabbi, Casablanca",
      client_phone: "+212 5 22 94 12 00",
      items: [
        {
          description: "Dîner Séminaire Équipe Audit (18 personnes)",
          quantity: 18,
          unit_price_ht: 380,
          vat_rate: 10,
        },
        {
          description: "Privatisation salon & équipement audiovisuel",
          quantity: 1,
          unit_price_ht: 2500,
          vat_rate: 20,
        },
      ],
      total_ht: 9340,
      total_tva: 1184,
      total_ttc: 10524,
      status: "pending",
      payment_method: null,
      notes: "Facture transmise au service comptable client.",
      created_by: "demo-admin-1",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-inv-3",
      invoice_number: "FAC-2026-003",
      issue_date: isoDateDaysAgo(1),
      due_date: isoDateDaysAgo(-14),
      client_name: "Hôtel & Spa Anfa Palace",
      client_ice: "002314587000082",
      client_if: "51247890",
      client_address: "Corniche Ain Diab, Casablanca",
      client_phone: "+212 5 22 79 44 00",
      items: [
        {
          description: "Prestation Traiteur Cocktail VIP (45 pax)",
          quantity: 45,
          unit_price_ht: 240,
          vat_rate: 10,
        },
      ],
      total_ht: 10800,
      total_tva: 1080,
      total_ttc: 11880,
      status: "pending",
      payment_method: null,
      notes: "Bon de commande n° BC-8841.",
      created_by: "demo-admin-1",
      created_at: now,
      updated_at: now,
    },
  ];

  const expenses: ExpenseReceipt[] = [
    {
      id: "demo-exp-1",
      expense_date: isoDateDaysAgo(1),
      supplier_name: "Hygiène Pro Maroc",
      supplier_ice: "002145698000062",
      category: "Entretien",
      amount_ttc: 945,
      vat_rate: 20,
      payment_method: "Carte",
      reference_number: "HP-309",
      file_path: null,
      file_name: null,
      file_mime_type: null,
      file_signed_url: null,
      status: "recorded",
      notes: "Détergents cuisine norme HACCP — justificatif papier à scanner.",
      created_by: "demo-manager-1",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-exp-2",
      expense_date: isoDateDaysAgo(2),
      supplier_name: "Lydec",
      supplier_ice: "000012457000090",
      category: "Énergie/Eau",
      amount_ttc: 3240.8,
      vat_rate: 14,
      payment_method: "Virement",
      reference_number: "FAC-LYD-1126",
      file_path: "demo/lydec.svg",
      file_name: "Facture_Lydec_Mensuelle.svg",
      file_mime_type: "image/svg+xml",
      file_signed_url: "/api/demo-file?type=receipt&id=demo-exp-2",
      status: "validated",
      notes: "Facture électricité et eau mensuelle.",
      created_by: "demo-admin-1",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-exp-3",
      expense_date: isoDateDaysAgo(3),
      supplier_name: "Marché de Gros Casablanca",
      supplier_ice: null,
      category: "Marchandises/Food",
      amount_ttc: 1860,
      vat_rate: 0,
      payment_method: "Espèces",
      reference_number: "MG-112",
      file_path: null,
      file_name: null,
      file_mime_type: null,
      file_signed_url: null,
      status: "recorded",
      notes: "Légumes frais, herbes aromatiques et agrumes (bon manuel manquant).",
      created_by: "demo-manager-1",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-exp-4",
      expense_date: isoDateDaysAgo(4),
      supplier_name: "Coca-Cola (CBGN)",
      supplier_ice: "000451298000014",
      category: "Boissons",
      amount_ttc: 2890,
      vat_rate: 20,
      payment_method: "Chèque",
      reference_number: "CHQ-771204",
      file_path: "demo/cbgn.svg",
      file_name: "BL_CocaCola_CBGN.svg",
      file_mime_type: "image/svg+xml",
      file_signed_url: "/api/demo-file?type=receipt&id=demo-exp-4",
      status: "validated",
      notes: "Sodas, eaux gazeuses et jus pour le bar.",
      created_by: "demo-manager-1",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-exp-5",
      expense_date: isoDateDaysAgo(5),
      supplier_name: "Centrale Danone",
      supplier_ice: "000214578000033",
      category: "Marchandises/Food",
      amount_ttc: 1420,
      vat_rate: 7,
      payment_method: "Espèces",
      reference_number: "CD-99821",
      file_path: "demo/danone.svg",
      file_name: "Facture_Centrale_Danone.svg",
      file_mime_type: "image/svg+xml",
      file_signed_url: "/api/demo-file?type=receipt&id=demo-exp-5",
      status: "validated",
      notes: "Beurre, crème fraîche, lait et yaourts cuisine.",
      created_by: "demo-manager-1",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-exp-6",
      expense_date: isoDateDaysAgo(6),
      supplier_name: "Metro Maroc",
      supplier_ice: "001524789000051",
      category: "Marchandises/Food",
      amount_ttc: 16480.5,
      vat_rate: 10,
      payment_method: "Virement",
      reference_number: "BL-2026-4412",
      file_path: "demo/metro.svg",
      file_name: "Facture_Metro_Maroc_4412.svg",
      file_mime_type: "image/svg+xml",
      file_signed_url: "/api/demo-file?type=receipt&id=demo-exp-6",
      status: "validated",
      notes: "Viandes, filets de bœuf, poissons et produits secs hebdomadaires.",
      created_by: "demo-admin-1",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-exp-7",
      expense_date: isoDateDaysAgo(10),
      supplier_name: "Metro Maroc",
      supplier_ice: "001524789000051",
      category: "Marchandises/Food",
      amount_ttc: 12350,
      vat_rate: 10,
      payment_method: "Virement",
      reference_number: "BL-2026-4290",
      file_path: "demo/metro2.svg",
      file_name: "Facture_Metro_Maroc_4290.svg",
      file_mime_type: "image/svg+xml",
      file_signed_url: "/api/demo-file?type=receipt&id=demo-exp-7",
      status: "validated",
      notes: "Réassort épicerie fine et huiles d'olive.",
      created_by: "demo-admin-1",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-exp-8",
      expense_date: isoDateDaysAgo(12),
      supplier_name: "Sidi Ali / Les Eaux Minérales d'Oulmès",
      supplier_ice: "000148520000027",
      category: "Boissons",
      amount_ttc: 3150,
      vat_rate: 20,
      payment_method: "Chèque",
      reference_number: "OUL-8821",
      file_path: "demo/oulmes.svg",
      file_name: "BL_Oulmes_8821.svg",
      file_mime_type: "image/svg+xml",
      file_signed_url: "/api/demo-file?type=receipt&id=demo-exp-8",
      status: "validated",
      notes: "Palettes Sidi Ali & Oulmès verre.",
      created_by: "demo-manager-1",
      created_at: now,
      updated_at: now,
    },
  ];

  return { profiles, cashRegisters, invoices, expenses };
}

export function readDemoDb(): DemoDatabase {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf8");
      return JSON.parse(raw) as DemoDatabase;
    }
  } catch {
    // Recreate on parse error
  }
  const initial = createInitialData();
  writeDemoDb(initial);
  return initial;
}

export function writeDemoDb(db: DemoDatabase): void {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // ignore fs errors in read-only env
  }
}

export function getDemoProfileByRole(role: UserRole): Profile {
  const db = readDemoDb();
  return (
    db.profiles.find((p) => p.role === role) ?? {
      id: `demo-${role}`,
      email: `${role}@tylias.ma`,
      full_name:
        role === "admin"
          ? "Karim Bennani"
          : role === "manager"
          ? "Salma Idrissi"
          : "Cabinet Tazi & Associés",
      role,
      is_active: true,
      created_at: new Date().toISOString(),
    }
  );
}
