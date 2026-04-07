"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface Milestone {
  amount: number;
  label: string;
  emoji: string;
  message: string;
}

const MILESTONES: Milestone[] = [
  { amount: 75_000, label: "75K€", emoji: "🔥", message: "75K€ Yanis. Trois quarts du chemin vers les 6 chiffres Patron. 🔥" },
  { amount: 100_000, label: "100K€", emoji: "💎", message: "6 chiffres Yanis. WOW. +100K€ nan là c'est fort — mais on va aller plus loin. 💎" },
  { amount: 250_000, label: "250K€", emoji: "🚀", message: "250K€ Patron. T'es plus dans la moyenne là. Bienvenue dans une autre catégorie. 🚀" },
  { amount: 500_000, label: "500K€", emoji: "👑", message: "Demi-million Yanis. 500 000€. Le patrimoine d'un homme sérieux. 👑" },
  { amount: 1_000_000, label: "1M€", emoji: "🏆", message: "MILLION. 1 000 000€ Patron. On ne rigole plus. L'empire est réel. 🏆" },
];

function getCrossedMilestones(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored: number[] = JSON.parse(localStorage.getItem("yw-milestones") || "[]");
    // Clean out removed milestones that no longer exist
    const validAmounts = new Set(MILESTONES.map((m) => m.amount));
    return new Set(stored.filter((a) => validAmounts.has(a)));
  } catch {
    return new Set();
  }
}

function markMilestoneCrossed(amount: number) {
  const crossed = getCrossedMilestones();
  crossed.add(amount);
  localStorage.setItem("yw-milestones", JSON.stringify(Array.from(crossed)));
}

export function getNextMilestone(totalEur: number): { milestone: Milestone; progress: number } | null {
  const next = MILESTONES.find((m) => totalEur < m.amount);
  if (!next) return null;
  const prevAmount = MILESTONES[MILESTONES.indexOf(next) - 1]?.amount || 0;
  const progress = ((totalEur - prevAmount) / (next.amount - prevAmount)) * 100;
  return { milestone: next, progress: Math.min(Math.max(progress, 0), 100) };
}

export function checkForNewMilestone(totalEur: number): Milestone | null {
  if (totalEur <= 0) return null;
  const crossed = getCrossedMilestones();
  for (const m of MILESTONES) {
    if (totalEur >= m.amount && !crossed.has(m.amount)) {
      return m;
    }
  }
  return null;
}

export function MilestoneCelebration({
  milestone,
  onDone,
}: {
  milestone: Milestone;
  onDone: () => void;
}) {
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = useCallback(() => {
    markMilestoneCrossed(milestone.amount);
    if (timerRef.current) clearInterval(timerRef.current);
    onDone();
  }, [milestone.amount, onDone]);

  useEffect(() => {
    // Fire confetti — dynamic import to avoid SSR/Safari iOS crash
    let cancelled = false;
    import("canvas-confetti").then((mod) => {
      if (cancelled) return;
      const confetti = mod.default;
      const duration = 4000;
      const end = Date.now() + duration;

      const frame = () => {
        if (cancelled) return;
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#6366F1", "#A78BFA", "#F59E0B"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#6366F1", "#A78BFA", "#F59E0B"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }).catch(() => {
      // Silently fail — confetti is cosmetic
    });

    // Countdown
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          dismiss();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dismiss]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="text-center px-6 max-w-md animate-fade-in-scale">
        <div className="text-7xl mb-6">{milestone.emoji}</div>
        <p className="text-4xl font-bold font-mono text-[#F59E0B] mb-4 tracking-tight">
          {milestone.label}
        </p>
        <p className="text-base text-white/90 leading-relaxed mb-8">
          {milestone.message}
        </p>

        {/* Countdown bar */}
        <div className="h-1 w-48 mx-auto rounded-full bg-white/10 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#F59E0B] transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / 5) * 100}%` }}
          />
        </div>

        <button
          onClick={dismiss}
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

export function NextMilestoneBar({ totalEur }: { totalEur: number }) {
  const next = getNextMilestone(totalEur);
  if (!next || totalEur <= 0) return null;

  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">
            Prochain palier : <span className="font-semibold text-foreground">{next.milestone.label}</span>
          </span>
          <span className="font-mono text-muted-foreground">{next.progress.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-accent overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#A78BFA] transition-all duration-500"
            style={{ width: `${next.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
