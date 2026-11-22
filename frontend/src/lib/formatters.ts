const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export function formatMoney(value: string): string {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return "—"
  }
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return "—"
  }
  const sign = num < 0 ? "-" : ""
  const formatted = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${sign}Rs. ${formatted}`
}

export function formatDate(value: string): string {
  if (!value || typeof value !== "string") return "—"
  const datePart = value.slice(0, 10)
  const parts = datePart.split("-")
  if (parts.length !== 3) return "—"
  const [yearStr, monthStr, dayStr] = parts
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  const day = Number(dayStr)
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    !Number.isFinite(day)
  ) {
    return "—"
  }
  return `${day} ${MONTHS[monthIndex]} ${year}`
}

export function formatMonth(value: string): string {
  if (!value || typeof value !== "string") return "—"
  const datePart = value.slice(0, 7)
  const parts = datePart.split("-")
  if (parts.length < 2) return "—"
  const [yearStr, monthStr] = parts
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return "—"
  }
  return `${MONTHS[monthIndex]} ${year}`
}

export function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const num = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(num)) return "—"
  return `${num.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`
}

export function toProgress(value: string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.min(100, Math.max(0, num))
}
