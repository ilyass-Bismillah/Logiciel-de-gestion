-- ============================================================================
-- Tylias — Logiciel de Gestion et de Pré-comptabilité (Maroc)
-- Schéma complet Supabase : Tables, Triggers, Storage & Row Level Security
-- ============================================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLE PROFILES (Rôles Utilisateurs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager', 'accountant')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Profils et rôles RBAC pour Tylias (admin, manager, accountant).';

-- Fonction helper pour lire le rôle de l'utilisateur connecté sans récursion RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$;

-- Trigger création automatique du profil lors de l'inscription Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('admin', 'manager', 'accountant')
        THEN NEW.raw_user_meta_data ->> 'role'
      ELSE 'manager'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. TABLE DAILY_CASH_REGISTERS (États de Caisse & Rapport Z)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_date DATE NOT NULL UNIQUE,
  opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cash_sales >= 0),
  card_sales NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (card_sales >= 0),
  delivery_other_sales NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_other_sales >= 0),
  cash_outflows NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cash_outflows >= 0),
  counted_cash NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (counted_cash >= 0),
  -- Écart de caisse = Espèces comptées - (Fond initial + Recette Espèces - Sorties espèces)
  cash_variance NUMERIC(12, 2) GENERATED ALWAYS AS (
    counted_cash - (opening_balance + cash_sales - cash_outflows)
  ) STORED,
  total_revenue NUMERIC(12, 2) GENERATED ALWAYS AS (
    cash_sales + card_sales + delivery_other_sales
  ) STORED,
  z_ticket_path TEXT,
  z_ticket_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  validated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_cash_date ON public.daily_cash_registers(register_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_cash_status ON public.daily_cash_registers(status);

-- ============================================================================
-- 3. TABLE CLIENT_INVOICES (Factures Clients B2B / Groupes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  client_name TEXT NOT NULL,
  client_ice TEXT, -- Identifiant Commun de l'Entreprise (15 chiffres au Maroc)
  client_if TEXT,  -- Identifiant Fiscal
  client_address TEXT,
  client_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_ht NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_ht >= 0),
  total_tva NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_tva >= 0),
  total_ttc NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_ttc >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('Espèces', 'Virement', 'Chèque', 'TPE / Carte', NULL)),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.client_invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.client_invoices(status);

-- Fonction de génération automatique du numéro de facture (FAC-YYYY-001)
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT := 'FAC-' || p_year::TEXT || '-';
  v_max_num INT;
BEGIN
  SELECT COALESCE(
    MAX(
      NULLIF(regexp_replace(invoice_number, '^FAC-' || p_year::TEXT || '-', ''), '')::INT
    ),
    0
  )
  INTO v_max_num
  FROM public.client_invoices
  WHERE invoice_number LIKE v_prefix || '%';

  RETURN v_prefix || LPAD((v_max_num + 1)::TEXT, 3, '0');
END;
$$;

-- ============================================================================
-- 4. TABLE EXPENSE_RECEIPTS (Justificatifs & Dépenses Fournisseurs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expense_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name TEXT NOT NULL,
  supplier_ice TEXT,
  category TEXT NOT NULL CHECK (
    category IN ('Marchandises/Food', 'Boissons', 'Énergie/Eau', 'Entretien', 'Autre')
  ),
  amount_ttc NUMERIC(12, 2) NOT NULL CHECK (amount_ttc >= 0),
  vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 20 CHECK (vat_rate IN (0, 7, 10, 14, 20)),
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('Espèces', 'Virement', 'Chèque', 'Carte')
  ),
  reference_number TEXT,
  file_path TEXT,
  file_name TEXT,
  file_mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'validated')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expense_receipts(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expense_receipts(category);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON public.expense_receipts(supplier_name);

-- ============================================================================
-- 5. TRIGGER UPDATED_AT AUTOMATIQUE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_daily_cash_updated ON public.daily_cash_registers;
CREATE TRIGGER trg_daily_cash_updated BEFORE UPDATE ON public.daily_cash_registers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated ON public.client_invoices;
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_expenses_updated ON public.expense_receipts;
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expense_receipts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.get_my_role() IN ('admin', 'accountant'));

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ---- DAILY_CASH_REGISTERS ----
DROP POLICY IF EXISTS "cash_select_all_roles" ON public.daily_cash_registers;
CREATE POLICY "cash_select_all_roles"
  ON public.daily_cash_registers FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'manager', 'accountant'));

