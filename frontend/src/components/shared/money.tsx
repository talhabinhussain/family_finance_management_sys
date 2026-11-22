import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/formatters"

export function Money({ value, className }: { value: string; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatMoney(value)}</span>
}
