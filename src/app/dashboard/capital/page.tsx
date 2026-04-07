"use client";

import { useWealth } from "@/contexts/wealth-context";
import { convertToEur } from "@/lib/currency";
import { isCryptoTab, getCryptoTabUsdTotal } from "@/lib/crypto";
import { formatCurrency, formatEur, timeAgo } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function CapitalPage() {
  const { tabs, lineItems, rates, cryptoPrices, loading, refreshTotals } = useWealth();
  const capitalTabs = tabs.filter((t) => t.section === "capital");

  const flatTabs = capitalTabs.flatMap((tab) =>
    tab.children && tab.children.length > 0 ? tab.children : [tab]
  );

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
          onClick={() => refreshTotals()}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Actualiser"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {flatTabs.map((item) => {
          const crypto = isCryptoTab(item, tabs);
          const tabItems = lineItems.filter((li) => li.tab_id === item.id);

          let displayTotal: number;
          let displayCurrency: string;
          let eurTotal: number;

          if (crypto) {
            const usdTotal = getCryptoTabUsdTotal(item.id, lineItems, cryptoPrices);
            displayTotal = usdTotal;
            displayCurrency = "USD";
            eurTotal = convertToEur(usdTotal, "USD", rates);
          } else {
            displayTotal = tabItems.reduce((s, li) => s + Number(li.amount), 0);
            displayCurrency = item.currency;
            eurTotal = convertToEur(displayTotal, item.currency, rates);
          }

          const lastUpdated = tabItems.length > 0
            ? tabItems.reduce((a, b) => new Date(a.updated_at) > new Date(b.updated_at) ? a : b).updated_at
            : null;

          return (
            <Link key={item.id} href={`/dashboard/capital/${item.slug}`}>
              <div className="card-gradient-border card-hover-glow rounded-xl p-5 cursor-pointer">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold">{item.name}</h3>
                  <span className={`text-base font-mono font-semibold tabular-nums ${displayTotal > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {formatCurrency(displayTotal, displayCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {displayCurrency}{lastUpdated ? ` · ${timeAgo(lastUpdated)}` : ""}
                  </p>
                  {displayCurrency !== "EUR" && eurTotal > 0 && (
                    <span className="text-[11px] font-mono text-muted-foreground/70 tabular-nums">
                      {formatEur(eurTotal)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
