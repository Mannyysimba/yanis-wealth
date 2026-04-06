import { supabase } from './supabase/client';
import { FALLBACK_RATES } from './constants';

export async function getExchangeRates(): Promise<Record<string, number>> {
  // Check cache in Supabase
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
    if (hoursSince < 24) {
      return cached.rates as Record<string, number>;
    }
  }

  // Fetch live rates
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    if (!res.ok) throw new Error('Rate fetch failed');
    const data = await res.json();
    const rates: Record<string, number> = {
      EUR: 1,
      MAD: data.rates.MAD,
      AED: data.rates.AED,
      USD: data.rates.USD,
    };

    // Cache in Supabase
    await supabase.from('exchange_rates').insert({
      base: 'EUR',
      rates,
      fetched_at: new Date().toISOString(),
    });

    return rates;
  } catch {
    return cached?.rates as Record<string, number> || FALLBACK_RATES;
  }
}

export function convertToEur(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'EUR') return amount;
  const rate = rates[currency];
  if (!rate) return amount;
  return amount / rate;
}
