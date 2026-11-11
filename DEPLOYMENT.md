# Afia Food Hub — Deployment Guide

**Target platform:** Neon (PostgreSQL) + Vercel (frontend and API)
**Date:** 2026-11-11
**Status:** Sprint 0 draft. The backend is rebuilt in Sprint 2; the steps below describe the
target architecture and the commands that will exist at that point. Steps that depend on
not-yet-created files are marked **[Sprint 2+]** and must not be attempted before then.

> **Nothing in this guide has been executed.** No deployment has been performed, no production
> environment has been touched, and no credentials exist in the repository. Sections marked
> "Requires approval" are gated on explicit owner sign-off.

---

## 1. Architecture recap

```
                    ┌───────────────────────────────────────┐
   Browser ────────►│  Vercel — Project: afia-food-hub       │
                    │                                       │
                    │  /api/*  →  Node serverless function  │
                    │            (backend/api/index.js)     │
                    │  /*      →  CRA static build           │
                    │            (frontend/build)           │
                    └──────────────────┬────────────────────┘
                                       │ pooled connection
                                       ▼
                    ┌───────────────────────────────────────┐
                    │  Neon — PostgreSQL                     │
                    │  pooled  : ...-pooler...neon.tech     │
                    │  direct  : ...region...neon.tech       │
                    └───────────────────────────────────────┘
```

One Vercel project serves both the SPA and the API, so production traffic is same-origin and
CORS becomes defence-in-depth rather than a functional requirement.

---

## 2. Prerequisites

| Requirement | Version / note |
|---|---|
| Node.js | 20 LTS or newer (22 recommended) |
| npm | 10+ |
| Neon account | With an active project |
| Vercel account | With access to the `afia-food-hub` project |
| GitHub access | For the Vercel ↔ Git integration (or the Vercel CLI) |
| Payment provider | Paystack (recommended) or Hubtel — **separate account** |
| Object storage | Neon Object Storage or Vercel Blob |

---

## 3. Neon setup

### 3.1 Create the project

1. Sign in at <https://console.neon.tech> and create a project.
2. Choose the region closest to your users — **Africa (Cape Town)** or **Europe (Frankfurt)**
   are sensible for Ghana. Record the region; it is part of the hostname.
3. Use the default PostgreSQL version (17 or later).
4. Create the database `afia_food_hub`.

### 3.2 Get the connection strings

The Neon console shows both. **Both are required.**

| Variable | Which string | Used by |
|---|---|---|
| `DATABASE_URL` | **Pooled** (host contains `-pooler`) | The running application — serverless functions |
| `DATABASE_URL_DIRECT` | **Direct** (no `-pooler`) | Migrations and schema work only |

```
# Pooled
postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/afia_food_hub?sslmode=require

# Direct
postgresql://USER:PASSWORD@ep-xxx.REGION.aws.neon.tech/afia_food_hub?sslmode=require
```

> **Never** put the direct string in a Vercel environment variable that the running application
> reads. Under serverless concurrency the direct connection will exhaust Neon's connection limit.

### 3.3 Branch for safe migrations

Neon's branching is the safety mechanism for every schema change.

```bash
# Install the Neon CLI
npm install -g neonctl
neonctl auth                       # opens a browser for authentication

# Create a branch from production and point the direct URL at it
neonctl branches create --name migration-check --parent main
neonctl connection-string migration-check --pooled=false
```

Run every migration against the branch first, verify, then merge the branch into `main`.

### 3.4 Configure the pool **[Sprint 2+]**

```js
// backend/config/db.js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Migrations use the direct (non-pooled) connection
export const migrationSql = neon(process.env.DATABASE_URL_DIRECT);
```

With the Neon serverless driver the pool is managed by the driver and the connection string; no
manual pool sizing is required. If `pg` is used instead, use the pooler host with
`max: 1` per instance.

### 3.5 Run migrations **[Sprint 2+]**

