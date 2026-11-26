import type { ExpenseCategory } from "@/types/database";

export interface OcrExtractedFields {
  supplierName: string | null;
  amountTtc: string | null;
  vatRate: "0" | "7" | "10" | "14" | "20" | null;
  expenseDate: string | null;
  supplierIce: string | null;
  referenceNumber: string | null;
  category: ExpenseCategory | null;
  detectedFieldKeys: Array<
    | "supplier_name"
    | "amount_ttc"
    | "vat_rate"
    | "expense_date"
    | "supplier_ice"
    | "reference_number"
    | "category"
  >;
}

const KNOWN_SUPPLIER_PATTERNS: Array<{
  pattern: RegExp;
  canonical: string;
  category?: ExpenseCategory;
}> = [
  { pattern: /\bmetro\b/i, canonical: "Metro Maroc", category: "Marchandises/Food" },
  { pattern: /\bcentrale\s*danone\b|\bdanone\b/i, canonical: "Centrale Danone", category: "Marchandises/Food" },
  { pattern: /\bcoca[\s-]*cola\b|\bcbgn\b/i, canonical: "Coca-Cola (CBGN)", category: "Boissons" },
  { pattern: /\bmarch[eé]\s*de\s*gros\b/i, canonical: "Marché de Gros Casablanca", category: "Marchandises/Food" },
  { pattern: /\blydec\b/i, canonical: "Lydec", category: "Énergie/Eau" },
  { pattern: /\bonee\b|\bredal\b|\bamendis\b/i, canonical: "ONEE / Eau & Électricité", category: "Énergie/Eau" },
  { pattern: /\bsidi\s*ali\b|\boulm[eè]s\b/i, canonical: "Sidi Ali / Les Eaux Minérales d'Oulmès", category: "Boissons" },
  { pattern: /\bkoutoubia\b/i, canonical: "Koutoubia Charcuterie", category: "Marchandises/Food" },
  { pattern: /\blesaffre\b/i, canonical: "Lesaffre Maroc", category: "Marchandises/Food" },
  { pattern: /\bhygi[eè]ne\s*pro\b/i, canonical: "Hygiène Pro Maroc", category: "Entretien" },
  { pattern: /\bafriquia\b/i, canonical: "Afriquia Gaz", category: "Énergie/Eau" },
  { pattern: /\bmarjane\b/i, canonical: "Marjane", category: "Marchandises/Food" },
  { pattern: /\bcarrefour\b/i, canonical: "Carrefour Market", category: "Marchandises/Food" },
  { pattern: /\baswak\s*assalam\b/i, canonical: "Aswak Assalam", category: "Marchandises/Food" },
  { pattern: /\bbim\b/i, canonical: "BIM Maroc", category: "Marchandises/Food" },
];

const HEADER_SKIP_PATTERN =
  /^(?:facture|ticket|re[cç]u|bon\s+de\s+livraison|duplicata|devis|client|destinataire|date|heure|t[eé]l|fax|ice|rc|if|patente|adresse|caisse|serveur|table|merci|bienvenue|total|sous[\s-]*total|tva|montant|esp[eè]ces|carte|(?:fac|fact|bl|bc|br|cmd|cd)[-/])\b/i;

