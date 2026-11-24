import type { QueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/hooks/query-keys"

export function invalidateReports(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.reports })
  queryClient.invalidateQueries({ queryKey: queryKeys.budgetVsActual })
}
