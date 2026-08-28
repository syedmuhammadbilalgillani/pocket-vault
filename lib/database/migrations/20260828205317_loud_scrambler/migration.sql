ALTER TABLE "users" ADD COLUMN "expense_categories_seeded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vault_categories_seeded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vault_unlock_salt" text;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "deleted_at" timestamp with time zone;