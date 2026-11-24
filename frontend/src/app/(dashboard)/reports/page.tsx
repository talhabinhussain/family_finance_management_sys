import type { Metadata } from "next"
import { ReportsView } from "@/components/reports/reports-view"

export const metadata: Metadata = {
  title: "Reports",
  description: "Review income, spending, budgets, balances, savings and bills.",
}

export default function ReportsPage() {
  return <ReportsView />
}
