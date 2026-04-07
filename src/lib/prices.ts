// Crypto & Gold price fetching — all free APIs, no keys needed

const COINGECKO_API = process.env.NEXT_PUBLIC_COINGECKO_API || 'https://api.coingecko.com/api/v3';
const METALS_API = process.env.NEXT_PUBLIC_METALS_API || 'https://api.metals.live/v1/spot';

export interface AssetPrice {
  id: string;
  symbol: string;
  name: string;
  price_usd: number;
  last_updated: string;
}

const CRYPTO_IDS: Record<string, { symbol: string; name: string }> = {
  bitcoin: { symbol: 'BTC', name: 'Bitcoin' },
  ethereum: { symbol: 'ETH', name: 'Ethereum' },
  tether: { symbol: 'USDT', name: 'Tether' },
  kaspa: { symbol: 'KAS', name: 'Kaspa' },
};

let priceCache: { prices: AssetPrice[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchCryptoPrices(): Promise<AssetPrice[]> {
  try {
    const ids = Object.keys(CRYPTO_IDS).join(',');
    const res = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error('CoinGecko fetch failed');
    const data = await res.json();
    const now = new Date().toISOString();
    return Object.entries(CRYPTO_IDS).map(([id, info]) => ({
      id,
      symbol: info.symbol,
      name: info.name,
      price_usd: data[id]?.usd || 0,
      last_updated: now,
    }));
  } catch {
    return Object.entries(CRYPTO_IDS).map(([id, info]) => ({
      id,
      symbol: info.symbol,
      name: info.name,
      price_usd: 0,
      last_updated: '',
    }));
  }
}

export async function fetchGoldPrice(): Promise<AssetPrice> {
  const fallback: AssetPrice = {
    id: 'gold',
    symbol: 'XAU',
    name: 'Gold (oz)',
    price_usd: 3100,
    last_updated: '',
  };
  try {
    const res = await fetch(`${METALS_API}/gold`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Metals API failed');
    const data = await res.json();
    // metals.live returns an array like [{ price: 3100.50 }]
    const price = Array.isArray(data) ? data[0]?.price : data?.price;
    if (!price) return fallback;
    return {
      id: 'gold',
      symbol: 'XAU',
      name: 'Gold (oz)',
      price_usd: Number(price),
      last_updated: new Date().toISOString(),
    };
  } catch {
    return fallback;
  }
}

export async function fetchAllPrices(): Promise<AssetPrice[]> {
  if (priceCache && Date.now() - priceCache.fetchedAt < CACHE_TTL) {
    return priceCache.prices;
  }
  const [crypto, gold] = await Promise.all([fetchCryptoPrices(), fetchGoldPrice()]);
  const prices = [gold, ...crypto];
  priceCache = { prices, fetchedAt: Date.now() };
  return prices;
}

export function getPriceForSymbol(prices: AssetPrice[], symbol: string): number {
  const found = prices.find((p) => p.symbol === symbol);
  return found?.price_usd || 0;
}
