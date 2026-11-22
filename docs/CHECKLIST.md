# Project Checklist

Last updated: 2026-11-22

This checklist separates what has been **built and verified locally** from what
still requires external accounts or manual action. Nothing in the "pending"
section should be described as complete until it has actually been tested.

Legend:

- ✅ **Done** — implemented and verified locally.
- ⏳ **Pending** — code/configuration is ready, but the external step has not
  been performed.
- ⬜ **Not started** — no work has been done yet.

---

## 1. Status at a glance

| Area | Status | Notes |
|---|---|---|
| React frontend | ✅ Done | Dashboard, expenses CRUD, `/admin`, 404, responsive layout |
| Express backend | ✅ Done | All five required endpoints plus health check |
| PostgreSQL schema | ✅ Done | Applied to local PostgreSQL 18 |
| Real database integration | ✅ Done locally | CRUD and summary verified against local PostgreSQL |
| Supabase production database | ⏳ Pending | Requires your Supabase account and connection string |
| Backend automated tests | ✅ Done | 15/15 passing with Node test runner + Supertest |
| Frontend production build | ✅ Done | `vite build` passes |
| Browser end-to-end verification | ✅ Done locally | Create, filter, edit, cancel delete, confirm delete, refresh, charts, mobile, 404 |
| Backend deployment (Render) | ⏳ Pending | `render.yaml` and env documentation are ready |
| Frontend deployment (Vercel) | ⏳ Pending | `vercel.json` and env documentation are ready |
| Public URL testing | ⏳ Pending | Must be done after both deployments exist |
| Demo video | ⏳ Pending | Script and checklist are ready; video not recorded |
| Git repository | ✅ Local / ⏳ Remote | 9 meaningful commits created locally; GitHub remote/push still required |
| README | ✅ Done | Architecture, API, schema, setup, testing, deployment |
| Interview preparation | ✅ Done | `docs/INTERVIEW_QA.md` |

---

## 2. Mandatory requirements

### 2.1 Add expense

- ✅ Amount field is numeric, greater than zero, supports decimals.
- ✅ Category selector has Food, Travel, Shopping, Bills, Other.
- ✅ Description is optional.
- ✅ Date is required and defaults to today.
- ✅ Frontend validates before submitting.
- ✅ `POST /api/expenses` validates again on the server.
- ✅ Record is inserted into PostgreSQL with parameterized SQL.
- ✅ Saved record is returned and the list refreshes.
- ✅ Success toast and field-level errors are shown.
- ✅ Invalid amounts (zero, negative, non-numeric, more than two decimals) are rejected.

### 2.2 View expenses

- ✅ Expenses are fetched from the API.
- ✅ Table columns: Amount, Category, Description, Date, Actions.
- ✅ Newest expense date appears first (`expense_date DESC, created_at DESC`).
- ✅ Category filter includes "All" plus the five categories.
- ✅ Filtering is performed by the backend with `?category=`.
- ✅ Loading skeletons are shown while fetching.
- ✅ Empty state is shown when there are no records.
- ✅ Error state with a retry button is shown when the API fails.
- ✅ Mobile layout converts the table into readable cards.

### 2.3 Edit expense

- ✅ Edit button on every row.
- ✅ Form is populated with the existing record.
- ✅ Amount, category, description, and date can all be changed.
- ✅ Updated values are validated on both client and server.
- ✅ `PUT /api/expenses/:id` updates the record.
- ✅ 404 is returned for a valid UUID that does not exist.
- ✅ 400 is returned for an invalid UUID.
- ✅ Updated values persist after a browser refresh (verified against PostgreSQL).

### 2.4 Delete expense

- ✅ Delete button on every row.
- ✅ Custom confirmation dialog shows the expense summary.
- ✅ Cancel leaves the record untouched.
- ✅ `DELETE /api/expenses/:id` removes the record only after confirmation.
- ✅ 204 is returned on success.
- ✅ 404 is returned when the record does not exist.
- ✅ The row disappears and dashboard totals update.
- ✅ Deletion persists after a browser refresh.

### 2.5 Admin dashboard

- ✅ Separate route at `/admin`.
- ✅ Total amount spent card.
- ✅ Total expense count card.
- ✅ Average expense card.
- ✅ Top category card.
- ✅ Category-wise spending summary cards.
- ✅ Recharts bar chart.
- ✅ Recharts donut/pie chart.
- ✅ Recent expenses section.
- ✅ Responsive charts and cards.
- ✅ Currency formatted with `Intl.NumberFormat`.
- ✅ All totals come from `GET /api/summary`, not hardcoded data.
- ✅ Page is documented as **public**, not as a secured admin area.

### 2.6 Backend API

