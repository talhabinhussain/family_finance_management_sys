import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiGet, apiPost } from "@/lib/api"
import { queryKeys } from "@/hooks/query-keys"
import { invalidateReports } from "@/hooks/invalidate-reports"
import type { Income, IncomeCreate } from "@/types"

export type IncomeFilterParams = {
  member_id?: number
  category_id?: number
  from?: string
  to?: string
}

export function useIncome(params?: IncomeFilterParams) {
  return useQuery({
    queryKey: [...queryKeys.income, "list", params],
    queryFn: () => apiGet<Income[]>("/transactions/income", params),
    select: (rows) =>
      [...rows].sort((a, b) => {
        if (a.transaction_date !== b.transaction_date) {
          return b.transaction_date.localeCompare(a.transaction_date)
        }
        return b.income_id - a.income_id
      }),
  })
}

export function useCreateIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: IncomeCreate) =>
      apiPost<Income>("/transactions/income", body),
    onSuccess: () => {
      toast.success("Income added.")
      queryClient.invalidateQueries({ queryKey: queryKeys.income })
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      invalidateReports(queryClient)
    },
  })
}
