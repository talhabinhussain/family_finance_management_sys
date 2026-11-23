"use client"

import { Button } from "@/components/ui/button"
import { DataState, EmptyState, LoadingState } from "@/components/shared/data-state"
import { SavingsGoalCard } from "@/components/savings/savings-goal-card"
import { useSavingsGoals } from "@/hooks/use-savings-goals"
import type { SavingsGoal } from "@/types"

interface SavingsGoalsSectionProps {
  onAddGoal: () => void
  onAddContribution: (goal: SavingsGoal) => void
}

export function SavingsGoalsSection({
  onAddGoal,
  onAddContribution,
}: SavingsGoalsSectionProps) {
  const goalsQuery = useSavingsGoals()

  return (
    <section className="flex flex-col gap-4" aria-labelledby="savings-goals-heading">
      <h2 id="savings-goals-heading" className="text-lg font-medium">
        Goals
      </h2>
      <DataState
        query={goalsQuery}
        loading={<LoadingState rows={3} />}
        empty={
          <EmptyState
            title="No savings goals yet"
            description="Add a goal to start tracking your savings."
            action={<Button onClick={onAddGoal}>Add goal</Button>}
          />
        }
      >
        {(items) => {
          const activeGoals = items.filter((item) => item.goal.is_active)
          const inactiveGoals = items.filter((item) => !item.goal.is_active)

          return (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeGoals.map((item) => (
                  <SavingsGoalCard
                    key={item.goal.goal_id}
                    item={item}
                    onAddContribution={onAddContribution}
                  />
                ))}
              </div>

              {inactiveGoals.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Inactive goals</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {inactiveGoals.map((item) => (
                      <SavingsGoalCard
                        key={item.goal.goal_id}
                        item={item}
                        onAddContribution={onAddContribution}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        }}
      </DataState>
    </section>
  )
}
