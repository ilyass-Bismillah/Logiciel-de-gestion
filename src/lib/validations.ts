import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'adresse e-mail est requise.")
    .email("Veuillez saisir une adresse e-mail valide."),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

export const cashRegisterSchema = z.object({
  id: z.string().optional(),
  register_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (format AAAA-MM-JJ requis)."),
  opening_balance: z.coerce
    .number()
    .min(0, "Le fond de caisse ne peut pas être négatif."),
  cash_sales: z.coerce
    .number()
    .min(0, "La recette espèces ne peut pas être négative."),
  card_sales: z.coerce
    .number()
    .min(0, "La recette TPE ne peut pas être négative."),
  delivery_other_sales: z.coerce
    .number()
    .min(0, "Les ventes livraison/autres ne peuvent pas être négatives."),
  cash_outflows: z.coerce
    .number()
    .min(0, "Les sorties de caisse ne peuvent pas être négatives."),
  counted_cash: z.coerce
    .number()
    .min(0, "Le montant compté en caisse ne peut pas être négatif."),
  z_ticket_path: z.string().nullable().optional(),
  z_ticket_name: z.string().nullable().optional(),
  notes: z.string().max(1000, "1000 caractères maximum.").nullable().optional(),
  status: z.enum(["draft", "validated"]).default("draft"),
});

export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(2, "La désignation est requise."),
  quantity: z.coerce.number().positive("La quantité doit être supérieure à 0."),
  unit_price_ht: z.coerce
    .number()
    .min(0, "Le prix unitaire HT ne peut pas être négatif."),
  vat_rate: z.union([z.literal(10), z.literal(20)]),
});

export const clientInvoiceSchema = z.object({
  id: z.string().optional(),
  invoice_number: z
    .string()
    .trim()
    .min(3, "Numéro de facture requis.")
    .optional(),
  issue_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date d'émission invalide."),
  due_date: z.string().nullable().optional(),
  client_name: z
    .string()
    .trim()
    .min(2, "La raison sociale / nom du client est requis."),
  client_ice: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^\d{15}$/.test(val),
      "L'ICE marocain doit contenir exactement 15 chiffres."
    )
    .nullable()
    .optional(),
  client_if: z.string().trim().max(30).nullable().optional(),
  client_address: z.string().trim().max(300).nullable().optional(),
  client_phone: z.string().trim().max(30).nullable().optional(),
  items: z
    .array(invoiceLineItemSchema)
    .min(1, "Ajoutez au moins une ligne de facturation."),
  status: z.enum(["paid", "pending", "cancelled"]).default("pending"),
  payment_method: z
    .enum(["Espèces", "Virement", "Chèque", "TPE / Carte"])
    .nullable()
    .optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const expenseReceiptSchema = z.object({
  id: z.string().optional(),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date de dépense invalide."),
  supplier_name: z
    .string()
    .trim()
    .min(2, "Le nom du fournisseur est requis."),
  supplier_ice: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^\d{15}$/.test(val),
      "L'ICE fournisseur doit contenir 15 chiffres."
    )
    .nullable()
    .optional(),
  category: z.enum([
    "Marchandises/Food",
    "Boissons",
    "Énergie/Eau",
    "Entretien",
    "Autre",
  ]),
  amount_ttc: z.coerce
    .number()
    .positive("Le montant TTC doit être supérieur à 0."),
  vat_rate: z.coerce
    .number()
    .refine((v) => [0, 7, 10, 14, 20].includes(v), "Taux de TVA invalide.")
    .default(20),
  payment_method: z.enum(["Espèces", "Virement", "Chèque", "Carte"]),
  reference_number: z.string().trim().max(80).nullable().optional(),
  file_path: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
  file_mime_type: z.string().nullable().optional(),
  status: z.enum(["recorded", "validated"]).default("recorded"),
  notes: z.string().max(1000).nullable().optional(),
});

export const userRoleUpdateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "manager", "accountant"]),
  is_active: z.boolean().optional(),
});
