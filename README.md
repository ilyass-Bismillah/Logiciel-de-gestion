# Tylias — Gestion & Pré-comptabilité

Application web de pré-comptabilité et de gestion financière conçue pour les entreprises d'hospitalité et de restauration (**Tylias** — Maroc : MAD, ICE, IF, TVA 10%/20%, Rapport Z).

## 1. Démarrage rapide

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).
- Sans configuration backend, l'**Accès Démonstration Interactive** permet de tester immédiatement les 3 rôles (`Gérant / Admin`, `Caissier / Manager`, `Comptable`) avec des données marocaines réalistes.
- Dès que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont configurés, l'authentification Supabase Auth et PostgreSQL RLS prennent automatiquement le relais.

## 2. Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com).
2. Exécutez `supabase/schema.sql` dans l'éditeur SQL de Supabase (crée les tables `profiles`, `daily_cash_registers`, `client_invoices`, `expense_receipts`, le bucket privé `justificatifs` et les politiques RLS).
3. Optionnel : exécutez `supabase/seed.sql` pour insérer des exemples réalistes.
4. Renseignez `.env.local` avec :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (uniquement pour la création de comptes depuis `/parametres` par l'admin).
