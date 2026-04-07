-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Exchange rates cache
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base TEXT DEFAULT 'EUR',
  rates JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dynamic tabs configuration
CREATE TABLE tabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section TEXT NOT NULL CHECK (section IN ('capital', 'investissement')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES tabs(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('EUR', 'MAD', 'AED', 'USD')),
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Line items inside each tab
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tab_id UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount DECIMAL(20,2) DEFAULT 0,
  currency TEXT NOT NULL,
  position INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily wealth snapshots
CREATE TABLE daily_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date DATE NOT NULL UNIQUE,
  total_eur DECIMAL(20,2) NOT NULL,
  capital_eur DECIMAL(20,2),
  investissement_eur DECIMAL(20,2),
  breakdown_json JSONB,
  rates_used JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objectives / Goals (per-tab or global)
CREATE TABLE objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tab_id UUID REFERENCES tabs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount DECIMAL(20,2) NOT NULL DEFAULT 0,
  target_currency TEXT NOT NULL DEFAULT 'EUR',
  target_amount_eur DECIMAL(20,2),
  target_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial tabs
INSERT INTO tabs (section, name, slug, parent_id, currency, position) VALUES
('capital', 'Espèces', 'especes', NULL, 'EUR', 0),
('capital', 'Banque', 'banque', NULL, 'EUR', 1),
('capital', 'Crypto', 'crypto', NULL, 'USD', 2),
('investissement', 'Ledger', 'ledger', NULL, 'USD', 0),
('investissement', 'Immobilier', 'immobilier', NULL, 'EUR', 1);

-- Sub-tabs
INSERT INTO tabs (section, name, slug, parent_id, currency, position)
SELECT 'capital', 'Espèces France', 'especes-france', id, 'EUR', 0 FROM tabs WHERE slug = 'especes';
INSERT INTO tabs (section, name, slug, parent_id, currency, position)
SELECT 'capital', 'Espèces Maroc', 'especes-maroc', id, 'MAD', 1 FROM tabs WHERE slug = 'especes';

INSERT INTO tabs (section, name, slug, parent_id, currency, position)
SELECT 'capital', 'Banque France', 'banque-france', id, 'EUR', 0 FROM tabs WHERE slug = 'banque';
INSERT INTO tabs (section, name, slug, parent_id, currency, position)
SELECT 'capital', 'Banque Maroc', 'banque-maroc', id, 'MAD', 1 FROM tabs WHERE slug = 'banque';

INSERT INTO tabs (section, name, slug, parent_id, currency, position)
SELECT 'capital', 'Tangem', 'tangem', id, 'USD', 0 FROM tabs WHERE slug = 'crypto';
INSERT INTO tabs (section, name, slug, parent_id, currency, position)
SELECT 'capital', 'Trust Wallet', 'trust-wallet', id, 'USD', 1 FROM tabs WHERE slug = 'crypto';

INSERT INTO tabs (section, name, slug, parent_id, currency, position)
SELECT 'investissement', 'Immobilier Maroc', 'immo-maroc', id, 'MAD', 0 FROM tabs WHERE slug = 'immobilier';
INSERT INTO tabs (section, name, slug, parent_id, currency, position)
SELECT 'investissement', 'Immobilier Dubaï', 'immo-dubai', id, 'AED', 1 FROM tabs WHERE slug = 'immobilier';

-- Row Level Security
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policies (single user app — allow all for authenticated)
CREATE POLICY "auth_all" ON tabs FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all" ON line_items FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all" ON daily_snapshots FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all" ON objectives FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all" ON exchange_rates FOR ALL TO authenticated USING (true);