function normalizeNumericString(
  raw: string,
  expectedSum?: number | null
): number | null {
  // Retirer espaces (séparateurs de milliers), DH/MAD, symboles
  let cleaned = raw
    .replace(/\s+/g, "")
    .replace(/(?:MAD|DH|DHS)/gi, "")
    .replace(/[^\d.,]/g, "");

  if (!cleaned) return null;

  // Ignorer les numéros ICE (15 chiffres) ou identifiants longs
  const digitsOnly = cleaned.replace(/[.,]/g, "");
  if (digitsOnly.length >= 12) return null;

  const hasDecimalSeparator = /[.,]/.test(cleaned);
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // Ex: 1.240,50 ou 1,240.50
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const decimals = cleaned.length - lastComma - 1;
    cleaned = decimals <= 2 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (lastDot > -1) {
    const decimals = cleaned.length - lastDot - 1;
    if (decimals > 2) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  let num = Number.parseFloat(cleaned);
  if (!Number.isFinite(num) || num <= 0 || num > 10_000_000) return null;

  // Cas fréquent OCR : séparateur décimal omis (ex: "2 095,00 MAD" lu "209500")
  if (!hasDecimalSeparator && /^\d{5,}$/.test(cleaned)) {
    if (cleaned.endsWith("00")) {
      num = num / 100;
    } else if (
      expectedSum &&
      expectedSum > 0 &&
      Math.abs(num / 100 - expectedSum) <= 2
    ) {
      num = num / 100;
    }
  }

  return Math.round(num * 100) / 100;
}

function extractSupplier(lines: string[], fullText: string): {
  supplierName: string | null;
  category: ExpenseCategory | null;
} {
  for (const item of KNOWN_SUPPLIER_PATTERNS) {
    if (item.pattern.test(fullText)) {
      return { supplierName: item.canonical, category: item.category ?? null };
    }
  }

  // Parcourir les premières lignes non vides pour trouver la raison sociale
  const topLines = lines.slice(0, 8);
  for (const line of topLines) {
    const trimmed = line
      .replace(/^[—–\-_=|:;•.,~*#/\s]+/, "")
      .replace(/[—–\-_=|:;•.,~*#/\s]+$/, "")
      .trim();
    if (trimmed.length < 3 || trimmed.length > 60) continue;
    if (HEADER_SKIP_PATTERN.test(trimmed)) continue;
    // Ignorer les lignes purement numériques / dates / téléphones
    if (/^[\d\s/.,:+-]+$/.test(trimmed)) continue;
    if (!/[a-zA-ZÀ-ÿ]{2,}/.test(trimmed)) continue;
    return { supplierName: trimmed, category: null };
  }

  return { supplierName: null, category: null };
}

function extractDate(text: string): string | null {
  const isValidYmd = (y: number, m: number, d: number) =>
    y >= 2018 && y <= 2035 && m >= 1 && m <= 12 && d >= 1 && d <= 31;

  // Format YYYY-MM-DD ou YYYY/MM/DD
  const ymdMatch = text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (ymdMatch) {
    const y = Number(ymdMatch[1]);
    const m = Number(ymdMatch[2]);
    const d = Number(ymdMatch[3]);
    if (isValidYmd(y, m, d)) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Format DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = text.match(
    /\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/
  );
  if (dmyMatch) {
    const d = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    if (isValidYmd(y, m, d)) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Format court DD/MM/YY
  const dmyShortMatch = text.match(
    /\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](\d{2})\b/
  );
  if (dmyShortMatch) {
    const d = Number(dmyShortMatch[1]);
    const m = Number(dmyShortMatch[2]);
    const y = 2000 + Number(dmyShortMatch[3]);
    if (isValidYmd(y, m, d)) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  return null;
}

function extractExpectedHtPlusTva(lines: string[]): number | null {
  let ht: number | null = null;
  let tva: number | null = null;

  for (const line of lines) {
    if (/(?:TOTAL\s*HT|SOUS[\s-]*TOTAL|HORS\s*TAXE)/i.test(line)) {
      const m = line.match(/\d[\d\s.,]{0,14}\d/g);
      if (m) {
        const val = normalizeNumericString(m[m.length - 1]);
        if (val !== null) ht = val;
      }
    } else if (/\bTVA\b/i.test(line) && !/TOTAL\s*TTC/i.test(line)) {
      const m = line.match(/\d[\d\s.,]{0,14}\d/g);
      if (m) {
        const val = normalizeNumericString(m[m.length - 1]);
        if (val !== null && val < (ht ?? Infinity)) tva = val;
      }
    }
  }

  if (ht !== null && tva !== null) {
    return Math.round((ht + tva) * 100) / 100;
  }
  return null;
}

function extractTotalAmount(lines: string[], fullText: string): string | null {
  const expectedSum = extractExpectedHtPlusTva(lines);
  const totalKeyword =
    /(?:TOTAL\s*TTC|NET\s*[AÀ]\s*PAYER|MONTANT\s*TTC|TOTAL\s*[AÀ]\s*PAYER|TOTAL\s*G[EÉ]N[EÉ]RAL|TOTAL\s*FINAL|A\s*PAYER|TOTAL|AMOUNT|TTC)/i;

  const candidatesFromLabels: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!totalKeyword.test(line)) continue;
    // Éviter "SOUS-TOTAL" ou "TOTAL HT" si un vrai TOTAL TTC existe
    const isSubtotal = /SOUS[\s-]*TOTAL|TOTAL\s*HT|HORS\s*TAXE/i.test(line);
    if (isSubtotal) continue;

    // Chercher le montant sur la même ligne ou la ligne suivante
    const segment = `${line} ${lines[i + 1] ?? ""}`;
    const numMatches = segment.match(/\d[\d\s.,]{0,14}\d|\d+[.,]\d{1,2}/g) ?? [];
    for (const m of numMatches) {
      // Ignorer années 2020..2035 isolées ou pourcentages
      if (/^20\d{2}$/.test(m.trim())) continue;
      const parsed = normalizeNumericString(m, expectedSum);
      if (parsed !== null && parsed >= 1) {
        candidatesFromLabels.push(parsed);
      }
    }
  }

  if (candidatesFromLabels.length > 0) {
    if (expectedSum !== null) {
      const matching = candidatesFromLabels.find(
        (c) => Math.abs(c - expectedSum) <= 2
      );
      if (matching !== undefined) {
        return matching.toFixed(2);
      }
    }
    const best = Math.max(...candidatesFromLabels);
    return best.toFixed(2);
  }

  // Fallback : plus grand montant décimal avec 2 décimales ou suivi de MAD/DH
  const currencyMatches =
    fullText.match(/\b\d{1,3}(?:[\s.]?\d{3})*[.,]\d{2}\b|\b\d+(?:[.,]\d{1,2})?\s*(?:MAD|DHS?)\b/gi) ??
    [];
  const allAmounts = currencyMatches
    .map((m) => normalizeNumericString(m, expectedSum))
    .filter((n): n is number => n !== null && n >= 1);

  if (allAmounts.length > 0) {
    return Math.max(...allAmounts).toFixed(2);
  }

  return null;
}

function extractVatRate(
  text: string
): "0" | "7" | "10" | "14" | "20" | null {
  // Priorité aux mentions explicites "TVA ... 20%" ou "20% ... TVA"
  const explicitMatch =
    text.match(/TVA[^\n%]{0,20}\b(20|14|10|7|0)\s*%/i) ??
    text.match(/\b(20|14|10|7)\s*%[^\n]{0,16}TVA/i);
  if (explicitMatch) {
    return explicitMatch[1] as "0" | "7" | "10" | "14" | "20";
  }

  if (/\b20\s*%/.test(text)) return "20";
  if (/\b10\s*%/.test(text)) return "10";
  if (/\b14\s*%/.test(text)) return "14";
  if (/\b7\s*%/.test(text)) return "7";
  return null;
}

function extractIce(text: string): string | null {
  // Chercher d'abord après le mot-clé ICE
  const iceLabelMatches = [...text.matchAll(/ICE[\s:#.-]*(\d[\d\s]{13,18}\d)/gi)];
  for (const m of iceLabelMatches) {
    const digits = m[1].replace(/\s+/g, "");
    if (/^\d{15}$/.test(digits)) {
      return digits;
    }
  }

  // Sinon, toute séquence de 15 chiffres n'importe où dans le texte (y compris pied de page)
  const all15Digits = text.match(/\b\d{15}\b/g);
  if (all15Digits && all15Digits.length > 0) {
    return all15Digits[0] ?? null;
  }

  return null;
}

function extractReference(text: string): string | null {
  // Codes structurés FAC-..., BL-..., CD-...
  const codeMatch = text.match(
    /\b((?:FAC|FACT|BL|BC|BR|CMD|CD|HP|MG)[-/][A-Z0-9]{2,}(?:[-/][A-Z0-9]+)*)\b/i
  );
  if (codeMatch) {
    return codeMatch[1].toUpperCase();
  }

  // Mot-clé suivi d'un numéro (Facture N° ..., Ticket N° ..., Réf ...)
  const labelMatch = text.match(
    /(?:FACTURE|BON\s*DE\s*LIVRAISON|TICKET|RE[CÇ]U|R[EÉ]F(?:[EÉ]RENCE)?)\s*(?:N[°oO]?)?[\s:#.-]+([A-Z0-9][A-Z0-9\-/]{2,20})/i
  );
  if (labelMatch) {
    const ref = labelMatch[1].trim();
    if (!/^(?:DU|DE|LE|LA|CLIENT|DATE|ICE|TTC)$/i.test(ref)) {
      return ref;
    }
  }

  return null;
}

export function parseReceiptOcrText(rawText: string): OcrExtractedFields {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const { supplierName, category } = extractSupplier(lines, rawText);
  const amountTtc = extractTotalAmount(lines, rawText);
  const vatRate = extractVatRate(rawText);
  const expenseDate = extractDate(rawText);
  const supplierIce = extractIce(rawText);
  const referenceNumber = extractReference(rawText);

  const detectedFieldKeys: OcrExtractedFields["detectedFieldKeys"] = [];
  if (supplierName) detectedFieldKeys.push("supplier_name");
  if (amountTtc) detectedFieldKeys.push("amount_ttc");
  if (vatRate) detectedFieldKeys.push("vat_rate");
  if (expenseDate) detectedFieldKeys.push("expense_date");
  if (supplierIce) detectedFieldKeys.push("supplier_ice");
  if (referenceNumber) detectedFieldKeys.push("reference_number");
  if (category) detectedFieldKeys.push("category");

  return {
    supplierName,
    amountTtc,
    vatRate,
    expenseDate,
    supplierIce,
    referenceNumber,
    category,
    detectedFieldKeys,
  };
}
