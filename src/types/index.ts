export interface Tab {
  id: string;
  section: 'capital' | 'investissement';
  name: string;
  parent_id: string | null;
  position: number;
  currency: string;
  created_at: string;
  children?: Tab[];
}

export interface LineItem {
  id: string;
  tab_id: string;
  label: string;
  amount: number;
  currency: string;
  updated_at: string;
}

export interface DailySnapshot {
  id: string;
  date: string;
  total_eur: number;
  breakdown_json: Record<string, number>;
  rates_used: Record<string, number>;
  created_at: string;
}

export interface ExchangeRates {
  id: string;
  base: string;
  rates: Record<string, number>;
  fetched_at: string;
}

export interface BreakdownItem {
  name: string;
  value: number;
  color: string;
}
