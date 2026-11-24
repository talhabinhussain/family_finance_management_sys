"use client"

import { DataCard } from "@/components/shared/data-card"
import { Money } from "@/components/shared/money"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCategorySpending, type MonthRange } from "@/hooks/use-reports"
import { CategorySpendingChart } from "@/components/reports/category-spending-chart"

export function CategorySpendingSection({ range }: { range: MonthRange }) {
  const query = useCategorySpending(range)

  return (
    <DataCard
      title="Category spending"
      description="Breakdown of expenses by category across the range."
      query={query}
      emptyTitle="No spending in this range"
      emptyDescription="Expenses you record will be grouped by category here."
      isEmpty={(data) => data.length === 0}
    >
      {(rows) => (
        <div className="flex flex-col gap-4">
          <CategorySpendingChart rows={rows} />
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.category_id}>
                    <TableCell className="font-medium">{row.category_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.expense_count}</TableCell>
                    <TableCell className="text-right font-medium">
                      <Money value={row.total_spending} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </DataCard>
  )
}
