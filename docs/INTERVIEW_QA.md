# Interview Preparation

This guide answers the interview topics from the project brief using the
**actual implementation** in this repository. Each important question has:

1. **Short answer** — what you would say first.
2. **In this project** — a concrete file or behaviour to reference.
3. **Go deeper** — a follow-up explanation if the interviewer probes.

> Accuracy note: the application was built and verified against a local
> PostgreSQL 18 database. The Supabase production connection and the Render /
> Vercel deployments are prepared but pending the account owner's action. Do
> not claim they are live until they have been tested.

---

## 1. React

### 1.1 What is React?

**Short answer:** React is a JavaScript library for building user interfaces
from reusable components. It keeps the UI in sync with application state using
a declarative rendering model.

**In this project:** The UI is a React 19 single-page application built with
Vite. `frontend/src/main.jsx` mounts `<App />` into `#root`, and `App.jsx`
defines the routes.

**Go deeper:** Instead of manually changing DOM elements, we describe what the
UI should look like for a given state. When state changes, React re-renders the
affected components and updates the DOM efficiently. React does not include a
router, HTTP client, or database layer; this project adds React Router for
routing and plain `fetch` for API calls.

### 1.2 What are components?

**Short answer:** Components are reusable, self-contained pieces of UI. They
can be functions that accept inputs (props) and return JSX.

**In this project:** `ExpenseTable`, `ExpenseForm`, `StatCard`,
`CategoryFilter`, `ConfirmDialog`, `SpendingBarChart`, and `CategoryPieChart`
are all components. Pages such as `DashboardPage` compose them.

**Go deeper:** Keeping components small makes them easier to test, reuse, and
reason about. Presentational components (for example `CategoryBadge`) receive
data through props. Container/page components (for example `ExpensesPage`) own
state and coordinate API calls.

### 1.3 What are props?

**Short answer:** Props are read-only values passed from a parent component to
a child component. They are how data flows down the component tree.

**In this project:** `ExpenseTable` receives `expenses`, `onEdit`, `onDelete`,
and `deletingId`. `StatCard` receives `label`, `value`, `meta`, `icon`, and
`featured`.

**Go deeper:** A child must not mutate its props. If a child needs to change
parent state, the parent passes a callback (for example `onDelete`) and the
child calls it. This one-way data flow makes state changes predictable.

### 1.4 What is useState?

**Short answer:** `useState` is a React hook that gives a component local state
and a setter function. Calling the setter schedules a re-render.

**In this project:** `ExpensesPage` uses state for the selected filter, the
expense being edited, the submit/delete loading flags, and the expense awaiting
deletion. `ExpenseForm` uses state for its controlled input values and
validation errors.

**Go deeper:** State updates are asynchronous and may be batched. When the next
value depends on the previous value, use the updater form, for example:

```js
setValues((current) => ({ ...current, [name]: value }));
```

This avoids stale-state bugs when several updates happen close together.

### 1.5 What is useEffect?

**Short answer:** `useEffect` runs side effects after rendering. It is used for
things like fetching data, subscribing to events, or syncing with the document.
The dependency array controls when it runs.

**In this project:** `useExpenses` calls `load()` when the selected category
changes. `usePageTitle` updates `document.title`. `AppLayout` adds and removes
window event listeners and manages body scroll while the mobile sidebar is
open.

**Go deeper:** An empty dependency array runs the effect once after the first
render (in development, React StrictMode runs it twice to surface bugs). A
cleanup function cancels timers, listeners, or in-flight work. In this project,
the expenses hook uses a request ID so a slow response for an old category
cannot overwrite a newer response.

### 1.6 How does form handling work?

**Short answer:** The form uses controlled inputs: each input's value comes from
React state, and `onChange` updates that state. On submit, the handler validates
the values, calls the API, and shows success or field errors.

**In this project:** `ExpenseForm.jsx` keeps `values` and `errors`. `validate()`
checks amount, date, and description length. On success it calls the `onSave`
prop, which is `handleSave` in `ExpensesPage`. The backend validates the same
payload again.

