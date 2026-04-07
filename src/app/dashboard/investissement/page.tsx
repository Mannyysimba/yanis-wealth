"use client";

import { useTabs } from "@/hooks/use-tabs";
import { useLineItems } from "@/hooks/use-line-items";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { convertToEur } from "@/lib/currency";
import { formatCurrency, formatEur, timeAgo } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function InvestissementPage() {
  const { tabs, loading: tabsLoading } = useTabs();
  const { lineItems, loading: itemsLoading } = useLineItems();
  const { rates } = useExchangeRates();
  const investTabs = tabs.filter((t) => t.section === "investissement");
  const loading = tabsLoading || itemsLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investissements</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerez vos investissements crypto et immobilier</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {investTabs.flatMap((tab) => {
          const items = tab.children && tab.children.length > 0 ? tab.children : [tab];
          return items.map((item) => {
            const tabItems = lineItems.filter((li) => li.tab_id === item.id);
            const rawTotal = tabItems.reduce((s, li) => s + Number(li.amount), 0);
            const eurTotal = convertToEur(rawTotal, item.currency, rates);
            const lastUpdated = tabItems.length > 0
              ? tabItems.reduce((a, b) => new Date(a.updated_at) > new Date(b.updated_at) ? a : b).updated_at
              : null;

            return (
              <Link key={item.id} href={`/dashboard/investissement/${item.slug}`}>
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
