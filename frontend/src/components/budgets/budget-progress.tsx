import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatPercent, toProgress } from "@/lib/formatters"
import type { BudgetVsActualRow } from "@/types"

export function BudgetProgress({ row }: { row: BudgetVsActualRow }) {
  const label = row.status === "OK" ? "Within budget" : row.status
  const variant = row.status === "Over budget" ? "destructive" : row.status === "Near limit" ? "outline" : "secondary"

  return (
    <div className="flex min-w-32 items-center gap-3">
      {row.percent_used === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <Progress value={toProgress(row.percent_used)} className="min-w-20 flex-1" aria-label={`${formatPercent(row.percent_used)} used`} />
      )}
      <Badge variant={variant}>{label}</Badge>
    </div>
  )
}
