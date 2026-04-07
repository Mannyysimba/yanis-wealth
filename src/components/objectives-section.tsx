"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEur } from "@/lib/format";
import type { Objective } from "@/types";

interface ObjectivesSectionProps {
  totalPatrimoine: number;
  loading: boolean;
}

function getMotivation(progress: number): string {
  if (progress >= 90) return "Patron vous y êtes 🔥 Dernière ligne droite.";
  if (progress >= 70) return "La majorité est faite Chef 💪 Gardez le rythme.";
  if (progress >= 50) return "La moitié du chemin Yanis. L'empire se construit.";
  if (progress >= 30) return "Bonne dynamique Patron. Chaque jour compte.";
  return "Le commencement d'un grand voyage Chef 🚀";
}

export function ObjectivesSection({ totalPatrimoine, loading: dataLoading }: ObjectivesSectionProps) {
  const [objective, setObjective] = useState<Objective | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const fetchObjective = useCallback(async () => {
    // Global objective = tab_id is null
    const { data } = await supabase
      .from("objectives")
      .select("*")
      .is("tab_id", null)
      .eq("is_completed", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setObjective(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchObjective();
  }, [fetchObjective]);

  const handleSave = async () => {
    if (!title.trim() || !targetAmount || !targetDate) return;
    const amount = parseFloat(targetAmount);

    if (objective && editing) {
      await supabase.from("objectives").update({
        title: title.trim(),
        target_amount: amount,
        target_currency: "EUR",
        target_amount_eur: amount,
        target_date: targetDate,
      }).eq("id", objective.id);
    } else {
      await supabase.from("objectives").insert({
        tab_id: null,
        title: title.trim(),
        target_amount: amount,
        target_currency: "EUR",
        target_amount_eur: amount,
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

  if (loading || dataLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // No objective yet — show CTA to create one
  if (!objective && !showForm && !editing) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold section-header">🎯 Objectif patrimoine</h3>
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-5 py-5 text-sm font-medium text-primary hover:bg-primary/10 hover:border-primary/60 transition-all duration-200"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Définir un objectif pour le patrimoine total
        </button>
      </div>
    );
  }

  // Show creation / editing form
  if (showForm || editing) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold section-header">🎯 Objectif patrimoine</h3>
        <div className="card-gradient-border rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editing ? "Modifier l'objectif" : "Nouvel objectif patrimoine"}
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-[11px]">Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Premier million" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-[11px]">Montant cible (€)</Label>
              <Input type="text" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value.replace(",", "."))} placeholder="1000000" className="mt-1 h-8 text-sm font-mono" />
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
      </div>
    );
  }

  if (!objective) return null;

  const target = Number(objective.target_amount_eur || objective.target_amount);
  const progress = target > 0 ? Math.min((totalPatrimoine / target) * 100, 100) : 0;
  const remaining = Math.max(target - totalPatrimoine, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold section-header">🎯 Objectif patrimoine</h3>

      <div className="card-gradient-border rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground/80">{objective.title}</p>
            <p className="text-xl font-bold font-mono mt-1">{formatEur(totalPatrimoine)} <span className="text-sm text-muted-foreground font-normal">/ {formatEur(target)}</span></p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-primary">{progress.toFixed(0)}%</span>
          </div>
        </div>

        <div className="h-2.5 rounded-full bg-accent overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              progress >= 80
                ? "bg-gradient-to-r from-[#F59E0B] to-[#F59E0B]"
                : "bg-gradient-to-r from-[#6366F1] to-[#A78BFA]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {remaining > 0 && (
          <p className="text-xs text-muted-foreground">
            Il vous manque <span className="font-semibold text-foreground">{formatEur(remaining)}</span> pour atteindre votre objectif
          </p>
        )}

        <p className="text-xs italic text-primary/70 pt-1 border-t border-[rgba(99,102,241,0.08)]">
          {getMotivation(progress)}
        </p>

        <div className="flex gap-1 pt-1">
          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
            setEditing(true);
            setTitle(objective.title);
            setTargetAmount((objective.target_amount_eur || objective.target_amount).toString());
            setTargetDate(objective.target_date);
          }}>
            Modifier
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
