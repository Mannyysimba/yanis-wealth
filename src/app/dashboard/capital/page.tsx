"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { convertToEur } from "@/lib/currency";
import { formatCurrency, formatEur, timeAgo } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import type { Tab, LineItem } from "@/types";

export default function CapitalPage() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    const [tabsRes, itemsRes, ratesRes] = await Promise.all([
      supabase.from("tabs").select("*").order("position", { ascending: true }),
      supabase.from("line_items").select("*"),
      supabase.from("exchange_rates").select("*").order("fetched_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (tabsRes.data) {
      const all = tabsRes.data;
      const parents = all.filter((t: Tab) => !t.parent_id && t.section === "capital");
      const tree = parents.map((p: Tab) => ({
        ...p,
        children: all.filter((c: Tab) => c.parent_id === p.id).sort((a: Tab, b: Tab) => a.position - b.position),
      }));
      setTabs(tree);
    }
    if (itemsRes.data) setLineItems(itemsRes.data);
    if (ratesRes.data?.rates) setRates(ratesRes.data.rates);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Refetch when navigating back to this page
  useEffect(() => {
    const handleRefresh = () => fetchAll();
    window.addEventListener("line-items-updated", handleRefresh);
    return () => window.removeEventListener("line-items-updated", handleRefresh);
  }, [fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Capital</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos liquidités et comptes bancaires</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          title="Actualiser"
        >
          <svg className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tabs.flatMap((tab) => {
          const items = tab.children && tab.children.length > 0 ? tab.children : [tab];
          return items.map((item) => {
            const tabItems = lineItems.filter((li) => li.tab_id === item.id);
            const rawTotal = tabItems.reduce((s, li) => s + Number(li.amount), 0);
            const eurTotal = convertToEur(rawTotal, item.currency, rates);
            const lastUpdated = tabItems.length > 0
              ? tabItems.reduce((a, b) => new Date(a.updated_at) > new Date(b.updated_at) ? a : b).updated_at
              : null;

            return (
              <Link key={item.id} href={`/dashboard/capital/${item.slug}`}>
                <div className="card-gradient-border card-hover-glow rounded-xl p-5 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-semibold">{item.name}</h3>
                    <span className={`text-base font-mono font-semibold tabular-nums ${rawTotal > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {formatCurrency(rawTotal, item.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {item.currency}{lastUpdated ? ` · ${timeAgo(lastUpdated)}` : ""}
                    </p>
                    {item.currency !== "EUR" && eurTotal > 0 && (
                      <span className="text-[11px] font-mono text-muted-foreground/70 tabular-nums">
                        {formatEur(eurTotal)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          });
        })}
      </div>
    </div>
  );
}
