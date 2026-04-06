import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FALLBACK_RATES } from "@/lib/constants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function convertToEur(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === "EUR") return amount;
  const rate = rates[currency];
  if (!rate) return amount;
  return amount / rate;
}

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    let rates: Record<string, number> = FALLBACK_RATES;
    try {
      const rateRes = await fetch("https://api.exchangerate-api.com/v4/latest/EUR");
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        rates = { EUR: 1, MAD: rateData.rates.MAD, AED: rateData.rates.AED, USD: rateData.rates.USD };
      }
    } catch {
      // use fallback
    }

    const { data: allTabs } = await supabase.from("tabs").select("*");
    const { data: allItems } = await supabase.from("line_items").select("*");

    if (!allTabs || !allItems) {
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    const breakdown: Record<string, number> = {};
    let total = 0;
    let capTotal = 0;
    let invTotal = 0;

    for (const tab of allTabs) {
      const tabItems = allItems.filter((li) => li.tab_id === tab.id);
      const rawSum = tabItems.reduce((s, li) => s + Number(li.amount), 0);
      const eurValue = convertToEur(rawSum, tab.currency, rates);
      breakdown[tab.name] = eurValue;
      total += eurValue;
      if (tab.section === "capital") capTotal += eurValue;
      else invTotal += eurValue;
    }

    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("daily_snapshots").upsert(
      {
        snapshot_date: today,
        total_eur: total,
        capital_eur: capTotal,
        investissement_eur: invTotal,
        breakdown_json: breakdown,
        rates_used: rates,
      },
      { onConflict: "snapshot_date" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("exchange_rates").insert({
      base: "EUR",
      rates,
      fetched_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, total_eur: total, date: today });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
