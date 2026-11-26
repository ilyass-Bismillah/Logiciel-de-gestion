-- ============================================================================
-- Données de démonstration réalistes pour Tylias (Maroc)
-- À exécuter optionnellement dans l'éditeur SQL Supabase après schema.sql
-- ============================================================================

INSERT INTO public.daily_cash_registers (
  register_date, opening_balance, cash_sales, card_sales, delivery_other_sales,
  cash_outflows, counted_cash, notes, status, validated_at
)
VALUES
  (CURRENT_DATE - INTERVAL '6 days', 1500.00, 6840.00, 9450.00, 2180.00, 420.00, 7920.00, 'Service midi & dîner fluide. Achat menthe et citron en appoint.', 'validated', NOW() - INTERVAL '5 days'),
  (CURRENT_DATE - INTERVAL '5 days', 1500.00, 7210.00, 10890.00, 2650.00, 310.00, 8390.00, 'Écart mineur -10 MAD sur caisse bar.', 'validated', NOW() - INTERVAL '4 days'),
  (CURRENT_DATE - INTERVAL '4 days', 1500.00, 8950.00, 13400.00, 3120.00, 580.00, 9870.00, 'Soirée complète + groupe terrasse.', 'validated', NOW() - INTERVAL '3 days'),
  (CURRENT_DATE - INTERVAL '3 days', 1500.00, 9420.00, 15280.00, 3490.00, 450.00, 10470.00, 'Samedi soir très actif. Glovo & livraison directe en hausse.', 'validated', NOW() - INTERVAL '2 days'),
  (CURRENT_DATE - INTERVAL '2 days', 1500.00, 7650.00, 11200.00, 2890.00, 250.00, 8900.00, 'Brunch dimanche + dîner.', 'validated', NOW() - INTERVAL '1 day'),
  (CURRENT_DATE - INTERVAL '1 day', 1500.00, 5430.00, 7890.00, 1940.00, 190.00, 6740.00, 'Journée calme lundi.', 'draft', NULL)
ON CONFLICT (register_date) DO NOTHING;

INSERT INTO public.client_invoices (
  invoice_number, issue_date, due_date, client_name, client_ice, client_if,
  client_address, items, total_ht, total_tva, total_ttc, status, payment_method, notes
)
VALUES
  (
    'FAC-2026-001',
    CURRENT_DATE - INTERVAL '12 days',
    CURRENT_DATE - INTERVAL '2 days',
    'Attijari Business Services SARL',
    '001548923000047',
    '40219854',
    'Boulevard Moulay Youssef, Casablanca',
    '[
      {"description": "Déjeuner d''affaires Direction (28 couverts - Menu Dégustation)", "quantity": 28, "unit_price_ht": 320, "vat_rate": 10},
      {"description": "Forfait Boissons & Eaux minérales", "quantity": 28, "unit_price_ht": 65, "vat_rate": 20}
    ]'::jsonb,
    10780.00, 1260.00, 12040.00, 'paid', 'Virement', 'Règlement reçu par virement CIH Bank.'
  ),
  (
    'FAC-2026-002',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '25 days',
    'Cabinet Mazars Conseil Maroc',
    '000874125000019',
    '15287410',
    'Quartier Racine, Rue Abou Kacem Echabbi, Casablanca',
    '[
      {"description": "Dîner Séminaire Équipe Audit (18 personnes)", "quantity": 18, "unit_price_ht": 380, "vat_rate": 10},
      {"description": "Privatisation salon & équipement audiovisuel", "quantity": 1, "unit_price_ht": 2500, "vat_rate": 20}
    ]'::jsonb,
    9340.00, 1184.00, 10524.00, 'pending', NULL, 'Facture transmise au service comptable client.'
  ),
  (
    'FAC-2026-003',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '14 days',
    'Hôtel & Spa Anfa Palace',
    '002314587000082',
    '51247890',
    'Corniche Ain Diab, Casablanca',
    '[
      {"description": "Prestation Traiteur Cocktail VIP (45 pax)", "quantity": 45, "unit_price_ht": 240, "vat_rate": 10}
    ]'::jsonb,
    10800.00, 1080.00, 11880.00, 'pending', NULL, 'Bon de commande n° BC-8841.'
  )
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO public.expense_receipts (
  expense_date, supplier_name, supplier_ice, category, amount_ttc, vat_rate,
  payment_method, reference_number, status, notes
)
VALUES
  (CURRENT_DATE - INTERVAL '6 days', 'Metro Maroc', '001524789000051', 'Marchandises/Food', 6480.50, 10, 'Virement', 'BL-2026-4412', 'validated', 'Viandes, filets de bœuf et produits secs hebdomadaires.'),
  (CURRENT_DATE - INTERVAL '5 days', 'Centrale Danone', '000214578000033', 'Marchandises/Food', 1420.00, 7, 'Espèces', 'CD-99821', 'validated', 'Beurre, crème fraîche, lait et yaourts cuisine.'),
  (CURRENT_DATE - INTERVAL '4 days', 'Coca-Cola (CBGN)', '000451298000014', 'Boissons', 2890.00, 20, 'Chèque', 'CHQ-771204', 'validated', 'Sodas, eaux gazeuses et jus pour le bar.'),
  (CURRENT_DATE - INTERVAL '3 days', 'Marché de Gros Casablanca', NULL, 'Marchandises/Food', 1860.00, 0, 'Espèces', 'MG-112', 'recorded', 'Légumes frais, herbes aromatiques et agrumes.'),
  (CURRENT_DATE - INTERVAL '2 days', 'Lydec', '000012457000090', 'Énergie/Eau', 3240.80, 14, 'Virement', 'FAC-LYD-1126', 'validated', 'Facture électricité et eau mensuelle.'),
  (CURRENT_DATE - INTERVAL '1 day', 'Hygiène Pro Maroc', '002145698000062', 'Entretien', 945.00, 20, 'Carte', 'HP-309', 'recorded', 'Détergents cuisine norme HACCP et essuie-mains.')
ON CONFLICT DO NOTHING;
