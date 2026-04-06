import { NextResponse } from "next/server";
import { FALLBACK_RATES } from "@/lib/constants";

export async function GET() {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/EUR");
    if (!res.ok) throw new Error("Rate API failed");
    const data = await res.json();

    return NextResponse.json({
      EUR: 1,
      MAD: data.rates.MAD,
      AED: data.rates.AED,
      USD: data.rates.USD,
    });
  } catch {
    return NextResponse.json(FALLBACK_RATES);
  }
}
