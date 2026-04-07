"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { useTabs } from "@/hooks/use-tabs";
import { convertToEur } from "@/lib/currency";
import { formatEur, formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid,
  LineChart, Line, ReferenceLine,
} from "recharts";
import type { Objective, LineItem, DailySnapshot, ObjectiveWithContext } from "@/types";

function getMotivation(progress: number): string {
  if (progress >= 90) return "Patron vous y êtes 🔥 Dernière ligne droite.";
  if (progress >= 70) return "La majorité est faite Chef 💪 Gardez le rythme.";
  if (progress >= 50) return "La moitié du chemin Yanis. L'empire se construit.";
  if (progress >= 30) return "Bonne dynamique Patron. Chaque jour compte.";
  return "Le commencement d'un grand voyage Chef 🚀";
}

function getBarColor(progress: number): string {
  if (progress >= 90) return "#F59E0B";
  if (progress >= 70) return "#10B981";
  if (progress >= 30) return "#F97316";
  return "#EF4444";
}

export default function ObjectifsPage() {
  const { rates, loading: ratesLoading } = useExchangeRates();
  const { tabs, loading: tabsLoading } = useTabs();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [objRes, itemsRes, snapRes] = await Promise.all([
        supabase.from("objectives").select("*").order("created_at"),
        supabase.from("line_items").select("*"),
        supabase.from("daily_snapshots").select("*").order("snapshot_date", { ascending: true }),
      ]);
      if (objRes.data) setObjectives(objRes.data);
      if (itemsRes.data) setLineItems(itemsRes.data);
      if (snapRes.data) setSnapshots(snapRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const isLoading = loading || ratesLoading || tabsLoading;

  // Calculate velocity
  const velocityDaily = useMemo(() => {
    if (snapshots.length < 2) return 0;
    const recent = snapshots.slice(-30);
    const first = Number(recent[0].total_eur);
    const last = Number(recent[recent.length - 1].total_eur);
    const days = recent.length - 1;
    return days > 0 ? (last - first) / days : 0;
  }, [snapshots]);

  // Build enriched objectives
  const enriched = useMemo((): ObjectiveWithContext[] => {
    const allTabs = tabs.flatMap((t) =>
      t.children && t.children.length > 0 ? [...t.children, t] : [t]
    );

    return objectives.map((obj) => {
      const tab = allTabs.find((t) => t.id === obj.tab_id);
      const tabName = tab?.name || "Global";
      const tabSection = tab?.section || "—";
      const currency = obj.target_currency || tab?.currency || "EUR";

      // Current value in this tab
      const tabItems = lineItems.filter((li) => li.tab_id === obj.tab_id);
      const currentAmount = tabItems.reduce((s, li) => s + Number(li.amount), 0);
      const currentAmountEur = convertToEur(currentAmount, currency, rates);

      const targetAmount = Number(obj.target_amount);
      const progress = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
      const remaining = Math.max(targetAmount - currentAmount, 0);
      const remainingEur = convertToEur(remaining, currency, rates);
      const daysLeft = Math.max(Math.ceil((new Date(obj.target_date).getTime() - Date.now()) / 86400000), 0);

      const projectedDate = velocityDaily > 0 && remainingEur > 0
        ? new Date(Date.now() + (remainingEur / velocityDaily) * 86400000)
        : null;

      return {
        ...obj,
        tab_name: tabName,
        tab_section: tabSection,
        current_amount: currentAmount,
        current_amount_eur: currentAmountEur,
        progress,
        remaining,
        remaining_eur: remainingEur,
        days_left: daysLeft,
        velocity_daily_eur: velocityDaily,
        projected_date: projectedDate,
      };
    });
  }, [objectives, tabs, lineItems, rates, velocityDaily]);

  const active = enriched
    .filter((o) => !o.is_completed)
    .sort((a, b) => b.progress - a.progress);
  const completed = enriched.filter((o) => o.is_completed);

  // Global summary
  const totalTarget = active.reduce((s, o) => s + (Number(o.target_amount_eur) || o.remaining_eur + o.current_amount_eur), 0);
  const totalCurrent = active.reduce((s, o) => s + o.current_amount_eur, 0);
  const globalProgress = totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0;
  const globalRemaining = Math.max(totalTarget - totalCurrent, 0);
  const globalProjectedDate = velocityDaily > 0 && globalRemaining > 0
    ? new Date(Date.now() + (globalRemaining / velocityDaily) * 86400000)
    : null;

  // Bar chart data
  const barData = active.map((o) => ({
    name: o.tab_name,
    progress: Math.round(o.progress),
    color: getBarColor(o.progress),
  }));

  // Timeline chart data (project 24 months)
  const timelineData = useMemo(() => {
    if (active.length === 0) return [];
    const months: { date: string; [key: string]: string | number }[] = [];
    const now = new Date();

    for (let i = 0; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const daysFromNow = (d.getTime() - now.getTime()) / 86400000;
      const entry: { date: string; [key: string]: string | number } = {
        date: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      };
      for (const obj of active) {
        const targetEur = Number(obj.target_amount_eur) || (obj.remaining_eur + obj.current_amount_eur);
        const projected = obj.current_amount_eur + velocityDaily * daysFromNow;
        entry[obj.tab_name] = Math.min(
          Math.round((projected / targetEur) * 100),
          100
        );
      }
      months.push(entry);
    }
    return months;
  }, [active, velocityDaily]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🎯 Objectifs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suivez vos objectifs financiers par catégorie
        </p>
      </div>

      {active.length === 0 && completed.length === 0 ? (
        <div className="card-gradient-border rounded-xl p-12 text-center">
          <p className="text-lg font-semibold">Aucun objectif défini</p>
          <p className="text-sm text-muted-foreground mt-1">
            Définissez des objectifs depuis chaque onglet (Espèces, Banque, Crypto, etc.)
          </p>
        </div>
      ) : (
        <>
          {/* Hero Summary */}
          {active.length > 0 && (
            <div className="card-gradient-border card-total-border rounded-xl p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Objectif total</p>
                  <p className="text-2xl font-bold font-mono mt-1">{formatEur(totalTarget)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Patrimoine actuel</p>
                  <p className="text-2xl font-bold font-mono mt-1">{formatEur(totalCurrent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Progression</p>
                  <p className="text-2xl font-bold text-primary mt-1">{globalProgress.toFixed(1)}%</p>
                </div>
              </div>

              <div className="h-3 rounded-full bg-accent overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    globalProgress >= 80
                      ? "bg-gradient-to-r from-[#F59E0B] to-[#F59E0B]"
                      : "bg-gradient-to-r from-[#6366F1] to-[#A78BFA]"
                  }`}
                  style={{ width: `${globalProgress}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {globalRemaining > 0 && (
                  <span>Il vous manque <span className="font-semibold text-foreground">{formatEur(globalRemaining)}</span></span>
                )}
                {velocityDaily > 0 && (
                  <span>Vélocité: <span className="font-semibold text-[var(--accent-green)]">+{formatEur(velocityDaily)} / jour</span></span>
                )}
                {globalProjectedDate && (
                  <span>Tous les objectifs atteints vers le <span className="font-semibold text-foreground">{globalProjectedDate.toLocaleDateString("fr-FR")}</span></span>
                )}
              </div>
            </div>
          )}

          {/* Objectives Grid */}
          {active.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold section-header">Objectifs en cours</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {active.map((obj) => {
                  const barCol = getBarColor(obj.progress);
                  return (
                    <div key={obj.id} className="card-gradient-border card-hover-glow rounded-xl p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              obj.tab_section === "capital"
                                ? "bg-primary/10 text-primary"
                                : "bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]"
                            }`}>
                              {obj.tab_section}
                            </span>
                            <span className="text-xs text-muted-foreground">{obj.tab_name}</span>
                          </div>
                          <h4 className="text-sm font-semibold">{obj.title}</h4>
                        </div>
                        <span className="text-lg font-bold" style={{ color: barCol }}>
                          {obj.progress.toFixed(0)}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 rounded-full bg-accent overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${obj.progress}%`, backgroundColor: barCol }}
                        />
                      </div>

                      {/* Values */}
                      <div className="text-xs space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actuel</span>
                          <span className="font-mono font-medium">
                            {formatCurrency(obj.current_amount, obj.target_currency)}
                            {obj.target_currency !== "EUR" && (
                              <span className="text-muted-foreground"> ({formatEur(obj.current_amount_eur)})</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cible</span>
                          <span className="font-mono font-medium">
                            {formatCurrency(Number(obj.target_amount), obj.target_currency)}
                          </span>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground pt-1 border-t border-[rgba(99,102,241,0.08)]">
                        <span>📅 {obj.days_left}j restants</span>
                        <span>Date: {new Date(obj.target_date).toLocaleDateString("fr-FR")}</span>
                        {obj.velocity_daily_eur > 0 && (
                          <span className="text-[var(--accent-green)]">+{formatEur(obj.velocity_daily_eur)}/j</span>
                        )}
                        {obj.projected_date && obj.remaining > 0 && (
                          <span>📊 Proj: {obj.projected_date.toLocaleDateString("fr-FR")}</span>
                        )}
                      </div>

                      <p className="text-[11px] italic text-primary/70">
                        {getMotivation(obj.progress)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bar Chart */}
          {barData.length > 0 && (
            <div className="card-gradient-border rounded-xl overflow-hidden">
              <div className="px-5 pt-5 pb-2">
                <h3 className="text-sm font-semibold section-header">Progression par objectif</h3>
              </div>
              <div className="chart-bg-gradient px-3 pb-4">
                <ResponsiveContainer width="100%" height={Math.max(barData.length * 50, 150)}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} width={120} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [`${value}%`, "Progression"]}
                    />
                    <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={20}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Timeline Chart */}
          {timelineData.length > 0 && active.length > 0 && (
            <div className="card-gradient-border rounded-xl overflow-hidden">
              <div className="px-5 pt-5 pb-2">
                <h3 className="text-sm font-semibold section-header">Trajectoire projetée (24 mois)</h3>
              </div>
              <div className="chart-bg-gradient px-3 pb-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} />
                    <YAxis domain={[0, 110]} tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => `${v}%`} tickLine={false} />
                    <ReferenceLine y={100} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: "100%", fill: "#F59E0B", fontSize: 10, position: "right" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                      formatter={(value, name) => [`${value}%`, String(name)]}
                    />
                    {active.map((obj, i) => (
                      <Line
                        key={obj.id}
                        type="monotone"
                        dataKey={obj.tab_name}
                        stroke={["#6366F1", "#818CF8", "#A78BFA", "#F59E0B", "#10B981", "#3B82F6"][i % 6]}
                        strokeWidth={2}
                        strokeDasharray={i > 0 ? "6 3" : undefined}
                        dot={false}
                        animationDuration={1500}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold section-header text-muted-foreground">Objectifs atteints</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {completed.map((obj) => (
                  <div key={obj.id} className="card-gradient-border rounded-xl p-5 opacity-60">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">✅</span>
                      <div>
                        <h4 className="text-sm font-semibold">{obj.title}</h4>
                        <p className="text-xs text-muted-foreground">{obj.tab_name}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--accent-green)]">
                      Objectif atteint le {obj.completed_at
                        ? new Date(obj.completed_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cible: {formatCurrency(Number(obj.target_amount), obj.target_currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
