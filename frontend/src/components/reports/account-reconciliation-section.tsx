"use client"

import { DataCard } from "@/components/shared/data-card"
import { Money } from "@/components/shared/money"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAccountBalanceReport } from "@/hooks/use-reports"

export function AccountReconciliationSection() {
  const query = useAccountBalanceReport()

  return (
    <DataCard
      title="Account reconciliation"
      description="Computed balance = opening balance + income − expenses − savings contributions."
      query={query}
      emptyTitle="No accounts yet"
      emptyDescription="Add accounts in Settings to see balances."
      isEmpty={(data) => data.length === 0}
    >
      {(rows) => (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Stored balance</TableHead>
                  <TableHead className="text-right">Computed balance</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.account_id}>
                    <TableCell className="font-medium">{row.account_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.account_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.opening_balance} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.stored_balance} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.computed_balance} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Money value={row.difference} />
                    </TableCell>
                    <TableCell className="text-center">
                      {row.is_reconciled ? (
                        <Badge className="bg-income text-primary-foreground hover:bg-income">
                          Reconciled
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Mismatch</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Computed balance is derived from the opening balance and all recorded transactions by the reconciliation view.
          </p>
        </div>
      )}
    </DataCard>
  )
}
