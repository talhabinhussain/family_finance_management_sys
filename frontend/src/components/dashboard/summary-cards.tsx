"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/shared/data-state"
import { Money } from "@/components/shared/money"
import { useMonthlyIncomeExpense } from "@/hooks/use-reports"

interface SummaryCardsProps {
  month: string
}

export function SummaryCards({ month }: SummaryCardsProps) {
  const range = month
    ? { start: month, end: month }
    : { start: "9999-99", end: "0000-00" }

  const query = useMonthlyIncomeExpense(range)

  if (query.isPending || !month) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Financial summary loading">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-4">
            <CardContent className="flex flex-col gap-2 p-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (query.data === undefined && query.error) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }

  const row = (query.data ?? []).find((r) => r.month.slice(0, 7) === month)

  const income = row?.total_income ?? "0.00"
  const expense = row?.total_expense ?? "0.00"
  const net = row?.net_amount ?? "0.00"
  const savings = row?.total_savings ?? "0.00"

  return (
    <section aria-label="Monthly financial summary">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-between p-4">
          <CardContent className="flex flex-col gap-1 p-0">
            <span className="text-sm font-medium text-muted-foreground">Income</span>
            <div className="text-2xl font-semibold tracking-tight text-income">
              <Money value={income} />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between p-4">
          <CardContent className="flex flex-col gap-1 p-0">
            <span className="text-sm font-medium text-muted-foreground">Expenses</span>
            <div className="text-2xl font-semibold tracking-tight text-expense">
              <Money value={expense} />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between p-4">
          <CardContent className="flex flex-col gap-1 p-0">
            <span className="text-sm font-medium text-muted-foreground">Net (income − expenses)</span>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              <Money value={net} />
            </div>
            <p className="text-xs text-muted-foreground">Savings contributions are not deducted.</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between p-4">
          <CardContent className="flex flex-col gap-1 p-0">
            <span className="text-sm font-medium text-muted-foreground">Savings contributed</span>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              <Money value={savings} />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
