"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatEur, safeDate } from "@/lib/format";
import { convertToEur } from "@/lib/currency";
import { CURRENCY_SYMBOLS } from "@/lib/constants";
import type { Objective, Tab, DailySnapshot } from "@/types";

interface TabObjectiveProps {
  tab: Tab;
  currentTotal: number;
}

function getMotivation(progress: number): string {
  if (progress >= 90) return "Patron vous y êtes 🔥 Dernière ligne droite.";
  if (progress >= 70) return "La majorité est faite Chef 💪 Gardez le rythme.";
  if (progress >= 50) return "La moitié du chemin Yanis. L'empire se construit.";
  if (progress >= 30) return "Bonne dynamique Patron. Chaque jour compte.";
  return "Le commencement d'un grand voyage Chef 🚀";
}

export function TabObjective({ tab, currentTotal }: TabObjectiveProps) {
  const [objective, setObjective] = useState<Objective | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const fetchObjective = useCallback(async () => {
    const [objRes, ratesRes, snapRes] = await Promise.all([
      supabase.from("objectives").select("*").eq("tab_id", tab.id).limit(1).maybeSingle(),
      supabase.from("exchange_rates").select("*").order("fetched_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("daily_snapshots").select("*").order("snapshot_date", { ascending: true }).limit(90),
    ]);
    setObjective(objRes.data);
    if (ratesRes.data?.rates) setRates(ratesRes.data.rates);
    if (snapRes.data) setSnapshots(snapRes.data);
    setLoading(false);
  }, [tab.id]);

  useEffect(() => {
    fetchObjective();
  }, [fetchObjective]);

  const handleSave = async () => {
    if (!title.trim() || !targetAmount || !targetDate) return;
    const amount = parseFloat(targetAmount);
    const eurAmount = convertToEur(amount, tab.currency, rates);

    if (objective && editing) {
      await supabase.from("objectives").update({
        title: title.trim(),
        target_amount: amount,
        target_currency: tab.currency,
        target_amount_eur: eurAmount,
        target_date: targetDate,
      }).eq("id", objective.id);
    } else {
      await supabase.from("objectives").insert({
        tab_id: tab.id,
        title: title.trim(),
        target_amount: amount,
        target_currency: tab.currency,
        target_amount_eur: eurAmount,
        target_date: targetDate,
      });
    }
    setShowForm(false);
    setEditing(false);
    fetchObjective();
  };

  const handleDelete = async () => {
    if (!objective) return;
    await supabase.from("objectives").delete().eq("id", objective.id);
    setObjective(null);
  };

  const handleMarkComplete = async () => {
    if (!objective) return;
    await supabase.from("objectives").update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    }).eq("id", objective.id);
    fetchObjective();
  };

  if (loading) return null;

  const symbol = CURRENCY_SYMBOLS[tab.currency] || tab.currency;

  // Calculate velocity from snapshots
  const velocity = (() => {
    if (snapshots.length < 2) return 0;
    const recent = snapshots.slice(-30);
    const first = Number(recent[0].total_eur);
    const last = Number(recent[recent.length - 1].total_eur);
    const days = recent.length - 1;
    return days > 0 ? (last - first) / days : 0;
  })();

  if (!objective && !showForm) {
    return (
      <div className="mt-4 pt-4 border-t border-[rgba(99,102,241,0.1)]">
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 hover:border-primary/60 transition-all duration-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Définir un objectif pour {tab.name}
        </button>
      </div>
    );
  }

  if (showForm || editing) {
    return (
      <div className="mt-4 pt-4 border-t border-[rgba(99,102,241,0.1)] space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {editing ? "Modifier l'objectif" : "Nouvel objectif"}
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-[11px]">Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mon objectif" className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-[11px]">Montant cible ({symbol})</Label>
            <Input type="text" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value.replace(",", "."))} placeholder="10000" className="mt-1 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-[11px]">Date cible</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs" onClick={handleSave}>Enregistrer</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowForm(false); setEditing(false); }}>Annuler</Button>
        </div>
      </div>
    );
  }

  if (!objective) return null;

  const target = Number(objective.target_amount);
  const progress = target > 0 ? Math.min((currentTotal / target) * 100, 100) : 0;
  const remaining = Math.max(target - currentTotal, 0);
  const remainingEur = convertToEur(remaining, tab.currency, rates);
  const daysLeft = Math.max(Math.ceil((new Date(objective.target_date).getTime() - Date.now()) / 86400000), 0);

  const projectedDate = velocity > 0 && remainingEur > 0
    ? new Date(Date.now() + (remainingEur / velocity) * 86400000)
    : null;

  const barColor = progress >= 80
    ? "from-[#F59E0B] to-[#F59E0B]"
    : "from-[#6366F1] to-[#A78BFA]";

  return (
    <div className="mt-4 pt-4 border-t border-[rgba(99,102,241,0.1)] space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          {objective.is_completed ? "✅" : "🎯"} {objective.title}
        </h4>
        <div className="flex gap-1">
          {!objective.is_completed && progress >= 100 && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-[var(--accent-green)]" onClick={handleMarkComplete}>
              Marquer atteint
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
            setEditing(true);
            setTitle(objective.title);
            setTargetAmount(objective.target_amount.toString());
            setTargetDate(objective.target_date);
          }}>
            Modifier
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            Suppr.
          </Button>
        </div>
      </div>

      {objective.is_completed ? (
        <p className="text-xs text-[var(--accent-green)]">
          Objectif atteint le {safeDate(objective.completed_at!)}
        </p>
      ) : (
        <>
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold">{progress.toFixed(1)}%</span>
              <span className="text-muted-foreground font-mono">
                {formatCurrency(currentTotal, tab.currency)} / {formatCurrency(target, tab.currency)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-accent overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
            {remaining > 0 && (
              <span>
                Reste: <span className="font-medium text-foreground">{formatCurrency(remaining, tab.currency)}</span>
                {tab.currency !== "EUR" && <span> ({formatEur(remainingEur)})</span>}
              </span>
            )}
            <span>{daysLeft}j restants</span>
            {projectedDate && remaining > 0 && (
              <span>📊 Proj: {safeDate(projectedDate)}</span>
            )}
          </div>

          <p className="text-[11px] italic text-primary/70">
            {getMotivation(progress)}
          </p>
        </>
      )}
    </div>
  );
}
