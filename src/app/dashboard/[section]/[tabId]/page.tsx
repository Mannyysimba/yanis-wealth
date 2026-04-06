"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { LineItemForm } from "@/components/line-item-form";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tab } from "@/types";

export default function TabPage({
  params,
}: {
  params: { section: string; tabId: string };
}) {
  const [tab, setTab] = useState<Tab | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTab() {
      const { data, error } = await supabase
        .from("tabs")
        .select("*")
        .eq("id", params.tabId)
        .single();

      if (!error && data) {
        setTab(data);
      }
      setLoading(false);
    }
    fetchTab();
  }, [params.tabId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tab) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium">Onglet introuvable</p>
        <p className="text-sm text-muted-foreground">
          Cet onglet n&apos;existe pas ou a été supprimé.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <LineItemForm tab={tab} />
    </div>
  );
}
