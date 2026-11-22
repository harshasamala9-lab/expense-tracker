# Deployment Guide

This guide covers the three hosted services required by the brief:
**Supabase** (PostgreSQL), **Render** (Express API), and **Vercel** (React app).

> The application has been built and verified locally. Deployment is a manual
> step because it requires your own accounts and secrets. Do not mark the
> deployment as complete until every URL below has been opened and tested.

---

## 0. Pre-flight checklist

Before starting:

- [ ] The repository is on GitHub (public or private).
- [ ] `backend/.env` is **not** committed. Only `backend/.env.example` is.
- [ ] `frontend/.env` is **not** committed. Only `frontend/.env.example` is.
- [ ] `npm test` passes in `backend/`.
- [ ] `npm run build` passes in `frontend/`.
- [ ] You have accounts on Supabase, Render, and Vercel.

Useful local verification commands:

```bash
cd backend && npm test
cd ../frontend && npm run build
```

---

## 1. Supabase — create the production database

1. Sign in at <https://supabase.com> and create a new project.
2. Choose the region closest to your Render region.
3. Save the database password in a password manager. It cannot be viewed again.
4. Wait for the project to finish provisioning.
5. Open **SQL Editor** → **New query**.
6. Paste the entire contents of [`database/schema.sql`](../database/schema.sql)
   and click **Run**.
7. Confirm the table exists:

   ```sql
   SELECT * FROM expenses ORDER BY created_at DESC LIMIT 5;
   ```

8. Open **Project Settings → Database → Connection string**.
9. Copy the **Session pooler** connection string. It looks like:

   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
   ```

   Why the session pooler? Render services use IPv4 networking. Supabase's
   direct database host is IPv6-only on many projects; the session pooler is
   reachable over IPv4 and behaves like a normal PostgreSQL connection.

10. Replace `<password>` with the real password. Keep `?sslmode=require`.

> **Never** put the service-role key or database password in frontend code.
> The React app only knows the API URL.

### Optional: verify from your machine

```bash
cd backend
DATABASE_URL="postgresql://...:5432/postgres?sslmode=require" npm run db:check
```

Expected output:

```
[db] Connected to database "postgres".
[db] expenses table is ready (0 rows).
```

If you want sample records for the demo, run
[`database/sample-data.sql`](../database/sample-data.sql) in the SQL Editor.
This is optional and should not be run against a real production dataset.

---

## 2. Render — deploy the Express API

### Option A: Blueprint (uses `render.yaml`)

1. Push the repository to GitHub.
2. In Render: **New → Blueprint**.
3. Connect the repository. Render reads `render.yaml`.
4. Enter the values marked `sync: false`:
   - `DATABASE_URL` — the Supabase session-pooler string.
   - `FRONTEND_URL` — your Vercel URL. You can set a temporary value now and
     update it after Vercel deploys.
5. Apply the blueprint.

### Option B: Manual Web Service

1. Render → **New → Web Service** → connect the repository.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
3. Environment variables:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Supabase session-pooler connection string |
   | `FRONTEND_URL` | `https://your-app.vercel.app` (comma-separate preview URLs if needed) |
   | `NODE_ENV` | `production` |
   | `DB_SSL_REJECT_UNAUTHORIZED` | `true` |
   | `PORT` | Leave unset; Render provides it |

4. Deploy and wait for the health check to pass.

### Verify the API

```bash
curl https://YOUR-API.onrender.com/api/health
curl https://YOUR-API.onrender.com/api/expenses
curl https://YOUR-API.onrender.com/api/summary
```

Expected health response:

```json
{
  "status": "ok",
  "uptime": 12,
  "timestamp": "2026-11-22T10:00:00.000Z"
}
```

If the health check fails, read the Render logs. Common causes are listed in
the troubleshooting table below.

---

## 3. Vercel — deploy the React frontend

1. Sign in at <https://vercel.com> and click **Add New → Project**.
2. Import the same GitHub repository.
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`
4. Environment variables:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://YOUR-API.onrender.com/api` |
   | `VITE_CURRENCY` | `USD` (or `INR`, `EUR`, `GBP`) |

5. Deploy.
6. Copy the production URL, for example `https://expense-tracker.vercel.app`.