**Go deeper:** Controlled inputs make validation and formatting predictable.
The form uses `noValidate` so the custom messages are shown consistently, while
still using semantic input types (`number`, `date`) and `aria-invalid` /
`aria-describedby` for accessibility. The submit button is disabled while the
request is in flight to prevent duplicate submissions.

### 1.7 How does React call an API?

**Short answer:** It uses `fetch` inside an async function, usually called from
an effect or an event handler, then stores the result in state.

**In this project:** `frontend/src/services/api.js` wraps `fetch` in a shared
`request()` function. It builds the URL from `VITE_API_URL` (or `/api` in
development), sets JSON headers, parses the response, and throws a typed
`ApiError` for non-2xx responses. Hooks and page handlers call `getExpenses`,
`createExpense`, `updateExpense`, `deleteExpense`, and `getSummary`.

**Go deeper:** Keeping HTTP details in one service module avoids duplicating
error handling in components. In development, Vite proxies `/api` to
`http://localhost:5000`, so no CORS setup is needed locally. In production,
`VITE_API_URL` points at the Render API.

### 1.8 How are loading and error states handled?

**Short answer:** Hooks expose `loading` and `error`; pages render skeletons
while loading, an error card with a retry button on failure, and an empty state
when the request succeeds but there is no data.

**In this project:** `useExpenses` and `useDashboardData` track loading and
error. `Skeletons.jsx` provides table, stat, chart, and recent-list skeletons.
`ErrorState.jsx` shows a retry action. `InlineAlert.jsx` handles a background
refresh failure without hiding existing data. `EmptyState.jsx` handles zero
records.

**Go deeper:** Distinguishing initial loading from background refreshing avoids
flicker. The pages keep existing data visible if a refresh fails, and only show
a full-page error when there is no data to display. This is a better experience
than replacing everything with an error message.

---

## 2. Node.js and Express

### 2.1 What is Node.js?

**Short answer:** Node.js is a JavaScript runtime built on Chrome's V8 engine.
It lets JavaScript run outside the browser, which is how this project runs the
Express server.

**In this project:** The backend uses Node.js 20.19+ with ES modules. `npm start`
runs `src/server.js`; `npm test` runs the built-in test runner.

**Go deeper:** Node uses a single-threaded event loop with non-blocking I/O.
Database and network operations are delegated to the operating system and
resolved through callbacks/promises, so the server can handle other requests
while waiting. That is why the `pg` pool and `async/await` work well here.

### 2.2 What is Express.js?

**Short answer:** Express is a minimal web framework for Node.js. It provides
routing, middleware, request/response helpers, and error handling for HTTP APIs.

**In this project:** `backend/src/app.js` creates the Express app, registers
middleware and routes, and exports a factory. `server.js` starts the listener
and handles graceful shutdown.

**Go deeper:** The app factory (`createApp`) accepts dependencies, so tests can
inject an in-memory repository and run without a database. This is a small form
of dependency injection and makes the tests fast and deterministic.

### 2.3 What is middleware?

**Short answer:** Middleware is a function that runs during the request
lifecycle. It can inspect or modify the request/response, end the request, or
call `next()` to continue.

**In this project:** The backend uses `helmet` for security headers, `cors` for
origin control, `express.json` for body parsing, `morgan` for request logging,
custom validation middleware, a 404 handler, and a centralized error handler.

**Go deeper:** Order matters. Body parsing and CORS must run before routes;
validation runs before controllers; the 404 handler runs after all routes; the
error handler is registered last. Express recognizes an error handler by its
four arguments `(error, req, res, next)`.

### 2.4 What is a REST API?

**Short answer:** A REST API exposes resources through URLs and uses HTTP
methods to operate on them. It is stateless: each request contains everything
needed to process it.

**In this project:** `/api/expenses` is the collection resource and
`/api/expenses/:id` is a single expense. `/api/summary` is a read-only
aggregate resource.

