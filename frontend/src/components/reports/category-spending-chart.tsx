"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatAxisMoney, toCategorySeries } from "@/lib/chart-data"
import { formatMoney } from "@/lib/formatters"
import type { CategorySpendingRow } from "@/types"

const chartConfig = {
  total: {
    label: "Spending",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function CategorySpendingChart({ rows }: { rows: CategorySpendingRow[] }) {
  const series = toCategorySeries(rows)

  if (series.length === 0) {
    return null
  }

  const chartHeight = Math.max(220, series.length * 36)

  return (
    <div className="w-full pb-4">
      <ChartContainer
        config={chartConfig}
        className="w-full aspect-auto"
        style={{ height: `${chartHeight}px` }}
        aria-label="Category spending horizontal bar chart"
      >
        <BarChart
          data={series}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxisMoney}
          />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{item.payload.label}</span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatMoney(item.payload.totalText)}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar dataKey="total" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
