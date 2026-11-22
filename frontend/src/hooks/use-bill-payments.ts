import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiGet, apiPost, ApiError } from "@/lib/api"
import { queryKeys } from "@/hooks/query-keys"
import type { BillPayment, BillPaymentCreate, ExpenseResult } from "@/types"

export function useBillPayments() {
  return useQuery({
    queryKey: queryKeys.billPayments,
    queryFn: () => apiGet<BillPayment[]>("/transactions/bill-payments"),
    select: (payments) =>
      [...payments].sort((a, b) => {
        if (a.period_month !== b.period_month) {
          return b.period_month.localeCompare(a.period_month)
        }
        return b.bill_payment_id - a.bill_payment_id
      }),
  })
}

export function useCreateBillPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: BillPaymentCreate) =>
      apiPost<ExpenseResult>("/transactions/bill-payment", body),
    onSuccess: (result) => {
      if (result.over_budget) {
        toast.error("Bill paid, but this category is now over budget.")
      } else if (result.budget_warning) {
        toast.warning("Bill paid — you are near this category's budget limit.")
      } else {
        toast.success("Bill payment recorded.")
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.billSchedule })
      queryClient.invalidateQueries({ queryKey: queryKeys.billPayments })
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses })
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      // Slices 06/07 must add their budget, report and dashboard keys here
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        queryClient.invalidateQueries({ queryKey: queryKeys.billSchedule })
        queryClient.invalidateQueries({ queryKey: queryKeys.billPayments })
      }
    },
  })
}
