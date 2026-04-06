"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCY_SYMBOLS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import type { LineItem, Tab } from "@/types";

interface LineItemFormProps {
  tab: Tab;
}

export function LineItemForm({ tab }: LineItemFormProps) {
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [lastModified, setLastModified] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("line_items")
      .select("*")
      .eq("tab_id", tab.id)
      .order("position", { ascending: true });

    if (!error && data) {
      setItems(data);
      if (data.length > 0) {
        const latest = data.reduce((a, b) =>
          new Date(a.updated_at) > new Date(b.updated_at) ? a : b
        );
        setLastModified(latest.updated_at);
      }
    }
    setLoading(false);
  }, [tab.id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAmountChange = (id: string, value: string) => {
    const num = parseFloat(value.replace(/[^\d.,\-]/g, "").replace(",", ".")) || 0;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: num } : item))
    );
  };

  const handleBlurSave = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const now = new Date().toISOString();
    await supabase
      .from("line_items")
      .update({ amount: item.amount, updated_at: now })
      .eq("id", id);
    setLastModified(now);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    for (const item of items) {
      await supabase
        .from("line_items")
        .update({ amount: item.amount, updated_at: now })
        .eq("id", item.id);
    }
    setLastModified(now);
    setSaving(false);
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    const maxPos = items.reduce((max, i) => Math.max(max, i.position), -1);
    const { data, error } = await supabase
      .from("line_items")
      .insert({
        tab_id: tab.id,
        label: newLabel.trim(),
        amount: 0,
        currency: tab.currency,
        position: maxPos + 1,
      })
      .select()
      .single();

    if (!error && data) {
      setItems((prev) => [...prev, data]);
      setNewLabel("");
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("line_items").delete().eq("id", id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRename = async (id: string) => {
    if (!editLabel.trim()) return;
    await supabase.from("line_items").update({ label: editLabel.trim() }).eq("id", id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, label: editLabel.trim() } : item
      )
    );
    setEditingId(null);
    setEditLabel("");
  };

  const symbol = CURRENCY_SYMBOLS[tab.currency] || tab.currency;

  return (
    <div className="card-gradient-border rounded-xl">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-lg font-semibold">{tab.name}</h2>
          {lastModified && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Dernière mise à jour : {timeAgo(lastModified)}
            </p>
          )}
        </div>
        <span className="rounded-md bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
          {tab.currency}
        </span>
      </div>
      <div className="px-5 pb-5 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            {items.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">Aucune valeur</p>
                <p className="text-xs text-muted-foreground mt-1">Cliquez ci-dessous pour ajouter une ligne</p>
              </div>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-end gap-3">
                <div className="flex-1">
                  {editingId === item.id ? (
                    <div className="flex gap-2 mb-1">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(item.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleRename(item.id)}>
                        OK
                      </Button>
                    </div>
                  ) : (
                    <Label
                      className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      onDoubleClick={() => {
                        setEditingId(item.id);
                        setEditLabel(item.label);
                      }}
                    >
                      {item.label}
                    </Label>
                  )}
                  <div className="relative mt-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={item.amount === 0 ? "" : item.amount.toString()}
                      onChange={(e) => handleAmountChange(item.id, e.target.value)}
                      onBlur={() => handleBlurSave(item.id)}
                      placeholder="0,00"
                      className="pr-14 font-mono text-base"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      {symbol}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(item.id)}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            ))}

            <div className="flex gap-2 pt-3 border-t border-[rgba(99,102,241,0.1)]">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ajouter une ligne..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
              <Button variant="outline" size="sm" onClick={handleAdd}>
                + Ajouter
              </Button>
            </div>

            <Button onClick={handleSaveAll} disabled={saving} className="w-full">
              {saving ? "Enregistrement..." : "Sauvegarder"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
