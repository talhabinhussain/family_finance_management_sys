"use client"

import { DataCard } from "@/components/shared/data-card"
import { IncomeExpenseChart } from "@/components/reports/income-expense-chart"
import { useMonthlyIncomeExpense } from "@/hooks/use-reports"
import { shiftMonth } from "@/lib/dates"

interface TrendCardProps {
  month: string
}

export function TrendCard({ month }: TrendCardProps) {
  const range = month
    ? { start: shiftMonth(month, -5), end: month }
    : { start: "9999-99", end: "0000-00" }

  const query = useMonthlyIncomeExpense(range)

  return (
    <DataCard
      title="Last six months"
      description="Income and expenses by month. Months with no activity are not shown."
      query={query}
      emptyTitle="No activity yet"
      emptyDescription="Record income or expenses to see your trend."
      isEmpty={(rows) => rows.length === 0}
      loadingRows={5}
    >
      {(rows) => (
        <div className="pt-2">
          <IncomeExpenseChart rows={rows} />
        </div>
      )}
    </DataCard>
  )
}
