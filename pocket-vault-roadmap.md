# Pocket Vault

> A secure personal dashboard for managing saved account credentials and tracking monthly expenses.

## 1. Product Overview

**Pocket Vault** is a privacy-focused web application built with **Next.js**. It combines:

1. A secure credential vault for email and other account logins.
2. A monthly expense tracker with budgets, categories, reports, and reminders.
3. A unified dashboard that helps users understand both their digital security and personal spending.

> [!IMPORTANT]
> Pocket Vault must never store vault passwords as plain text. User login passwords should be securely hashed. Saved account credentials must be encrypted before they are written to the database.

---

## 2. Product Goals

### Primary goals

- Give users one secure place to organize account credentials.
- Help users record and understand monthly expenses.
- Make budgeting simple for non-technical users.
- Protect sensitive information with strong encryption and authentication.
- Deliver a responsive experience on mobile, tablet, and desktop.
- Build the product so it can later support mobile apps and browser extensions.

### Non-goals for the first release

- Directly replacing a bank.
- Sending or receiving money.
- Automatically logging users into third-party websites.
- Sharing vault credentials between teams.
- Supporting cryptocurrency wallets or seed phrases.
- Building a native mobile app before the web MVP is stable.

---

## 3. Target Users

### Primary users

- Students managing limited monthly budgets.
- Employees tracking salary-based spending.
- Freelancers tracking irregular income and expenses.
- Families organizing household expenses.
- Users who want a simple personal credential organizer.

### User problems

- Passwords are stored in notes, spreadsheets, or browsers without proper organization.
- Monthly spending is difficult to understand.
- Users forget subscriptions and recurring payments.
- Budgeting apps and password tools are often separate.
- Users want a private, simple, all-in-one personal dashboard.

---

## 4. Recommended Technology Stack

### Frontend and full-stack framework

- **Next.js** with the **App Router**
- **TypeScript**
- **React**
- **Tailwind CSS**
- **shadcn/ui** or another accessible component library
- **React Hook Form**
- **Zod** for input validation

### Backend

Use Next.js Server Actions and Route Handlers for application logic.

Recommended services:

- **PostgreSQL** for relational data
- **Prisma ORM** or **Drizzle ORM**
- **Auth.js**, Clerk, Better Auth, or another established authentication solution
- **Redis** for rate limiting, temporary security state, and optional caching
- Background jobs through a managed queue when reminders are introduced

### Hosting

A practical initial deployment:

- Next.js application: Vercel or another Node.js-compatible platform
- PostgreSQL: Neon, Supabase, Railway, or managed PostgreSQL
- Redis: Upstash or managed Redis
- Transactional email: Resend, Postmark, or Amazon SES
- Error monitoring: Sentry
- Product analytics: privacy-friendly analytics with sensitive fields excluded

### Development tools

- ESLint
- Prettier
- Husky and lint-staged
- Vitest or Jest
- React Testing Library
- Playwright
- GitHub Actions
- Dependabot or Renovate

---

## 5. High-Level Architecture

```text
Browser
  |
  | HTTPS
  v
Next.js Application
  |
  |-- Authentication and session layer
  |-- Vault service
  |-- Expense and budget service
  |-- Reporting service
  |-- Notification service
  |
  +--> PostgreSQL
  +--> Redis / rate limiter
  +--> Email provider
  +--> Key-management or secrets service
  +--> Monitoring and audit logs
```

### Application layers

```text
app/
  (public)/
  (auth)/
  (dashboard)/
  api/
components/
features/
  auth/
  vault/
  expenses/
  budgets/
  reports/
  settings/
lib/
  auth/
  crypto/
  database/
  validation/
  permissions/
  rate-limit/
  logging/
server/
  actions/
  services/
  repositories/
```

### Architecture principles

- Keep business logic outside UI components.
- Validate every input on the server.
- Check authorization inside every sensitive server action and route.
- Never trust a user ID submitted by the browser.
- Keep decrypted vault data in memory for the shortest possible time.
- Never place secrets or decrypted credentials in logs, URLs, analytics, or error messages.
- Separate encryption logic from database access.
- Use database transactions for related financial updates.

---

## 6. Main Application Modules

## 6.1 Authentication

### MVP features

- User registration.
- Email verification.
- Secure login and logout.
- Forgot-password flow.
- Reset-password flow.
- Session management.
- Protected dashboard routes.
- Device/session list.
- Revoke individual sessions.
- Revoke all other sessions.
- Login rate limiting.
- Failed-login protection.
- Security activity history.

### Advanced features

- Two-factor authentication using authenticator apps.
- Recovery codes.
- Passkeys.
- New-device alerts.
- Suspicious-login alerts.
- Optional biometric unlock in future native apps.
- Account lock and recovery process.

### Authentication security

- Hash application login passwords with Argon2id where supported.
- Use a unique salt for every password.
- Never encrypt login passwords for later recovery.
- Store sessions in secure, `HttpOnly`, `SameSite` cookies.
- Enable `Secure` cookies in production.
- Rotate session identifiers after authentication changes.
- Require recent authentication for sensitive operations.

---

## 6.2 Credential Vault

### Credential item fields

