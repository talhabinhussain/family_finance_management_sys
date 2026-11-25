export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function currentMonthInput(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export function monthInputToApi(value: string): string {
  return `${value}-01`
}

export function apiToMonthInput(value: string): string {
  return value.slice(0, 7)
}

export function shiftMonth(monthInput: string, delta: number): string {
  if (!monthInput || typeof monthInput !== "string") return ""
  const [yearStr, monthStr] = monthInput.split("-")
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  if (Number.isNaN(year) || Number.isNaN(month)) {
    return monthInput
  }
  const totalMonths = year * 12 + (month - 1) + delta
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}`
}
