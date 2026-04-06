"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { useTabs } from "@/hooks/use-tabs";
import { convertToEur } from "@/lib/currency";
import { SummaryCards } from "@/components/summary-cards";
import { WealthChart } from "@/components/wealth-chart";
import { AllocationChart } from "@/components/allocation-chart";
import { CurrencyTable } from "@/components/currency-table";
import type { LineItem, DailySnapshot, BreakdownItem } from "@/types";

export default function DashboardPage() {
  const { rates, loading: ratesLoading, lastUpdated } = useExchangeRates();
  const { tabs, loading: tabsLoading } = useTabs();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [itemsRes, snapshotsRes] = await Promise.all([
        supabase.from("line_items").select("*"),
        supabase
          .from("daily_snapshots")
          .select("*")
          .order("date", { ascending: true }),
      ]);
      if (itemsRes.data) setLineItems(itemsRes.data);
      if (snapshotsRes.data) setSnapshots(snapshotsRes.data);
      setItemsLoading(false);
    }
    fetchData();
  }, []);

  const loading = ratesLoading || tabsLoading || itemsLoading;

  // Calculate totals by category
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

    for (const tab of allTabs) {
      const tabItems = lineItems.filter((li) => li.tab_id === tab.id);
      const rawSum = tabItems.reduce((s, li) => s + Number(li.amount), 0);

      if (tab.currency in currencyAmounts) {
        currencyAmounts[tab.currency] += rawSum;
      }

      const eurValue = convertToEur(rawSum, tab.currency, rates);

      // Find parent tab name for category
      const parent = tabs.find(
        (p) => p.id === tab.parent_id || p.id === tab.id
      );
      const parentName = parent?.name || tab.name;

      if (
        parentName === "Tangem" ||
        parentName === "Trust Wallet" ||
        parentName === "Ledger"
      ) {
        categoryTotals["Crypto"] += eurValue;
      } else if (parentName === "Immobilier") {
        categoryTotals["Immobilier"] += eurValue;
      } else if (parentName === "Espèces") {
        categoryTotals["Espèces"] += eurValue;
      } else if (parentName === "Banque") {
        categoryTotals["Banque"] += eurValue;
      }

      if (tab.section === "capital" || parent?.section === "capital") {
        capitalTotal += eurValue;
      } else {
        investTotal += eurValue;
      }
    }

    const totalPatrimoine = capitalTotal + investTotal;

    // Variation from yesterday
    let variation24h = 0;
    let variationPercent = 0;
    if (snapshots.length > 0) {
      const yesterday = snapshots[snapshots.length - 1];
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
    };
  }, [tabs, lineItems, rates, snapshots]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Vue d&apos;ensemble de votre patrimoine
        </p>
      </div>

      <SummaryCards
        totalPatrimoine={calculations.totalPatrimoine}
        capitalTotal={calculations.capitalTotal}
        investTotal={calculations.investTotal}
        variation24h={calculations.variation24h}
        variationPercent={calculations.variationPercent}
        loading={loading}
      />

      <WealthChart snapshots={snapshots} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <AllocationChart data={calculations.allocation} loading={loading} />
        <CurrencyTable
          rows={calculations.currencyRows}
          loading={loading}
          lastUpdated={lastUpdated}
        />
      </div>
    </div>
  );
}
