"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEur } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";
import type { BreakdownItem } from "@/types";

interface AllocationChartProps {
  data: BreakdownItem[];
  loading: boolean;
  totalEur: number;
}

export function AllocationChart({ data, loading, totalEur }: AllocationChartProps) {
  return (
    <div className="card-gradient-border card-hover-glow rounded-xl">
      <div className="px-5 pt-5 pb-2">
        <h3 className="text-sm font-semibold section-header">Répartition du patrimoine</h3>
      </div>
      <div className="px-4 pb-4">
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : data.length === 0 || totalEur === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            Aucune donnée disponible
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={100}
                dataKey="value"
                nameKey="name"
                strokeWidth={2}
                stroke="var(--bg-primary)"
                animationDuration={1200}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              {/* Center text */}
              <text
                x="50%"
                y="43%"
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-foreground text-lg font-bold"
                style={{ fontSize: '16px', fontWeight: 700 }}
              >
                {formatEur(totalEur)}
              </text>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
                formatter={(value) => [
                  `${formatEur(Number(value))} (${((Number(value) / totalEur) * 100).toFixed(1)}%)`,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value) => {
                  const name = String(value);
                  const item = data.find((d) => d.name === name);
                  if (!item) return name;
                  return `${name} — ${formatEur(item.value)} (${((item.value / totalEur) * 100).toFixed(1)}%)`;
                }}
                wrapperStyle={{ fontSize: "11px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
