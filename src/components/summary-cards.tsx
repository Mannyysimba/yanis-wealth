"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatEur, formatPercent } from "@/lib/format";
import { AnimatedCounter } from "./animated-counter";

interface SummaryCardsProps {
  totalPatrimoine: number;
  capitalTotal: number;
  investTotal: number;
  variation24h: number;
  variationPercent: number;
  loading: boolean;
}

export function SummaryCards({
  totalPatrimoine,
  capitalTotal,
  investTotal,
  variation24h,
  variationPercent,
  loading,
}: SummaryCardsProps) {
  const cards = [
    {
      title: "Total Patrimoine",
      value: totalPatrimoine,
      isTotal: true,
    },
    {
      title: "Capital",
      value: capitalTotal,
    },
    {
      title: "Investissements",
      value: investTotal,
    },
    {
      title: "Variation 24h",
      value: Math.abs(variation24h),
      badge: formatPercent(variationPercent),
      isPositive: variation24h >= 0,
      isVariation: true,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <div
          key={card.title}
          className={`card-gradient-border card-hover-glow rounded-xl p-4 animate-slide-up stagger-${i + 1} ${
            card.isTotal ? "card-total-border" : ""
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
            {card.title}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div>
              {card.isVariation ? (
                <>
                  <p className={`text-xl font-bold tracking-tight lg:text-2xl font-mono ${
                    card.isPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                  }`}>
                    {card.isPositive ? "+" : "-"}{formatEur(card.value)}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                      card.isPositive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {card.badge}
                  </span>
                </>
              ) : (
                <AnimatedCounter value={card.value} className="text-xl font-bold tracking-tight lg:text-2xl font-mono" />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