- Item name.
- Account type.
- Email or username.
- Password.
- Website URL.
- Notes.
- Category.
- Tags.
- Favorite status.
- Created date.
- Updated date.
- Password-updated date.
- Optional custom fields.

### MVP vault features

- Add a credential.
- View a credential.
- Edit a credential.
- Delete a credential.
- Soft-delete and trash.
- Restore from trash.
- Search by item name, username, website, category, or tag.
- Filter and sort credentials.
- Copy username.
- Copy password.
- Reveal or hide password.
- Favorite important items.
- Organize credentials into categories.
- Add secure notes.
- Generate strong passwords.
- Display password strength.
- Auto-clear copied passwords from the clipboard when browser support permits.
- Require reauthentication before revealing or exporting highly sensitive data.
- Automatically lock the vault after inactivity.

### Suggested categories

- Email.
- Social media.
- Work.
- Banking.
- Shopping.
- Entertainment.
- Education.
- Utilities.
- Other.

### Password generator options

- Password length.
- Uppercase letters.
- Lowercase letters.
- Numbers.
- Symbols.
- Exclude ambiguous characters.
- Memorable passphrase mode.
- Copy generated password.
- Strength estimate.

### Future vault features

- Encrypted import from CSV or supported password managers.
- Encrypted export.
- Browser extension.
- Duplicate-password detection.
- Reused-password detection.
- Old-password reminders.
- Compromised-password checking using a privacy-preserving approach.
- Shared family vaults with end-to-end encrypted sharing.
- File attachments.
- Credential version history.
- Emergency access.

---

## 6.3 Expense Tracking

### Expense fields

- Amount.
- Currency.
- Transaction type.
- Category.
- Description.
- Merchant.
- Transaction date.
- Payment method.
- Account or wallet.
- Tags.
- Receipt attachment.
- Recurring status.
- Notes.
- Created date.
- Updated date.

### Transaction types

- Expense.
- Income.
- Refund.
- Transfer.

### MVP expense features

- Add an expense.
- Edit an expense.
- Delete an expense.
- Add income.
- View transaction history.
- Search transactions.
- Filter by month, category, amount, account, and payment method.
- Sort by date or amount.
- Duplicate an existing transaction.
- Add notes and tags.
- Show monthly totals.
- Show income, expenses, and remaining balance.
- Compare the current month with the previous month.
- Show category breakdowns.
- Export transactions to CSV.

### Suggested expense categories

- Housing.
- Food and groceries.
- Transport.
- Utilities.
- Healthcare.
- Education.
- Entertainment.
- Shopping.
- Subscriptions.
- Personal care.
- Family.
- Travel.
- Debt payments.
- Savings.
- Charity.
- Other.

### Payment methods

- Cash.
- Debit card.
- Credit card.
- Bank transfer.
- Digital wallet.
- Other.

### Future expense features

- Receipt image upload.
- Receipt data extraction.
- Bank import through a regulated aggregation provider.
- CSV statement import.
- Transaction rules.
- Merchant normalization.
- Split transactions.
- Multi-currency conversion.
- Shared household expenses.
- Reimbursements.
- Tax labels for freelancers.
- Offline-friendly data entry.

---

## 6.4 Budgets

### MVP budget features

- Set a total monthly budget.
- Set category-specific monthly budgets.
- Show amount spent.
- Show remaining amount.
- Show usage percentage.
- Progress bars.
- Warning at a configurable threshold.
- Alert when a budget is exceeded.
- Copy budgets into the next month.
- View budget history.

### Future budget features

- Weekly budgets.
- Rollover budgets.
- Envelope budgeting.
- Savings goals.
- Debt repayment goals.
- Forecasted end-of-month spending.
- AI-assisted category budget suggestions.
- Shared family budgets.

---

## 6.5 Recurring Transactions and Subscriptions

### MVP or second-release features

- Create recurring expenses.
- Create recurring income.
- Frequency options:
  - Daily.
  - Weekly.
  - Monthly.
  - Quarterly.
  - Yearly.
  - Custom.
- Define start date.
- Define optional end date.
- Generate upcoming transactions.
- Mark recurring transactions as paid.
- Pause or cancel a recurring item.
- Upcoming-payment list.
- Subscription total per month.
- Reminder before due date.

### Future features

- Trial-ending reminders.
- Price-change history.
- Detect likely subscriptions from imported transactions.
- Suggest unused subscriptions based on user-confirmed activity.

---

## 6.6 Dashboard

### Dashboard cards

- Current-month expenses.
- Current-month income.
- Remaining balance.
- Budget usage.
- Number of saved credentials.
- Credentials updated recently.
- Upcoming bills.
- Top spending category.
- Recent transactions.
- Recent vault activity.

### Dashboard charts

- Daily spending trend.
- Category spending.
- Income versus expenses.
- Month-over-month spending.
- Budget versus actual.
- Subscription spending.

### Dashboard behavior

- Default to the current month.
- Allow month selection.
- Hide monetary values with a privacy toggle.
- Support customizable dashboard cards later.
- Use loading skeletons.
- Show useful empty states for new users.

---

## 6.7 Reports and Insights

### MVP reports

- Monthly spending summary.
- Category report.
- Income-versus-expense report.
- Budget-versus-actual report.
- Transaction export.
- Monthly comparison.

### Later insights