DROP POLICY IF EXISTS "cash_insert_admin_manager" ON public.daily_cash_registers;
CREATE POLICY "cash_insert_admin_manager"
  ON public.daily_cash_registers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND status = 'draft')
  );

DROP POLICY IF EXISTS "cash_update_admin_or_draft_manager" ON public.daily_cash_registers;
CREATE POLICY "cash_update_admin_or_draft_manager"
  ON public.daily_cash_registers FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND status = 'draft')
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND status = 'draft')
  );

DROP POLICY IF EXISTS "cash_delete_admin_only_or_manager_draft" ON public.daily_cash_registers;
CREATE POLICY "cash_delete_admin_only_or_manager_draft"
  ON public.daily_cash_registers FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND status = 'draft' AND created_by = auth.uid())
  );

-- ---- CLIENT_INVOICES ----
DROP POLICY IF EXISTS "invoices_select_all_roles" ON public.client_invoices;
CREATE POLICY "invoices_select_all_roles"
  ON public.client_invoices FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'manager', 'accountant'));

DROP POLICY IF EXISTS "invoices_admin_insert" ON public.client_invoices;
CREATE POLICY "invoices_admin_insert"
  ON public.client_invoices FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "invoices_admin_update" ON public.client_invoices;
CREATE POLICY "invoices_admin_update"
  ON public.client_invoices FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "invoices_admin_delete" ON public.client_invoices;
CREATE POLICY "invoices_admin_delete"
  ON public.client_invoices FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- ---- EXPENSE_RECEIPTS ----
DROP POLICY IF EXISTS "expenses_select_all_roles" ON public.expense_receipts;
CREATE POLICY "expenses_select_all_roles"
  ON public.expense_receipts FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'manager', 'accountant'));

DROP POLICY IF EXISTS "expenses_insert_admin_manager" ON public.expense_receipts;
CREATE POLICY "expenses_insert_admin_manager"
  ON public.expense_receipts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND status = 'recorded')
  );

DROP POLICY IF EXISTS "expenses_update_admin_or_manager_recorded" ON public.expense_receipts;
CREATE POLICY "expenses_update_admin_or_manager_recorded"
  ON public.expense_receipts FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND status = 'recorded')
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND status = 'recorded')
  );

DROP POLICY IF EXISTS "expenses_delete_admin_or_manager_recorded" ON public.expense_receipts;
CREATE POLICY "expenses_delete_admin_or_manager_recorded"
  ON public.expense_receipts FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND status = 'recorded' AND created_by = auth.uid())
  );

-- ============================================================================
-- 7. SUPABASE STORAGE BUCKET : justificatifs
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'justificatifs',
  'justificatifs',
  FALSE,
  15728640, -- 15 Mo max par pièce
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Politiques Storage : lecture pour tous les rôles authentifiés
DROP POLICY IF EXISTS "justificatifs_read_authenticated" ON storage.objects;
CREATE POLICY "justificatifs_read_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'justificatifs'
    AND public.get_my_role() IN ('admin', 'manager', 'accountant')
  );

-- Upload autorisé pour admin et manager
DROP POLICY IF EXISTS "justificatifs_insert_admin_manager" ON storage.objects;
CREATE POLICY "justificatifs_insert_admin_manager"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'justificatifs'
    AND public.get_my_role() IN ('admin', 'manager')
  );

-- Suppression réservée à l'admin
DROP POLICY IF EXISTS "justificatifs_delete_admin" ON storage.objects;
CREATE POLICY "justificatifs_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'justificatifs'
    AND public.get_my_role() = 'admin'
  );