**Go deeper:** The API returns JSON, uses meaningful status codes, and does not
keep per-user session state. The server is the only layer that talks to
PostgreSQL; the browser never receives database credentials.

### 2.5 Explain GET, POST, PUT, and DELETE.

**Short answer:**

- `GET` reads data and should not change it.
- `POST` creates a new resource.
- `PUT` replaces/updates an existing resource.
- `DELETE` removes a resource.

**In this project:**

| Method | Endpoint | Behaviour |
|---|---|---|
| GET | `/api/expenses` | List expenses, optional `?category=` |
| POST | `/api/expenses` | Create, return 201 |
| PUT | `/api/expenses/:id` | Update, return 200 or 404 |
| DELETE | `/api/expenses/:id` | Delete, return 204 or 404 |
| GET | `/api/summary` | Totals and category breakdown |

**Go deeper:** `PUT` is used as a full update because the form sends all
editable fields. `DELETE` returns 204 with no body, which the frontend handles
explicitly. `GET /api/expenses` supports filtering via a query parameter rather
than a separate route.

### 2.6 What is CORS?

**Short answer:** Cross-Origin Resource Sharing is a browser security mechanism.
The API must explicitly allow the frontend's origin, otherwise the browser
blocks the response.

**In this project:** `backend/src/app.js` builds an allowlist from
`FRONTEND_URL` (comma-separated origins are supported). Requests without an
`Origin` header, such as curl or health checks, are allowed. An unknown browser
origin receives 403.

**Go deeper:** CORS is enforced by the browser, not by the server's network
stack. A non-browser client can still call the API, so CORS is not
authentication. In production, `FRONTEND_URL` must exactly match the Vercel
origin, including `https://` and excluding a trailing slash.

### 2.7 How does backend validation work?

**Short answer:** Validation middleware checks the request before the controller
runs. If anything is invalid, it returns 400 with field-level messages; if valid,
it stores a normalized payload on `req.validatedExpense`.

**In this project:** `middleware/validation.js` calls
`utils/validators.js`. It validates amount, category, date, description, UUIDs,
and category filters. The database also has `CHECK` constraints as a final
safety net.

**Go deeper:** Backend validation is mandatory even though the frontend also
validates, because a browser can be bypassed with curl or modified JavaScript.
The validator rejects amounts with more than two decimal places instead of
silently rounding, validates that dates such as `2026-02-30` do not exist, and
trims descriptions. Unknown body fields are ignored intentionally.

### 2.8 How are errors handled?

**Short answer:** Controllers use `asyncHandler` to forward rejected promises to
Express. A single `errorHandler` converts known errors into safe JSON responses
and logs unexpected ones on the server.

**In this project:** `utils/AppError.js` carries a status code and optional
details. `middleware/errorHandler.js` maps malformed JSON, oversized bodies,
PostgreSQL constraint errors, and connection failures to appropriate statuses.
Unexpected errors return a generic 500 message.

**Go deeper:** The client never sees stack traces, SQL, passwords, or
connection strings. Known client errors (400/404) are logged briefly; server
errors are logged with the full error for debugging. If headers have already
been sent, the handler delegates back to Express instead of trying to send a
second response.

---

## 3. PostgreSQL and Supabase

### 3.1 What is PostgreSQL?

**Short answer:** PostgreSQL is an open-source relational database. It stores
data in tables with typed columns, supports constraints, transactions, indexes,
and powerful SQL aggregation.

**In this project:** The `expenses` table stores one row per expense. Summary
totals use `SUM`, `COUNT`, and `GROUP BY`. The backend connects with the `pg`
driver.

**Go deeper:** PostgreSQL is relational, so the schema enforces structure and
data integrity. `NUMERIC` stores exact decimal values, which matters for money.
Transactions ensure a group of statements either all succeed or all fail; this
project's single-row writes do not need explicit transactions, but the pool
supports them if the app grows.

### 3.2 What is Supabase?

**Short answer:** Supabase is a hosted platform built around PostgreSQL. It
provides a managed database, dashboard, SQL editor, connection pooling, and
optional services such as auth and storage.