```bash
cd backend
npm ci

# Validate the environment and print the resolved configuration
npm run env:check

# Apply migrations against the DIRECT connection
DATABASE_URL="$DATABASE_URL_DIRECT" npm run migrate

# Optional: seed reference data (categories, admin bootstrap) — never destructive
DATABASE_URL="$DATABASE_URL_DIRECT" npm run seed
```

**Migration rules**

- Every migration is **additive** and **idempotent** (`IF NOT EXISTS` / guarded DDL).
- No migration drops or renames a column without an explicit owner approval recorded in
  `REPAIR_LOG.md`.
- Migrations are **never** run automatically on deploy. They are run deliberately, then
  verified.
- Take a Neon branch (a point-in-time snapshot) before every migration.

### 3.6 Migrate the existing data **[Sprint 2+]**

The live Render database currently holds one menu item, four users and two orders — development
scratch data, no genuine customer records.

```bash
# 1. Read-only inventory of the source
pg_dump "postgresql://USER:PASSWORD@HOST:5432/food_ordering" --schema-only > schema.sql
pg_dump "postgresql://USER:PASSWORD@HOST:5432/food_ordering" --data-only --table=users > users.sql

# 2. Apply to Neon (branch first)
psql "$DATABASE_URL_DIRECT" -f schema.sql

# 3. Reconcile — these must match exactly
psql "$DATABASE_URL_DIRECT" -c "SELECT count(*) FROM users;"
psql "$DATABASE_URL_DIRECT" -c "SELECT count(*) FROM orders;"
psql "$DATABASE_URL_DIRECT" -c "SELECT sum(total) FROM orders;"
```

Two rows must be removed during this step (audit artifacts — see `AUDIT_REPORT.md` §8):

```sql
DELETE FROM order_items WHERE order_id = 2;
DELETE FROM orders          WHERE id = 2;
DELETE FROM users           WHERE id = 5;      -- the audit-probe admin account
UPDATE users SET address = NULL WHERE id = 3; -- reset the admin address
```

Password hashes are copied **only after** the hashing algorithm of the old backend is confirmed.
If it cannot be confirmed, user passwords are reset instead of migrated.

---

## 4. Vercel setup

### 4.1 Create the project

```bash
npm install -g vercel
vercel login
vercel link                        # select or create the "afia-food-hub" project
```

Or connect the repository at <https://vercel.com/new> and import
`akhadagh/food-ordering-app`.

### 4.2 Project settings

| Setting | Value |
|---|---|
| Framework preset | Other |
| Root directory | `.` (repository root) |
| Build command | `npm run build` (see `vercel.json` below) |
| Output directory | `frontend/build` |
| Node.js version | 20.x or 22.x |
| Install command | `npm ci --prefix frontend && npm ci --prefix backend` **[Sprint 2+]** |

