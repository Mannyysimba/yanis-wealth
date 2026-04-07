"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { useTabs } from "@/hooks/use-tabs";
import { convertToEur } from "@/lib/currency";
import { formatEur, formatPercent, safeDate } from "@/lib/format";
import { SummaryCards } from "@/components/summary-cards";
import { WealthChart } from "@/components/wealth-chart";
import { AllocationChart } from "@/components/allocation-chart";
import { CurrencyTable } from "@/components/currency-table";
import { ObjectivesSection } from "@/components/objectives-section";
import { MilestoneCelebration, NextMilestoneBar, checkForNewMilestone } from "@/components/milestone-celebration";
import type { LineItem, DailySnapshot, BreakdownItem } from "@/types";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function DashboardPage() {
  const { rates, loading: ratesLoading, lastUpdated } = useExchangeRates();
  const { tabs, loading: tabsLoading } = useTabs();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [activeMilestone, setActiveMilestone] = useState<{ amount: number; label: string; emoji: string; message: string } | null>(null);
  const upsertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    const [itemsRes, snapshotsRes] = await Promise.all([
      supabase.from("line_items").select("*"),
      supabase
        .from("daily_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: true }),
    ]);
    if (itemsRes.data) setLineItems(itemsRes.data);
    if (snapshotsRes.data) setSnapshots(snapshotsRes.data);
    setItemsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Supabase realtime: re-fetch when line_items change
  useEffect(() => {
    const channel = supabase
      .channel("line_items_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "line_items" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const loading = ratesLoading || tabsLoading || itemsLoading;

  const calculations = useMemo(() => {
    const allTabs = tabs.flatMap((t) =>
      t.children && t.children.length > 0 ? t.children : [t]
    );

    let capitalTotal = 0;
    let investTotal = 0;
    const currencyAmounts: Record<string, number> = { EUR: 0, MAD: 0, AED: 0, USD: 0 };
    const categoryTotals: Record<string, number> = {
      Espèces: 0,
      Banque: 0,
      Crypto: 0,
      Immobilier: 0,
    };
    const breakdown: Record<string, number> = {};

    for (const tab of allTabs) {
      const tabItems = lineItems.filter((li) => li.tab_id === tab.id);
      const rawSum = tabItems.reduce((s, li) => s + Number(li.amount), 0);

      if (tab.currency in currencyAmounts) {
        currencyAmounts[tab.currency] += rawSum;
      }

      const eurValue = convertToEur(rawSum, tab.currency, rates);
      breakdown[tab.name] = eurValue;
      const parent = tabs.find((p) => p.id === tab.parent_id || p.id === tab.id);
      const parentName = parent?.name || tab.name;

      if (["Tangem", "Trust Wallet", "Ledger", "Crypto"].includes(parentName)) {
        categoryTotals["Crypto"] += eurValue;
      } else if (parentName.includes("Immobilier") || parentName === "Immobilier") {
        categoryTotals["Immobilier"] += eurValue;
      } else if (parentName.includes("Espèces") || parentName === "Espèces") {
        categoryTotals["Espèces"] += eurValue;
      } else if (parentName.includes("Banque") || parentName === "Banque") {
        categoryTotals["Banque"] += eurValue;
      }

      if (tab.section === "capital" || parent?.section === "capital") {
        capitalTotal += eurValue;
      } else {
        investTotal += eurValue;
      }
    }

    const totalPatrimoine = capitalTotal + investTotal;

    // Variation = compare to previous snapshot (not today's)
    let variation24h = 0;
    let variationPercent = 0;
    const pastSnapshots = snapshots.filter((s) => s.snapshot_date !== todayISO());
    if (pastSnapshots.length > 0) {
      const yesterday = pastSnapshots[pastSnapshots.length - 1];
      const yesterdayTotal = Number(yesterday.total_eur);
      variation24h = totalPatrimoine - yesterdayTotal;
      variationPercent =
        yesterdayTotal > 0
          ? ((totalPatrimoine - yesterdayTotal) / yesterdayTotal) * 100
          : 0;
    }

    const allocation: BreakdownItem[] = Object.entries(categoryTotals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: "" }));

    const currencyRows = Object.entries(currencyAmounts).map(
      ([currency, rawAmount]) => ({
        currency,
        rawAmount,
        rate: rates[currency] || 1,
        convertedEur: convertToEur(rawAmount, currency, rates),
      })
    );

    return {
      totalPatrimoine,
      capitalTotal,
      investTotal,
      variation24h,
      variationPercent,
      allocation,
      currencyRows,
      breakdown,
    };
  }, [tabs, lineItems, rates, snapshots]);

  // Check for milestone celebrations
  useEffect(() => {
    if (loading || calculations.totalPatrimoine <= 0) return;
    const milestone = checkForNewMilestone(calculations.totalPatrimoine);
    if (milestone) setActiveMilestone(milestone);
  }, [loading, calculations.totalPatrimoine]);

  // Auto-upsert today's snapshot whenever totalPatrimoine changes (debounced 2s)
  useEffect(() => {
    if (loading || calculations.totalPatrimoine === 0) return;

    if (upsertTimer.current) clearTimeout(upsertTimer.current);
    upsertTimer.current = setTimeout(async () => {
      const today = todayISO();
      await supabase.from("daily_snapshots").upsert(
        {
          snapshot_date: today,
          total_eur: calculations.totalPatrimoine,
          capital_eur: calculations.capitalTotal,
          investissement_eur: calculations.investTotal,
          breakdown_json: calculations.breakdown,
          rates_used: rates,
        },
        { onConflict: "snapshot_date" }
      );
      // Re-fetch snapshots to keep chart in sync
      const { data } = await supabase
        .from("daily_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: true });
      if (data) setSnapshots(data);
    }, 2000);

    return () => {
      if (upsertTimer.current) clearTimeout(upsertTimer.current);
    };
  }, [loading, calculations.totalPatrimoine, calculations.capitalTotal, calculations.investTotal, calculations.breakdown, rates]);

  // Build chart data: historical snapshots + live today point
  const chartData = useMemo(() => {
    const today = todayISO();
    const points = snapshots
      .filter((s) => s.snapshot_date !== today)
      .map((s) => ({
        date: safeDate(s.snapshot_date, { day: "2-digit", month: "2-digit" }),
        total: Number(s.total_eur),
      }));

    // Always add today's live point if we have data
    if (calculations.totalPatrimoine > 0 || lineItems.length > 0) {
      points.push({
        date: safeDate(new Date(), { day: "2-digit", month: "2-digit" }),
        total: calculations.totalPatrimoine,
      });
    }

    return points;
  }, [snapshots, calculations.totalPatrimoine, lineItems.length]);

  const today = safeDate(new Date(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Milestone celebration */}
      {activeMilestone && (
        <MilestoneCelebration
          milestone={activeMilestone}
          onDone={() => setActiveMilestone(null)}
        />
      )}

      {/* Hero Section */}
      <div className="title-gradient rounded-2xl p-6 -mx-2 animate-fade-in">
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Bonjour Patron</h1>
        {!loading && (
          <div className="mt-3 flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-bold tracking-tight font-mono lg:text-4xl">
              {formatEur(calculations.totalPatrimoine)}
            </span>
            {calculations.variation24h !== 0 && (
              <span className={`text-sm font-semibold ${
                calculations.variation24h >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
              }`}>
                {calculations.variation24h >= 0 ? "+" : ""}{formatEur(calculations.variation24h)}
                {" "}({formatPercent(calculations.variationPercent)}) depuis hier
              </span>
            )}
          </div>
        )}
        {!loading && (
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            1 € = {(rates.MAD || 10.85).toFixed(2)} MAD · {(rates.AED || 3.97).toFixed(2)} AED · {(rates.USD || 1.08).toFixed(2)} $
            {lastUpdated && <span className="ml-2 text-muted-foreground/60">· {lastUpdated}</span>}
          </p>
        )}
        {!loading && <NextMilestoneBar totalEur={calculations.totalPatrimoine} />}
      </div>

      <SummaryCards
        totalPatrimoine={calculations.totalPatrimoine}
        capitalTotal={calculations.capitalTotal}
        investTotal={calculations.investTotal}
        variation24h={calculations.variation24h}
        variationPercent={calculations.variationPercent}
        loading={loading}
      />

      <WealthChart chartData={chartData} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <AllocationChart
          data={calculations.allocation}
          loading={loading}
          totalEur={calculations.totalPatrimoine}
        />
        <CurrencyTable
          rows={calculations.currencyRows}
          loading={loading}
          lastUpdated={lastUpdated}
        />
      </div>

      <ObjectivesSection
        totalPatrimoine={calculations.totalPatrimoine}
        loading={loading}
      />
    </div>
  );
}
