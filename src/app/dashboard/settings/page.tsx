"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useTabs } from "@/hooks/use-tabs";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { convertToEur } from "@/lib/currency";
import type { LineItem } from "@/types";


export default function SettingsPage() {
  const { tabs, refetch } = useTabs();
  const { rates } = useExchangeRates();
  const [newTabName, setNewTabName] = useState("");
  const [newTabSection, setNewTabSection] = useState<string>("capital");
  const [newTabCurrency, setNewTabCurrency] = useState<string>("EUR");
  const [newSubTabName, setNewSubTabName] = useState("");
  const [newSubTabParent, setNewSubTabParent] = useState<string>("");
  const [newSubTabCurrency, setNewSubTabCurrency] = useState<string>("EUR");
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [rateOverrides, setRateOverrides] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const allParentTabs = tabs.filter((t) => !t.parent_id);

  useEffect(() => {
    if (allParentTabs.length > 0 && !newSubTabParent) {
      setNewSubTabParent(allParentTabs[0].id);
    }
  }, [allParentTabs, newSubTabParent]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleAddTab = async () => {
    if (!newTabName.trim()) return;
    const maxPos = tabs
      .filter((t) => t.section === newTabSection && !t.parent_id)
      .reduce((max, t) => Math.max(max, t.position), -1);

    await supabase.from("tabs").insert({
      section: newTabSection,
      name: newTabName.trim(),
      parent_id: null,
      position: maxPos + 1,
      currency: newTabCurrency,
    });
    setNewTabName("");
    refetch();
    showMessage("Onglet ajouté !");
  };

  const handleAddSubTab = async () => {
    if (!newSubTabName.trim() || !newSubTabParent) return;
    const parent = tabs.find((t) => t.id === newSubTabParent);
    if (!parent) return;
    const children = parent.children || [];
    const maxPos = children.reduce((max, c) => Math.max(max, c.position), -1);

    await supabase.from("tabs").insert({
      section: parent.section,
      name: newSubTabName.trim(),
      parent_id: newSubTabParent,
      position: maxPos + 1,
      currency: newSubTabCurrency,
    });
    setNewSubTabName("");
    refetch();
    showMessage("Sous-onglet ajouté !");
  };

  const handleDeleteTab = async (tabId: string) => {
    await supabase.from("tabs").delete().eq("id", tabId);
    refetch();
    showMessage("Onglet supprimé !");
  };

  const handleTriggerSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      // Fetch all line items and calculate total
      const { data: allItems } = await supabase.from("line_items").select("*");
      const { data: allTabs } = await supabase.from("tabs").select("*");

      if (!allItems || !allTabs) {
        showMessage("Erreur lors du calcul");
        setSnapshotLoading(false);
        return;
      }

      const breakdown: Record<string, number> = {};
      let total = 0;

      for (const tab of allTabs) {
        const tabItems = allItems.filter(
          (li: LineItem) => li.tab_id === tab.id
        );
        const rawSum = tabItems.reduce(
          (s: number, li: LineItem) => s + Number(li.amount),
          0
        );
        const eurValue = convertToEur(rawSum, tab.currency, rates);
        breakdown[tab.name] = eurValue;
        total += eurValue;
      }

      const today = new Date().toISOString().split("T")[0];

      await supabase.from("daily_snapshots").upsert(
        {
          date: today,
          total_eur: total,
          breakdown_json: breakdown,
          rates_used: rates,
        },
        { onConflict: "date" }
      );

      showMessage(`Snapshot enregistré : ${total.toFixed(2)} €`);
    } catch {
      showMessage("Erreur lors du snapshot");
    }
    setSnapshotLoading(false);
  };

  const handleExportCsv = async () => {
    const { data } = await supabase
      .from("daily_snapshots")
      .select("*")
      .order("date", { ascending: true });

    if (!data || data.length === 0) {
      showMessage("Aucune donnée à exporter");
      return;
    }

    const header = "Date,Total EUR,Breakdown\n";
    const rows = data
      .map(
        (s) =>
          `${s.date},${s.total_eur},"${JSON.stringify(s.breakdown_json).replace(/"/g, '""')}"`
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yanis-wealth-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Réglages</h1>
        <p className="text-sm text-muted-foreground">
          Configurez vos onglets, thème et données
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
          {message}
        </div>
      )}

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Apparence</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Mode sombre / clair</span>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Add Tab */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ajouter un onglet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Nom</Label>
              <Input
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="Mon onglet"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Section</Label>
              <Select value={newTabSection} onValueChange={setNewTabSection}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capital">Capital</SelectItem>
                  <SelectItem value="investissement">Investissement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Devise</Label>
              <Select value={newTabCurrency} onValueChange={setNewTabCurrency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="MAD">MAD</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" onClick={handleAddTab}>
            Ajouter l&apos;onglet
          </Button>
        </CardContent>
      </Card>

      {/* Add Sub-tab */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ajouter un sous-onglet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Nom</Label>
              <Input
                value={newSubTabName}
                onChange={(e) => setNewSubTabName(e.target.value)}
                placeholder="Mon sous-onglet"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Onglet parent</Label>
              <Select value={newSubTabParent} onValueChange={setNewSubTabParent}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allParentTabs.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Devise</Label>
              <Select value={newSubTabCurrency} onValueChange={setNewSubTabCurrency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="MAD">MAD</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" onClick={handleAddSubTab}>
            Ajouter le sous-onglet
          </Button>
        </CardContent>
      </Card>

      {/* Manage tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Gérer les onglets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tabs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun onglet</p>
          ) : (
            tabs.map((tab) => (
              <div key={tab.id}>
                <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent/50">
                  <span className="text-sm font-medium">{tab.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteTab(tab.id)}
                  >
                    Supprimer
                  </Button>
                </div>
                {tab.children?.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 pl-8 hover:bg-accent/50"
                  >
                    <span className="text-sm text-muted-foreground">
                      └ {child.name} ({child.currency})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteTab(child.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Manual snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Snapshot manuel</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Forcer un enregistrement maintenant
          </span>
          <Button
            size="sm"
            onClick={handleTriggerSnapshot}
            disabled={snapshotLoading}
          >
            {snapshotLoading ? "En cours..." : "Déclencher"}
          </Button>
        </CardContent>
      </Card>

      {/* Export CSV */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Export données</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Exporter tous les snapshots en CSV
          </span>
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            Exporter CSV
          </Button>
        </CardContent>
      </Card>

      {/* Currency overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Taux de change manuels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Surcharger les taux si l&apos;API est indisponible (1 EUR = X)
          </p>
          {["MAD", "AED", "USD"].map((cur) => (
            <div key={cur} className="flex items-center gap-3">
              <Label className="w-12 text-sm">{cur}</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={`${rates[cur] || ""}`}
                value={rateOverrides[cur] || ""}
                onChange={(e) =>
                  setRateOverrides((prev) => ({ ...prev, [cur]: e.target.value }))
                }
                className="w-32 font-mono"
              />
              <span className="text-xs text-muted-foreground">
                Actuel: {rates[cur]?.toFixed(4) || "N/A"}
              </span>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const overrides: Record<string, number> = { EUR: 1 };
              for (const [cur, val] of Object.entries(rateOverrides)) {
                if (val) overrides[cur] = parseFloat(val);
              }
              await supabase.from("exchange_rates").insert({
                base: "EUR",
                rates: { ...rates, ...overrides },
                fetched_at: new Date().toISOString(),
              });
              showMessage("Taux mis à jour !");
            }}
          >
            Sauvegarder les taux
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent className="py-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
