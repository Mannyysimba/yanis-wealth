// Crypto price fetching via CoinGecko — free, no key needed

const COINGECKO_API = process.env.NEXT_PUBLIC_COINGECKO_API || 'https://api.coingecko.com/api/v3';

export interface AssetPrice {
  id: string;
  symbol: string;
  name: string;
  price_usd: number;
  last_updated: string;
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank: number | null;
}

// Known CoinGecko IDs for default assets
export const KNOWN_COINS: Record<string, { id: string; name: string }> = {
  BTC: { id: 'bitcoin', name: 'Bitcoin' },
  ETH: { id: 'ethereum', name: 'Ethereum' },
  USDT: { id: 'tether', name: 'Tether' },
  KAS: { id: 'kaspa', name: 'Kaspa' },
  PAXG: { id: 'pax-gold', name: 'PAX Gold' },
  TRX: { id: 'tron', name: 'Tron' },
  BNB: { id: 'binancecoin', name: 'Binance Coin' },
};

let priceCache: { prices: AssetPrice[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchPricesForIds(coinIds: string[]): Promise<AssetPrice[]> {
  if (coinIds.length === 0) return [];
  try {
    const ids = coinIds.join(',');
    const res = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error('CoinGecko fetch failed');
    const data = await res.json();
    const now = new Date().toISOString();

    return coinIds.map((id) => {
      // Find the symbol/name from KNOWN_COINS or use the id
      const known = Object.entries(KNOWN_COINS).find(([, v]) => v.id === id);
      return {
        id,
        symbol: known ? known[0] : id.toUpperCase(),
        name: known ? known[1].name : id,
        price_usd: data[id]?.usd || 0,
        last_updated: data[id]?.usd ? now : '',
      };
    });
  } catch {
    return coinIds.map((id) => {
      const known = Object.entries(KNOWN_COINS).find(([, v]) => v.id === id);
      return {
        id,
        symbol: known ? known[0] : id.toUpperCase(),
        name: known ? known[1].name : id,
        price_usd: 0,
        last_updated: '',
      };
    });
  }
}

export async function fetchAllPrices(extraIds: string[] = []): Promise<AssetPrice[]> {
  const knownIds = Object.values(KNOWN_COINS).map((c) => c.id);
  const allIds = Array.from(new Set([...knownIds, ...extraIds]));

  if (priceCache && Date.now() - priceCache.fetchedAt < CACHE_TTL) {
    // Check if cache covers all requested ids
    const cachedIds = new Set(priceCache.prices.map((p) => p.id));
    const missing = allIds.filter((id) => !cachedIds.has(id));
    if (missing.length === 0) return priceCache.prices;
    // Fetch missing and merge
    const extra = await fetchPricesForIds(missing);
    const merged = [...priceCache.prices, ...extra];
    priceCache = { prices: merged, fetchedAt: Date.now() };
    return merged;
  }

  const prices = await fetchPricesForIds(allIds);
  priceCache = { prices, fetchedAt: Date.now() };
  return prices;
}

export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(
      `${COINGECKO_API}/search?query=${encodeURIComponent(query)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.coins || []).slice(0, 6).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      name: c.name as string,
      symbol: (c.symbol as string || '').toUpperCase(),
      thumb: c.thumb as string,
      market_cap_rank: c.market_cap_rank as number | null,
    }));
  } catch {
    return [];
  }
}

export function getPriceForSymbol(prices: AssetPrice[], symbol: string): number {
  const found = prices.find((p) => p.symbol === symbol);
  return found?.price_usd || 0;
}