- ✅ `GET /api/expenses` — list, newest first, optional category filter.
- ✅ `POST /api/expenses` — create, returns 201.
- ✅ `PUT /api/expenses/:id` — update, returns 200 or 404.
- ✅ `DELETE /api/expenses/:id` — delete, returns 204 or 404.
- ✅ `GET /api/summary` — total, count, category totals and counts.
- ✅ `GET /api/health` — database-aware health check.
- ✅ JSON error responses with consistent shape.
- ✅ Status codes: 200, 201, 204, 400, 404, 413, 500, 503.

### 2.7 Database

- ✅ `expenses` table with the required columns and types.
- ✅ UUID primary key with `gen_random_uuid()`.
- ✅ `NUMERIC(12,2)` amount with `CHECK (amount > 0)`.
- ✅ Category `CHECK` constraint for the five allowed values.
- ✅ Optional `description`.
- ✅ Required `expense_date DATE`.
- ✅ `created_at TIMESTAMPTZ DEFAULT NOW()`.
- ✅ Index on `(expense_date DESC, created_at DESC)`.
- ✅ Index on `category`.
- ✅ SQL migration committed at `database/schema.sql`.
- ✅ Schema applied and verified locally.
- ⏳ Apply the same schema in Supabase.

### 2.8 Validation and error handling

- ✅ Amount must be finite and greater than zero.
- ✅ At most two decimal places are accepted.
- ✅ Category must be one of the five allowed values.
- ✅ Date must be a real calendar date in `YYYY-MM-DD` format.
- ✅ Description must be a string when supplied; trimmed; max 500 characters.
- ✅ IDs must be valid UUIDs.
- ✅ Missing required fields are rejected.
- ✅ Invalid category filters are rejected.
- ✅ Malformed JSON returns a helpful 400.
- ✅ Oversized request bodies return 413.
- ✅ Database connection failures map to 503.
- ✅ Unexpected errors return a generic 500 without internals.
- ✅ Centralized Express error middleware.
- ✅ No stack traces, passwords, or connection strings are returned.

### 2.9 Frontend UX

- ✅ Professional SaaS-style financial dashboard.
- ✅ Sidebar navigation with active state.
- ✅ Summary cards, forms, table, filter chips, dialog, charts.
- ✅ Loading, error, empty, and success states.
- ✅ Accessible labels, focus styles, skip link, keyboard Escape handling.
- ✅ Responsive at desktop, laptop, tablet, and mobile widths.
- ✅ Reduced-motion media query.
- ✅ No horizontal overflow at 390 px (verified).
- ✅ Zero browser console errors during the E2E run.

### 2.10 Testing

- ✅ At least three automated backend tests (15 implemented).
- ✅ Test 1: successful creation returns 201 and the correct body.
- ✅ Test 2: invalid amounts are rejected with 400 and nothing is stored.
- ✅ Test 3: nonexistent valid UUID returns 404.
- ✅ Additional tests: invalid UUID, filtering, ordering, update, delete,
  summary math, empty summary, malformed JSON, health/404, CORS.
- ✅ Tests use an injectable in-memory repository; production data is untouched.
- ✅ Live smoke test against local PostgreSQL passes.
- ✅ Browser E2E against the running app passes.

### 2.11 Git and secrets

- ✅ `.gitignore` excludes `.env`, `node_modules`, `dist`, logs, and editor files.
- ✅ `backend/.env.example` documents required variables without secrets.
- ✅ `frontend/.env.example` documents required variables without secrets.
- ✅ Backend `.env` exists locally but is ignored by Git.
- ✅ No credentials are present in source files.
- ✅ Initialize Git repository and create meaningful commits (9 commits on `main`).
- ⏳ Create GitHub repository and push.
- ⏳ Confirm the remote does not contain `.env` files.

### 2.12 Deployment

- ⏳ Create Supabase project and run `database/schema.sql`.
- ⏳ Set `DATABASE_URL` on Render to the Supabase session-pooler string.
- ⏳ Deploy the backend to Render.
- ⏳ Deploy the frontend to Vercel with `VITE_API_URL`.
- ⏳ Set `FRONTEND_URL` on Render to the exact Vercel origin.
- ⏳ Verify direct navigation and refresh on `/expenses` and `/admin`.
- ⏳ Run the post-deployment checklist in `docs/DEPLOYMENT.md`.
- ⏳ Run `npm run smoke` against the production API.
- ⏳ Test the application using its public URL.

### 2.13 Documentation

- ✅ `README.md` covers architecture, schema, API, setup, testing, deployment,
  assumptions, limitations, and placeholders for live URLs.
- ✅ `docs/DEPLOYMENT.md` has step-by-step Supabase/Render/Vercel instructions.
- ✅ `docs/DEMO_SCRIPT.md` has a timed 3–5 minute script and recording checklist.
- ✅ `docs/INTERVIEW_QA.md` answers every interview topic from the brief.
- ✅ `docs/CHECKLIST.md` (this file) tracks honest status.
- ✅ Screenshots are stored in `docs/screenshots/`.

### 2.14 Demo video

