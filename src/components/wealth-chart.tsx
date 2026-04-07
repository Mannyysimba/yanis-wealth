"use client";

import { useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEur } from "@/lib/format";
import { TIME_RANGES } from "@/lib/constants";
import type { DailySnapshot } from "@/types";

interface WealthChartProps {
  snapshots: DailySnapshot[];
  loading: boolean;
}

function ActiveDot(props: Record<string, unknown>) {
  const { cx, cy } = props as { cx: number; cy: number };
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="#6366F1"
        stroke="#6366F1"
        strokeWidth={2}
        style={{
          filter: "drop-shadow(0 0 8px rgba(99,102,241,0.8))",
        }}
      />
      <circle cx={cx} cy={cy} r={3} fill="#fff" />
    </g>
  );
}

export function WealthChart({ snapshots, loading }: WealthChartProps) {
  const [range, setRange] = useState("30J");
  const [animKey, setAnimKey] = useState(0);

  const handleRangeChange = useCallback((newRange: string) => {
    setRange(newRange);
    setAnimKey((k) => k + 1);
  }, []);

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

    return snapshots.filter((s) => new Date(s.snapshot_date) >= cutoff);
  }, [snapshots, range]);

  const chartData = filtered.map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    }),
    total: Number(s.total_eur),
  }));

  return (
    <div className="card-gradient-border card-hover-glow rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold section-header">Courbe de patrimoine</h3>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => handleRangeChange(r.label)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
                range === r.label
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-bg-gradient px-2 pb-4">
        {loading ? (
          <Skeleton className="h-[300px] w-full mx-3" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Aucune donnée disponible
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300} key={animKey}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(99,102,241,0.15)" />
                  <stop offset="100%" stopColor="rgba(99,102,241,0)" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("fr-FR", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(v)
                }
                stroke="rgba(255,255,255,0.05)"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
                formatter={(value) => [formatEur(Number(value)), "Total"]}
                labelFormatter={(label) => `${String(label)}`}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366F1"
                strokeWidth={2.5}
                fill="url(#wealthGrad)"
                dot={false}
                activeDot={<ActiveDot />}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
