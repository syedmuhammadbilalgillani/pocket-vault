"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatMinor } from "@/lib/money"

const chartConfig = {
  totalMinor: { label: "Spent", color: "var(--chart-2)" },
} satisfies ChartConfig

export function CategoryBreakdownChart({
  data,
}: {
  data: { name: string; totalMinor: number }[]
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No category spending yet.</p>
  }

  const top = [...data].sort((a, b) => b.totalMinor - a.totalMinor).slice(0, 6)
  const summary = `Top spending categories: ${top.map((c) => `${c.name} ${formatMinor(c.totalMinor)}`).join(", ")}.`

  return (
    <>
      <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full">
        <BarChart data={top} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            width={100}
            tick={{ fontSize: 12 }}
          />
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMinor(Number(value))} />} />
          <Bar dataKey="totalMinor" fill="var(--color-totalMinor)" radius={4} />
        </BarChart>
      </ChartContainer>
      <p className="sr-only">{summary}</p>
    </>
  )
}
