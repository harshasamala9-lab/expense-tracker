# Demo Script (3–5 minutes)

> Status: **script prepared, video not recorded.** Record it only after the
> Supabase, Render, and Vercel deployment is complete and verified.

## Before recording

- [ ] Production deployment is live and tested (see `docs/DEPLOYMENT.md`).
- [ ] The database contains 8–12 realistic records for the charts.
- [ ] Delete any temporary "smoke test" records.
- [ ] Browser zoom is 100%; window is 1440×900 or 1920×1080.
- [ ] Close personal tabs, notifications, and password managers.
- [ ] No `.env`, Supabase dashboard password, or connection string is visible.
- [ ] Microphone is tested; record in a quiet room.
- [ ] Have the deployed URL ready in the address bar.
- [ ] Keep the demo under 5 minutes.

Suggested demo data is in `database/sample-data.sql` (development/demo only).

---

## Script

### 0:00–0:20 — Introduction

> "Hi, I'm [name]. This is my Expense Tracker, a full-stack application built
> with React, Express, and PostgreSQL hosted on Supabase. It records expenses,
> supports editing and deleting, filters by category, and includes a separate
> analytics dashboard with charts."

Show the dashboard at the deployed URL.

### 0:20–0:45 — Architecture in one breath

> "The browser talks only to the Express REST API. The API validates every
> request, runs parameterized SQL through the pg connection pool, and is the
> only layer that knows the database credentials. React never talks to
> PostgreSQL directly."

Optionally show the README architecture diagram.

### 0:45–1:10 — Dashboard overview

Point out:

- Total spent card.
- Expense count and average.
- Top category.
- Recent expenses.
- Category progress bars.

> "All of these numbers come from `GET /api/summary`, which uses SUM, COUNT,
> and GROUP BY in PostgreSQL. There are no hardcoded totals."

### 1:10–1:45 — Add an expense

1. Click **Add expense**.
2. Enter amount `24.50`.
3. Choose category **Food**.
4. Description: `Team lunch`.
5. Keep today's date.
6. Click **Save expense**.
7. Show the success toast and the new row at the top.

> "The form validates in the browser, then the backend validates the same data
> again before inserting it with a parameterized query. The list and summary
> refresh from the API."

### 1:45–2:05 — View and filter

1. Click **Food** in the category filter.
2. Show that only Food records remain and the count updates.
3. Click **All**.
4. Point out that dates are sorted newest first.

> "Filtering calls `GET /api/expenses?category=Food`; it is not just hiding
> rows in the browser."

### 2:05–2:35 — Edit

1. Click the pencil icon on the new expense.
2. Show the form populated with the existing values.
3. Change the amount to `29.00` and the description to `Team lunch (updated)`.
4. Click **Update expense**.
5. Show the toast and the updated row.

> "This is a PUT request. The backend checks the UUID, validates the full
> payload, and returns 404 if the record does not exist."

### 2:35–3:05 — Delete with confirmation

1. Click the trash icon on the same expense.
2. Show the confirmation dialog with the expense summary.
3. Click **Cancel** once; show that the record remains.
4. Click delete again and confirm.
5. Show the success toast and the row disappearing.
6. Show the total spent decreasing.

> "The record is only deleted after explicit confirmation. The dialog is a
> custom accessible modal, not `window.confirm`."

### 3:05–3:25 — Persistence after refresh

1. Refresh the browser.
2. Show that the remaining records are still present.
3. Optionally add an expense, refresh, and show it remains.

> "Data lives in Supabase PostgreSQL, not localStorage. Refreshing the browser
> does not lose anything."

### 3:25–4:05 — Admin analytics

1. Navigate to `/admin` directly (or refresh the page to show SPA routing).
2. Show total spent, count, average, and top category.
3. Show the bar chart and donut chart.
4. Point out category summary cards and recent expenses.
5. Mention the scope note.

> "This page uses the same summary endpoint. The charts use Recharts and show
> actual database values. The brief did not request authentication, so this
> page is intentionally public and documented as such."

### 4:05–4:30 — Testing and close

> "The backend has 15 automated tests using Node's test runner and Supertest.
> They cover successful creation, invalid amounts, invalid categories and
> dates, missing UUIDs, filtering, updates, deletes, summary math, malformed
> JSON, CORS, and health checks. The tests use an injectable in-memory
> repository, so they never touch production data. I also verified the real
> Supabase integration with a live CRUD smoke test."

Close with:

> "The app is deployed on Vercel and Render, with PostgreSQL on Supabase. The
> README documents the architecture, API, schema, setup, tests, and deployment.
> Thanks for watching."

---

## Recording checklist

- [ ] Length is 3–5 minutes.
- [ ] Deployed URL is visible in the address bar.
- [ ] Create, read, filter, update, delete, refresh, and admin are all shown.
- [ ] Confirmation dialog is shown before deleting.
- [ ] No secrets, passwords, or connection strings appear.
- [ ] Audio is clear and narration matches the actions.
- [ ] The video was actually watched once after recording.
- [ ] Upload to Google Drive/YouTube/Loom and add the link to the README.

## What not to claim

- Do not say the admin page is secured; it is public by design.
- Do not say tests run against the production database; they use an in-memory
  repository, with a separate live smoke test.
- Do not say the video exists until it has been recorded and uploaded.
