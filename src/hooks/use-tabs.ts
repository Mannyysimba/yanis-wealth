"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tab } from "@/types";

export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTabs = useCallback(async () => {
    const { data, error } = await supabase
      .from("tabs")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching tabs:", error);
      return;
    }

    // Build tree
    const parents = (data || []).filter((t) => !t.parent_id);
    const tree = parents.map((parent) => ({
      ...parent,
      children: (data || [])
        .filter((t) => t.parent_id === parent.id)
        .sort((a, b) => a.position - b.position),
    }));

    setTabs(tree);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);

  return { tabs, loading, refetch: fetchTabs };
}
