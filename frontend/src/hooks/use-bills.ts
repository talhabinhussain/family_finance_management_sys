import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { toast } from "sonner"

import { apiGet, apiPatch, apiPost, getErrorMessage } from "@/lib/api"
import { queryKeys } from "@/hooks/query-keys"
import type { Bill, BillCreate, BillDueRow, BillUpdate } from "@/types"

type UpcomingBillsParams = {
  days_ahead: number
}

export function useBills() {
  const query = useQuery({
    queryKey: queryKeys.bills,
    queryFn: () => apiGet<Bill[]>("/bills"),
    select: (bills) => [...bills].sort((a, b) => a.bill_name.localeCompare(b.bill_name)),
  })
  const byId = useMemo(
    () => new Map((query.data ?? []).map((bill) => [bill.bill_id, bill])),
    [query.data]
  )
  return { ...query, byId }
}

export function useBillSchedule(daysAhead: number) {
  return useQuery({
    queryKey: [...queryKeys.billSchedule, daysAhead],
    queryFn: async () => {
      const [overdue, upcoming] = await Promise.all([
        apiGet<BillDueRow[]>("/reports/overdue-bills"),
        apiGet<BillDueRow[]>("/reports/upcoming-bills", { days_ahead: daysAhead } satisfies UpcomingBillsParams),
      ])
      return { overdue, upcoming }
    },
  })
}

export function useCreateBill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: BillCreate) => apiPost<Bill>("/bills", body),
    onSuccess: () => {
      toast.success("Bill added.")
      queryClient.invalidateQueries({ queryKey: queryKeys.bills })
      queryClient.invalidateQueries({ queryKey: queryKeys.billSchedule })
    },
  })
}

export function useSetBillActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ billId, isActive }: { billId: number; isActive: boolean }) =>
      apiPatch<Bill>(`/bills/${billId}`, { is_active: isActive } satisfies BillUpdate),
    onSuccess: (bill) => {
      toast.success(
        bill.is_active
          ? "Bill activated."
          : "Bill deactivated. It no longer appears in the schedule."
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.bills })
      queryClient.invalidateQueries({ queryKey: queryKeys.billSchedule })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}
