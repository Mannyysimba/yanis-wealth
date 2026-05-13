"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatEur, safeDate } from "@/lib/format";

interface ManualEntry {
  date: string;
  amount: number;
}

const STORAGE_KEY = "manual-wealth-entries-v1";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function loadEntries(): ManualEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is ManualEntry =>
        typeof e?.date === "string" && typeof e?.amount === "number"
    );
  } catch {
    return [];
  }
}

function saveEntries(entries: ManualEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage may be unavailable (private mode, quota) — fail silently
  }
}

export function ManualWealthChart() {
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [date, setDate] = useState<string>(todayISO());
  const [amount, setAmount] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(loadEntries());
    setHydrated(true);
  }, []);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  );

  const chartData = useMemo(
    () =>
      sorted.map((e) => ({
        date: safeDate(e.date, { day: "2-digit", month: "2-digit" }),
        total: e.amount,
      })),
    [sorted]
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(",", "."));
    if (!date || !Number.isFinite(parsed)) return;

    const next = entries.filter((entry) => entry.date !== date);
    next.push({ date, amount: parsed });
    next.sort((a, b) => a.date.localeCompare(b.date));

    setEntries(next);
    saveEntries(next);
    setAmount("");
    setDate(todayISO());
  };

  const handleDelete = (target: string) => {
    const next = entries.filter((entry) => entry.date !== target);
    setEntries(next);
    saveEntries(next);
  };

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const variation = latest && previous ? latest.amount - previous.amount : 0;

  return (
    <div className="card-gradient-border card-hover-glow rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="text-sm font-semibold section-header">Courbe manuelle</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ajoute un montant total à la date de ton choix
          </p>
        </div>
        {latest && (
          <div className="text-right">
            <div className="text-lg font-bold font-mono">{formatEur(latest.amount)}</div>
            {variation !== 0 && (
              <div
                className={`text-[11px] font-semibold ${
                  variation >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                }`}
              >
                {variation >= 0 ? "+" : ""}
                {formatEur(variation)}
              </div>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-end gap-2 px-5 pb-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayISO()}
            className="h-9 w-[160px]"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[11px] font-medium text-muted-foreground">Montant (€)</label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="103 000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9"
          />
        </div>
        <Button type="submit" className="h-9">
          Ajouter
        </Button>
      </form>

      <div className="chart-bg-gradient px-2 pb-4">
        {!hydrated || chartData.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            Ajoute un premier montant pour démarrer la courbe
          </div>
        ) : chartData.length === 1 ? (
          <div className="flex h-[260px] flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 h-5 w-5 rounded-full bg-[var(--accent-green)] animate-ping opacity-30" />
              <div
                className="h-5 w-5 rounded-full bg-[var(--accent-green)]"
                style={{ boxShadow: "0 0 16px rgba(34,197,94,0.6)" }}
              />
            </div>
            <p className="text-lg font-bold font-mono">{formatEur(chartData[0].total)}</p>
            <p className="text-xs text-muted-foreground">{chartData[0].date}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="manualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,197,94,0.20)" />
                  <stop offset="100%" stopColor="rgba(34,197,94,0)" />
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
                tickFormatter={(v: number) => {
                  try {
                    return new Intl.NumberFormat("fr-FR", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(v);
                  } catch {
                    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                    return v.toString();
                  }
                }}
                stroke="rgba(255,255,255,0.05)"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
                formatter={(value) => [formatEur(Number(value)), "Montant"]}
                labelFormatter={(label) => `${String(label)}`}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#22C55E"
                strokeWidth={2.5}
                fill="url(#manualGrad)"
                dot={{ r: 3, fill: "#22C55E", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#22C55E", stroke: "#fff", strokeWidth: 2 }}
                animationDuration={400}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="border-t border-border/40 px-5 py-3 max-h-[160px] overflow-y-auto">
          <p className="text-[11px] font-medium text-muted-foreground mb-2">
            Historique ({sorted.length})
          </p>
          <ul className="space-y-1">
            {[...sorted].reverse().map((entry) => (
              <li
                key={entry.date}
                className="flex items-center justify-between text-xs py-1"
              >
                <span className="text-muted-foreground font-mono">
                  {safeDate(entry.date, { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{formatEur(entry.amount)}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.date)}
                    className="text-muted-foreground hover:text-[var(--accent-red)] transition-colors"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
