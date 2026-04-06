"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEur } from "@/lib/format";
import type { Objective, DailySnapshot } from "@/types";

interface ObjectivesSectionProps {
  totalPatrimoine: number;
  snapshots: DailySnapshot[];
  loading: boolean;
}

function getMotivation(progress: number, remaining: number): string {
  if (progress >= 80) {
    return `Patron vous y êtes presque 🔥 Plus que ${formatEur(remaining)} et c'est dans la poche.`;
  }
  if (progress >= 50) {
    return "La moitié du chemin est faite Chef. Continuez comme ça 💪";
  }
  if (progress >= 20) {
    return `On construit l'empire brique par brique Yanis. ${formatEur(remaining)} de plus chaque jour et c'est réglé.`;
  }
  return `Chaque voyage commence par un premier pas Patron. Cap sur ${formatEur(remaining)} 🚀`;
}

export function ObjectivesSection({ totalPatrimoine, snapshots, loading: dataLoading }: ObjectivesSectionProps) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDate, setNewDate] = useState("");

  const fetchObjectives = useCallback(async () => {
    const { data } = await supabase
      .from("objectives")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setObjectives(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newTarget || !newDate) return;
    await supabase.from("objectives").insert({
      title: newTitle.trim(),
      target_amount_eur: parseFloat(newTarget),
      target_date: newDate,
    });
    setNewTitle("");
    setNewTarget("");
    setNewDate("");
    setDialogOpen(false);
    fetchObjectives();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("objectives").delete().eq("id", id);
    fetchObjectives();
  };

  // Calculate avg daily gain from last 30 snapshots
  const avgDailyGain = (() => {
    if (snapshots.length < 2) return 0;
    const recent = snapshots.slice(-30);
    const first = Number(recent[0].total_eur);
    const last = Number(recent[recent.length - 1].total_eur);
    const days = recent.length - 1;
    return days > 0 ? (last - first) / days : 0;
  })();

  if (loading || dataLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold section-header">🎯 Mes Objectifs</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors h-9 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
              + Ajouter un objectif
            </span>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel objectif</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Titre</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="100K€ de patrimoine"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Montant cible (EUR)</Label>
                <Input
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="100000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Date cible</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                Créer l&apos;objectif
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {objectives.length === 0 ? (
        <div className="card-gradient-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucun objectif défini</p>
          <p className="text-xs text-muted-foreground mt-1">Ajoutez un objectif pour suivre votre progression</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {objectives.map((obj) => {
            const target = Number(obj.target_amount_eur);
            const progress = Math.min((totalPatrimoine / target) * 100, 100);
            const remaining = Math.max(target - totalPatrimoine, 0);
            const daysLeft = Math.max(
              Math.ceil((new Date(obj.target_date).getTime() - Date.now()) / 86400000),
              0
            );
            const projectedDate =
              avgDailyGain > 0 && remaining > 0
                ? new Date(Date.now() + (remaining / avgDailyGain) * 86400000)
                : null;

            return (
              <div key={obj.id} className="card-gradient-border card-hover-glow rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">{obj.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Objectif : {formatEur(target)} · Échéance : {new Date(obj.target_date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(obj.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{progress.toFixed(1)}%</span>
                    <span className="text-muted-foreground">{formatEur(totalPatrimoine)} / {formatEur(target)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-accent overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#A78BFA] transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {remaining > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Il vous manque <span className="font-semibold text-foreground">{formatEur(remaining)}</span>
                    {" · "}{daysLeft}j restants
                  </p>
                )}

                {projectedDate && remaining > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    📊 Projection : {projectedDate.toLocaleDateString("fr-FR")} (à rythme actuel)
                  </p>
                )}

                <p className="text-xs italic text-primary/80 pt-1 border-t border-[rgba(99,102,241,0.1)]">
                  {getMotivation(progress, remaining)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