**In this project:** Supabase is the intended production database host. The
backend uses the standard PostgreSQL connection string and the `pg` package, so
no Supabase-specific SDK is required. The local verification used PostgreSQL 18
with the same schema and driver.

**Go deeper:** Because the API is the only database client, the frontend never
uses Supabase keys. For a Render deployment, the **session pooler** connection
string is preferred because it supports IPv4 and behaves like a normal
PostgreSQL connection. The database password must stay in Render's environment
settings, never in Git.

### 3.3 What is a primary key?

**Short answer:** A primary key uniquely identifies each row. It must be unique
and not null.

**In this project:** `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` identifies
each expense. The API uses it in `/api/expenses/:id`.

**Go deeper:** A primary key automatically creates a unique index, so lookups
by ID are fast. Without a key, duplicate or ambiguous rows would be possible,
and updating or deleting a specific record would be unreliable.

### 3.4 Why use UUID?

**Short answer:** A UUID is a 128-bit identifier that is effectively unique
without asking the database for the next number. It does not reveal how many
records exist or the order in which they were created.

**In this project:** The database generates UUIDs with `gen_random_uuid()`.
The validator checks the UUID format before any query runs.

**Go deeper:** Sequential integer IDs make it easy to guess other records
(`/api/expenses/1`, `/api/expenses/2`). UUIDs are harder to enumerate. They also
let a client or another service generate an ID before inserting. The trade-off
is slightly larger storage and less human-readable URLs, which is acceptable
here.

### 3.5 Why use NUMERIC for money?

**Short answer:** `NUMERIC` stores exact decimal values. Floating-point types
such as `FLOAT` can produce rounding errors (for example `0.1 + 0.2`), which is
unacceptable for money.

**In this project:** `amount NUMERIC(12,2)` stores up to 12 total digits with
exactly two decimal places. The API converts the PostgreSQL string to a Number
for JSON, and the frontend formats it with `Intl.NumberFormat`.

**Go deeper:** The validator also rejects more than two decimal places instead
of silently rounding. The `CHECK (amount > 0)` constraint prevents zero or
negative values even if a future code path forgets validation. JavaScript
`Number` is safe for the allowed range here; for extremely large financial
systems, decimal libraries or integer cents are common alternatives.

### 3.6 What are database constraints?

**Short answer:** Constraints are rules enforced by the database, such as
`NOT NULL`, `UNIQUE`, `PRIMARY KEY`, `FOREIGN KEY`, and `CHECK`.

**In this project:** The schema requires amount, category, and date; restricts
amount to positive values; restricts category to the five allowed values; and
defaults `created_at` to `NOW()`.

**Go deeper:** Application validation gives friendly error messages, while
constraints protect data integrity at the lowest level. If a bug or a direct
SQL import bypasses the API, the database still rejects invalid rows. This
defense in depth is why both layers exist.

### 3.7 What is an SQL index?

**Short answer:** An index is a data structure that speeds up lookups and
sorting at the cost of extra storage and slightly slower writes.

**In this project:** `idx_expenses_date` on `(expense_date DESC, created_at DESC)`
supports the default newest-first ordering. `idx_expenses_category` supports
category filtering.

**Go deeper:** Without an index, PostgreSQL may scan the whole table and sort
the result. With the index, it can read rows in the required order or quickly
locate a category. Indexes are most useful on columns used in `WHERE`, `ORDER
BY`, and joins. Over-indexing is wasteful, so only query patterns used by the
app are indexed.

### 3.8 How does GROUP BY work?

**Short answer:** `GROUP BY` collapses rows that share a value into one row per
group, so aggregate functions can be applied to each group.

**In this project:** The summary query groups by `category` and calculates
`SUM(amount)` and `COUNT(*)` per category. The result is ordered by total
descending.

**Go deeper:** Every selected column must either be in the `GROUP BY` or be
inside an aggregate function. This query returns one row per category, which
the frontend maps into chart data and category cards.

### 3.9 How does SUM work?

