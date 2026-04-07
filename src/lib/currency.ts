import { supabase } from './supabase/client';
import { FALLBACK_RATES } from './constants';

const PRIMARY_API = process.env.NEXT_PUBLIC_EXCHANGE_API || 'https://api.exchangerate-api.com/v4/latest/EUR';
const FALLBACK_API = 'https://open.er-api.com/v6/latest/EUR';

export async function getExchangeRates(): Promise<Record<string, number>> {
  // Check cache in Supabase (6 hour TTL)
  const { data: cached } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    const fetchedAt = new Date(cached.fetched_at);
    const now = new Date();
    const hoursSince = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 6) {
      return cached.rates as Record<string, number>;
    }
  }

  // Try primary API
  let rates = await fetchFromApi(PRIMARY_API);

  // Fallback API
  if (!rates) {
    rates = await fetchFromApi(FALLBACK_API);
  }

  if (rates) {
    // Cache in Supabase
    await supabase.from('exchange_rates').insert({
      base: 'EUR',
      rates,
      fetched_at: new Date().toISOString(),
    });
    return rates;
  }

  return cached?.rates as Record<string, number> || FALLBACK_RATES;
}

async function fetchFromApi(url: string): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const ratesData = data.rates || data;
    return {
      EUR: 1,
      MAD: ratesData.MAD,
      AED: ratesData.AED,
      USD: ratesData.USD,
    };
  } catch {
    return null;
  }
}

export function convertToEur(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'EUR') return amount;
  const rate = rates[currency];
  if (!rate) return amount;
  return amount / rate;
}
