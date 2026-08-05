"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { format, parseISO } from "date-fns"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatMinor } from "@/lib/money"

const chartConfig = {
  totalMinor: { label: "Spent", color: "var(--chart-1)" },
} satisfies ChartConfig

export function SpendingTrendChart({ data }: { data: { date: string; totalMinor: number }[] }) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No spending yet this month.</p>
  }

  const summary = `Daily spending trend: ${data.length} days with expenses, totaling ${formatMinor(
    data.reduce((sum, d) => sum + d.totalMinor, 0),
  )}.`

  return (
    <>
      <ChartContainer config={chartConfig} className="aspect-auto h-40 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(parseISO(value), "d")}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => format(parseISO(value), "MMM d")}
                formatter={(value) => formatMinor(Number(value))}
              />
            }
          />
          <Bar dataKey="totalMinor" fill="var(--color-totalMinor)" radius={4} />
        </BarChart>
      </ChartContainer>
      <p className="sr-only">{summary}</p>
    </>
  )
}