- ⏳ Record a 3–5 minute video using `docs/DEMO_SCRIPT.md`.
- ⏳ Show the deployed URL, CRUD, filter, refresh persistence, and both charts.
- ⏳ Upload the video and add the link to the README.
- ⏳ Watch the recording once before submitting.

---

## 3. Verification evidence (local)

These commands were run against the local PostgreSQL database and the local
development servers.

### Backend tests

```bash
cd backend
npm test
```

Result:

```text
# tests 15
# pass 15
# fail 0
```

### Live API smoke test

```bash
cd backend
npm run smoke
```

Result: create, list, update, summary, delete, and 404 cleanup all passed.

### Frontend production build

```bash
cd frontend
npm run build
```

Result: build completed successfully. The analytics route is lazy-loaded so
Recharts is not part of the initial dashboard bundle.

### Browser E2E

A headless Chromium run verified:

- Dashboard loads real summary data.
- Expenses table shows 12 seeded records, newest first.
- Create via the form shows a toast and the new row.
- Food filter returns only Food records and updates the count.
- Edit form is populated, update succeeds, and the row changes.
- Delete confirmation opens; Cancel keeps the record.
- Confirm delete removes the row and updates totals.
- Refresh keeps the remaining records and does not restore the deleted one.
- `/admin` renders two Recharts charts and five category cards.
- Dashboard, expenses, and admin have no horizontal overflow at 390 px.
- Unknown routes render the 404 page.
- No browser console errors occurred.

Screenshots: `docs/screenshots/`.

---

## 4. Definition of Done mapping

| Definition of Done item | Status |
|---|---|
| React frontend is functional | ✅ |
| Express backend is functional | ✅ |
| Supabase PostgreSQL is connected | ⏳ local PostgreSQL verified; Supabase pending |
| Expenses can be created | ✅ |
| Expenses can be retrieved | ✅ |
| Expenses can be edited | ✅ |
| Expenses can be deleted with confirmation | ✅ |
| Category filtering works | ✅ |
| Newest expenses appear first | ✅ |
| Dashboard totals are correct | ✅ |
| Category-wise charts display actual database data | ✅ locally |
| Browser refresh does not lose saved information | ✅ locally |
| At least three automated backend tests pass | ✅ 15 tests |
| Frontend is deployed to Vercel | ⏳ |
| Backend is deployed to Render | ⏳ |
| Production database is cloud-hosted | ⏳ |
| Database credentials are protected | ✅ locally; verify Render/Vercel tomorrow |
| README is complete | ✅ |
| Demo script is prepared | ✅ |
| Application is tested using its public URL | ⏳ |
| Developer can explain the architecture and implementation | ✅ preparation in `docs/INTERVIEW_QA.md` |

---

## 5. Remaining work for tomorrow

Do these in order. Full details are in `docs/DEPLOYMENT.md`.

1. **Supabase**
   - Create a project.
   - Run `database/schema.sql` in the SQL Editor.
   - Copy the session-pooler connection string.
   - Optionally run `database/sample-data.sql` for demo data.
2. **Render**
   - Push the repository to GitHub.
   - Create the service from `render.yaml` or manually with root directory `backend`.
   - Set `DATABASE_URL` and a temporary `FRONTEND_URL`.
   - Confirm `/api/health` returns 200.
3. **Vercel**
   - Import the repository with root directory `frontend`.
   - Set `VITE_API_URL=https://YOUR-API.onrender.com/api`.
   - Set `VITE_CURRENCY` if a currency other than USD is wanted.
   - Deploy and copy the production URL.
4. **Connect them**
   - Set `FRONTEND_URL` on Render to the exact Vercel origin.
   - Redeploy Render and confirm there are no CORS errors.
5. **Verify**
   - Complete every item in `docs/DEPLOYMENT.md` section 4.
   - Run `API_URL="https://YOUR-API.onrender.com/api" npm run smoke`.
6. **Publish**
   - Update the README live URL table.
   - Add the GitHub repository URL.
   - Record and upload the demo video; add the link.
7. **Final secrets check**
   - `git status` should not list any `.env` file.
   - Search the repository for `expense_local_password`, Supabase passwords,
     and service-role keys before making the repository public.

---

## 6. Deliberate scope decisions

These are intentional, not missing features:

- **No authentication.** The brief explicitly says not to invent an auth
  system. `/admin` is public and labelled as such.
- **No localStorage persistence.** All production data is stored through the
  API in PostgreSQL. Browser storage is not used for expenses.
- **No pagination or monthly filter.** These are optional bonus items. The
  core requirements were prioritized.
- **Plain CSS instead of Tailwind.** The brief allows either. A small design
  system in `frontend/src/styles/` keeps the project understandable.
- **In-memory repository for tests.** This keeps tests deterministic and safe.
  Real PostgreSQL behavior is covered by the separate smoke test.
- **Local PostgreSQL for development verification.** The production database
  target remains Supabase; only `DATABASE_URL` changes.
