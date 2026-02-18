# Mobile App Flow Proposal (Draft)

## Primary Principles
- Field‑first receipt capture with strong OCR is the top priority.
- Daily workflow is the primary daily entry point.
- Minimal taps: swipe + quick actions over multi‑step forms.
- Daily/weekly workflow order and data must match desktop exactly; only UI presentation differs.

## Core Navigation (Tabs)
- **Workflow** (Daily flow + progress)
- **Receipts** (Capture + inbox)
- **Inbox** (Transactions + other review items)
- **Jobs** (Jobs + Schedule)
- **Timesheets** (Clock + review)
- **More** (Reports, Settings, Account)

## Screen Map (MVP)

### 1) Workflow Hub (Primary)
- Shows Daily + Weekly progress
- Primary CTA: “Continue Daily Workflow”
- Quick stats: Unconverted, Unclassified, Unmatched receipts, Time entries to verify

### 2) Transactions → Convert
- List of pending transactions
- Bulk convert action
- Per‑row: Convert / Ignore
- Filters: Pending / Converted / Ignored

### 3) Expenses → Categorize (Secondary)
- Unclassified list (swipe actions)
- Quick assign category + job
- Apply suggestions button
- Manual add is available but not primary

### 4) Incomings → Categorize (Secondary)
- Unclassified list
- Assign category + job
- Apply suggestions button
- Manual add is available but not primary

### 5) Receipts (Primary)
- One‑tap camera upload
- OCR preview + edit before save
- Suggested matches (Accept / Match)
- Orphan receipts filter

### 6) Jobs
- Job list + search
- Create job (inline form)
- Job detail: profitability summary

### 7) Schedule
- Week view
- Drag/resize blocks later
- Quick add from Jobs list

### 8) Timesheets
- Employee clock in/out (for TIME_ONLY role)
- Review entries (admin)
- Lock previous week (admin)

### 9) Reports (lightweight)
- Spend by job/category
- Period selection

## Workflow‑Driven Flow (Daily)
1) Convert transactions
2) Categorize expenses
3) Categorize incomings
4) Review receipts inbox
5) Jobs in progress
6) Verify yesterday’s time entries

## Workflow‑Driven Flow (Weekly)
1) New clients
2) New jobs
3) Schedule jobs
4) Jobs in progress
5) Verify time entries
6) Lock timesheet
7) Convert transactions
8) Categorize expenses
9) Categorize incomings
10) Receipts inbox
11) Orphan receipts

## Data Sources (API v1)
- `GET /api/v1/workflow`
- `POST /api/v1/workflow/{kind}/advance`
- `GET /api/v1/transactions`
- `POST /api/v1/transactions/convert/all`
- `GET /api/v1/expenses/unclassified`
- `POST /api/v1/expenses/unclassified/{id}`
- `POST /api/v1/expenses/suggestions/apply`
- `GET /api/v1/incomings/unclassified`
- `POST /api/v1/incomings/unclassified/{id}`
- `POST /api/v1/incomings/suggestions/apply`
- `GET /api/v1/receipts/inbox`
- `POST /api/v1/receipts/upload`
- `POST /api/v1/receipts/suggestions/{id}/accept`
- `POST /api/v1/receipts/suggestions/{id}/match`
- `GET /api/v1/jobs`
- `POST /api/v1/jobs`
- `GET /api/v1/schedule`
- `POST /api/v1/schedule`
- `GET /api/v1/timesheets/me`
- `GET /api/v1/timesheets/admin`

## Open Questions
- Offline strategy (queue vs limited offline)
- Auth for mobile (token + refresh)
- Role‑based navigation (OWNER/ADMIN/MEMBER/TIME_ONLY)
