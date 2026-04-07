"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { getExchangeRates } from "@/lib/currency";
import { safeDateTime } from "@/lib/format";
import type { Tab, LineItem } from "@/types";

interface WealthState {
  tabs: Tab[];
  lineItems: LineItem[];
  rates: Record<string, number>;
  ratesLastUpdated: string | null;
  loading: boolean;
  refreshTotals: () => Promise<void>;
}

const WealthContext = createContext<WealthState | null>(null);

export function WealthProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 });
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string | null>(null);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(true);

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

  const refreshTotals = useCallback(async () => {
    await fetchLineItems();
  }, [fetchLineItems]);

  // Initial load
  useEffect(() => {
    fetchTabs();
    fetchLineItems();
    fetchRates();
  }, [fetchTabs, fetchLineItems, fetchRates]);

  // Listen for custom refresh events (backwards compat with window events)
  useEffect(() => {
    const handle = () => { fetchLineItems(); };
    window.addEventListener("line-items-updated", handle);
    return () => window.removeEventListener("line-items-updated", handle);
  }, [fetchLineItems]);

  const loading = tabsLoading || itemsLoading || ratesLoading;

  return (
    <WealthContext.Provider value={{ tabs, lineItems, rates, ratesLastUpdated, loading, refreshTotals }}>
      {children}
    </WealthContext.Provider>
  );
}

export function useWealth(): WealthState {
  const ctx = useContext(WealthContext);
  if (!ctx) throw new Error("useWealth must be used within WealthProvider");
  return ctx;
}
