"use client";

import { useTabs } from "@/hooks/use-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <p className="text-sm text-muted-foreground">Gérez vos investissements crypto et immobilier</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {investTabs.map((tab) => {
          const items =
            tab.children && tab.children.length > 0
              ? tab.children
              : [tab];
          return items.map((item) => (
            <Link key={item.id} href={`/dashboard/investissement/${item.id}`}>
              <Card className="transition-colors hover:border-primary/40 hover:bg-accent/50 cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-xs text-muted-foreground">
                    {item.currency} · Cliquer pour éditer
                  </span>
                </CardContent>
              </Card>
            </Link>
          ));
        })}
      </div>
    </div>
  );
}
