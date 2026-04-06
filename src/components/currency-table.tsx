"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatEur } from "@/lib/format";

interface CurrencyRow {
  currency: string;
  rawAmount: number;
  rate: number;
  convertedEur: number;
}

interface CurrencyTableProps {
  rows: CurrencyRow[];
  loading: boolean;
  lastUpdated: string | null;
}

export function CurrencyTable({ rows, loading, lastUpdated }: CurrencyTableProps) {
  return (
    <div className="card-gradient-border card-hover-glow rounded-xl">
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <h3 className="text-sm font-semibold section-header">Répartition par devise</h3>
        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground">
            Taux mis à jour le {lastUpdated}
          </span>
        )}
      </div>
      <div className="px-4 pb-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[rgba(99,102,241,0.1)]">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Devise</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Montant brut</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Taux</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Valeur EUR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow
                  key={row.currency}
                  className={`border-[rgba(99,102,241,0.08)] ${i % 2 === 1 ? "bg-[var(--bg-card)]/50" : ""}`}
                >
                  <TableCell className="font-semibold text-sm">{row.currency}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(row.rawAmount, row.currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {row.currency === "EUR" ? "—" : `1€ = ${row.rate.toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {formatEur(row.convertedEur)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
