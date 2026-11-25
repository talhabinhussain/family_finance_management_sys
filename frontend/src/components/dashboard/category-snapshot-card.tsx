"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DataCard } from "@/components/shared/data-card"
import { CategorySpendingChart } from "@/components/reports/category-spending-chart"
import { useCategorySpending } from "@/hooks/use-reports"

interface CategorySnapshotCardProps {
  month: string
}

export function CategorySnapshotCard({ month }: CategorySnapshotCardProps) {
  const range = month
    ? { start: month, end: month }
    : { start: "9999-99", end: "0000-00" }

  const query = useCategorySpending(range)

  const action = (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/reports" />}>
      Full report
    </Button>
  )

  return (
    <DataCard
      title="Top spending categories"
      description="Highest spending this month."
      action={action}
      query={query}
      emptyTitle="No spending this month"
      emptyDescription="Expenses you record will appear here."
      isEmpty={(rows) => rows.filter((r) => r.expense_count > 0).length === 0}
      loadingRows={4}
    >
      {(rows) => {
        const topFive = rows.filter((r) => r.expense_count > 0).slice(0, 5)

        return (
          <div className="flex flex-col justify-between gap-4">
            <CategorySpendingChart rows={topFive} />

            <div className="flex justify-end border-t border-border pt-3">
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/reports" />}>
                Full report
              </Button>
            </div>
          </div>
        )
      }}
    </DataCard>
  )
}