- Average monthly spending.
- Spending trend over 3, 6, and 12 months.
- Largest expenses.
- Fastest-growing categories.
- Recurring-cost summary.
- Savings rate.
- Cash-flow forecast.
- Unusual-spending alerts.
- Personalized saving suggestions.

> Financial insights should be presented as informational guidance, not professional financial advice.

---

## 6.8 Notifications

### Notification types

- Budget threshold reached.
- Budget exceeded.
- Upcoming recurring payment.
- Subscription renewal.
- Monthly report ready.
- New-device login.
- Password changed.
- Two-factor authentication changed.
- Export requested.
- Account recovery started.

### Delivery channels

- In-app notifications.
- Email notifications.
- Push notifications in a later PWA or mobile release.

### User controls

- Enable or disable each notification type.
- Configure reminder timing.
- Choose email frequency.
- Mute non-security notifications.
- Security notifications should remain difficult to disable.

---

## 6.9 Settings

### Profile settings

- Display name.
- Email address.
- Profile image.
- Preferred currency.
- Locale.
- Time zone.
- Date format.
- Week start day.

### Security settings

- Change login password.
- Configure two-factor authentication.
- Generate recovery codes.
- View active sessions.
- Revoke sessions.
- Set vault auto-lock duration.
- Require reauthentication for sensitive actions.
- View security activity.
- Download recovery information safely.

### Appearance settings

- Light theme.
- Dark theme.
- System theme.
- Compact or comfortable transaction layout.
- Hide balances by default.

### Data settings

- Export expenses.
- Export vault data through a strongly protected encrypted process.
- Delete individual data.
- Request full account deletion.
- Configure retention settings where appropriate.

---

## 7. Security Model

The credential vault is the highest-risk part of Pocket Vault. Security design must be reviewed before production use.

## 7.1 Separate two password concepts

### Application login password

This verifies the user's identity.

- Store only a strong password hash.
- Never store the original password.
- Never make it recoverable.
- Reset it through a secure account-recovery process.

### Vault encryption secret

This protects saved credentials.

Possible designs:

1. **Server-managed encryption**
   - Easier to build.
   - Server can decrypt vault entries.
   - Requires strong key management and strict access controls.

2. **Zero-knowledge-style encryption**
   - Encryption and decryption primarily happen on the client.
   - Server stores encrypted ciphertext.
   - Harder to build correctly.
   - Password recovery becomes more complicated.
   - Better privacy when implemented and audited correctly.

### Recommended rollout

For a learning or internal MVP:

- Use audited cryptographic libraries.
- Encrypt sensitive vault fields using authenticated encryption.
- Keep encryption keys outside the database.
- Use a managed key service in production.
- Document key rotation.

For a public password-manager product:

- Engage a qualified application-security and cryptography reviewer.
- Define a formal threat model.
- Prefer a carefully reviewed zero-knowledge architecture.
- Complete an independent penetration test before launch.

## 7.2 Encryption requirements

- Encrypt vault usernames, passwords, notes, and custom fields.
- Use authenticated encryption such as AES-256-GCM or a well-supported equivalent.
- Use a unique nonce or initialization value as required by the chosen algorithm.
- Never reuse a nonce with the same key.
- Use separate keys or derived subkeys where appropriate.
- Store key identifiers with encrypted records.
- Support key rotation.
- Encrypt database backups.
- Encrypt traffic using HTTPS/TLS.
- Keep production secrets in a managed secrets service.
- Never commit secrets to Git.

## 7.3 Phase 0 Architecture Decisions

These decisions resolve open questions left by sections 7.1–7.2 and must be settled before Phase 3 begins, since they are expensive to change retroactively once vault records exist.

### ADR-001: Vault encryption architecture

**Decision:** Use server-managed envelope encryption for the first release. This is a deliberate, documented choice, not a placeholder — it matches the MVP guidance in section 7.1.

- A single **Key Encryption Key (KEK)** lives in a managed secrets/KMS service (never in the database, never in application code or environment files committed to Git).
- Each `VaultItem` field group is encrypted with a **per-record Data Encryption Key (DEK)**.
- Each DEK is itself encrypted ("wrapped") by the current KEK and stored alongside the record as `wrappedDek`.
- `encryptionKeyVersion` (already in the `VaultItem` schema) identifies which KEK version wrapped the DEK, enabling rotation without re-encrypting every record at once.
- Zero-knowledge (client-side) encryption is deferred to Release 2.0 per the existing roadmap. Because the DEK-per-record model is used now, a future migration to zero-knowledge only requires changing *who holds the KEK/derives the DEK* — the wrapped-DEK envelope shape does not need to change. This avoids a full data-model rewrite later.
- This choice and its rationale must be recorded as a standalone ADR document (not just this roadmap) before Phase 3 engineering starts.

### ADR-002: Key management by environment

**Decision:**

