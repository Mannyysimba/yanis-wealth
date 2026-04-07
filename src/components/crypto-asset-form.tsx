"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllPrices, searchCoins, KNOWN_COINS, type AssetPrice, type CoinSearchResult } from "@/lib/prices";
import { convertToEur } from "@/lib/currency";
import { FALLBACK_RATES } from "@/lib/constants";
import { timeAgo, formatCurrency, formatEur } from "@/lib/format";
import { TabObjective } from "@/components/tab-objective";
import type { LineItem, Tab } from "@/types";

interface CryptoAssetFormProps {
  tab: Tab;
}

// Default assets per crypto tab — stored as symbol:coingeckoId
const DEFAULT_ASSETS: Record<string, string[]> = {
  tangem: ["PAXG", "USDT", "ETH", "BTC", "KAS", "TRX", "BNB"],
  "trust-wallet": ["BTC", "ETH", "USDT"],
  ledger: ["BTC", "ETH"],
};

// Custom CoinGecko IDs stored per line item in the label as "SYMBOL"
// We maintain a map of symbol → coingecko ID for price lookups
// This is stored in localStorage so custom assets persist their IDs
function getStoredCoinIds(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("yw-coin-ids") || "{}");
  } catch {
    return {};
  }
}

function storeCoinId(symbol: string, coinId: string) {
  const stored = getStoredCoinIds();
  stored[symbol] = coinId;
  localStorage.setItem("yw-coin-ids", JSON.stringify(stored));
}

function getCoinId(symbol: string): string | undefined {
  const known = KNOWN_COINS[symbol];
  if (known) return known.id;
  return getStoredCoinIds()[symbol];
}

function getCoinName(symbol: string): string {
  const known = KNOWN_COINS[symbol];
  if (known) return known.name;
  return symbol;
}

