import { formatMonth } from "@/lib/formatters"
import type { CategorySpendingRow, MonthlyIncomeExpenseRow } from "@/types"

export type IncomeExpenseSeriesItem = {
  label: string
  income: number
  expense: number
  incomeText: string
  expenseText: string
}

export type CategorySeriesItem = {
  label: string
  total: number
  totalText: string
}

export function toIncomeExpenseSeries(
  rows: MonthlyIncomeExpenseRow[]
): IncomeExpenseSeriesItem[] {
  return rows.map((row) => ({
    label: formatMonth(row.month),
    income: Number(row.total_income) || 0,
    expense: Number(row.total_expense) || 0,
    incomeText: row.total_income,
    expenseText: row.total_expense,
  }))
}

export function toCategorySeries(
  rows: CategorySpendingRow[]
): CategorySeriesItem[] {
  return rows
    .filter((row) => row.expense_count > 0)
    .map((row) => ({
      label: row.category_name,
      total: Number(row.total_spending) || 0,
      totalText: row.total_spending,
    }))
}

export function formatAxisMoney(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0"
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000
    const str = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
    return `${sign}${str}M`
  }
  if (abs >= 1_000) {
    const val = abs / 1_000
    const str = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
    return `${sign}${str}k`
  }
  return `${sign}${abs}`
}
