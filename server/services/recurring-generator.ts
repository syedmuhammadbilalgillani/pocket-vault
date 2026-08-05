import "server-only"
import { and, eq } from "drizzle-orm"
import { differenceInCalendarDays } from "date-fns"

import { db } from "@/lib/database/connection"
import { transactions, recurringRules } from "@/lib/database/schema"
import { getDueRecurringRules, updateRecurringRule } from "@/server/repositories/recurring-rules"
import { insertNotification, hasRecentNotification } from "@/server/repositories/notifications"
import { computeNextOccurrence } from "@/lib/recurring/next-occurrence"
import { formatMinor } from "@/lib/money"

const REMINDER_WINDOW_DAYS = 3

// Idempotency guard: has a transaction already been generated for this
// exact rule + occurrence date? Without this, re-running the cron job (a
// retry, or an overlapping invocation) would double-record every due rule.
async function transactionAlreadyGenerated(recurringRuleId: string, transactionDate: string) {
  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.recurringRuleId, recurringRuleId), eq(transactions.transactionDate, transactionDate)))
    .limit(1)
  return !!existing
}

export type GenerationResult = {
  generated: number
  skippedDuplicates: number
  remindersSent: number
  failures: { ruleId: string; error: string }[]
}

// Called by the scheduled-job endpoint (app/api/cron/recurring/route.ts).
// Every rule is processed independently so one failure doesn't block the
// rest — failures are collected and returned rather than thrown.
export async function generateDueTransactions(asOf: Date): Promise<GenerationResult> {
  const result: GenerationResult = { generated: 0, skippedDuplicates: 0, remindersSent: 0, failures: [] }

  const dueRules = await getDueRecurringRules(asOf)

  for (const rule of dueRules) {
    try {
      const occurrenceDate = rule.nextRunAt.toISOString().slice(0, 10)

      const alreadyGenerated = await transactionAlreadyGenerated(rule.id, occurrenceDate)
      if (alreadyGenerated) {
        result.skippedDuplicates++
      } else {
        await db.insert(transactions).values({
          userId: rule.userId,
          type: rule.transactionType,
          amountMinor: rule.amountMinor,
          currency: rule.currency,
          categoryId: rule.categoryId,
          description: rule.description,
          transactionDate: occurrenceDate,
          paymentMethod: "other",
          recurringRuleId: rule.id,
        })

        await insertNotification(rule.userId, {
          type: "upcoming_recurring_payment",
          title: rule.description ? `${rule.description} recorded` : "Recurring transaction recorded",
          message: `${formatMinor(rule.amountMinor, rule.currency)} on ${occurrenceDate}.`,
        })

        result.generated++
      }

      const nextRunAt = computeNextOccurrence(rule.nextRunAt, rule.frequency, rule.interval)
      const pastEndDate = rule.endDate ? nextRunAt.toISOString().slice(0, 10) > rule.endDate : false

      await updateRecurringRule(rule.userId, rule.id, {
        nextRunAt,
        isActive: pastEndDate ? false : rule.isActive,
      })
    } catch (error) {
      result.failures.push({ ruleId: rule.id, error: error instanceof Error ? error.message : String(error) })
    }
  }

  result.remindersSent = await sendUpcomingReminders(asOf)
  return result
}

// Separate pass: notify about rules due soon (but not due yet — those are
// handled above) without generating a transaction or advancing nextRunAt.
async function sendUpcomingReminders(asOf: Date): Promise<number> {
  let sent = 0
  const upcoming = await db
    .select()
    .from(recurringRules)
    .where(eq(recurringRules.isActive, true))

  for (const rule of upcoming) {
    const daysUntilDue = differenceInCalendarDays(rule.nextRunAt, asOf)
    if (daysUntilDue <= 0 || daysUntilDue > REMINDER_WINDOW_DAYS) continue

    const title = rule.description
      ? `${rule.description} due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`
      : `Recurring payment due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`

    // hasRecentNotification's 24h window assumes this job runs at most
    // once a day; running it more often would suppress a legitimate
    // same-day second reminder just as readily as a duplicate one.
    if (await hasRecentNotification(rule.userId, title, 24)) continue

    await insertNotification(rule.userId, {
      type: "upcoming_recurring_payment",
      title,
      message: `${formatMinor(rule.amountMinor, rule.currency)} scheduled for ${rule.nextRunAt.toISOString().slice(0, 10)}.`,
    })
    sent++
  }

  return sent
}
