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
import { formatMonth } from "@/lib/formatters"
import { useMonthlyIncomeExpense, type MonthRange } from "@/hooks/use-reports"
import { IncomeExpenseChart } from "@/components/reports/income-expense-chart"

export function IncomeExpenseSection({ range }: { range: MonthRange }) {
  const query = useMonthlyIncomeExpense(range)

  return (
    <DataCard
      title="Income vs expenses"
      description="Monthly comparison of income, expenses, savings and net activity."
      query={query}
      emptyTitle="No activity in this range"
      emptyDescription="Record income or expenses to see monthly totals."
      isEmpty={(data) => data.length === 0}
    >
      {(rows) => (
        <div className="flex flex-col gap-4">
          <IncomeExpenseChart rows={rows} />
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Savings</TableHead>
                  <TableHead className="text-right">Net (income − expenses)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{formatMonth(row.month)}</TableCell>
                    <TableCell className="text-right">
                      <Money value={row.total_income} className="text-income font-medium" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.total_expense} className="text-expense font-medium" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.total_savings} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Money value={row.net_amount} />
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
