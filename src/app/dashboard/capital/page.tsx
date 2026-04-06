"use client";

import { useTabs } from "@/hooks/use-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function CapitalPage() {
  const { tabs, loading } = useTabs();
  const capitalTabs = tabs.filter((t) => t.section === "capital");

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">💰 Capital</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez vos liquidités et comptes bancaires</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {capitalTabs.flatMap((tab) => {
          const items = tab.children && tab.children.length > 0 ? tab.children : [tab];
          return items.map((item) => (
            <Link key={item.id} href={`/dashboard/capital/${item.slug}`}>
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
