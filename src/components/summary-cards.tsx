"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEur, formatPercent } from "@/lib/format";

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
      value: formatEur(totalPatrimoine),
      highlight: true,
    },
    {
      title: "Capital Total",
      value: formatEur(capitalTotal),
    },
    {
      title: "Investissements",
      value: formatEur(investTotal),
    },
    {
      title: "Variation 24h",
      value: `${formatEur(Math.abs(variation24h))}`,
      badge: formatPercent(variationPercent),
      isPositive: variation24h >= 0,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={card.highlight ? "border-primary/30 bg-primary/5" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div>
                <p className="text-xl font-bold tracking-tight lg:text-2xl font-mono">
                  {card.value}
                </p>
                {card.badge && (
                  <span
                    className={`mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                      card.isPositive
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {card.isPositive ? "+" : ""}{card.badge}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
