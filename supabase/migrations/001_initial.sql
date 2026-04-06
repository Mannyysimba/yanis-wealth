-- Tabs configuration
CREATE TABLE tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('capital', 'investissement')),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES tabs(id) ON DELETE CASCADE,
  position INT DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Line items inside each tab
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID REFERENCES tabs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount DECIMAL(20,2) DEFAULT 0,
  currency TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily snapshots
CREATE TABLE daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_eur DECIMAL(20,2),
  breakdown_json JSONB,
  rates_used JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exchange rates cache
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base TEXT DEFAULT 'EUR',
  rates JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can manage tabs" ON tabs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage line_items" ON line_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage daily_snapshots" ON daily_snapshots FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read exchange_rates" ON exchange_rates FOR ALL USING (auth.role() = 'authenticated');

-- Seed parent tabs
INSERT INTO tabs (id, section, name, parent_id, position, currency) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'capital', 'Espèces', NULL, 0, 'EUR'),
  ('a2000000-0000-0000-0000-000000000002', 'capital', 'Banque', NULL, 1, 'EUR'),
  ('a3000000-0000-0000-0000-000000000003', 'capital', 'Tangem', NULL, 2, 'USD'),
  ('a4000000-0000-0000-0000-000000000004', 'capital', 'Trust Wallet', NULL, 3, 'USD'),
  ('b1000000-0000-0000-0000-000000000001', 'investissement', 'Ledger', NULL, 0, 'USD'),
  ('b2000000-0000-0000-0000-000000000002', 'investissement', 'Immobilier', NULL, 1, 'EUR');

-- Seed sub-tabs
INSERT INTO tabs (section, name, parent_id, position, currency) VALUES
  ('capital', 'Espèces France', 'a1000000-0000-0000-0000-000000000001', 0, 'EUR'),
  ('capital', 'Espèces Maroc', 'a1000000-0000-0000-0000-000000000001', 1, 'MAD'),
  ('capital', 'Banque France', 'a2000000-0000-0000-0000-000000000002', 0, 'EUR'),
  ('capital', 'Banque Maroc', 'a2000000-0000-0000-0000-000000000002', 1, 'MAD'),
  ('investissement', 'Maroc', 'b2000000-0000-0000-0000-000000000002', 0, 'MAD'),
  ('investissement', 'Dubaï', 'b2000000-0000-0000-0000-000000000002', 1, 'AED');
