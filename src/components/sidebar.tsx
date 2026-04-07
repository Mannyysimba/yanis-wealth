"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { formatCurrency, formatEur } from "@/lib/format";
import { convertToEur } from "@/lib/currency";
import { isCryptoTab, getCryptoTabUsdTotal } from "@/lib/crypto";
import { useWealth } from "@/contexts/wealth-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { LineItem } from "@/types";

const sectionLabels: Record<string, string> = {
  capital: "CAPITAL",
  investissement: "INVESTISSEMENT",
};

function getTabTotal(tabId: string, lineItems: LineItem[]): number {
  return lineItems
    .filter((li) => li.tab_id === tabId)
    .reduce((s, li) => s + Number(li.amount), 0);
}

export function Sidebar() {
  const pathname = usePathname();
  const { tabs, lineItems, rates, cryptoPrices, loading } = useWealth();

  const capitalTabs = tabs.filter((t) => t.section === "capital");
  const investTabs = tabs.filter((t) => t.section === "investissement");

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-[rgba(99,102,241,0.12)] bg-[var(--bg-secondary)] h-screen sticky top-0">
      {/* Gradient right border */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-[#6366F1]/40 via-[#A78BFA]/20 to-transparent" />

      <div className="flex items-center gap-3 px-5 py-5 border-b border-[rgba(99,102,241,0.12)]">
        <Image src="/logo.svg" alt="YW" width={36} height={36} className="rounded-lg" />
        <span className="text-base font-semibold tracking-tight">Yanis Wealth</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
            pathname === "/dashboard"
              ? "bg-primary/15 text-primary shadow-[0_0_12px_rgba(99,102,241,0.2)]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>

        <Link
          href="/dashboard/objectifs"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
            pathname === "/dashboard/objectifs"
              ? "bg-primary/15 text-primary shadow-[0_0_12px_rgba(99,102,241,0.2)]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Objectifs
        </Link>

        {loading ? (
          <div className="space-y-2 px-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : (
          <>
            {[
              { key: "capital", items: capitalTabs },
              { key: "investissement", items: investTabs },
            ].map(({ key, items }) => (
              <div key={key} className="space-y-0.5">
                <p className="section-header mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {sectionLabels[key]}
                </p>
                {items.map((tab) => {
                  const hasChildren = tab.children && tab.children.length > 0;
                  if (hasChildren) {
                    const parentTotalEur = tab.children!.reduce((sum, child) => {
                      if (isCryptoTab(child, tabs)) {
                        const usdTotal = getCryptoTabUsdTotal(child.id, lineItems, cryptoPrices);
                        return sum + convertToEur(usdTotal, "USD", rates);
                      }
                      const childTotal = getTabTotal(child.id, lineItems);
                      return sum + convertToEur(childTotal, child.currency, rates);
                    }, 0);

                    return (
                      <div key={tab.id} className="space-y-0.5">
                        <div className="flex items-center justify-between px-3 py-1">
                          <p className="text-xs font-semibold text-foreground/70">
                            {tab.name}
                          </p>
                          {parentTotalEur > 0 && (
                            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                              {formatEur(parentTotalEur)}
                            </span>
                          )}
                        </div>
                        {tab.children!.map((child) => {
                          const crypto = isCryptoTab(child, tabs);
                          const displayTotal = crypto
                            ? getCryptoTabUsdTotal(child.id, lineItems, cryptoPrices)
                            : getTabTotal(child.id, lineItems);
                          const displayCurrency = crypto ? "USD" : child.currency;
                          return (
                            <Link
                              key={child.id}
                              href={`/dashboard/${key}/${child.slug}`}
                              className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-1.5 pl-7 text-sm transition-all duration-150",
                                pathname === `/dashboard/${key}/${child.slug}`
                                  ? "bg-primary/15 text-primary shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              )}
                            >
                              <span>{child.name}</span>
                              {displayTotal > 0 && (
                                <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">
                                  {formatCurrency(displayTotal, displayCurrency)}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    );
                  }

                  const tabTotal = getTabTotal(tab.id, lineItems);
                  return (
                    <Link
                      key={tab.id}
                      href={`/dashboard/${key}/${tab.slug}`}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-all duration-150",
                        pathname === `/dashboard/${key}/${tab.slug}`
                          ? "bg-primary/15 text-primary shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{tab.name}</span>
                      {tabTotal > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">
                          {formatCurrency(tabTotal, tab.currency)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-[rgba(99,102,241,0.12)] px-3 py-3 flex items-center justify-between">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-150",
            pathname === "/dashboard/settings"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Réglages
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
