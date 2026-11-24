"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatAxisMoney, toIncomeExpenseSeries } from "@/lib/chart-data"
import { formatMoney } from "@/lib/formatters"
import type { MonthlyIncomeExpenseRow } from "@/types"

const chartConfig = {
  income: {
    label: "Income",
    color: "var(--chart-1)",
  },
  expense: {
    label: "Expenses",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function IncomeExpenseChart({ rows }: { rows: MonthlyIncomeExpenseRow[] }) {
  const series = toIncomeExpenseSeries(rows)

  if (series.length === 0) {
    return null
  }

  return (
    <div className="w-full pb-4">
      <ChartContainer
        config={chartConfig}
        className="h-[280px] w-full aspect-auto"
        aria-label="Monthly income and expenses bar chart"
      >
        <BarChart data={series}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxisMoney}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      {name === "income" ? "Income" : "Expenses"}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatMoney(
                        name === "income"
                          ? item.payload.incomeText
                          : item.payload.expenseText
                      )}
                    </span>
                  </div>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
