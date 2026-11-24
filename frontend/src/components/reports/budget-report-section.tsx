"use client"

import { DataCard } from "@/components/shared/data-card"
import { Money } from "@/components/shared/money"
import { BudgetProgress } from "@/components/budgets/budget-progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMonth, formatPercent } from "@/lib/formatters"
import { useBudgetVsActualRange, type MonthRange } from "@/hooks/use-reports"

export function BudgetReportSection({ range }: { range: MonthRange }) {
  const query = useBudgetVsActualRange(range)

  return (
    <DataCard
      title="Budget vs actual"
      description="Spending compared to allocated category budgets across the selected range."
      query={query}
      emptyTitle="No budgets in this range"
      emptyDescription="Create budgets on the Budgets page to compare them here."
      isEmpty={(data) => data.length === 0}
    >
      {(rows) => (
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="min-w-44">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.budget_id}-${row.budget_month}`}>
                  <TableCell className="font-medium">{formatMonth(row.budget_month)}</TableCell>
                  <TableCell>{row.category_name}</TableCell>
                  <TableCell className="text-right">
                    <Money value={row.limit_amount} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={row.actual_amount} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={row.remaining_amount} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.percent_used === null ? "—" : formatPercent(row.percent_used)}
                  </TableCell>
                  <TableCell>
                    <BudgetProgress row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DataCard>
  )
}