**Short answer:** `SUM(amount)` adds all non-null values in a column. `COUNT(*)`
counts rows. `COALESCE(SUM(amount), 0)` returns zero when the table is empty.

**In this project:** The totals query computes total spent and expense count;
the grouped query computes per-category totals. The frontend does not calculate
the authoritative totals; it displays the API result.

**Go deeper:** `SUM` ignores `NULL` values. Since `amount` is `NOT NULL`, every
row contributes. PostgreSQL returns `NUMERIC` for a `SUM` of `NUMERIC`, and the
repository converts it to a JavaScript number for the JSON response.

### 3.10 How does the backend connect to PostgreSQL?

**Short answer:** The backend uses the `pg` package and a connection pool. The
connection string comes from `DATABASE_URL`.

**In this project:** `config/db.js` lazily creates a `pg.Pool`, configures SSL
for non-local hosts, sets pool limits and timeouts, and exports `getPool()` and
`closePool()`. `PgExpenseRepository` runs parameterized queries through the
pool.

**Go deeper:** A pool reuses connections instead of opening one per request,
which is essential for performance. The pool is created lazily so importing the
app in tests does not require a database. The server checks `SELECT 1` at
startup and shuts the pool down gracefully on `SIGTERM`/`SIGINT`.

### 3.11 Why does the DATE parser matter?

**Short answer:** By default, `pg` may parse a PostgreSQL `DATE` into a
JavaScript `Date` at local midnight. Serializing that to JSON in a different
timezone can shift the calendar date by one day.

**In this project:** `config/db.js` registers a type parser for OID `1082` that
returns the raw `YYYY-MM-DD` string. This keeps `expense_date` stable across
timezones.

**Go deeper:** This is a real bug that was found and fixed during development.
Dates without a time or timezone should stay as plain calendar dates. The
frontend also appends `T00:00:00` when formatting so the displayed date does
not shift.

---

## 4. Deployment and Security

### 4.1 What is Vercel?

**Short answer:** Vercel is a hosting platform for frontend applications. It
builds the project, serves static assets from a global CDN, and supports SPA
rewrites.

**In this project:** The React app is configured to deploy with root directory
`frontend`, build command `npm run build`, and output directory `dist`.
`vercel.json` rewrites unknown paths to `index.html` so `/expenses` and `/admin`
work on direct navigation and refresh.

**Go deeper:** Without the rewrite, a direct request to `/admin` would ask the
static host for a file that does not exist and return 404. The rewrite lets
React Router handle the route. Vite environment variables are baked in at build
time, so changing `VITE_API_URL` requires a new deployment.

### 4.2 What is Render?

**Short answer:** Render is a cloud platform for hosting backend services,
databases, and other workloads. It builds from a Git repository and runs the
start command.

**In this project:** `render.yaml` defines a Node web service with root
directory `backend`, build command `npm ci`, start command `npm start`, and
health check path `/api/health`. `DATABASE_URL` and `FRONTEND_URL` are marked
`sync: false` so they are entered in the dashboard rather than committed.

**Go deeper:** Render provides the `PORT` environment variable, so the app reads
`process.env.PORT` with a local fallback of 5000. The health check lets Render
restart or stop routing traffic to an unhealthy instance. Free instances may
sleep and cold-start after inactivity.

### 4.3 What are environment variables?

**Short answer:** Environment variables are configuration values supplied by the
runtime instead of hardcoded in source code. They keep secrets and
environment-specific settings out of Git.

**In this project:**

Backend: `DATABASE_URL`, `PORT`, `FRONTEND_URL`, `NODE_ENV`,
`DB_SSL_REJECT_UNAUTHORIZED`, optional `DB_POOL_MAX` and `DB_SSL`.
Frontend: `VITE_API_URL`, `VITE_CURRENCY`.

**Go deeper:** `.env.example` files document the names without real values.
Local `.env` files are gitignored. In production, Render and Vercel inject the
values. Vite only exposes variables prefixed with `VITE_`, which is why the
database credentials must never use that prefix or appear in frontend code.

