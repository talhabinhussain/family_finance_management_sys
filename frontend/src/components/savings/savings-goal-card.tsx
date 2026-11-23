"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Money } from "@/components/shared/money"
import { formatDate, formatPercent, toProgress } from "@/lib/formatters"
import { useMembers } from "@/hooks/use-members"
import { useSetSavingsGoalActive } from "@/hooks/use-savings-goals"
import type { SavingsGoalWithProgress } from "@/hooks/use-savings-goals"
import type { SavingsGoal } from "@/types"

interface SavingsGoalCardProps {
  item: SavingsGoalWithProgress
  onAddContribution: (goal: SavingsGoal) => void
}

export function SavingsGoalCard({ item, onAddContribution }: SavingsGoalCardProps) {
  const { goal, progress } = item
  const members = useMembers()
  const setGoalActive = useSetSavingsGoalActive()

  const isCompleted = toProgress(progress.completion_percent) === 100
  const isPending = setGoalActive.isPending && setGoalActive.variables?.goalId === goal.goal_id

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader>
          <CardTitle>{goal.goal_name}</CardTitle>
          {isCompleted ? (
            <CardAction>
              <Badge variant="outline" className="border-income/30 bg-income/10 text-income">
                Completed
              </Badge>
            </CardAction>
          ) : !goal.is_active ? (
            <CardAction>
              <Badge variant="outline">Inactive</Badge>
            </CardAction>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Progress
              value={toProgress(progress.completion_percent)}
              aria-label={`${goal.goal_name} progress`}
              className="flex-1"
            />
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatPercent(progress.completion_percent)}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Saved</dt>
              <dd className="font-medium">
                <Money value={progress.contributed_amount} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Target</dt>
              <dd className="font-medium">
                <Money value={progress.target_amount} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Remaining</dt>
              <dd className="font-medium">
                <Money value={progress.remaining_amount} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Target date</dt>
              <dd className="font-medium">
                {goal.target_date ? formatDate(goal.target_date) : "No target date"}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            Created by {members.byId.get(goal.created_by_member_id)?.full_name ?? "—"}
          </p>
        </CardContent>
      </div>

      <CardFooter className="flex items-center justify-between gap-2 pt-2">
        {goal.is_active ? (
          <Button
            size="sm"
            onClick={() => onAddContribution(goal)}
            aria-label={`Add contribution to ${goal.goal_name}`}
          >
            Add contribution
          </Button>
        ) : (
          <div />
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            setGoalActive.mutate({ goalId: goal.goal_id, isActive: !goal.is_active })
          }
        >
          {goal.is_active ? "Deactivate" : "Activate"}
        </Button>
      </CardFooter>
    </Card>
  )
}
