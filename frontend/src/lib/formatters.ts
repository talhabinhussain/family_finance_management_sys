export function formatMoney(value: string) {
  const amount = Number(value)
  const sign = amount < 0 ? "-" : ""
  return `${sign}Rs. ${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

export function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1))
}

export function formatPercent(value: number | null | undefined) {
  return value == null ? "—" : `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`
}
