"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { getExchangeRates } from "@/lib/currency";
import { fetchAllPrices, getCoinId, type AssetPrice } from "@/lib/prices";
import { isCryptoTab } from "@/lib/crypto";
import { safeDateTime } from "@/lib/format";
import type { Tab, LineItem } from "@/types";

interface WealthState {
  tabs: Tab[];
  lineItems: LineItem[];
  rates: Record<string, number>;
  cryptoPrices: Record<string, number>;
  ratesLastUpdated: string | null;
  loading: boolean;
  refreshTotals: () => Promise<void>;
}

const WealthContext = createContext<WealthState | null>(null);

function buildCryptoPriceMap(prices: AssetPrice[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of prices) {
    map[p.symbol] = p.price_usd;
  }
  return map;
}

export function WealthProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 });
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string | null>(null);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(true);
  const priceInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTabs = useCallback(async () => {
    const { data } = await supabase
      .from("tabs")
      .select("*")
      .order("position", { ascending: true });

    if (data) {
      const parents = data.filter((t: Tab) => !t.parent_id);
      const tree = parents.map((parent: Tab) => ({
        ...parent,
        children: data
          .filter((t: Tab) => t.parent_id === parent.id)
          .sort((a: Tab, b: Tab) => a.position - b.position),
      }));
      setTabs(tree);
    }
    setTabsLoading(false);
  }, []);

  const fetchLineItems = useCallback(async () => {
    const { data } = await supabase.from("line_items").select("*");
    if (data) setLineItems(data);
    setItemsLoading(false);
  }, []);

  const fetchRates = useCallback(async () => {
    const r = await getExchangeRates();
    setRates(r);
    setRatesLastUpdated(safeDateTime(new Date()));
    setRatesLoading(false);
  }, []);

  const fetchCryptoPrices = useCallback(async (currentTabs: Tab[], currentItems: LineItem[]) => {
    // Find all crypto tab IDs
    const allFlat = currentTabs.flatMap((t) =>
      t.children && t.children.length > 0 ? t.children : [t]
    );
    const cryptoTabIds = new Set(
      allFlat.filter((t) => isCryptoTab(t, currentTabs)).map((t) => t.id)
    );
    if (cryptoTabIds.size === 0) {
      setCryptoPrices({});
      return;
    }

    // Collect unique ticker symbols from crypto line items
    const symbolSet = new Set<string>();
    for (const li of currentItems) {
      if (cryptoTabIds.has(li.tab_id)) {
        symbolSet.add(li.label);
      }
    }
    const symbols = Array.from(symbolSet);

    // Resolve CoinGecko IDs for custom coins (not in KNOWN_COINS)
    const extraIds: string[] = [];
    for (let i = 0; i < symbols.length; i++) {
      const coinId = getCoinId(symbols[i]);
      if (coinId) extraIds.push(coinId);
    }

    const prices = await fetchAllPrices(extraIds);
    setCryptoPrices(buildCryptoPriceMap(prices));
  }, []);

  const refreshTotals = useCallback(async () => {
    const { data } = await supabase.from("line_items").select("*");
    if (data) {
      setLineItems(data);
      // Re-fetch crypto prices with current tabs and new items
      const currentTabs = tabs;
      if (currentTabs.length > 0) {
        fetchCryptoPrices(currentTabs, data);
      }
    }
  }, [tabs, fetchCryptoPrices]);

  // Initial load
  useEffect(() => {
    fetchTabs();
    fetchLineItems();
    fetchRates();
  }, [fetchTabs, fetchLineItems, fetchRates]);

  // Fetch crypto prices once tabs and items are loaded
  useEffect(() => {
    if (tabsLoading || itemsLoading) return;
    fetchCryptoPrices(tabs, lineItems);
  }, [tabsLoading, itemsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh crypto prices every 5 minutes
  useEffect(() => {
    if (tabsLoading || itemsLoading) return;
    priceInterval.current = setInterval(() => {
      fetchCryptoPrices(tabs, lineItems);
    }, 5 * 60 * 1000);
    return () => {
      if (priceInterval.current) clearInterval(priceInterval.current);
    };
  }, [tabsLoading, itemsLoading, tabs, lineItems, fetchCryptoPrices]);

  // Listen for custom refresh events (backwards compat with window events)
  useEffect(() => {
    const handle = () => { fetchLineItems(); };
    window.addEventListener("line-items-updated", handle);
    return () => window.removeEventListener("line-items-updated", handle);
  }, [fetchLineItems]);

  const loading = tabsLoading || itemsLoading || ratesLoading;

  return (
    <WealthContext.Provider value={{ tabs, lineItems, rates, cryptoPrices, ratesLastUpdated, loading, refreshTotals }}>
      {children}
    </WealthContext.Provider>
  );
}

export function useWealth(): WealthState {
  const ctx = useContext(WealthContext);
  if (!ctx) throw new Error("useWealth must be used within WealthProvider");
  return ctx;
}