### 4.3 `vercel.json` **[Sprint 2+]**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build --prefix frontend",
  "outputDirectory": "frontend/build",
  "installCommand": "npm ci --prefix frontend && npm ci --prefix backend",
  "functions": {
    "backend/api/index.js": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/backend/api/index.js" },
    { "source": "/((?!api/).*)", "destination": "/frontend/index.html" }
  ]
}
```

> **The SPA rewrite is mandatory.** Without it, refreshing `/orders/12` or `/admin/menu` returns a
> 404 — finding **P1-14**. The negative lookahead keeps `/api/*` from being rewritten to the SPA.

### 4.4 Backend as a Vercel function **[Sprint 2+]**

The Express app must be exported, not listened on:

```js
// backend/api/index.js
import app from '../src/app.js';
export default app;
```

```js
// backend/src/server.js  — local development only
import app from './app.js';
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Afia Food Hub API on :${port}`));
```

Do **not** call `app.listen()` in the module that Vercel imports.

### 4.5 Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. Configure them
separately for **Production**, **Preview** and **Development**.

#### Production

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | Neon **pooled** URL | Runtime only |
| `DATABASE_URL_DIRECT` | Neon **direct** URL | Migrations only — safe to set, never used at runtime |
| `DATABASE_SSL` | `true` | |
| `JWT_SECRET` | random ≥ 32 bytes | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | a *different* random ≥ 32 bytes | |
| `FRONTEND_URL` | `https://afia-food-hub.vercel.app` | Comma-separated for multiple |
| `CORS_ORIGINS` | `https://afia-food-hub.vercel.app` | |
| `REACT_APP_API_URL` | `https://afia-food-hub.vercel.app/api` | **Must not be localhost** |
| `UPLOAD_DRIVER` | `neon` or `vercel` | Not `local` in production |
| `UPLOAD_BUCKET` / `UPLOAD_PUBLIC_URL` | bucket + public base URL | |
| `PAYMENT_PROVIDER` | `paystack` (or `disabled` until credentials exist) | |
| `PAYSTACK_SECRET_KEY` | secret key | Required when the provider is enabled |
| `PAYSTACK_WEBHOOK_SECRET` | webhook secret | Required for webhook verification |
| `PAYMENT_MERCHANT_NAME` | `Afia Food Hub` | Shown in mobile-money prompts |
| `TRUST_PROXY` | `1` | Correct client IPs for rate limiting |
| `LOG_LEVEL` | `info` | |
| `LOG_JSON` | `true` | Structured logs in Vercel |
| `SUPPORT_PHONE` / `SUPPORT_EMAIL` / `BUSINESS_ADDRESS` / `BUSINESS_HOURS` | real values | No placeholders may ship |
| `PUBLIC_APP_URL` | `https://afia-food-hub.vercel.app` | Used in emails and OG tags |

#### Preview (optional)

Preview deployments should use a **Neon branch**, not production data:

```
DATABASE_URL          = <neon branch pooled URL>
DATABASE_URL_DIRECT   = <neon branch direct URL>
FRONTEND_URL          = https://afia-food-hub-git-<branch>-<team>.vercel.app
REACT_APP_API_URL     = https://afia-food-hub-git-<branch>-<team>.vercel.app/api
```

#### Development

```
DATABASE_URL = postgresql://...localhost:5432/afia_food_hub
FRONTEND_URL = http://localhost:3000
REACT_APP_API_URL = http://localhost:5000/api
```

### 4.6 Deploy

```bash
# Preview deployment (safe, non-production)
vercel

# Production deployment — REQUIRES OWNER APPROVAL
vercel --prod
```

---

## 5. Payment provider configuration

### 5.1 Paystack (recommended)

Paystack supports **MTN Mobile Money, Telecel Cash, AirtelTigo Money** and cards in Ghana on one
integration.

1. Create an account at <https://paystack.com> and complete business verification.
2. Copy the **secret key** from Dashboard → Settings → API Keys & Keys.
3. Copy the **public key**.
4. Register the webhook URL:
   `https://afia-food-hub.vercel.app/api/payments/webhook`
5. Copy the generated **webhook secret** into `PAYSTACK_WEBHOOK_SECRET`.
6. Set `PAYMENT_PROVIDER=paystack` in Vercel and redeploy.

**Verification checklist (do not skip)**

- [ ] The webhook signature is validated **before** any database write.
- [ ] The amount in the callback equals the server-computed order total. A mismatch must not
      mark the order paid.
- [ ] Replaying the same webhook does not create a second payment (idempotency).
- [ ] `payment_status` transitions to `paid` and `paid_at` is recorded.
- [ ] The order status advances **independently** of the payment status.
- [ ] Cash on Delivery still works and is clearly labelled as payable on delivery.

### 5.2 Hubtel (alternative)

Set `HUBTEL_CLIENT_ID`, `HUBTEL_CLIENT_SECRET`, `HUBTEL_MERCHANT_ID` and
`PAYMENT_PROVIDER=hubtel`. The adapter follows the same interface as the Paystack adapter, so
the rest of the application is unchanged.

### 5.3 Until credentials exist

`PAYMENT_PROVIDER=disabled` keeps the application honest: the checkout offers **Cash on
Delivery only**, the order is created with `payment_status = 'pending_cod'`, and the confirmation
screen says the payment is made on delivery. **The application never simulates a successful
payment.** Finding **P0-05** must not be reintroduced in any form.

---

## 6. Object storage for menu images

The local filesystem is ephemeral on Vercel — images uploaded to `/tmp` do not survive a cold
start. Use Neon Object Storage or Vercel Blob.

```bash
# Neon Object Storage — create a bucket
neonctl storage create --name afia-food-hub-assets --region <region> --access public
```

```
UPLOAD_DRIVER=neon
UPLOAD_BUCKET=afia-food-hub-assets
UPLOAD_PUBLIC_URL=https://<account>.storage.<region>.neon.tech/afia-food-hub-assets
```

Uploads must be validated server-side: MIME allowlist (`image/jpeg`, `image/png`, `image/webp`),
size limit (`UPLOAD_MAX_BYTES`), and randomised filenames. Finding **P1-02**.

---

## 7. Local development

```bash
# Terminal 1 — API
cd backend
cp .env.example .env          # edit with your Neon dev-branch or local credentials
npm ci
npm run migrate
npm run dev                   # http://localhost:5000

# Terminal 2 — frontend
cd frontend
cp ../.env.example .env       # keep only the REACT_APP_* block
npm ci
npm start                     # http://localhost:3000
```

Verify: `curl http://localhost:5000/api/health` → `{"status":"ok","db":"ok",...}`.

---

## 8. Verification after deployment

Do not consider the deployment successful until all of the following have been executed against
the live URL and observed to pass.

### 8.1 Automated

| # | Check | Command |
|---|---|---|
| 1 | Production build succeeds | `npm run build --prefix frontend` |
| 2 | Lint-as-error build | `CI=true npm run build --prefix frontend` |
| 3 | Health endpoint | `curl -i https://afia-food-hub.vercel.app/api/health` → `200`, `db: ok` |
| 4 | Readiness endpoint | `curl -i .../api/health/ready` → `200` |
| 5 | No localhost URLs in the bundle | `grep -r "localhost:5000" frontend/build/` → no matches |
| 6 | Secret scan | `grep -rE "(sk_live|pk_live|postgresql://[^ ]*:[^ ]*@)" frontend/build/` → no matches |
| 7 | Dependency audit | `npm audit --prefix backend` and `npm audit --prefix frontend` |

### 8.2 Manual — customer flow

- [ ] The homepage renders the Afia Food Hub brand, the logo and the favicon.
- [ ] The menu loads real dishes with real images and correct GH₵ prices.
- [ ] Search and category filters work.
- [ ] Adding a customised item to the cart produces the correct line total.
- [ ] The cart persists across a page refresh.
- [ ] Registration succeeds and the session survives a refresh.
- [ ] Login succeeds; a wrong password shows a clear error without wiping the form.
- [ ] Checkout shows a **server-computed** total.
- [ ] A promo code applies only if it exists in the database.
- [ ] The order is created once — submitting twice does not duplicate it.
- [ ] Order tracking shows the correct status and the status history.
- [ ] Cancellation works from an eligible status and is refused from an ineligible one.
- [ ] The receipt and confirmation email carry the Afia Food Hub branding.

### 8.3 Manual — admin flow

- [ ] The admin dashboard loads without error.
- [ ] Revenue figures reconcile with the sum of the underlying orders.
- [ ] Order status transitions follow the state machine; invalid transitions are refused.
- [ ] A menu item can be created **with an image** and the image persists.
- [ ] An item created as unavailable is **not** visible to customers.
- [ ] The CSV export matches the on-screen figures.

### 8.4 Security

- [ ] `POST /api/auth/signup` with `{"role":"admin"}` creates a **customer**.
- [ ] Customer A cannot read customer B's order (expect `404`).
- [ ] A customer cannot reach any `/api/admin/*` route (expect `403`).
- [ ] Repeated failed logins are throttled (expect `429`).
- [ ] An invalid order status is rejected with `400`, not `500`.
- [ ] The response carries CSP, `X-Frame-Options`, HSTS and `Referrer-Policy`.
- [ ] A preflight from the production origin returns `204` with the correct allow header.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Every API call fails; the console shows `localhost` | `REACT_APP_API_URL` not set in Vercel, or set after the build | Set it in Vercel and redeploy. `REACT_APP_*` values are **compile-time** |
| `404` on refreshing `/orders/12` | Missing SPA rewrite | Add the `rewrites` block to `vercel.json` |
| `500` on any cross-origin request | `FRONTEND_URL` does not include the calling origin | Add the origin, comma-separated |
| `ENOTFOUND` / connection refused to Neon | Wrong host or the direct URL used at runtime | Use the **pooled** URL for `DATABASE_URL` |
| `too many connections` | Direct URL used by serverless functions | Switch to the pooled URL; reduce pool `max` |
| Cold-start latency | Unpooled connections | Neon pooled URL + the serverless driver |
| Webhook returns `401` | Signature not verified or wrong secret | Check `PAYSTACK_WEBHOOK_SECRET`; the raw body must be used for verification |
| Payments never complete | Provider disabled or credentials missing | Check `PAYMENT_PROVIDER` and the keys; until then use COD |
| Images disappear after a while | Written to the local filesystem | Set `UPLOAD_DRIVER=neon` (or `vercel`) |
| `500` on the admin dashboard | A null statistic | `Number(value ?? 0)` on every figure — tracked as **P2-15** |
| Migrations fail on an existing database | Non-idempotent DDL | Migrations must use `IF NOT EXISTS` / guarded DDL |
| Neon branch has the old data after migrating | Migrations ran against the wrong URL | Check `DATABASE_URL_DIRECT` — it must point at the branch |

---

## 10. Rollback

| Layer | Procedure |
|---|---|
| **Frontend** | Vercel → Deployments → promote a previous successful deployment (instant) |
| **API** | Same as the frontend; the API and SPA share the project |
| **Database** | Neon → point-in-time recovery, or restore the branch that was taken before the migration. Migrations are additive, so a code rollback rarely needs a database rollback |
| **Full** | Redeploy the last known-good commit, confirm `/api/health`, then re-verify the flow in §8 |

---

## 11. Production checklist

Before announcing the launch:

- [ ] Owner actions 1–4 in `AUDIT_REPORT.md` §8 are complete (password rotation, probe-account
      deletion, probe-order deletion, admin address reset).
- [ ] The admin password is **not** `admin123`, and the demo-credentials block is removed from the
      login page.
- [ ] Every `SUPPORT_*` and `BUSINESS_*` value is real — no placeholders, no invented phone
      numbers or addresses.
- [ ] No promo code, price or business claim appears in the UI unless it exists in the database.
- [ ] The payment provider is configured and the webhook is verified end-to-end, **or** the site
      clearly offers Cash on Delivery only.
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are fresh and are not the live Render values.
- [ ] The `.env` file is not committed; `.env.example` contains placeholders only.
- [ ] `npm audit` is clean of high/critical findings, or each is documented.
- [ ] The full checklist in §8 has been executed and passed against the live URL.
- [ ] `TEST_REPORT.md` has been updated with the production verification results.

---

## 12. Approval gate

> **No deployment, no production environment change and no push to GitHub will be performed
> without explicit owner approval.** The steps above are instructions, not a record of work
> performed. Sprint 8 is where the deployment will actually be executed, tested and reported.