### 4.4 Why should database credentials never be exposed?

**Short answer:** Anyone with the credentials can read, modify, or delete all
data, and may be able to escalate privileges or incur costs.

**In this project:** The React bundle contains only `VITE_API_URL` and
`VITE_CURRENCY`. `DATABASE_URL` exists only in the backend environment and
Render settings. API error responses never include connection details.

**Go deeper:** Frontend code is downloadable by every visitor, so anything
bundled there is public. Even obfuscation is not protection. The safe boundary
is the API: the browser sends HTTP requests, and the server decides what SQL to
run. Credentials should also be rotated if they are ever exposed.

### 4.5 What is SQL injection?

**Short answer:** SQL injection is an attack where untrusted input is
concatenated into SQL and changes the query's meaning, for example by adding
`OR 1=1` or a destructive statement.

**In this project:** All user values go through `$1`, `$2`, ... placeholders in
`PgExpenseRepository`. The SQL text is fixed; values are sent separately.

**Go deeper:** An example of the wrong approach would be
`` `SELECT * FROM expenses WHERE category = '${category}'` ``. With a crafted
category, an attacker could alter the query. The project validates category
against an allowlist as an extra layer, but parameterization is the primary
defense.

### 4.6 Why use parameterized queries?

**Short answer:** Parameterized queries separate SQL code from data, so the
database treats user input as values, never as executable SQL.

**In this project:** For example:

```sql
SELECT id, amount, category, description, expense_date, created_at
FROM expenses
WHERE category = $1
ORDER BY expense_date DESC, created_at DESC
```

The category is passed as `[category]`.

**Go deeper:** Parameters also handle quoting and escaping correctly, including
apostrophes in descriptions. They can improve performance because PostgreSQL
can reuse a prepared plan. They do not replace validation: the app still checks
types, ranges, and allowed values before querying.

### 4.7 How does deployed frontend-backend communication work?

**Short answer:** The browser sends HTTPS requests to the Render API using the
URL in `VITE_API_URL`. The API checks the browser origin against
`FRONTEND_URL`, runs the query, and returns JSON. The frontend renders the
result.

**In this project:** Production flow:

```text
Browser (Vercel)
  -> HTTPS GET https://YOUR-API.onrender.com/api/expenses
  -> CORS allowlist checks the Vercel origin
  -> Express validation/controller/service
  -> pg pool -> Supabase PostgreSQL
  -> JSON response -> React state -> UI
```

**Go deeper:** The database is never exposed to the browser. CORS must allow
the exact Vercel origin, and the frontend must point at the exact Render URL
including `/api`. A mismatch in either direction produces network or CORS
errors even though both services are running.

---

## 5. Project-based questions

### 5.1 Explain your project architecture.

**Short answer:** It is a three-tier application: React frontend, Express REST
API, and PostgreSQL. The browser only talks to the API; the API is the only
layer that talks to the database.

**In this project:**

```text
Browser
  -> React 19 + Vite (Vercel)
  -> Express 5 REST API (Render)
  -> PostgreSQL (Supabase; local PostgreSQL for development)
```

The backend is layered as routes → controllers → services → repositories.
Routes define URLs and attach validation. Controllers translate HTTP to service
calls. Services hold business rules. Repositories contain SQL. Dependencies are
injected through `createApp`, which lets tests swap in an in-memory repository.

**Go deeper:** This separation keeps SQL out of controllers and HTTP details out
of services. It also makes the code easy to test: the same controller and
service code runs against either a real PostgreSQL repository or the in-memory
test repository.

### 5.2 Why did you choose this technology stack?

**Short answer:** It matches the brief, uses JavaScript end to end, and keeps
each layer understandable: React for UI, Express for HTTP, PostgreSQL for
relational data, Recharts for charts, and standard hosting for deployment.

**In this project:** React + Vite, Express 5, `pg`, Recharts, React Router,
plain CSS, Node's built-in test runner + Supertest.

