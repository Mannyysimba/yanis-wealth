"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Répartition par devise</CardTitle>
        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground">
            Taux mis à jour : {lastUpdated}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Devise</TableHead>
                <TableHead className="text-xs text-right">Montant brut</TableHead>
                <TableHead className="text-xs text-right">Taux</TableHead>
                <TableHead className="text-xs text-right">Valeur EUR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.currency}>
                  <TableCell className="font-medium text-sm">{row.currency}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(row.rawAmount, row.currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {row.currency === "EUR" ? "—" : `1 EUR = ${row.rate.toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {formatEur(row.convertedEur)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