`frontend/vercel.json` contains an SPA rewrite so direct navigation to
`/expenses` and `/admin` works on refresh. It rewrites unknown paths to
`index.html`, while real assets are still served normally.

### Connect the two deployments

1. Go back to Render → your service → **Environment**.
2. Set `FRONTEND_URL` to the exact Vercel production origin, with no trailing
   slash:

   ```
   https://expense-tracker.vercel.app
   ```

3. Save. Render redeploys automatically.
4. If you use Vercel preview deployments, add their origins as a
   comma-separated list:

   ```
   https://expense-tracker.vercel.app,https://expense-tracker-git-main-you.vercel.app
   ```

5. Hard-refresh the Vercel site and confirm the browser console has no CORS
   errors.

---

## 4. Post-deployment verification (required)

Open the public URL and complete every item:

- [ ] Dashboard loads with totals and recent expenses.
- [ ] `/expenses` loads directly and survives a browser refresh.
- [ ] Add an expense with decimals (for example `19.99`).
- [ ] The new expense appears at the top of the list.
- [ ] Refresh the browser; the expense is still there.
- [ ] Filter by each category; the list and count update.
- [ ] Edit an expense; the change survives a refresh.
- [ ] Delete an expense; the confirmation dialog appears first.
- [ ] Cancel deletion once and confirm the record remains.
- [ ] Confirm deletion; the record disappears and totals update.
- [ ] `/admin` loads directly and survives a refresh.
- [ ] Both charts show real category totals.
- [ ] Browser console has no errors.
- [ ] The API health endpoint returns 200.

API smoke test against production:

```bash
cd backend
API_URL="https://YOUR-API.onrender.com/api" npm run smoke
```

The smoke test creates a temporary record, exercises create/read/update/delete,
and cleans up after itself.

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `503` / health check fails | Render cannot reach Supabase | Use the **session pooler** string, not the direct host; check the password; confirm `?sslmode=require` |
| `self-signed certificate` / TLS error | Certificate chain not trusted in the environment | Keep `DB_SSL_REJECT_UNAUTHORIZED=true` first; only if your host cannot validate Supabase's chain, set it to `false` and document why |
| Browser shows CORS error | `FRONTEND_URL` does not exactly match the browser origin | Set the full origin with `https://`, no trailing slash, then redeploy Render |
| Direct `/admin` refresh shows 404 | SPA rewrite missing | Confirm `frontend/vercel.json` is present and Vercel's root directory is `frontend` |
| Frontend calls `localhost` in production | `VITE_API_URL` missing or build cache | Add the env var in Vercel and redeploy (Vite bakes env vars at build time) |
| API returns `500` | Database/SQL problem | Check Render logs; the client response intentionally hides internals |
| Render service sleeps | Free plan cold start | First request may take 30–60 seconds; wait and retry |
| `relation "expenses" does not exist` | Schema not applied to the production database | Run `database/schema.sql` in the Supabase SQL Editor |
| Expense date shifts by one day | DATE parsed as a timezone-aware value | Already handled in `backend/src/config/db.js`; do not remove the DATE type parser |

---

## 6. Security checklist

- [ ] `.env` files are ignored by Git.
- [ ] `DATABASE_URL` exists only in Render's environment settings.
- [ ] `FRONTEND_URL` is an explicit allowlist, not `*`.
- [ ] No database credentials or service-role keys appear in the frontend bundle.
- [ ] SQL uses parameter placeholders (`$1`, `$2`, ...).
- [ ] Error responses never contain stack traces or connection strings.
- [ ] Supabase row-level security is not required for this single-tenant API
      because the browser never talks to Supabase directly. The API is the only
      database client.
- [ ] The `/admin` page is documented as public, not as a secured admin area.

---

## 7. Rollback

- **Vercel:** Deployments → select a previous deployment → **Promote to Production**.
- **Render:** Events → select a previous deploy → **Redeploy**.
- **Database:** Take a Supabase backup/snapshot before destructive changes.
  This project never drops the `expenses` table in normal operation.

---

## 8. Updating the live site

1. Commit and push to `main`.
2. Render auto-deploys the backend if `autoDeploy` is enabled.
3. Vercel auto-deploys the frontend for the production branch.
4. Re-run the post-deployment verification for any changed flow.
5. If environment variables changed, trigger a new deploy; Vite variables are
   compiled into the bundle at build time.