**Go deeper:** Plain CSS was chosen over Tailwind to keep the design system
explicit and avoid an extra build dependency. Node's test runner avoids adding
Jest configuration. The repository pattern keeps the database swappable between
local PostgreSQL and Supabase because both speak the same protocol.

### 5.3 How does expense creation work?

**Short answer:** The user submits the form; the frontend validates; `POST
/api/expenses` validates again, inserts the row, and returns 201 with the saved
record; the list refreshes and a toast appears.

**In this project:** `ExpenseForm` → `handleSave` in `ExpensesPage` →
`createExpense` in `services/api.js` → `validateExpenseBody` →
`ExpenseController.create` → `ExpenseService.create` →
`PgExpenseRepository.create` → `INSERT ... RETURNING`.

**Go deeper:** The database generates the UUID and `created_at`, so the client
cannot spoof them. `RETURNING` gives the exact stored row back in one round
trip. If the current filter would hide the new category, the page resets the
filter to "All" so the user can see the record.

### 5.4 How does the dashboard calculate totals?

**Short answer:** The backend runs SQL aggregation and returns
`totalSpent`, `expenseCount`, and a `categoryBreakdown`. The frontend only
formats and displays those values.

**In this project:** `PgExpenseRepository.getSummary()` runs two queries in
parallel: one for overall totals and one grouped by category. The admin and
dashboard pages call `GET /api/summary` through `useDashboardData`.

**Go deeper:** The totals are not calculated from the currently filtered list.
They represent all expenses in the database. The grouped query returns category,
total, and count; the UI fills missing categories with zero so all five appear
consistently.

### 5.5 How does editing work?

**Short answer:** Clicking Edit copies the selected row into the form. On save,
the frontend sends `PUT /api/expenses/:id`; the backend validates the UUID and
payload, updates the row, and returns it. The list refreshes.

**In this project:** `ExpensesPage` stores `editingExpense`. `ExpenseForm` uses
an effect to populate its fields when that prop changes. The submit button
switches to "Update expense", and a banner offers Cancel.

**Go deeper:** If the record was deleted in another tab, the update returns 404
and the frontend shows an error toast. The form is not closed until the request
succeeds, so the user does not lose their edits on failure.

### 5.6 How does deletion work?

**Short answer:** Clicking Delete opens a confirmation dialog with the expense
summary. Only after the user confirms does the frontend send `DELETE
/api/expenses/:id`; the backend returns 204 and the list refreshes.

**In this project:** `ConfirmDialog` is rendered through a React portal. It
traps focus on the Cancel button, supports Escape, restores body scroll, and
returns focus to the previously focused element. `handleConfirmDelete` calls
`deleteExpense` and shows a toast.

**Go deeper:** Cancel does not call the API at all. The dialog is a custom
accessible modal rather than `window.confirm`, so it matches the design and can
show the amount, category, and date. The backend also returns 404 if the record
is already gone.

### 5.7 How does the application retain data after a refresh?

**Short answer:** The data lives in PostgreSQL, not in browser memory or
localStorage. On page load, React fetches it from the API again.

**In this project:** `useExpenses` and `useDashboardData` run on mount. A
refresh re-runs the fetch and receives the persisted rows. The E2E test creates,
edits, deletes, refreshes, and confirms the final state.

**Go deeper:** localStorage would be per-browser and easy to lose or tamper
with. A server-side database gives one source of truth across devices and
sessions. The only browser storage used by this app is none for expense data.

### 5.8 How did you test the application?

**Short answer:** Three layers: 15 backend integration tests with Supertest and
an in-memory repository, a live smoke test against PostgreSQL, and a browser E2E
run covering the full user flow and responsive layout.

**In this project:** `backend/tests/expenses.test.js` covers creation, invalid
amounts, categories, dates, descriptions, UUIDs, 404s, filtering, ordering,
updates, deletes, summary math, empty summary, malformed JSON, health/404, and
CORS. `scripts/smokeTest.mjs` exercises the real API and database.
`npm run build` verifies the production bundle.