export function CryptoAssetForm({ tab }: CryptoAssetFormProps) {
  const [items, setItems] = useState<LineItem[]>([]);
  const [prices, setPrices] = useState<AssetPrice[]>([]);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CoinSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  const [lastModified, setLastModified] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("line_items")
      .select("*")
      .eq("tab_id", tab.id)
      .order("position", { ascending: true });

    if (data) {
      setItems(data);
      const inputs: Record<string, string> = {};
      for (const item of data) {
        const amt = Number(item.amount);
        inputs[item.id] = amt === 0 ? "" : amt.toString();
      }
      setRawInputs(inputs);
      if (data.length > 0) {
        const latest = data.reduce((a, b) =>
          new Date(a.updated_at) > new Date(b.updated_at) ? a : b
        );
        setLastModified(latest.updated_at);
      }
    }
    setLoading(false);
  }, [tab.id]);

  const fetchPrices = useCallback(async (extraSymbols: string[] = []) => {
    setPricesLoading(true);
    // Collect all CoinGecko IDs we need
    const extraIds = extraSymbols
      .map((s) => getCoinId(s))
      .filter((id): id is string => !!id);
    const p = await fetchAllPrices(extraIds);
    setPrices(p);
    const updated = p.find((x) => x.last_updated)?.last_updated;
    if (updated) setLastPriceUpdate(updated);
    setPricesLoading(false);
  }, []);

  const fetchRates = useCallback(async () => {
    const { data } = await supabase
      .from("exchange_rates")
      .select("*")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.rates) setRates(data.rates);
  }, []);

  useEffect(() => {
    fetchItems();
    fetchRates();
  }, [fetchItems, fetchRates]);

  // Fetch prices once items are loaded (so we know which custom IDs to include)
  useEffect(() => {
    if (loading) return;
    const customSymbols = items.map((i) => i.label).filter((s) => !KNOWN_COINS[s]);
    fetchPrices(customSymbols);
  }, [loading, items.length, fetchPrices]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh prices every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const customSymbols = items.map((i) => i.label).filter((s) => !KNOWN_COINS[s]);
      fetchPrices(customSymbols);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPrices, items]);

  // Ensure default assets exist as line items
  useEffect(() => {
    if (loading || items.length > 0) return;
    const defaults = DEFAULT_ASSETS[tab.slug] || [];
    if (defaults.length === 0) return;

    (async () => {
      for (let i = 0; i < defaults.length; i++) {
        const symbol = defaults[i];
        await supabase.from("line_items").insert({
          tab_id: tab.id,
          label: symbol,
          amount: 0,
          currency: tab.currency,
          position: i,
        });
      }
      fetchItems();
    })();
  }, [loading, items.length, tab.slug, tab.id, tab.currency, fetchItems]);

  // Search handler with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedIdx(-1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const results = await searchCoins(value);
      setSearchResults(results);
      setSearching(false);
    }, 300);
  };

  const handleSelectCoin = async (coin: CoinSearchResult) => {
    const symbol = coin.symbol.toUpperCase();
    // Store the CoinGecko ID for this symbol
    storeCoinId(symbol, coin.id);
    // Also add to KNOWN_COINS runtime
    KNOWN_COINS[symbol] = { id: coin.id, name: coin.name };

    const maxPos = items.reduce((max, i) => Math.max(max, i.position), -1);
    const { data } = await supabase
      .from("line_items")
      .insert({
        tab_id: tab.id,
        label: symbol,
        amount: 0,
        currency: tab.currency,
        position: maxPos + 1,
      })
      .select()
      .single();

    if (data) {
      setItems((prev) => [...prev, data]);
    }

    // Fetch price for the new coin immediately
    fetchPrices([symbol]);

    // Reset search
    setShowAddCustom(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedIdx(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowAddCustom(false);
      setSearchQuery("");
      setSearchResults([]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, searchResults.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && selectedIdx >= 0 && searchResults[selectedIdx]) {
      e.preventDefault();
      handleSelectCoin(searchResults[selectedIdx]);
    }
  };

  const getPrice = (symbol: string): number => {
    const coinId = getCoinId(symbol);
    if (coinId) {
      const found = prices.find((p) => p.id === coinId);
      if (found) return found.price_usd;
    }
    const found = prices.find(
      (p) => p.symbol === symbol || p.name.toLowerCase() === symbol.toLowerCase()
    );
    return found?.price_usd || 0;
  };

  const handleQuantityChange = (id: string, value: string) => {
    const cleaned = value.replace(/[^\d.,\-]/g, "");
    setRawInputs((prev) => ({ ...prev, [id]: cleaned }));
  };

  const handleBlurSave = async (id: string) => {
    const raw = rawInputs[id] || "";
    const num = parseFloat(raw.replace(",", ".")) || 0;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: num } : item))
    );
    setRawInputs((prev) => ({ ...prev, [id]: num === 0 ? "" : num.toString() }));
    const now = new Date().toISOString();
    await supabase
      .from("line_items")
      .update({ amount: num, updated_at: now })
      .eq("id", id);
    setLastModified(now);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("line_items").delete().eq("id", id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalUsd = items.reduce((sum, item) => {
    const price = getPrice(item.label);
    return sum + Number(item.amount) * price;
  }, 0);
  const totalEur = convertToEur(totalUsd, "USD", rates);

  if (loading) {
    return (
      <div className="card-gradient-border rounded-xl p-5 space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="card-gradient-border rounded-xl">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-lg font-semibold">{tab.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {lastModified && (
              <span className="text-xs text-muted-foreground">
                Modifié {timeAgo(lastModified)}
              </span>
            )}
            {lastPriceUpdate && !pricesLoading && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--accent-green)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-green)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent-green)]" />
                </span>
                Live
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="rounded-md bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
            {tab.currency}
          </span>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {formatCurrency(totalUsd, "USD")} · {formatEur(totalEur)}
          </p>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-1">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 pb-1">
          <div className="col-span-3">Actif</div>
          <div className="col-span-2 text-right">Quantité</div>
          <div className="col-span-2 text-right">Prix/u $</div>
          <div className="col-span-2 text-right">Total $</div>
          <div className="col-span-2 text-right">Total €</div>
          <div className="col-span-1" />
        </div>

        {items.map((item) => {
          const price = getPrice(item.label);
          const qty = Number(item.amount);
          const rowTotalUsd = qty * price;
          const rowTotalEur = convertToEur(rowTotalUsd, "USD", rates);
          const assetName = getCoinName(item.label);
          const hasLivePrice = price > 0;

          return (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-2 items-center rounded-lg px-1 py-2 hover:bg-accent/30 transition-colors"
            >
              <div className="col-span-3">
                <p className="text-sm font-medium">{assetName}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>

              <div className="col-span-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rawInputs[item.id] ?? ""}
                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                  onBlur={() => handleBlurSave(item.id)}
                  placeholder="0"
                  className="h-8 text-right font-mono text-sm"
                />
              </div>

              <div className="col-span-2 text-right">
                {pricesLoading ? (
                  <Skeleton className="h-4 w-16 ml-auto" />
                ) : hasLivePrice ? (
                  <span className="font-mono text-sm">
                    ${price >= 1000 ? price.toLocaleString("en-US", { maximumFractionDigits: 0 }) : price.toFixed(price < 1 ? 4 : 2)}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>

              <div className="col-span-2 text-right font-mono text-sm">
                {qty > 0 && hasLivePrice ? (
                  `$${rowTotalUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>

              <div className="col-span-2 text-right font-mono text-sm text-muted-foreground">
                {qty > 0 && hasLivePrice ? formatEur(rowTotalEur) : "—"}
              </div>

              <div className="col-span-1 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(item.id)}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
          );
        })}

        {/* Add asset with CoinGecko search */}
        <div className="pt-3 border-t border-[rgba(99,102,241,0.1)]">
          {showAddCustom ? (
            <div className="relative" ref={dropdownRef}>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Rechercher un actif (BNB, SOL, DOGE...)"
                    className="text-sm"
                    autoFocus
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => {
                  setShowAddCustom(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}>
                  Annuler
                </Button>
              </div>

              {/* Search results dropdown */}
              {searchQuery.length >= 2 && (
                <div className="absolute z-50 left-0 right-12 mt-1 rounded-lg border border-[rgba(99,102,241,0.2)] bg-[var(--bg-card)] shadow-xl overflow-hidden">
                  {searching ? (
                    <div className="px-4 py-3 text-xs text-muted-foreground">Recherche...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-muted-foreground">Aucun résultat</div>
                  ) : (
                    searchResults.map((coin, idx) => (
                      <button
                        key={coin.id}
                        onClick={() => handleSelectCoin(coin)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          idx === selectedIdx
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {coin.thumb && (
                          <img
                            src={coin.thumb}
                            alt={coin.symbol}
                            className="h-6 w-6 rounded-full"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{coin.name}</span>
                          <span className="text-muted-foreground ml-1.5">— {coin.symbol}</span>
                        </div>
                        {coin.market_cap_rank && (
                          <span className="text-[10px] text-muted-foreground">#{coin.market_cap_rank}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddCustom(true)}
            >
              + Ajouter un actif
            </Button>
          )}
        </div>

        {!pricesLoading && prices.some((p) => !p.last_updated) && (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--accent-gold)] mt-2">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Certains prix n&apos;ont pas pu être actualisés
          </div>
        )}

        <TabObjective tab={tab} currentTotal={totalUsd} />
      </div>
    </div>
  );
}
