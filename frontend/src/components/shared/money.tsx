import { formatMoney } from "@/lib/formatters"

export function Money({ value, className }: { value: string; className?: string }) {
  return <span className={`tabular-nums ${className ?? ""}`}>{formatMoney(value)}</span>
}
