"use client";

import { useTabs } from "@/hooks/use-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function InvestissementPage() {
  const { tabs, loading } = useTabs();
  const investTabs = tabs.filter((t) => t.section === "investissement");

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">📈 Investissements</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez vos investissements crypto et immobilier</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {investTabs.flatMap((tab) => {
          const items = tab.children && tab.children.length > 0 ? tab.children : [tab];
          return items.map((item) => (
            <Link key={item.id} href={`/dashboard/investissement/${item.slug}`}>
              <div className="card-gradient-border card-hover-glow rounded-xl p-5 cursor-pointer">
                <h3 className="text-sm font-semibold">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.currency} · Cliquer pour éditer
                </p>
              </div>
            </Link>
          ));
        })}
      </div>
    </div>
  );
}
