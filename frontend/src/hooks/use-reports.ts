import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"
import { monthInputToApi } from "@/lib/dates"
import { queryKeys } from "@/hooks/query-keys"
import type {
  AccountBalanceRow,
  BudgetVsActualRow,
  CategorySpendingRow,
  MemberSpendingRow,
  MonthlyIncomeExpenseRow,
  SavingsProgressRow,
} from "@/types"

export type MonthRange = {
  start: string
  end: string
}

function rangeToApiParams(range: MonthRange): {
  start_month?: string
  end_month?: string
} {
  return {
    start_month: range.start ? monthInputToApi(range.start) : undefined,
    end_month: range.end ? monthInputToApi(range.end) : undefined,
  }
}

export function isRangeValid(range: MonthRange): boolean {
  if (range.start && range.end && range.start > range.end) {
    return false
  }
  return true
}

export function useMonthlyIncomeExpense(range: MonthRange) {
  const valid = isRangeValid(range)
  return useQuery({
    queryKey: [...queryKeys.reports, "monthly-income-vs-expense", range],
    queryFn: () =>
      apiGet<MonthlyIncomeExpenseRow[]>(
        "/reports/monthly-income-vs-expense",
        rangeToApiParams(range)
      ),
    enabled: valid,
  })
}

export function useCategorySpending(range: MonthRange) {
  const valid = isRangeValid(range)
  return useQuery({
    queryKey: [...queryKeys.reports, "category-spending", range],
    queryFn: () =>
      apiGet<CategorySpendingRow[]>(
        "/reports/category-spending",
        rangeToApiParams(range)
      ),
    enabled: valid,
  })
}

export function useMemberSpending(range: MonthRange, minTotal?: string) {
  const valid = isRangeValid(range)
  return useQuery({
    queryKey: [...queryKeys.reports, "member-spending", range, minTotal],
    queryFn: () =>
      apiGet<MemberSpendingRow[]>("/reports/member-spending", {
        ...rangeToApiParams(range),
        min_total: minTotal || undefined,
      }),
    enabled: valid,
  })
}

export function useBudgetVsActualRange(range: MonthRange) {
  const valid = isRangeValid(range)
  return useQuery({
    queryKey: [...queryKeys.budgetVsActual, "range", range],
    queryFn: () =>
      apiGet<BudgetVsActualRow[]>(
        "/reports/budget-vs-actual",
        rangeToApiParams(range)
      ),
    enabled: valid,
  })
}

export function useAccountBalanceReport() {
  return useQuery({
    queryKey: [...queryKeys.reports, "account-balances"],
    queryFn: () => apiGet<AccountBalanceRow[]>("/reports/account-balances"),
  })
}

export function useSavingsProgress() {
  return useQuery({
    queryKey: [...queryKeys.reports, "savings-progress"],
    queryFn: () => apiGet<SavingsProgressRow[]>("/reports/savings-progress"),
  })
}
