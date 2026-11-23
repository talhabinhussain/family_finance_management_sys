"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { ContributionFormDialog } from "@/components/savings/contribution-form-dialog"
import { ContributionHistory } from "@/components/savings/contribution-history"
import { GoalFormDialog } from "@/components/savings/goal-form-dialog"
import { SavingsGoalsSection } from "@/components/savings/savings-goals-section"
import type { SavingsGoal } from "@/types"

export function SavingsView() {
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null)
  const [addGoalOpen, setAddGoalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Savings"
        description="Set goals, record contributions and see how close you are."
        action={
          <Button onClick={() => setAddGoalOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add goal
          </Button>
        }
      />
      <SavingsGoalsSection
        onAddGoal={() => setAddGoalOpen(true)}
        onAddContribution={(goal) => setContributingGoal(goal)}
      />
      <ContributionHistory />
      <ContributionFormDialog
        goal={contributingGoal}
        onOpenChange={(open) => {
          if (!open) setContributingGoal(null)
        }}
      />
      <GoalFormDialog open={addGoalOpen} onOpenChange={setAddGoalOpen} />
    </div>
  )
}
