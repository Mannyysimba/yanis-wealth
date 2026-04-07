"use client";

import { useEffect, useState } from "react";
import { getExchangeRates } from "@/lib/currency";
import { safeDateTime } from "@/lib/format";

export function useExchangeRates() {
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    getExchangeRates().then((r) => {
      setRates(r);
      setLastUpdated(safeDateTime(new Date()));
      setLoading(false);
    });
  }, []);

  return { rates, loading, lastUpdated };
}
