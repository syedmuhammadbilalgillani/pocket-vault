"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatMinor } from "@/lib/money"

const chartConfig = {
  amountMinor: { label: "Amount", color: "var(--chart-3)" },
} satisfies ChartConfig

export function IncomeVsExpenseChart({ incomeMinor, expenseMinor }: { incomeMinor: number; expenseMinor: number }) {
  const data = [
    { label: "Income", amountMinor: incomeMinor },
    { label: "Expenses", amountMinor: expenseMinor },
  ]
  const summary = `Income ${formatMinor(incomeMinor)} versus expenses ${formatMinor(expenseMinor)} this month.`

  return (
    <>
      <ChartContainer config={chartConfig} className="aspect-auto h-40 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMinor(Number(value))} />} />
          <Bar dataKey="amountMinor" fill="var(--color-amountMinor)" radius={4} />
        </BarChart>
      </ChartContainer>
      <p className="sr-only">{summary}</p>
    </>
  )
}
