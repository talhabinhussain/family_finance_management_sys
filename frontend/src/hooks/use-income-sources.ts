import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { apiGet } from "@/lib/api"
import { queryKeys } from "@/hooks/query-keys"
import type { IncomeSource } from "@/types"

export function useIncomeSources() {
  const query = useQuery({
    queryKey: queryKeys.incomeSources,
    queryFn: () => apiGet<IncomeSource[]>("/income-sources"),
  })
  const byId = useMemo(
    () => new Map((query.data ?? []).map((s) => [s.income_source_id, s])),
    [query.data]
  )
  return { ...query, byId }
}
