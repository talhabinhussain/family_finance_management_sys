import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { toast } from "sonner"

import { apiDelete, apiGet, apiPatch, apiPost, getErrorMessage } from "@/lib/api"
import { monthInputToApi } from "@/lib/dates"
import { queryKeys } from "@/hooks/query-keys"
import type { Budget, BudgetCreate, BudgetUpdate, BudgetVsActualRow } from "@/types"

export type BudgetWithActual = {
  budget: Budget
  actual: BudgetVsActualRow
}

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets,
    queryFn: () => apiGet<Budget[]>("/budgets"),
  })
}

export function useBudgetVsActual(month: string) {
  const apiMonth = monthInputToApi(month)
  return useQuery({
    queryKey: [...queryKeys.budgetVsActual, month] as const,
    queryFn: () =>
      apiGet<BudgetVsActualRow[]>("/reports/budget-vs-actual", {
        start_month: apiMonth,
        end_month: apiMonth,
      }),
    enabled: Boolean(month),
  })
}

export function useBudgetData(month: string) {
  const budgets = useBudgets()
  const report = useBudgetVsActual(month)

  const data = useMemo(() => {
    const budgetById = new Map(
      (budgets.data ?? []).filter((budget) => budget.budget_month.slice(0, 7) === month).map((budget) => [budget.budget_id, budget])
    )
    return (report.data ?? []).flatMap((actual): BudgetWithActual[] => {
      const budget = budgetById.get(actual.budget_id)
      return budget ? [{ budget, actual }] : []
    })
  }, [budgets.data, month, report.data])

  return {
    data,
    error: budgets.error ?? report.error,
    isPending: budgets.isPending || report.isPending,
    refetch: async () => {
      await Promise.all([budgets.refetch(), report.refetch()])
    },
  }
}

export function useCreateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BudgetCreate) => apiPost<Budget>("/budgets", body),
    onSuccess: (budget) => {
      toast.success("Budget added.")
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets })
      queryClient.invalidateQueries({ queryKey: [...queryKeys.budgetVsActual, budget.budget_month.slice(0, 7)] })
    },
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ budgetId, body }: { budgetId: number; body: BudgetUpdate }) =>
      apiPatch<Budget>(`/budgets/${budgetId}`, body),
    onSuccess: (budget) => {
      toast.success("Budget updated.")
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets })
      queryClient.invalidateQueries({ queryKey: [...queryKeys.budgetVsActual, budget.budget_month.slice(0, 7)] })
    },
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ budgetId }: { budgetId: number; month: string }) => apiDelete(`/budgets/${budgetId}`),
    onSuccess: (_, variables) => {
      toast.success("Budget deleted.")
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets })
      queryClient.invalidateQueries({ queryKey: [...queryKeys.budgetVsActual, variables.month] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}
