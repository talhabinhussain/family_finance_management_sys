import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiGet, apiPost } from "@/lib/api"
import { queryKeys } from "@/hooks/query-keys"
import type { Expense, ExpenseCreate, ExpenseResult } from "@/types"

export interface ExpenseFilters {
  member_id?: number
  category_id?: number
  from?: string
  to?: string
}

export function useExpenses(params?: ExpenseFilters) {
  return useQuery({
    queryKey: [...queryKeys.expenses, "list", params],
    queryFn: () => apiGet<Expense[]>("/transactions/expense", params as Record<string, string | number | boolean | null | undefined>),
    select: (rows) =>
      [...rows].sort((a, b) => {
        if (a.transaction_date !== b.transaction_date) {
          return b.transaction_date.localeCompare(a.transaction_date)
        }
        return b.expense_id - a.expense_id
      }),
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ExpenseCreate) =>
      apiPost<ExpenseResult>("/transactions/expense", body),
    onSuccess: (result) => {
      if (result.over_budget) {
        toast.error("Expense added, but this category is now over budget.")
      } else if (result.budget_warning) {
        toast.warning("Expense added — you are near this category's budget limit.")
      } else {
        toast.success("Expense added.")
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.expenses })
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      // Slices 06/07 must add their budget/report/dashboard keys here when those queries exist
    },
  })
}
