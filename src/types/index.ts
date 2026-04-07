export interface Tab {
  id: string;
  section: 'capital' | 'investissement';
  name: string;
  slug: string;
  parent_id: string | null;
  currency: 'EUR' | 'MAD' | 'AED' | 'USD';
  position: number;
  created_at: string;
  children?: Tab[];
}

export interface LineItem {
  id: string;
  tab_id: string;
  label: string;
  amount: number;
  currency: string;
  position: number;
  updated_at: string;
}

export interface DailySnapshot {
  id: string;
  snapshot_date: string;
  total_eur: number;
  capital_eur: number;
  investissement_eur: number;
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

export interface Objective {
  id: string;
  tab_id: string | null;
  title: string;
  target_amount: number;
  target_currency: string;
  target_amount_eur: number | null;
  target_date: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface BreakdownItem {
  name: string;
  value: number;
  color: string;
}

export interface ObjectiveWithContext extends Objective {
  tab_name: string;
  tab_section: string;
  current_amount: number;
  current_amount_eur: number;
  progress: number;
  remaining: number;
  remaining_eur: number;
  days_left: number;
  velocity_daily_eur: number;
  projected_date: Date | null;
}
