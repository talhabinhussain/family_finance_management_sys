"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DataCard } from "@/components/shared/data-card"
import { Money } from "@/components/shared/money"
import { useSavingsProgress } from "@/hooks/use-reports"
import { formatPercent, toProgress } from "@/lib/formatters"
import type { SavingsProgressRow } from "@/types"

export function SavingsSnapshotCard() {
  const query = useSavingsProgress()

  const action = (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/savings" />}>
      View savings
    </Button>
  )

  return (
    <DataCard
      title="Savings goals"
      description="Progress toward each goal. Not affected by the month."
      action={action}
      query={query}
      emptyTitle="No savings goals yet"
      emptyDescription="Create a goal on the Savings page."
      isEmpty={(goals) => goals.length === 0}
      loadingRows={4}
    >
      {(goals) => {
        const topGoals = goals.slice(0, 4)

        return (
          <div className="flex flex-col justify-between gap-4">
            <div className="flex flex-col divide-y divide-border">
              {topGoals.map((goal: SavingsProgressRow) => {
                const progressVal = toProgress(goal.completion_percent)
                const isCompleted = progressVal === 100

                return (
                  <div
                    key={goal.goal_id}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground truncate">
                        {goal.goal_name}
                      </span>
                      {isCompleted && (
                        <Badge
                          variant="outline"
                          className="border-income/30 bg-income/10 text-income text-xs"
                        >
                          Completed
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Progress
                        value={progressVal}
                        aria-label={`${goal.goal_name} progress`}
                        className="flex-1"
                      />
                      <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
                        {formatPercent(goal.completion_percent)}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Saved: <Money value={goal.contributed_amount} />
                      </span>
                      <span>
                        Target: <Money value={goal.target_amount} />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end border-t border-border pt-3">
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/savings" />}>
                View savings
              </Button>
            </div>
          </div>
        )
      }}
    </DataCard>
  )
}
