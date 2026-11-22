import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { apiGet } from "@/lib/api"
import { queryKeys } from "@/hooks/query-keys"
import type { Member } from "@/types"

export function useMembers() {
  const query = useQuery({
    queryKey: queryKeys.members,
    queryFn: () => apiGet<Member[]>("/members"),
  })
  const byId = useMemo(
    () => new Map((query.data ?? []).map((m) => [m.member_id, m])),
    [query.data]
  )
  return { ...query, byId }
}
