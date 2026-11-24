import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiGet, apiPost } from "@/lib/api"
import { queryKeys } from "@/hooks/query-keys"
import { invalidateReports } from "@/hooks/invalidate-reports"
import type { SavingsContribution, SavingsContributionCreate } from "@/types"

export function useSavingsContributions() {
  return useQuery({
    queryKey: queryKeys.savingsContributions,
    queryFn: () => apiGet<SavingsContribution[]>("/transactions/savings-contributions"),
    select: (contributions) =>
      [...contributions].sort((a, b) => {
        const cmp = b.contribution_date.localeCompare(a.contribution_date)
        return cmp !== 0 ? cmp : b.contribution_id - a.contribution_id
      }),
  })
}

export function useCreateSavingsContribution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: SavingsContributionCreate) =>
      apiPost<SavingsContribution>("/transactions/savings-contribution", body),
    onSuccess: () => {
      toast.success("Contribution recorded.")
      queryClient.invalidateQueries({ queryKey: queryKeys.savingsGoals })
      queryClient.invalidateQueries({ queryKey: queryKeys.savingsContributions })
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      invalidateReports(queryClient)
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savingsGoals })
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
    },
  })
}
