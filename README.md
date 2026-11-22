# Expense Tracker

A full-stack expense management and spending analytics application built with
**React, Express, PostgreSQL, and Recharts**.

Record daily expenses, edit or delete them, filter by category, and explore
category-wise spending on a separate analytics dashboard. Expenses are stored
in PostgreSQL through a REST API — never in `localStorage` or a hardcoded array.

![Dashboard](docs/screenshots/dashboard-desktop.png)

> **Project status:** The application is fully implemented and verified locally
> against PostgreSQL 18. Backend tests, the production frontend build, and a
> browser end-to-end run all pass. The Supabase production database and the
> Render/Vercel deployments are prepared but **not yet live**; see
> [Deployment](#deployment) and [`docs/CHECKLIST.md`](docs/CHECKLIST.md).

---

## Table of contents

1. [Overview](#overview)
2. [Objectives](#objectives)
3. [Features](#features)
4. [Screenshots](#screenshots)
5. [Technology stack](#technology-stack)
6. [Architecture](#architecture)
7. [Folder structure](#folder-structure)
8. [Database design](#database-design)
9. [SQL schema reference](#sql-schema-reference)
10. [API documentation](#api-documentation)
11. [Environment variables](#environment-variables)
12. [Local installation](#local-installation)
13. [Database configuration](#database-configuration)
14. [Running the backend](#running-the-backend)
15. [Running the frontend](#running-the-frontend)
16. [Testing](#testing)
17. [Deployment](#deployment)
18. [Live application URLs](#live-application-urls)
19. [GitHub repository](#github-repository)
20. [Assumptions and limitations](#assumptions-and-limitations)
21. [Future improvements](#future-improvements)
22. [Documentation](#documentation)

---

## Overview

Expense Tracker is a three-tier web application:

- **Frontend:** React 19 + Vite single-page app with React Router, Recharts,
  and a custom CSS design system.
- **Backend:** Node.js + Express 5 REST API with validation, centralized error
  handling, and a layered routes → controllers → services → repositories design.
- **Database:** PostgreSQL, hosted on Supabase in production and run locally for
  development verification.

The backend is the **only** layer that communicates with PostgreSQL. The browser
never receives database credentials or Supabase keys.

### Core user flows

1. Add an expense with amount, category, optional description, and date.
2. View all expenses newest-first, optionally filtered by category.
3. Edit any expense and see the change persist after refresh.
4. Delete an expense only after confirming in a dialog.
5. View total spending, expense count, average, top category, recent activity,
   and category charts on `/` and `/admin`.

---

## Objectives

- Build a complete CRUD expense tracker with a real relational database.
- Validate data on both the client and the server.
- Demonstrate a clean REST API with correct HTTP status codes.
- Show category-wise analytics using SQL aggregation and Recharts.
- Provide loading, error, empty, and success states throughout the UI.
- Keep the code understandable enough to explain in a technical interview.
- Protect credentials with environment variables and parameterized SQL.
- Deploy the frontend, backend, and database to their required hosts.

---

## Features

### Expense management

- Add expenses with:
  - Positive numeric amount, up to two decimal places.
  - One of five categories: Food, Travel, Shopping, Bills, Other.
  - Optional description (maximum 500 characters).
  - Required date, defaulting to today.
- Edit an existing expense with the form pre-populated.
- Delete with a custom confirmation dialog; cancel leaves the record intact.
- Success and error toasts.
- Field-level validation messages.
- Server-side validation for every create and update.

### Viewing and filtering

- Professional data table: Amount, Category, Description, Date, Actions.
- Newest expense dates first, with `created_at` as a deterministic tie-breaker.
- Category filter for All, Food, Travel, Shopping, Bills, Other.
- Filtering is performed by the backend (`?category=`), not by hiding rows.
- Loading skeletons, empty states, and retryable error states.
- Responsive card layout on small screens.

### Analytics

- Separate `/admin` route.
- Total spent, total expense count, average expense, and top category cards.
- Recharts bar chart of spending by category.
- Recharts donut chart of category share.
- Category summary cards with totals and percentages.
- Recent expenses list.
- All values come from `GET /api/summary`.
- Charts are lazy-loaded so Recharts is not in the initial dashboard bundle.

### UX and accessibility

- SaaS-style sidebar navigation with active states.
- Skip-to-content link.
- Keyboard-accessible dialog with Escape handling and focus restoration.
- `aria-invalid`, `aria-describedby`, and live-region-style toast roles.
- Visible focus rings and reduced-motion support.
- Responsive from mobile (390 px) through desktop.
- Zero horizontal overflow verified at 390 px.

---

## Screenshots

### Dashboard

![Dashboard desktop](docs/screenshots/dashboard-desktop.png)

### Expense management

![Expenses desktop](docs/screenshots/expenses-desktop.png)

### Admin analytics

![Admin analytics desktop](docs/screenshots/admin-desktop.png)

### Mobile and interaction states

| Dashboard (mobile) | Delete confirmation |
|---|---|
| ![Dashboard mobile](docs/screenshots/dashboard-mobile.png) | ![Delete confirmation](docs/screenshots/delete-confirmation.png) |

More screenshots, including the filtered table, success toast, updated expense,
and mobile expense/admin views, are in [`docs/screenshots/`](docs/screenshots/).

> Screenshots were captured against the local PostgreSQL database with 12
> realistic demo records.

---

## Technology stack

| Layer | Technology | Version / notes |
|---|---|---|
| Frontend | React | 19 |
| Build tool | Vite | 8 |
| Routing | React Router | 7 |
| Charts | Recharts | 3 |
| Styling | Plain CSS | Design tokens + component/page styles |
| Font | Inter Variable | Self-hosted via `@fontsource-variable/inter` |
| Backend | Node.js | 20.19+ |
| API framework | Express | 5 |
| Database | PostgreSQL | 15+ (Supabase in production) |
| DB driver | `pg` | Connection pool |
| Validation | Custom validators | Shared rules on server; mirrored on client |
| API tests | Node test runner + Supertest | 15 tests |
| Security | Helmet, CORS allowlist, parameterized SQL | |
| Logging | Morgan | Request logs; skipped for health checks |
| Deployment | Vercel, Render, Supabase | Configuration included, deployment pending |

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Browser                                                             │
│                                                                     │
│  React 19 + Vite + React Router + Recharts                          │
│  Pages: /  /expenses  /admin  *                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTPS JSON
                                │ fetch(VITE_API_URL)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Express 5 REST API (Node.js)                                        │
│                                                                     │
│  app.js                                                             │
│    ├── helmet, cors, express.json, morgan                           │
│    ├── routes          → URL definitions + validation middleware    │
│    ├── controllers     → HTTP request/response translation          │
│    ├── services        → business rules (404 handling, etc.)        │
│    ├── repositories    → parameterized SQL                          │
│    ├── notFound        → JSON 404                                   │
│    └── errorHandler    → safe JSON errors, PG error mapping         │
│                                                                     │
│  config/db.js → pg.Pool (DATABASE_URL, SSL, timeouts)               │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ SQL over TLS
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PostgreSQL (Supabase in production, local PostgreSQL in development)│
│                                                                     │
│  expenses                                                           │
│    id UUID PK, amount NUMERIC(12,2), category, description,         │
│    expense_date DATE, created_at TIMESTAMPTZ                        │
│                                                                     │
│  Indexes: (expense_date DESC, created_at DESC), (category)          │
└─────────────────────────────────────────────────────────────────────┘
```

### Request lifecycle: create an expense

```text
ExpenseForm controlled inputs
  → client validation
  → POST /api/expenses
  → express.json
  → validateExpenseBody
  → ExpenseController.create
  → ExpenseService.create
  → PgExpenseRepository.create
  → INSERT ... RETURNING
  → 201 JSON
  → toast + list/summary refresh
```

### Why this structure?

- **Routes** keep URL and middleware wiring in one place.
- **Controllers** contain no SQL and no validation rules.
- **Services** are reusable and testable independently of HTTP.
- **Repositories** isolate all SQL and make the storage layer swappable.
- **Dependency injection** through `createApp` lets tests use an in-memory
  repository without touching PostgreSQL.
- **The API is the security boundary**: only the backend knows `DATABASE_URL`.

---

## Folder structure

```text
expense-tracker/
├── backend/
│   ├── scripts/
│   │   ├── dbCheck.mjs          # Connection/table verification
│   │   ├── migrate.mjs          # Applies database/schema.sql
│   │   └── smokeTest.mjs        # Live CRUD smoke test
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js            # pg pool, SSL, DATE type parser
│   │   │   └── env.js           # Centralized environment config
│   │   ├── controllers/
│   │   │   └── expenseController.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── notFound.js
│   │   │   └── validation.js
│   │   ├── repositories/
│   │   │   ├── InMemoryExpenseRepository.js
│   │   │   └── PgExpenseRepository.js
│   │   ├── routes/
│   │   │   └── expenseRoutes.js
│   │   ├── services/
│   │   │   └── expenseService.js
│   │   ├── utils/
│   │   │   ├── AppError.js
│   │   │   ├── asyncHandler.js
│   │   │   └── validators.js
│   │   ├── app.js               # Express app factory
│   │   ├── constants.js
│   │   └── server.js            # Startup, DB check, graceful shutdown
│   ├── tests/
│   │   └── expenses.test.js     # 15 API tests
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   ├── CategoryPieChart.jsx
│   │   │   │   ├── ChartTooltip.jsx
│   │   │   │   └── SpendingBarChart.jsx
│   │   │   ├── AppLayout.jsx
│   │   │   ├── CategoryBadge.jsx
│   │   │   ├── CategoryBreakdown.jsx
│   │   │   ├── CategoryFilter.jsx
│   │   │   ├── CategorySummary.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── ErrorState.jsx
│   │   │   ├── ExpenseForm.jsx
│   │   │   ├── ExpenseTable.jsx
│   │   │   ├── Icons.jsx
│   │   │   ├── InlineAlert.jsx
│   │   │   ├── PageHeader.jsx
│   │   │   ├── RecentExpenses.jsx
│   │   │   ├── ScrollToTop.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Skeletons.jsx
│   │   │   └── StatCard.jsx
│   │   ├── constants/
│   │   │   └── categories.js
│   │   ├── context/
│   │   │   └── ToastContext.jsx
│   │   ├── hooks/
│   │   │   ├── useDashboardData.js
│   │   │   ├── useExpenses.js
│   │   │   └── usePageTitle.js
│   │   ├── pages/
│   │   │   ├── AdminPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ExpensesPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   │   ├── base.css
│   │   │   ├── components.css
│   │   │   ├── index.css
│   │   │   ├── layout.css
│   │   │   ├── pages.css
│   │   │   └── tokens.css
│   │   ├── utils/
│   │   │   └── format.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── vercel.json              # SPA rewrite
│   └── vite.config.js
│
├── database/
│   ├── schema.sql               # Required production schema
│   └── sample-data.sql          # Development/demo data only
│
├── docs/
│   ├── CHECKLIST.md
│   ├── DEMO_SCRIPT.md
│   ├── DEPLOYMENT.md
│   ├── INTERVIEW_QA.md
│   └── screenshots/
│
├── .github/workflows/ci.yml     # Backend tests + frontend build
├── .gitignore
├── .nvmrc                       # Node 22
├── render.yaml                  # Render blueprint for the API
└── README.md
```

---

## Database design

### `expenses` table

| Column | PostgreSQL type | Constraints | Purpose |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, default `gen_random_uuid()` | Unique, non-guessable record identifier |
| `amount` | `NUMERIC(12,2)` | `NOT NULL`, `CHECK (amount > 0)` | Exact positive monetary value with two decimals |
| `category` | `VARCHAR(30)` | `NOT NULL`, `CHECK` in five values | Groups expenses for filtering and analytics |
| `description` | `TEXT` | Optional | Short note about the expense |
| `expense_date` | `DATE` | `NOT NULL` | Calendar date the expense belongs to |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `NOW()` | Audit timestamp and same-day tie-breaker |

### Why each choice?

- **UUID instead of a sequential integer:** does not expose record counts or
  make records easy to enumerate. PostgreSQL generates it automatically.
- **`NUMERIC(12,2)` instead of `FLOAT`:** money must be exact. Floating-point
  arithmetic can produce values such as `0.30000000000000004`.
- **`CHECK (amount > 0)`:** zero and negative amounts are rejected at the
  database level as well as in the API.
- **Category `CHECK`:** the database only accepts Food, Travel, Shopping, Bills,
  and Other, so invalid data cannot slip in through a future code path.
- **`DATE` instead of `TIMESTAMPTZ` for the expense date:** an expense belongs
  to a calendar day, not a precise instant. The backend registers a `pg` type
  parser so the date string does not shift across timezones.
- **`created_at`:** useful for auditing and for deterministic ordering when two
  expenses share the same `expense_date`.
- **Indexes:** `(expense_date DESC, created_at DESC)` supports newest-first
  listing; `(category)` supports category filtering.

### Ordering rule

```sql
ORDER BY expense_date DESC, created_at DESC
```

Newest expense date first. If two rows share a date, the most recently created
row appears first.

---

## SQL schema reference

The complete migration is [`database/schema.sql`](database/schema.sql).

```sql
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    amount NUMERIC(12,2) NOT NULL
        CHECK (amount > 0),

    category VARCHAR(30) NOT NULL
        CHECK (
            category IN ('Food', 'Travel', 'Shopping', 'Bills', 'Other')
        ),

    description TEXT,

    expense_date DATE NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date
    ON expenses (expense_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_category
    ON expenses (category);
```

### Apply the schema

**Supabase:** open **SQL Editor**, paste the file contents, and run it.

**Local PostgreSQL:**

```bash
cd backend
npm run db:migrate
npm run db:check
```

`npm run db:migrate` reads `database/schema.sql` and executes it through the
configured `DATABASE_URL`. The schema uses `IF NOT EXISTS`, so it is safe to run
again.

### Sample data

[`database/sample-data.sql`](database/sample-data.sql) inserts 12 realistic
records **only when the table is empty**. It is explicitly development/demo
data, not part of the production migration:

```bash
psql "$DATABASE_URL" -f database/sample-data.sql
```

---

## API documentation

Base URL in development: `http://localhost:5000/api`
Base URL in production: `https://YOUR-API.onrender.com/api`

All request and response bodies are JSON. Errors use:

```json
{
  "message": "Please correct the highlighted fields.",
  "details": [
    { "field": "amount", "message": "Amount must be greater than zero." }
  ]
}
```

`details` is included only for field-level validation errors.

### Expense object

```json
{
  "id": "7f1c2a9e-3b4d-4f6a-8c2e-1d5b7a9f0c3e",
  "amount": 42.5,
  "category": "Shopping",
  "description": "New shoes",
  "expense_date": "2026-11-21",
  "created_at": "2026-11-21T09:30:00.000Z"
}
```

### `GET /api/expenses`

Returns all expenses, newest first. Optionally filters by category.

**Query parameters**

| Name | Required | Values |
|---|---|---|
| `category` | No | Food, Travel, Shopping, Bills, Other |

**Example**

```bash
curl "http://localhost:5000/api/expenses?category=Food"
```

**Response — 200**

```json
{
  "expenses": [
    {
      "id": "7f1c2a9e-3b4d-4f6a-8c2e-1d5b7a9f0c3e",
      "amount": 28.5,
      "category": "Food",
      "description": "Lunch with team",
      "expense_date": "2026-11-22",
      "created_at": "2026-11-22T08:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Errors:** `400` for an unknown category.

---

### `POST /api/expenses`

Creates an expense.

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `amount` | number | Yes | Finite, > 0, at most two decimals, max 9,999,999,999.99 |
| `category` | string | Yes | One of the five allowed categories |
| `description` | string \| null | No | Trimmed; max 500 characters; empty becomes `null` |
| `expense_date` | string | Yes | Real calendar date in `YYYY-MM-DD` format |

**Example**

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250,
    "category": "Food",
    "description": "Lunch",
    "expense_date": "2026-11-21"
  }'
```

**Response — 201**

```json
{
  "id": "7f1c2a9e-3b4d-4f6a-8c2e-1d5b7a9f0c3e",
  "amount": 250,
  "category": "Food",
  "description": "Lunch",
  "expense_date": "2026-11-21",
  "created_at": "2026-11-21T09:30:00.000Z"
}
```

**Errors:** `400` for invalid fields or malformed JSON; `413` for an oversized
body.

---

### `PUT /api/expenses/:id`

Updates an existing expense. The body has the same rules as `POST`.

**Example**

```bash
curl -X PUT http://localhost:5000/api/expenses/7f1c2a9e-3b4d-4f6a-8c2e-1d5b7a9f0c3e \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 300.25,
    "category": "Bills",
    "description": "Electricity",
    "expense_date": "2026-11-22"
  }'
```

**Response — 200:** the updated expense object.

**Errors:** `400` for an invalid UUID or payload; `404` if the expense does not
exist.

---

### `DELETE /api/expenses/:id`

Deletes an expense.

**Example**

```bash
curl -X DELETE http://localhost:5000/api/expenses/7f1c2a9e-3b4d-4f6a-8c2e-1d5b7a9f0c3e
```

**Response — 204:** empty body.

**Errors:** `400` for an invalid UUID; `404` if the expense does not exist.

---

### `GET /api/summary`

Returns totals calculated by PostgreSQL.

**Example**

```bash
curl http://localhost:5000/api/summary
```

**Response — 200**

```json
{
  "totalSpent": 1944.14,
  "expenseCount": 12,
  "categoryBreakdown": [
    { "category": "Bills", "total": 1323.3, "count": 3 },
    { "category": "Shopping", "total": 238.99, "count": 2 },
    { "category": "Travel", "total": 185.4, "count": 2 },
    { "category": "Food", "total": 161.45, "count": 4 },
    { "category": "Other", "total": 35, "count": 1 }
  ]
}
```

When the table is empty:

```json
{
  "totalSpent": 0,
  "expenseCount": 0,
  "categoryBreakdown": []
}
```

The aggregation is:

```sql
SELECT COALESCE(SUM(amount), 0) AS total_spent,
       COUNT(*) AS expense_count
  FROM expenses;

SELECT category,
       SUM(amount) AS total,
       COUNT(*) AS expense_count
  FROM expenses
 GROUP BY category
 ORDER BY total DESC, category ASC;
```

---

### `GET /api/health`

Used by Render's health check and by the smoke test. It runs `SELECT 1` when a
database health checker is configured.

**Response — 200**

```json
{
  "status": "ok",
  "uptime": 42,
  "timestamp": "2026-11-22T10:00:00.000Z"
}
```

**Response — 503:** database temporarily unavailable.

---

### Status codes

| Code | Meaning in this API |
|---|---|
| 200 | Successful read or update |
| 201 | Expense created |
| 204 | Expense deleted |
| 400 | Invalid UUID, body, category filter, or malformed JSON |
| 404 | Expense or route not found |
| 413 | Request body too large |
| 500 | Unexpected server error |
| 503 | Database unavailable |

---

## Environment variables

### Backend (`backend/.env`)

Copy [`backend/.env.example`](backend/.env.example) and fill in real values.
**Never commit `backend/.env`.**

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | `5000` | HTTP port; Render supplies this automatically |
| `FRONTEND_URL` | Yes in production | — | Comma-separated allowed browser origins, no trailing slash |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `DB_SSL_REJECT_UNAUTHORIZED` | No | `true` | TLS certificate verification for hosted PostgreSQL |
| `DB_SSL` | No | auto | Set to `false` to disable SSL explicitly |
| `DB_POOL_MAX` | No | `10` | Maximum pool connections |

Example local configuration:

```dotenv
DATABASE_URL=postgresql://expense_app:your_password@localhost:5432/expense_tracker
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
DB_SSL_REJECT_UNAUTHORIZED=true
```

Production Supabase example (session pooler):

```dotenv
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

### Frontend (`frontend/.env`)

Copy [`frontend/.env.example`](frontend/.env.example) if you need to override
the defaults. Only variables prefixed with `VITE_` are exposed to the browser.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `/api` | Base URL of the API, including `/api` |
| `VITE_CURRENCY` | `USD` | ISO 4217 currency code for `Intl.NumberFormat` |

In development you can omit `frontend/.env` and rely on the Vite proxy:
`/api` → `http://localhost:5000`. In production, set `VITE_API_URL` to the
Render URL. Vite bakes it in at build time, so changing it requires a rebuild.

> **Security:** `DATABASE_URL` must never appear in frontend code or use a
> `VITE_` prefix. The browser bundle is public.

---

## Local installation

### Prerequisites

- **Node.js 20.19+** (Node 22 recommended; see `.nvmrc`)
- **npm** (included with Node)
- **PostgreSQL 15+** locally, or a Supabase project
- **Git**

Check versions:

```bash
node --version
npm --version
psql --version
git --version
```

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/expense-tracker.git
cd expense-tracker
```

### 2. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Create the local database

Choose either **local PostgreSQL** (used for development verification) or
**Supabase** (the production target).

---

## Database configuration

### Option A — Local PostgreSQL

Start PostgreSQL, then create a role and database. Replace `your_password` with
a local development password:

```bash
sudo -u postgres psql -c "CREATE ROLE expense_app WITH LOGIN PASSWORD 'your_password';"
sudo -u postgres createdb -O expense_app expense_tracker
```

Create `backend/.env`:

```dotenv
DATABASE_URL=postgresql://expense_app:your_password@localhost:5432/expense_tracker
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Apply the schema and verify:

```bash
cd backend
npm run db:migrate
npm run db:check
```

Expected:

```text
[db] Schema applied successfully.
[db] Connected to database "expense_tracker".
[db] expenses table is ready (0 rows).
```

Optionally seed demo data:

```bash
psql "postgresql://expense_app:your_password@localhost:5432/expense_tracker" \
  -f ../database/sample-data.sql
```

### Option B — Supabase

1. Create a project at <https://supabase.com>.
2. Open **SQL Editor → New query**.
3. Paste and run [`database/schema.sql`](database/schema.sql).
4. Open **Project Settings → Database → Connection string**.
5. Copy the **Session pooler** string. It supports IPv4, which Render needs.
6. Replace the password placeholder and keep `?sslmode=require`.
7. Put the string in `backend/.env` as `DATABASE_URL`.
8. Verify:

```bash
cd backend
npm run db:check
```

The same schema and `pg` driver work for both local PostgreSQL and Supabase.
See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full production steps.

---

## Running the backend

```bash
cd backend
npm run dev
```

Expected:

```text
[db] Connected to PostgreSQL
[api] Expense Tracker API listening on http://localhost:5000 (development)
```

Useful scripts:

| Command | Purpose |
|---|---|
| `npm run dev` | Start with `node --watch` (auto-restart) |
| `npm start` | Start normally |
| `npm test` | Run the 15 backend tests |
| `npm run db:migrate` | Apply `database/schema.sql` |
| `npm run db:check` | Verify connection and table |
| `npm run smoke` | Live CRUD smoke test against a running API |

Quick checks:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/expenses
curl http://localhost:5000/api/summary
```

The API also exposes `GET /` with a short endpoint index.

---

## Running the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173>.

The Vite development server proxies `/api` to `http://localhost:5000`, so no
CORS configuration is needed locally. If you prefer a direct URL, create
`frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
VITE_CURRENCY=USD
```

Production build:

```bash
cd frontend
npm run build
npm run preview
```

`npm run build` outputs static assets to `frontend/dist/`.

---

## Testing

### Automated backend tests

```bash
cd backend
npm test
```

Result on the completed implementation:

```text
# tests 15
# pass 15
# fail 0
```

The suite uses Node's built-in test runner and Supertest. It injects an
`InMemoryExpenseRepository`, so it never touches PostgreSQL or production data.

Coverage includes:

1. Successful creation returns 201 with the correct body.
2. Descriptions are trimmed; omitted descriptions become `null`.
3. Zero, negative, non-numeric, null, and over-precise amounts are rejected.
4. Invalid categories, impossible dates, and non-string descriptions are
   rejected.
5. A nonexistent valid UUID returns 404 for update and delete.
6. An invalid UUID returns 400.
7. Expenses are listed newest-first.
8. Category filtering works and invalid filters return 400.
9. Updates persist in the repository.
10. Deletes return 204 and repeat deletes return 404.
11. Summary totals and category breakdowns are calculated correctly.
12. An empty database returns a zero summary.
13. Malformed JSON returns a helpful 400.
14. Health and unknown routes return JSON with the correct status.
15. Configured CORS origins are allowed and unknown browser origins are blocked.

### Live API smoke test

This requires a running server and a real database:

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd backend
npm run smoke
```

The script creates a temporary expense, verifies it through list, update, and
summary endpoints, deletes it, and confirms a missing record returns 404. It
cleans up even if an assertion fails.

Against production:

```bash
API_URL="https://YOUR-API.onrender.com/api" npm run smoke
```

### Frontend build verification

```bash
cd frontend
npm run build
```

A successful build is part of CI and confirms that all imports, routes, and
production assets compile.

### Manual browser checklist

- [ ] Dashboard shows real totals and recent expenses.
- [ ] `/expenses` lists records newest-first.
- [ ] Add an expense with decimals; it appears at the top.
- [ ] Filter each category; the list and count update.
- [ ] Edit an expense; the form is pre-populated and the change persists.
- [ ] Delete: confirmation appears; Cancel keeps the record.
- [ ] Confirm delete removes the row and updates totals.
- [ ] Refresh; data remains and deleted records stay deleted.
- [ ] `/admin` shows two charts and five category cards.
- [ ] Direct navigation/refresh to `/expenses` and `/admin` works.
- [ ] Mobile width (390 px) has no horizontal overflow.
- [ ] Browser console has no errors.

The implemented version was verified with a headless Chromium E2E run covering
these flows. Screenshots are in [`docs/screenshots/`](docs/screenshots/).

---

## Deployment

The project is configured for the required hosting stack, but **the production
deployment has not been performed yet** because it requires the account owner's
Supabase, Render, Vercel, and GitHub access.

| Service | Purpose | Configuration |
|---|---|---|
| Supabase | Managed PostgreSQL | Run `database/schema.sql`; use the session-pooler URL |
| Render | Express API | `render.yaml`, root `backend`, health check `/api/health` |
| Vercel | React frontend | Root `frontend`, build `npm run build`, output `dist`, SPA rewrite |
| GitHub | Source control and CI | `.github/workflows/ci.yml` |

### Deployment order

1. Create the Supabase project and run the schema.
2. Push the repository to GitHub.
3. Deploy the backend to Render with `DATABASE_URL` and a temporary
   `FRONTEND_URL`.
4. Deploy the frontend to Vercel with `VITE_API_URL` pointing at Render.
5. Set Render's `FRONTEND_URL` to the exact Vercel origin.
6. Verify the live API, CRUD flows, direct route refreshes, and charts.
7. Run the production smoke test.

Full instructions, including troubleshooting and a post-deployment checklist,
are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Production environment summary

**Render**

```text
DATABASE_URL=postgresql://...supabase.com:5432/postgres?sslmode=require
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
DB_SSL_REJECT_UNAUTHORIZED=true
```

Do not set `PORT` manually on Render; Render provides it.

**Vercel**

```text
VITE_API_URL=https://YOUR-API.onrender.com/api
VITE_CURRENCY=USD
```

---

## Live application URLs

These placeholders must be replaced **only after** the deployments have been
created and tested.

| Application | URL | Status |
|---|---|---|
| Frontend (Vercel) | `https://YOUR-APP.vercel.app` | Not deployed yet |
| Backend API (Render) | `https://YOUR-API.onrender.com` | Not deployed yet |
| API health check | `https://YOUR-API.onrender.com/api/health` | Not deployed yet |
| Database | Supabase project dashboard | Not created yet |
| Demo video | `https://YOUR-VIDEO-LINK` | Not recorded yet |

Do not mark these as complete until each URL has been opened and the
post-deployment checklist has passed.

---

## GitHub repository

```text
https://github.com/YOUR-USERNAME/expense-tracker
```

Status: local Git history is being prepared; the GitHub remote and push are
pending. The repository must not contain `.env` files or credentials.

CI workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs backend
tests and the frontend production build on pushes and pull requests.

---

## Assumptions and limitations

- **No authentication.** The brief explicitly says not to invent an auth
  system. `/admin` is a separate, **public** analytics page, not a secured admin
  area. This is documented in the UI and README.
- **No localStorage for expenses.** PostgreSQL through the API is the only
  source of truth. There is no offline mode.
- **Single currency per deployment.** `VITE_CURRENCY` is a build-time setting.
  Changing it requires a frontend rebuild. It does not convert amounts.
- **No pagination or monthly filter.** These were optional bonus items; the
  core requirements were prioritized.
- **No user accounts or per-user data isolation.** All records belong to the
  single application instance.
- **Production deployment pending.** Local PostgreSQL 18 was used for
  verification. Supabase, Render, and Vercel require external accounts.
- **Free-tier cold starts.** A sleeping Render instance may take 30–60 seconds
  to respond to the first request.
- **Charts are client-side.** Recharts receives already-aggregated data from the
  API; it does not query the database.
- **The sample data is not production data.** `database/sample-data.sql` is for
  development and demos only.

---

## Future improvements

- Add authentication and per-user expense ownership; protect `/admin`.
- Add monthly and date-range filters.
- Add pagination or infinite scrolling for large datasets.
- Add budget limits with warnings.
- Add CSV/PDF export.
- Add recurring expenses.
- Add optimistic UI updates and undo for deletion.
- Add integration tests against a disposable PostgreSQL container.
- Add accessibility automation (axe) and visual regression tests.
- Add request rate limiting and structured production logging.
- Add TypeScript for stronger compile-time guarantees.
- Add a settings page for currency and locale instead of a build-time variable.

---

## Documentation

| Document | Purpose |
|---|---|
| [`docs/CHECKLIST.md`](docs/CHECKLIST.md) | Honest done/pending status and Definition of Done mapping |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Supabase, Render, and Vercel step-by-step guide |
| [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) | 3–5 minute demo script and recording checklist |
| [`docs/INTERVIEW_QA.md`](docs/INTERVIEW_QA.md) | Interview answers with project examples |
| [`docs/screenshots/`](docs/screenshots/) | Desktop and mobile UI screenshots |

---

## Security notes

- All SQL uses parameterized queries (`$1`, `$2`, ...).
- `DATABASE_URL` exists only in backend environment variables and hosting
  settings, never in the frontend bundle.
- `.env` files are gitignored; `.env.example` files contain placeholders only.
- CORS uses an explicit origin allowlist, not `*`.
- Helmet sets security-related HTTP headers.
- The JSON body limit is 16 kB.
- Error responses never include stack traces, SQL, or connection strings.
- Unexpected server errors are logged server-side and returned as a generic 500.
- Input is validated on both the client and the server; database constraints
  provide a final layer.

---

## Author

Built as a full-stack software engineering assessment project.

If you are reviewing this repository, start with the
[`docs/CHECKLIST.md`](docs/CHECKLIST.md) for an honest status summary, then
follow the local setup instructions above. The application is functional
locally; the public deployment and demo video are the remaining external steps.
