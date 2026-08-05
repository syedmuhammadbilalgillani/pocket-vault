CREATE TYPE "financial_account_type" AS ENUM('cash', 'bank', 'credit_card', 'digital_wallet', 'other');--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('budget_threshold_reached', 'budget_exceeded', 'upcoming_recurring_payment', 'subscription_renewal', 'monthly_report_ready', 'new_device_login', 'password_changed', 'two_factor_changed', 'export_requested', 'account_recovery_started');--> statement-breakpoint
CREATE TYPE "payment_method" AS ENUM('cash', 'debit_card', 'credit_card', 'bank_transfer', 'digital_wallet', 'other');--> statement-breakpoint
CREATE TYPE "recurrence_frequency" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom');--> statement-breakpoint
CREATE TYPE "theme_preference" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "transaction_type" AS ENUM('expense', 'income', 'refund', 'transfer');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL UNIQUE,
	"email_verified_at" timestamp with time zone,
	"display_name" text,
	"avatar_url" text,
	"password_hash" text NOT NULL,
	"preferred_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"theme" "theme_preference" DEFAULT 'system'::"theme_preference" NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL UNIQUE,
	"device_name" text,
	"browser" text,
	"operating_system" text,
	"ip_address_masked" text,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_item_tags" (
	"vault_item_id" uuid,
	"vault_tag_id" uuid,
	CONSTRAINT "vault_item_tags_pkey" PRIMARY KEY("vault_item_id","vault_tag_id")
);
--> statement-breakpoint
CREATE TABLE "vault_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category_id" uuid,
	"encrypted_username" text,
	"encrypted_password" text,
	"encrypted_website" text,
	"encrypted_notes" text,
	"encrypted_custom_fields" text,
	"wrapped_dek" text NOT NULL,
	"encryption_key_version" integer NOT NULL,
	"nonce_metadata" jsonb NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"password_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vault_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "financial_account_type" NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"opening_balance_minor" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"category_id" uuid,
	"account_id" uuid,
	"merchant" text,
	"description" text,
	"transaction_date" date NOT NULL,
	"payment_method" "payment_method" DEFAULT 'other'::"payment_method" NOT NULL,
	"tags" text[],
	"notes" text,
	"recurring_rule_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recurring_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"transaction_type" "transaction_type" NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"category_id" uuid,
	"description" text,
	"frequency" "recurrence_frequency" NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"category_id" uuid,
	"month" smallint NOT NULL,
	"year" smallint NOT NULL,
	"limit_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"alert_threshold_percent" smallint DEFAULT 80 NOT NULL,
	"rollover_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"event_type" text NOT NULL,
	"metadata_redacted" jsonb,
	"ip_address_masked" text,
	"user_agent_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "vault_categories_user_id_idx" ON "vault_categories" ("user_id");--> statement-breakpoint
CREATE INDEX "vault_item_tags_tag_id_idx" ON "vault_item_tags" ("vault_tag_id");--> statement-breakpoint
CREATE INDEX "vault_items_user_id_idx" ON "vault_items" ("user_id");--> statement-breakpoint
CREATE INDEX "vault_items_category_id_idx" ON "vault_items" ("category_id");--> statement-breakpoint
CREATE INDEX "vault_tags_user_id_idx" ON "vault_tags" ("user_id");--> statement-breakpoint
CREATE INDEX "expense_categories_user_id_idx" ON "expense_categories" ("user_id");--> statement-breakpoint
CREATE INDEX "financial_accounts_user_id_idx" ON "financial_accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_id_date_idx" ON "transactions" ("user_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" ("category_id");--> statement-breakpoint
CREATE INDEX "recurring_rules_user_id_idx" ON "recurring_rules" ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_rules_next_run_at_idx" ON "recurring_rules" ("next_run_at");--> statement-breakpoint
CREATE INDEX "budgets_user_id_idx" ON "budgets" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_category_month_year_idx" ON "budgets" ("user_id","category_id","month","year");--> statement-breakpoint
CREATE INDEX "receipts_user_id_idx" ON "receipts" ("user_id");--> statement-breakpoint
CREATE INDEX "receipts_transaction_id_idx" ON "receipts" ("transaction_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications" ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "audit_events_user_id_idx" ON "audit_events" ("user_id");--> statement-breakpoint
CREATE INDEX "audit_events_event_type_idx" ON "audit_events" ("event_type");--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" ("created_at");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vault_categories" ADD CONSTRAINT "vault_categories_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vault_item_tags" ADD CONSTRAINT "vault_item_tags_vault_item_id_vault_items_id_fkey" FOREIGN KEY ("vault_item_id") REFERENCES "vault_items"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vault_item_tags" ADD CONSTRAINT "vault_item_tags_vault_tag_id_vault_tags_id_fkey" FOREIGN KEY ("vault_tag_id") REFERENCES "vault_tags"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_category_id_vault_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "vault_categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "vault_tags" ADD CONSTRAINT "vault_tags_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_expense_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_financial_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_rule_id_recurring_rules_id_fkey" FOREIGN KEY ("recurring_rule_id") REFERENCES "recurring_rules"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_category_id_expense_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_expense_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_transaction_id_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;