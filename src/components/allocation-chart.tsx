"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEur } from "@/lib/format";
import type { BreakdownItem } from "@/types";

interface AllocationChartProps {
  data: BreakdownItem[];
  loading: boolean;
}

const COLORS = ["#6366F1", "#818CF8", "#4F46E5", "#A78BFA", "#7C3AED", "#6D28D9"];

export function AllocationChart({ data, loading }: AllocationChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Répartition du patrimoine</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 || total === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Aucune donnée disponible
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
                nameKey="name"
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [
                  `${formatEur(Number(value))} (${((Number(value) / total) * 100).toFixed(1)}%)`,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value) => {
                  const name = String(value);
                  const item = data.find((d) => d.name === name);
                  if (!item) return name;
                  return `${name} — ${formatEur(item.value)} (${((item.value / total) * 100).toFixed(1)}%)`;
                }}
                wrapperStyle={{ fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
