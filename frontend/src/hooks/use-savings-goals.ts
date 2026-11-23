import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { toast } from "sonner"

import { apiGet, apiPatch, apiPost, getErrorMessage } from "@/lib/api"
import { queryKeys } from "@/hooks/query-keys"
import type {
  SavingsGoal,
  SavingsGoalCreate,
  SavingsGoalUpdate,
  SavingsProgressRow,
} from "@/types"

export type SavingsGoalWithProgress = {
  goal: SavingsGoal
  progress: SavingsProgressRow
}

export function useSavingsGoals() {
  const query = useQuery({
    queryKey: queryKeys.savingsGoals,
    queryFn: async () => {
      const [goals, progress] = await Promise.all([
        apiGet<SavingsGoal[]>("/savings-goals"),
        apiGet<SavingsProgressRow[]>("/reports/savings-progress"),
      ])
      const goalById = new Map(goals.map((goal) => [goal.goal_id, goal]))
      return progress.flatMap((row): SavingsGoalWithProgress[] => {
        const goal = goalById.get(row.goal_id)
        return goal ? [{ goal, progress: row }] : []
      })
    },
  })

  const byId = useMemo(
    () => new Map((query.data ?? []).map((item) => [item.goal.goal_id, item.goal])),
    [query.data]
  )

  return { ...query, byId }
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: SavingsGoalCreate) => apiPost<SavingsGoal>("/savings-goals", body),
    onSuccess: () => {
      toast.success("Goal added.")
      queryClient.invalidateQueries({ queryKey: queryKeys.savingsGoals })
    },
  })
}

export function useSetSavingsGoalActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ goalId, isActive }: { goalId: number; isActive: boolean }) =>
      apiPatch<SavingsGoal>(`/savings-goals/${goalId}`, { is_active: isActive } satisfies SavingsGoalUpdate),
    onSuccess: (goal) => {
      toast.success(
        goal.is_active
          ? "Goal activated."
          : "Goal deactivated. It no longer accepts contributions."
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.savingsGoals })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}
