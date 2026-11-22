import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { apiGet } from "@/lib/api"
import { queryKeys } from "@/hooks/query-keys"
import type { Category } from "@/types"

export function useCategories() {
  const query = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => apiGet<Category[]>("/categories"),
  })
  const byId = useMemo(
    () => new Map((query.data ?? []).map((c) => [c.category_id, c])),
    [query.data]
  )
  const incomeCategories = useMemo(
    () => (query.data ?? []).filter((c) => c.category_type === "Income"),
    [query.data]
  )
  const expenseCategories = useMemo(
    () => (query.data ?? []).filter((c) => c.category_type === "Expense"),
    [query.data]
  )
  return { ...query, byId, incomeCategories, expenseCategories }
}
