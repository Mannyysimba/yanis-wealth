"use client";

import { useEffect, useState } from "react";
import { getExchangeRates } from "@/lib/currency";

export function useExchangeRates() {
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    getExchangeRates().then((r) => {
      setRates(r);
      setLastUpdated(new Date().toLocaleString("fr-FR"));
      setLoading(false);
    });
  }, []);

  return { rates, loading, lastUpdated };
}
