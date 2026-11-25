"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataCard } from "@/components/shared/data-card"
import { Money } from "@/components/shared/money"
import { useBillSchedule } from "@/hooks/use-bills"
import { formatDate } from "@/lib/formatters"
import type { BillDueRow } from "@/types"

export function BillsSnapshotCard() {
  const query = useBillSchedule(30)

  const action = (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/bills" />}>
      Go to Bills
    </Button>
  )

  return (
    <DataCard
      title="Bills needing attention"
      description="Overdue bills and bills due in the next 30 days. Not affected by the month."
      action={action}
      query={query}
      emptyTitle="No bills due"
      emptyDescription="Nothing is overdue or due in the next 30 days."
      isEmpty={(data) => (data.overdue?.length ?? 0) === 0 && (data.upcoming?.length ?? 0) === 0}
      loadingRows={4}
    >
      {({ overdue, upcoming }) => {
        const rows: BillDueRow[] = [...(overdue ?? []), ...(upcoming ?? [])].slice(0, 5)

        return (
          <div className="flex flex-col justify-between gap-4">
            <div className="flex flex-col divide-y divide-border">
              {rows.map((bill) => {
                const isOverdue =
                  bill.days_overdue !== undefined &&
                  bill.days_overdue !== null &&
                  bill.days_overdue > 0

                return (
                  <div
                    key={`${bill.bill_id}-${bill.due_date}`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-medium text-foreground truncate">{bill.bill_name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(bill.due_date)}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="tabular-nums font-medium">
                        <Money value={bill.amount_due} />
                      </span>
                      {isOverdue ? (
                        <Badge variant="destructive">
                          {bill.days_overdue} days overdue
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Due in {bill.days_until_due ?? 0} days
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end border-t border-border pt-3">
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/bills" />}>
                Go to Bills
              </Button>
            </div>
          </div>
        )
      }}
    </DataCard>
  )
}
