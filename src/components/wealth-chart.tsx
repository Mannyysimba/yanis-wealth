"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEur } from "@/lib/format";
import { TIME_RANGES } from "@/lib/constants";
import type { DailySnapshot } from "@/types";

interface WealthChartProps {
  snapshots: DailySnapshot[];
  loading: boolean;
}

export function WealthChart({ snapshots, loading }: WealthChartProps) {
  const [range, setRange] = useState("30J");

  const filtered = useMemo(() => {
    const selected = TIME_RANGES.find((r) => r.label === range);
    if (!selected || selected.days === 0) return snapshots;

    const now = new Date();
    let cutoff: Date;

    if (selected.days === -1) {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      cutoff = new Date(now.getTime() - selected.days * 86400000);
    }

    return snapshots.filter((s) => new Date(s.date) >= cutoff);
  }, [snapshots, range]);

  const chartData = filtered.map((s) => ({
    date: new Date(s.date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    }),
    fullDate: s.date,
    total: Number(s.total_eur),
    breakdown: s.breakdown_json,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Courbe de patrimoine</CardTitle>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <Button
              key={r.label}
              variant={range === r.label ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setRange(r.label)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Aucune donnée disponible
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("fr-FR", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(v)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [formatEur(Number(value)), "Total"]}
                labelFormatter={(label) => `Date: ${String(label)}`}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#wealthGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
