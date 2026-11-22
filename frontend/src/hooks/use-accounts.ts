import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { apiGet } from "@/lib/api"
import { queryKeys } from "@/hooks/query-keys"
import type { Account } from "@/types"

export function useAccounts() {
  const query = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => apiGet<Account[]>("/accounts"),
  })
  const byId = useMemo(
    () => new Map((query.data ?? []).map((a) => [a.account_id, a])),
    [query.data]
  )
  return { ...query, byId }
}
