"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataCard } from "@/components/shared/data-card"
import { Money } from "@/components/shared/money"
import { useBudgetVsActual } from "@/hooks/use-budgets"
import { formatPercent } from "@/lib/formatters"
import type { BudgetVsActualRow } from "@/types"

interface BudgetAlertsCardProps {
  month: string
}

const statusRank: Record<string, number> = {
  "Over budget": 0,
  "Near limit": 1,
}

export function BudgetAlertsCard({ month }: BudgetAlertsCardProps) {
  const query = useBudgetVsActual(month)

  const isAllEmpty = (query.data ?? []).length === 0
  const emptyTitle = isAllEmpty ? "No budgets for this month" : "All budgets are within limits"
  const emptyDescription = isAllEmpty
    ? "Set monthly limits to get alerts."
    : "No category is near or over its limit this month."

  const action = (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/budgets" />}>
      View budgets
    </Button>
  )

  return (
    <DataCard
      title="Budget alerts"
      description="Categories near or over their limit this month."
      action={action}
      query={query}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      isEmpty={(rows) => rows.filter((r) => r.status !== "OK").length === 0}
      loadingRows={4}
    >
      {(rows) => {
        const flagged = rows
          .filter((r) => r.status !== "OK")
          .sort((a, b) => (statusRank[a.status] ?? 2) - (statusRank[b.status] ?? 2))

        return (
          <div className="flex flex-col justify-between gap-4">
            <div className="flex flex-col divide-y divide-border">
              {flagged.map((row: BudgetVsActualRow) => {
                const isOver = row.status === "Over budget"
                return (
                  <div
                    key={row.budget_id}
                    className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground truncate">
                        {row.category_name}
                      </span>
                      <Badge
                        variant={isOver ? "destructive" : "outline"}
                        className={
                          isOver
                            ? undefined
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }
                      >
                        {row.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {row.percent_used !== null ? formatPercent(row.percent_used) : "—"}
                      </span>
                      <span className="tabular-nums font-medium">
                        <Money value={row.actual_amount} /> of{" "}
                        <Money value={row.limit_amount} />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end border-t border-border pt-3">
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/budgets" />}>
                View budgets
              </Button>
            </div>
          </div>
        )
      }}
    </DataCard>
  )
}