**Go deeper:** The in-memory repository makes tests deterministic and prevents
production data mutation. The smoke test is separate because it needs a running
server and a real database. The browser test caught UI-level issues such as
mobile overflow and confirmed there were no console errors.

### 5.9 What problems did you encounter?

**Short answer:** The main ones were DATE timezone shifts, CORS configuration,
bundle size from Recharts, test isolation, and money precision.

**In this project:**

- **DATE shift:** `pg` parsed `DATE` into a timezone-sensitive JavaScript Date.
  Fixed with a custom type parser that returns the raw `YYYY-MM-DD` string.
- **CORS:** Development uses a Vite proxy; production needs an exact origin
  allowlist. Built `FRONTEND_URL` parsing with comma-separated origins.
- **Bundle size:** Recharts pushed the initial bundle over 500 kB. The admin
  page is lazy-loaded, so Recharts is fetched only when `/admin` is opened.
- **Test isolation:** Tests inject an in-memory repository instead of touching
  the real database.
- **Money precision:** Used `NUMERIC(12,2)` and rejected more than two decimal
  places rather than silently rounding.
- **Stale requests:** Added a request ID in the hooks so an older response
  cannot overwrite a newer filter result.

**Go deeper:** Each fix addressed a root cause rather than hiding the symptom.
The DATE bug is a good example: changing the display format would not fix the
data; the correct fix was at the driver boundary.

### 5.10 What would you improve in the next version?

**Short answer:** Add authentication for `/admin`, monthly filtering and
pagination, budget alerts, and stronger automated coverage including database
integration tests and accessibility checks.

**In this project:** These are listed as future improvements because the brief
prioritized the core CRUD and analytics requirements and explicitly said not to
invent authentication.

**Go deeper:** A sensible next step would be user accounts with row-level
ownership, so each person sees only their expenses. That would require an
`user_id` column, authorization checks in the service layer, and protected
routes. Other improvements include optimistic updates, CSV export, recurring
expenses, and monitoring/alerting on the deployed API.

---

## 6. Quick reference

### Request lifecycle for creating an expense

```text
ExpenseForm (controlled inputs)
  -> client validation
  -> POST /api/expenses
  -> express.json
  -> validateExpenseBody
  -> ExpenseController.create
  -> ExpenseService.create
  -> PgExpenseRepository.create
  -> INSERT ... RETURNING
  -> 201 JSON
  -> toast + refresh list/summary
```

### Key files

| Concern | File |
|---|---|
| Express app and middleware | `backend/src/app.js` |
| Server startup/shutdown | `backend/src/server.js` |
| Validation middleware | `backend/src/middleware/validation.js` |
| Validation rules | `backend/src/utils/validators.js` |
| Error mapping | `backend/src/middleware/errorHandler.js` |
| SQL queries | `backend/src/repositories/PgExpenseRepository.js` |
| Business rules | `backend/src/services/expenseService.js` |
| API tests | `backend/tests/expenses.test.js` |
| Schema | `database/schema.sql` |
| API client | `frontend/src/services/api.js` |
| Expense page | `frontend/src/pages/ExpensesPage.jsx` |
| Dashboard | `frontend/src/pages/DashboardPage.jsx` |
| Analytics | `frontend/src/pages/AdminPage.jsx` |
| Charts | `frontend/src/components/charts/` |
| Design tokens | `frontend/src/styles/tokens.css` |

### Numbers to remember

- 5 REST endpoints plus a health check.
- 5 allowed categories.
- 15 backend tests, all passing.
- 2 Recharts charts on `/admin`.
- 3 main pages plus a 404 route.
- `NUMERIC(12,2)` for money.
- Newest-first ordering: `expense_date DESC, created_at DESC`.
- 500-character description limit.
- 16 kB JSON body limit.

### Honest status sentence for an interview

> "The application is fully implemented and verified locally against PostgreSQL,
> including automated API tests and a browser end-to-end run. The production
> Supabase, Render, and Vercel deployment is prepared and documented; I am
> completing that external deployment and the demo video next."
