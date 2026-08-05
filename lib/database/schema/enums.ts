import { pgEnum } from "drizzle-orm/pg-core"

export const themePreferenceEnum = pgEnum("theme_preference", ["light", "dark", "system"])

export const transactionTypeEnum = pgEnum("transaction_type", [
  "expense",
  "income",
  "refund",
  "transfer",
])

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "debit_card",
  "credit_card",
  "bank_transfer",
  "digital_wallet",
  "other",
])

export const financialAccountTypeEnum = pgEnum("financial_account_type", [
  "cash",
  "bank",
  "credit_card",
  "digital_wallet",
  "other",
])

export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
])

export const verificationTokenTypeEnum = pgEnum("verification_token_type", [
  "email_verification",
  "password_reset",
])

export const notificationTypeEnum = pgEnum("notification_type", [
  "budget_threshold_reached",
  "budget_exceeded",
  "upcoming_recurring_payment",
  "subscription_renewal",
  "monthly_report_ready",
  "new_device_login",
  "password_changed",
  "two_factor_changed",
  "export_requested",
  "account_recovery_started",
])