| Environment | KEK storage | Access method |
|---|---|---|
| Local development | Locally generated key in a git-ignored `.env.local`, clearly labeled as dev-only and never reused elsewhere | Read directly from env |
| Test / CI | Ephemeral key generated per test run | Read directly from env |
| Preview / Staging | Managed secrets service (e.g., cloud KMS or hosting provider's secret store) | App authenticates to KMS via short-lived service credentials, not a static key |
| Production | Managed KMS, separate key from staging | Short-lived service credentials; app never has standing access beyond decrypt/encrypt calls |

- The app must never be able to export or log the raw KEK, in any environment.
- Key rotation procedure: generate new KEK version → new writes wrap DEKs with the new version → background job re-wraps existing DEKs opportunistically (on next read/write) → old KEK version retired only once no records reference it. This must be documented in the Phase 0 threat model deliverable, not deferred.

### ADR-003: Session token requirements

**Decision:**

- Session tokens: minimum 256 bits of CSPRNG-generated entropy before hashing.
- Only `tokenHash` (never the raw token) is stored, matching the existing `Session` schema.
- Session identifiers rotate on: login, password change, 2FA change, and privilege-sensitive reauthentication — not only "authentication changes" generically.
- Session expiry: absolute lifetime plus idle timeout, both configurable; exact durations are a Phase 2 product decision, not Phase 0.

### ADR-004: Rate limit thresholds (Phase 2 exit-criteria baseline)

**Decision:** These are starting defaults, tunable post-launch based on real traffic, but Phase 2 cannot claim "login rate limiting" as done without concrete numbers to test against:

- Login attempts: 5 per account per 15 minutes, plus a coarser per-IP limit to slow credential stuffing across accounts.
- Password-reset requests: 3 per account per hour.
- Vault export / data export requests: 3 per account per 24 hours, always requiring reauthentication regardless of rate limit state.
- Two-factor verification attempts: 5 per session per 15 minutes.
- All limits enforced server-side via Redis; exceeding a limit is a logged security event (per section 7.5) without logging the attempted credential values.

### ADR-005: Auto-lock, reauthentication, and session expiry relationship

**Decision:** These are three independent timers with a defined precedence, to avoid inconsistent UX or security gaps:

1. **Session expiry** (absolute + idle) is the outermost boundary. If the session expires, the user is fully logged out regardless of vault-lock state.
2. **Vault auto-lock** (inactivity-based, configurable in Settings) is a lock *within* an active session — it clears decrypted vault data from memory/UI and requires the login password (or a configured unlock method) to resume, but does not end the session or require re-navigating auth pages.
3. **Reauthentication** is required per-action for highly sensitive operations (revealing/exporting credentials, changing security settings) regardless of vault-lock or session state, and does not itself reset the vault auto-lock timer or the session idle timer — reauthentication is a one-time gate for a single action, not a state change.
4. Unlocking the vault after auto-lock **does** reset the vault inactivity timer, but does **not** extend session expiry — session idle timeout is tracked independently based on actual request activity.

---

## 7.4 Authorization

Every protected operation must verify:

- The user is authenticated.
- The session is valid.
- The requested record belongs to the authenticated user.
- The user recently reauthenticated when the operation is highly sensitive.
- The request has passed rate limits and validation.

Do not rely only on route middleware or proxy checks. Authorization must also run inside the server function handling the data.

## 7.5 Application protections

- Content Security Policy.
- CSRF protection for state-changing requests.
- Secure cookie configuration.
- Strict input validation.
- Output encoding.
- SQL injection protection through parameterized ORM queries.
- Rate limiting.
- Brute-force protection.
- Account enumeration prevention.
- Safe file-upload validation.
- Malware scanning for uploaded receipts where supported.
- Dependency vulnerability scanning.
- Secure HTTP headers.
- Production source-map controls.
- Sensitive error redaction.

## 7.6 Logging rules

Log:

- Authentication success and failure.
- Password reset events.
- Two-factor changes.
- New sessions.
- Export attempts.
- Account deletion.
- Key rotation operations.
- Permission failures.
- Administrative security operations.

Never log:

- Saved passwords.
- Encryption keys.
- Full session tokens.
- Recovery codes.
- Decrypted secure notes.
- Complete card or bank details.
- Sensitive request bodies.

## 7.7 Threat model

Document threats including:

- Database theft.
- Server compromise.
- Stolen browser session.
- Cross-site scripting.
- Credential stuffing.
- Brute-force attacks.
- Malicious insiders.
- Log leakage.
- Backup leakage.
- Clipboard exposure.
- Browser-extension interference.
- Lost encryption keys.
- Insecure account recovery.
- Supply-chain compromise.

For each threat, document:

- Likelihood.
- Impact.
- Existing controls.
- Remaining risk.
- Owner.
- Planned mitigation.

---

## 8. Suggested Database Schema

The following is a conceptual schema. Exact fields depend on the selected authentication and encryption design.

## 8.1 User

```text
User
- id
- email
- emailVerifiedAt
- displayName
- avatarUrl
- passwordHash
- preferredCurrency
- locale
- timezone
- theme
- createdAt
- updatedAt
- deletedAt
```

## 8.2 Session

```text
Session
- id
- userId
- tokenHash
- deviceName
- browser
- operatingSystem
- ipAddressMasked
- lastActiveAt
- expiresAt
- revokedAt
- createdAt
```

## 8.3 VaultItem

```text
VaultItem
- id
- userId
- title
- categoryId
- encryptedUsername
- encryptedPassword
- encryptedWebsite
- encryptedNotes
- encryptedCustomFields
- encryptionKeyVersion
- nonceMetadata
- isFavorite
- passwordChangedAt
- createdAt
- updatedAt
- deletedAt
```

Depending on the threat model, title, website, and category may also need encryption.

## 8.4 VaultCategory

```text
VaultCategory
- id
- userId
- name
- icon
- createdAt
- updatedAt
```

## 8.5 VaultTag

```text
VaultTag
- id
- userId
- name
```

## 8.6 Transaction

```text
Transaction
- id
- userId
- type
- amountMinor
- currency
- categoryId
- accountId
- merchant
- description
- transactionDate
- paymentMethod
- notes
- recurringRuleId
- createdAt
- updatedAt
- deletedAt
```

Store money as integer minor units, such as cents, rather than floating-point values.

## 8.7 ExpenseCategory

```text
ExpenseCategory
- id
- userId
- name
- icon
- isSystem
- createdAt
- updatedAt
```

## 8.8 FinancialAccount

```text
FinancialAccount
- id
- userId
- name
- type
- currency
- openingBalanceMinor
- isArchived
- createdAt
- updatedAt
```

## 8.9 Budget

```text
Budget
- id
- userId
- categoryId
- month
- year
- limitMinor
- currency
- alertThresholdPercent
- rolloverEnabled
- createdAt
- updatedAt
```

## 8.10 RecurringRule

```text
RecurringRule
- id
- userId
- transactionType
- amountMinor
- currency
- categoryId
- description
- frequency
- interval
- startDate
- nextRunAt
- endDate
- isActive
- createdAt
- updatedAt
```

## 8.11 Receipt

```text
Receipt
- id
- userId
- transactionId
- storageKey
- mimeType
- sizeBytes
- createdAt
```

## 8.12 Notification

```text
Notification
- id
- userId
- type
- title
- message
- readAt
- createdAt
```

## 8.13 AuditEvent

```text
AuditEvent
- id
- userId
- eventType
- metadataRedacted
- ipAddressMasked
- userAgentSummary
- createdAt
```

---

## 9. Main Routes and Screens

## Public pages

```text
/
 /features
 /security
 /privacy
 /terms
 /contact
```

## Authentication pages

```text
/login
/register
/verify-email
/forgot-password
/reset-password
/two-factor
/recovery
```

## Application pages

```text
/dashboard
/vault
/vault/new
/vault/[id]
/vault/[id]/edit
/vault/trash
/expenses
/expenses/new
/expenses/[id]
/expenses/[id]/edit
/budgets
/subscriptions
/reports
/notifications
/settings/profile
/settings/security
/settings/preferences
/settings/data
```

## API or Route Handler areas

```text
/api/auth/*
/api/exports/*
/api/uploads/*
/api/webhooks/*
/api/cron/*
```

---

## 10. User Experience Requirements

### General UX

- Mobile-first responsive layout.
- Clear navigation between Vault and Expenses.
- Fast keyboard navigation.
- Accessible labels and focus states.
- Helpful validation messages.
- Confirmation for destructive actions.
- Undo where practical.
- Empty states with direct calls to action.
- Skeleton states during loading.
- Optimistic updates only where rollback is safe.
- Sensitive values hidden by default.

### Accessibility

Target WCAG 2.2 AA where practical.

- Full keyboard support.
- Sufficient contrast.
- Screen-reader labels.
- Visible focus indicators.
- Semantic headings.
- Accessible form errors.
- Reduced-motion support.
- Charts with text summaries.
- No important meaning communicated by color alone.

### Suggested navigation

Desktop sidebar:

```text
Pocket Vault
- Dashboard
- Vault
- Expenses
- Budgets
- Subscriptions
- Reports
- Notifications
- Settings
```

Mobile:

- Bottom navigation for primary modules.
- More menu for reports and settings.
- Floating add button for a credential or transaction.

---

## 11. MVP Definition

The MVP should prove that users can securely manage credentials and understand monthly spending.

### MVP must include

- Registration and login.
- Email verification.
- Password reset.
- Protected sessions.
- Credential create, read, update, and delete.
- Encrypted credential fields.
- Search and categories.
- Password generator.
- Expense and income create, read, update, and delete.
- Expense categories.
- Monthly dashboard.
- Monthly and category budgets.
- Basic charts.
- CSV expense export.
- Profile and security settings.
- Audit events for major security actions.
- Responsive design.
- Automated tests for critical flows.
- Production monitoring.
- Privacy policy and terms.
- Account deletion.

### MVP should not include

- Browser extension.
- Shared vaults.
- Bank connections.
- AI financial advice.
- Receipt OCR.
- Native mobile apps.
- Complex multi-currency reporting.
- Team administration.

---

## 12. Development Roadmap

## Phase 0 — Discovery and Security Planning

### Product work

- Define primary user persona.
- Validate the combined vault-and-expense concept.
- Write user stories.
- Define MVP boundaries.
- Create low-fidelity wireframes.
- Define success metrics.
- Decide whether the initial product is private, beta, or public.

### Security work

- Create a threat model.
- Select encryption architecture.
- Define account-recovery behavior.
- Define key-management strategy.
- Decide which database fields are encrypted.
- Define audit events.
- Define backup and restore procedures.
- Document security assumptions.

### Deliverables

- Product requirements document.
- Threat model.
- Data classification document.
- Initial wireframes.
- Architecture decision records.
- MVP backlog.

---

## Phase 1 — Project Foundation

### Engineering tasks

- Create Next.js project with TypeScript.
- Use the App Router.
- Configure Tailwind CSS.
- Install UI component system.
- Configure linting and formatting.
- Set up PostgreSQL.
- Configure ORM and migrations.
- Create environment validation.
- Add CI pipeline.
- Add unit and end-to-end test foundations.
- Configure error monitoring.
- Add structured logging with redaction.
- Create local development seed data.
- Configure preview deployments.

### Deliverables

- Deployable application shell.
- Database connection.
- Automated checks on pull requests.
- Shared layout and design tokens.
- Initial technical documentation.

---

## Phase 2 — Authentication and Account Security

### Engineering tasks

- Registration.
- Email verification.
- Login and logout.
- Password hashing.
- Password reset.
- Secure session cookies.
- Protected route layout.
- Server-side authorization helper.
- Login rate limiting.
- Session/device management.
- Security event logging.
- Reauthentication flow.
- Account deletion skeleton.

### Tests

- Registration success and validation.
- Invalid login.
- Rate limiting.
- Expired verification link.
- Password-reset token reuse.
- Session revocation.
- Unauthorized record access.
- Cookie security configuration.

### Exit criteria

- No dashboard route is accessible anonymously.
- Users cannot access another user's data.
- Security events are logged without sensitive values.
- Critical auth tests pass in CI.

---

## Phase 3 — Credential Vault MVP

### Engineering tasks

- Finalize vault encryption service.
- Implement encryption-key loading.
- Add key-version metadata.
- Create vault database tables.
- Build credential list.
- Build credential form.
- Build credential details.
- Add edit and delete.
- Add trash and restore.
- Add categories and tags.
- Add search and filters.
- Add copy and reveal controls.
- Add password generator.
- Add password-strength feedback.
- Add inactivity lock.
- Require reauthentication for sensitive operations.
- Prevent sensitive values from entering logs or analytics.

### Tests

- Encryption and decryption round trip.
- Wrong-key failure.
- Tampered-ciphertext failure.
- Authorization checks.
- Search ownership isolation.
- Trash and restore.
- Clipboard behavior.
- Auto-lock.
- Sensitive-log redaction.

### Exit criteria

- Database records do not contain plaintext saved passwords.
- Vault records are isolated per user.
- Decryption happens only in approved server or client security boundaries.
- The vault can be locked without logging the user fully out.

---

## Phase 4 — Expense Tracking MVP

### Engineering tasks

- Create transaction schema.
- Create income and expense forms.
- Build transaction list.
- Add date, category, amount, and payment filters.
- Add search.
- Add edit and delete.
- Add custom categories.
- Add accounts and payment methods.
- Add monthly totals.
- Store monetary values as integer minor units.
- Add CSV export.
- Add pagination or cursor-based loading.

### Tests

- Monetary calculations.
- Currency validation.
- Month boundary behavior.
- Time-zone behavior.
- Transaction ownership.
- CSV export.
- Filtering and sorting.
- Delete and restore behavior if soft deletion is used.

### Exit criteria

- Totals match transaction data.
- Date calculations are consistent in the user's time zone.
- Large transaction lists remain responsive.
- Exports exclude other users' data.

---

## Phase 5 — Budgets and Dashboard

### Engineering tasks

- Create monthly budget model.
- Add total and category budgets.
- Calculate budget usage.
- Add threshold warnings.
- Build dashboard summary cards.
- Add spending trend chart.
- Add category chart.
- Add income-versus-expense chart.
- Add recent transactions.
- Add vault summary without exposing credential values.
- Add balance privacy mode.
- Add empty and loading states.

### Tests

- Budget calculations.
- Budget rollover boundaries if included.
- Month changes.
- Zero-income and zero-expense states.
- Chart data accuracy.
- Currency consistency.
- Privacy mode.

### Exit criteria

- Dashboard values match reports.
- Budget warnings appear at correct thresholds.
- Charts have accessible text summaries.

---

## Phase 6 — Recurring Payments and Notifications

### Engineering tasks

- Create recurring-rule model.
- Generate upcoming occurrences.
- Prevent duplicate generation.
- Add upcoming-bills screen.
- Add subscription summary.
- Build in-app notifications.
- Add email notification preferences.
- Add secure scheduled-job endpoint.
- Add retry and idempotency handling.
- Add delivery logs without sensitive financial details.

### Tests

- Daily, weekly, monthly, and yearly recurrence.
- End-of-month behavior.
- Leap-year behavior.
- Time-zone behavior.
- Duplicate job execution.
- Paused rules.
- Notification preferences.
- Email delivery failure handling.

---

## Phase 7 — Reports, Export, and Data Controls

### Engineering tasks

- Monthly report.
- Category report.
- Budget-versus-actual report.
- Month comparison.
- Date-range filters.
- CSV export.
- Encrypted vault export design.
- Account data export.
- Full account deletion.
- Retention and deletion jobs.
- Export audit events.
- Reauthentication before sensitive exports.

### Exit criteria

- Exports are permission-checked.
- Sensitive exports expire.
- Deleted accounts follow the documented deletion policy.
- Backups and retained data are covered in the privacy policy.

---

## Phase 8 — Hardening and Beta

### Security tasks

- Dependency audit.
- Static analysis.
- Dynamic security testing.
- Authorization review.
- Encryption implementation review.
- Key-rotation test.
- Backup restoration test.
- Rate-limit review.
- Content Security Policy rollout.
- File-upload security review.
- Penetration test.
- Resolve critical and high findings.

### Quality tasks

- Cross-browser testing.
- Mobile responsiveness.
- Accessibility audit.
- Performance profiling.
- Database index review.
- Error-state review.
- User onboarding.
- Beta feedback collection.

### Beta launch criteria

- No known critical or high-severity security issues.
- Restore process has been tested.
- Monitoring and alerting are active.
- Incident-response contacts and procedures exist.
- Privacy policy and terms are published.
- Core flows meet accessibility expectations.
- Critical end-to-end tests pass.

---

## Phase 9 — Public Launch

### Launch tasks

- Production domain and TLS.
- Production database.
- Managed secrets.
- Email domain authentication.
- Monitoring dashboards.
- Error alerts.
- Database backups.
- Status page.
- Support process.
- Security contact.
- Vulnerability disclosure policy.
- Analytics consent where required.
- Product onboarding.
- Documentation and FAQ.

### Post-launch monitoring

- Authentication failures.
- Rate-limit events.
- Export activity.
- Database latency.
- Encryption-service failures.
- Job failures.
- Email delivery.
- Application errors.
- User drop-off.
- Budget and vault feature adoption.

---

## 13. Post-MVP Roadmap

## Release 1.1

- Two-factor authentication.
- Recovery codes.
- Recurring expenses.
- Upcoming bill reminders.
- Better reports.
- Custom categories.
- Improved session management.
- PWA installation.

## Release 1.2

- Encrypted import and export.
- Receipt attachments.
- Advanced search.
- Credential health dashboard.
- Duplicate-password detection.
- Subscription dashboard.
- Savings goals.

## Release 2.0

- Browser extension.
- Passkeys.
- Carefully reviewed zero-knowledge vault architecture.
- Shared family vault.
- Shared household expenses.
- Multi-currency reports.
- Bank or statement import.
- Independent security audit.

## Later possibilities

- Native iOS and Android apps.
- Offline-first encrypted vault access.
- Receipt scanning.
- Smart transaction rules.
- Financial forecasting.
- Emergency vault access.
- Organization or team edition.

---

## 14. Testing Strategy

### Unit tests

Test:

- Validation schemas.
- Money calculations.
- Budget calculations.
- Recurrence calculations.
- Encryption helpers.
- Permission helpers.
- Date and time-zone utilities.
- Report transformations.

### Integration tests

Test:

- Database repositories.
- Authentication callbacks.
- Session lifecycle.
- Vault create and decrypt flow.
- Expense creation and dashboard totals.
- Export generation.
- Notification jobs.

### End-to-end tests

Critical flows:

1. Register and verify email.
2. Log in.
3. Add a credential.
4. Reveal and edit a credential.
5. Lock and unlock the vault.
6. Add an expense.
7. Set a budget.
8. View dashboard totals.
9. Export expenses.
10. Revoke another session.
11. Reset login password.
12. Delete account.

### Security tests

- Broken object-level authorization.
- Cross-site scripting.
- Cross-site request forgery.
- SQL injection.
- Brute-force handling.
- Session fixation.
- Token expiry.
- Ciphertext tampering.
- Log leakage.
- Unsafe exports.
- File upload abuse.
- Dependency vulnerabilities.

### Performance tests

- Dashboard with several years of transactions.
- Vault search with thousands of records.
- CSV export with large datasets.
- Concurrent recurring-job execution.
- Login and rate-limit behavior under load.

---

## 15. Deployment and Operations

### Environments

- Local.
- Test.
- Preview.
- Staging.
- Production.

Use separate databases, credentials, encryption keys, and external-service accounts for each environment.

### CI pipeline

On every pull request:

- Install locked dependencies.
- Type-check.
- Lint.
- Run unit tests.
- Run integration tests.
- Build application.
- Scan dependencies.
- Run selected end-to-end tests.

Before production:

- Run full end-to-end suite.
- Apply reviewed migrations.
- Confirm backups.
- Validate secrets.
- Complete smoke tests.
- Confirm rollback plan.

### Database migrations

- Use version-controlled migrations.
- Review destructive changes.
- Back up before high-risk migrations.
- Use expand-and-contract migrations for large schema changes.
- Never silently remove encrypted data.
- Test rollback or forward recovery.

### Backup strategy

- Automated encrypted backups.
- Point-in-time recovery where supported.
- Documented retention.
- Regular restore tests.
- Restricted backup access.
- Separate key and backup access controls.

### Incident response

Document:

- How to detect an incident.
- Who responds.
- How to rotate keys and secrets.
- How to revoke sessions.
- How to disable exports.
- How to notify affected users.
- How to preserve evidence.
- How to recover service.
- How to write a post-incident review.

---

## 16. Privacy and Compliance Checklist

Before public launch:

- Publish a clear privacy policy.
- Explain what is encrypted and where decryption occurs.
- Explain account recovery limitations.
- Collect only necessary data.
- Define retention periods.
- Support data export.
- Support account deletion.
- Restrict employee access.
- Audit privileged access.
- Use data-processing agreements with vendors where required.
- Determine legal obligations for target markets.
- Obtain professional legal advice before claiming regulatory compliance.

Do not claim that Pocket Vault is “unhackable,” “100% secure,” or compliant with a regulation unless that claim has been independently verified.

---

## 17. Product Metrics

### Activation

- Registration completion rate.
- Email verification rate.
- Percentage of users adding their first credential.
- Percentage adding their first expense.
- Percentage creating their first budget.
- Time to first useful dashboard.

### Engagement

- Weekly active users.
- Monthly active users.
- Expenses added per active user.
- Credentials stored per active user.
- Budget review frequency.
- Report usage.
- Recurring-item usage.

### Retention

- 7-day retention.
- 30-day retention.
- 90-day retention.
- Users returning at month-end.
- Users maintaining budgets across multiple months.

### Reliability and security

- Error rate.
- Slow-request rate.
- Failed background jobs.
- Failed email delivery.
- Account recovery success.
- Suspicious-login events.
- Security findings by severity.
- Backup restore success.
- Mean time to resolve incidents.

Never send decrypted credential values, full transaction notes, or other sensitive content to analytics tools.

---

## 18. Example User Stories

### Vault

- As a user, I can add an email login so that I do not forget it.
- As a user, I can generate a strong password.
- As a user, I can search my credentials.
- As a user, I can hide passwords from people near my screen.
- As a user, I can lock my vault without logging out.
- As a user, I can see which sessions are signed in.

### Expenses

- As a user, I can record an expense in a few seconds.
- As a user, I can categorize spending.
- As a user, I can see how much I spent this month.
- As a user, I can compare this month with last month.
- As a user, I can export my transactions.

### Budgets

- As a user, I can set a grocery budget.
- As a user, I can see how much remains.
- As a user, I receive a warning before exceeding the budget.
- As a user, I can reuse last month's budget.

---

## 19. Definition of Done

A feature is complete only when:

- Requirements are documented.
- UI works on supported screen sizes.
- Server-side validation exists.
- Authentication and authorization are enforced.
- Sensitive data is protected.
- Loading, empty, error, and success states exist.
- Accessibility has been considered.
- Unit or integration tests cover core logic.
- Critical flows have end-to-end coverage.
- Logs do not expose sensitive data.
- Documentation is updated.
- Monitoring is added where needed.
- Product acceptance criteria pass.

---

## 20. Suggested Initial Backlog

### Highest priority

1. Project setup.
2. Authentication.
3. Authorization utilities.
4. Threat model.
5. Encryption proof of concept.
6. Credential CRUD.
7. Expense CRUD.
8. Monthly totals.
9. Budgets.
10. Dashboard.
11. Security settings.
12. Automated testing.
13. Monitoring.
14. Beta hardening.

### Medium priority

- Recurring expenses.
- Notifications.
- Reports.
- CSV export.
- Trash and restore.
- PWA support.
- Two-factor authentication.
- Receipt upload.

### Later priority

- Browser extension.
- Bank integrations.
- Shared vaults.
- Native mobile apps.
- Advanced forecasting.
- AI-assisted insights.

---

## 21. Recommended First Sprint

### Sprint goal

Create a secure project foundation and allow a user to register, log in, and reach an empty protected dashboard.

### Tasks

- Initialize Next.js with TypeScript and App Router.
- Configure Tailwind CSS.
- Set up PostgreSQL and ORM.
- Add environment validation.
- Implement authentication.
- Add email verification.
- Add secure session handling.
- Add protected dashboard layout.
- Add server-side authorization helper.
- Add login rate limiting.
- Add logging redaction.
- Add CI.
- Add auth integration tests.
- Add one registration-to-dashboard Playwright test.
- Draft the initial threat model.

### Sprint result

A user can create an account, verify it, log in, view a protected Pocket Vault dashboard, and log out. No credential or expense feature should be built until the authentication and authorization foundation is tested.

---

## 22. Reference Guidance

The architecture and security plan should be checked against current primary guidance before implementation:

- Next.js App Router documentation.
- Next.js authentication guide.
- Next.js data-security guide.
- OWASP Password Storage Cheat Sheet.
- OWASP Cryptographic Storage Cheat Sheet.
- OWASP Secrets Management Cheat Sheet.
- OWASP Key Management Cheat Sheet.
- OWASP Session Management Cheat Sheet.

Useful official references:

- Next.js App Router: https://nextjs.org/docs/app
- Next.js Authentication: https://nextjs.org/docs/app/guides/authentication
- Next.js Data Security: https://nextjs.org/docs/app/guides/data-security
- OWASP Password Storage: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Cryptographic Storage: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- OWASP Key Management: https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

---

## 23. Final Product Vision

Pocket Vault should become a trusted personal command center where users can:

- Protect important account credentials.
- Understand where their money goes.
- Plan monthly budgets.
- Track subscriptions.
- Receive useful reminders.
- Maintain control over their personal data.

The first release should prioritize **security, clarity, reliability, and a small set of well-tested features** over a large feature count.
