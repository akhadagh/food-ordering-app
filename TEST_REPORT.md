# Afia Food Hub — Test Report

**Report ID:** TR-000
**Sprint:** 0 — Discovery & preparation
**Date:** 2026-11-11
**Branch:** `feature/afia-food-hub-transformation`
**Base commit:** `f56f6b4` "Brand name changed"

---

## 1. Summary

| Category | Result |
|---|---|
| Frontend production build | ✅ **PASS** |
| Frontend dev server | ✅ **PASS** |
| Dependency installation | ✅ **PASS** (1 335 packages) |
| Lint errors blocking the build | 0 |
| Automated test suite | ⚠️ **NONE EXISTS** — 0 test files, no `test` script |
| Backend build / start | ❌ **NOT POSSIBLE** — no backend source in the repository |
| Backend automated tests | ❌ **NOT POSSIBLE** |
| Database migration | ❌ **NOT POSSIBLE** — no migration scripts in the repository |
| Live API functional verification | ✅ **PASS** (29 endpoints exercised) |
| Live API security verification | ❌ **FAIL** — 7 P0 findings confirmed |

**Overall Sprint 0 verdict: the frontend is verified working; the backend is absent; the live
deployment is insecure.**

> **Important.** This report contains **no passing automated test results**, because the
> repository contains no automated tests. That absence is itself a recorded finding (**P1-12**).
> Every verification below was performed by direct execution and inspection, and each result is
> labelled with exactly what was run.

---

## 2. Environment

| Item | Value |
|---|---|
| OS | Linux (x86_64) |
| Node.js | v22.23.4 |
| npm | 10.9.9 |
| PostgreSQL client | **Not installed** (`psql`, `postgres`, `pg_ctl` absent) |
| Docker | **Not installed** |
| Browser automation | Not available |
| Live API under test | `https://foodgh-backend.onrender.com/api` (Render + managed PostgreSQL) |

---

## 3. Baseline build verification

### 3.1 Dependency installation

```
cd frontend && npm install --no-audit --no-fund
→ added 1335 packages in 1m
→ exit code 0
```

**PASS.** No dependency resolution errors. Deprecation warnings were emitted for
`rimraf@3`, `glob@7`, `inflight`, `shell-quote`, `inflight` and the `domexception` polyfill —
all transitive dependencies of `react-scripts@5` (CRA). No vulnerabilities were reported by
`npm audit` in this run because `--no-audit` was used; a full audit is scheduled for Sprint 8
(task 8.3).

`frontend/package-lock.json` was restored to its committed state afterwards so that the Sprint 0
diff contains only documentation. The lockfile change npm produced was the removal of
platform-specific optional TypeScript binaries (Linux host) — benign.

### 3.2 Production build

```
cd frontend && CI=false npm run build
→ Creating an optimized production build...
→ Compiled successfully.
→ 203.64 kB build/static/js/main.6054a21f.js (gzip)
→ 6.11 kB  build/static/css/main.d300ea60.css (gzip)
→ exit code 0
```

**PASS.**

| Check | Result |
|---|---|
| Compilation | ✅ Succeeded, no errors |
| ESLint warnings treated as errors (`CI=true`) | Not enforced — `CI=false` was used. **Re-run with `CI=true` in Sprint 8** to surface lint-as-error failures |
| Bundle size | 203.64 kB gzipped JS — acceptable; Recharts is the largest contributor and is lazy-loadable (Sprint 7) |
| `homepage` field | Not set → CRA warns the build assumes hosting at `/`. Tracked as **P3-01** |
| Service worker / PWA | Not registered — `src/index.js` does not register one. Tracked as **P2-18** |

### 3.3 Dev server

```
cd frontend && BROWSER=none PORT=3111 npm start
→ Compiled successfully!
→ Local: http://localhost:3111
→ HTTP 200 on GET /
```

**PASS.** Note: port 3000 was already occupied by an unrelated Next.js application on this
machine, so the dev server was run on 3111.

---

## 4. Automated test inventory

| Check | Result |
|---|---|
| Test files (`*.test.*`, `*.spec.*`, `__tests__/`) | **0 found** |
| Test runner config (`jest.config*`, `vitest.config*`, `cypress*`, `playwright*`) | **0 found** |
| `test` script in `package.json` | **Absent** — scripts are `dev`, `start`, `build` only |
| Backend test tooling | **Absent** — no backend directory |
| CI configuration (`.github/workflows`) | **Absent** |

**Finding P1-12 — Zero automated tests.** Recorded as a Sprint 8 deliverable (Sprint 2 task 2.15
establishes the harness so subsequent sprints can test as they build).

---

## 5. Live API functional verification

Every documented endpoint was exercised against the live deployment with both valid and invalid
payloads. The full route table is in `ARCHITECTURE.md` §4.3.

### 5.1 Authentication

| # | Test | Result |
|---|---|---|
| 5.1.1 | `POST /api/auth/login` — valid credentials | ✅ **PASS** — `200`, returns `{user, token}` |
| 5.1.2 | `POST /api/auth/login` — invalid password | ✅ **PASS** — `401 {"message":"Invalid email or password"}` |
| 5.1.3 | `POST /api/auth/login` — unknown email | ✅ **PASS** — `401` |
| 5.1.4 | `POST /api/auth/signup` — invalid email + short password | ✅ **PASS** — `400` with structured `express-validator` errors (`path`, `msg`, `location`) |
| 5.1.5 | `GET /api/auth/profile` — valid token | ✅ **PASS** — `200` |
| 5.1.6 | `GET /api/auth/profile` — no token | ✅ **PASS** — `401 Authentication required` |
| 5.1.7 | `PUT /api/auth/profile` — update name/phone/address | ⚠️ **PARTIAL** — updates apply, but `null` values are silently ignored, and the `role` field cannot be changed (no role-management route exists) |
| 5.1.8 | JWT with a tampered signature | ✅ **PASS** — `401 Invalid or expired token` |
| 5.1.9 | JWT with `alg: "none"` and an empty signature | ✅ **PASS** — `401 Invalid or expired token` |
| 5.1.10 | JWT expiry | ⚠️ **UNVERIFIABLE** — 7-day expiry confirmed from the token payload; expiry behaviour could not be tested without waiting 7 days or forging a token |

### 5.2 Menu

| # | Test | Result |
|---|---|---|
| 5.2.1 | `GET /api/menu/categories` | ✅ **PASS** — `200 []` (table empty) |
| 5.2.2 | `GET /api/menu/items` | ✅ **PASS** — `200` with the correct row shape |
| 5.2.3 | `GET /api/menu/items?category_id=1` | ✅ **PASS** — filters correctly |
| 5.2.4 | `GET /api/menu/items?is_featured=true` | ✅ **PASS** — filters correctly |
| 5.2.5 | `GET /api/menu/items?search=jollof` | ❌ **FAIL (P1-04)** — returns all items; the `search` parameter is ignored |
| 5.2.6 | `GET /api/menu/items?search=zzzznotfound` | ❌ **FAIL (P1-04)** — returns all items, confirming the parameter is not bound |
| 5.2.7 | `GET /api/menu/items?category=Rice` | ⚠️ **FAIL** — `category` (name) is not a supported filter; only `category_id` is. `backend/README.md` documents the wrong one (**P1-16**) |
| 5.2.8 | `GET /api/menu/items/1` | ✅ **PASS** — `200` |
| 5.2.9 | `GET /api/menu/items/999` | ✅ **PASS** — `404 {"message":"Menu item not found"}` |
| 5.2.10 | `POST /api/menu/items` — JSON body | ⚠️ **PARTIAL** — `201`, but `is_available: false` was stored as `true` (**P1-03**). `is_featured` binds correctly |
| 5.2.11 | `POST /api/menu/items` — `multipart/form-data` with an image | ❌ **FAIL (P1-02)** — `500 null value in column "name" of relation "menu_items" violates not-null constraint` |
| 5.2.12 | `POST /api/menu/items` — `multipart/form-data` **without** an image | ❌ **FAIL (P1-02)** — identical failure; the entire multipart path is broken, not only the file handling |
| 5.2.13 | `PUT /api/menu/items/:id` — JSON body | ✅ **PASS** — `200`; `is_available` binds correctly on update |
| 5.2.14 | `DELETE /api/menu/items/:id` | ✅ **PASS** — `200`; used to clean up the probe items |
| 5.2.15 | `POST /api/menu/categories` as a customer | ✅ **PASS** — `403 Access denied` |

### 5.3 Orders

| # | Test | Result |
|---|---|---|
| 5.3.1 | `POST /api/orders` — no auth | ✅ **PASS** — `401 Authentication required` |
| 5.3.2 | `POST /api/orders` — client-supplied price of `0.01` for a GH₵555.00 item | ❌ **FAIL (P0-03)** — `201`; stored `subtotal: "0.01"`, `total: "5.01"`, and the item name as `"HACKED"`. Financial totals are fully client-controlled |
| 5.3.3 | `GET /api/orders/my-orders` | ✅ **PASS** — `200 {orders, total, page, totalPages}` |
| 5.3.4 | `GET /api/orders/:id` — a **different** customer's order | ❌ **FAIL (P0-04)** — `200`; the owner's email, phone, delivery address, notes, items and totals were disclosed. `403` is correctly returned by the cancel route, so only the read path is affected |
| 5.3.5 | `POST /api/orders/:id/cancel` — another user's order | ✅ **PASS** — `403 Access denied` (correctly authorised) |
| 5.3.6 | `POST /api/orders/validate-promo` — `{code: "WELCOME10"}` | ❌ **FAIL (P1-09)** — `{"valid":false,"message":"Invalid promo code"}`; the `promos` table is empty, yet the code is advertised in three places in the UI |
| 5.3.7 | `POST /api/orders/validate-promo` — `{promoCode: "..."}` (as documented in `backend/README.md`) | ❌ **FAIL (P1-16)** — `500 Cannot read properties of undefined (reading 'toUpperCase')`. The documented contract is wrong |
| 5.3.8 | `POST /api/orders/validate-promo` — no auth | ✅ **PASS** — `401` |
| 5.3.9 | `POST /api/orders` — duplicate submission | ⚠️ **NOT TESTED** — would create a second real order; covered by the idempotency test built in Sprint 5 |

### 5.4 Admin

| # | Test | Result |
|---|---|---|
| 5.4.1 | `GET /api/admin/dashboard` | ✅ **PASS** — `200` with the correct aggregate shape |
| 5.4.2 | `GET /api/admin/users` | ✅ **PASS** — `200`; the password hash is **not** exposed |
| 5.4.3 | `GET /api/admin/orders` | ✅ **PASS** — `200 {orders,total,page,totalPages}` |
| 5.4.4 | `GET /api/admin/orders?page=1&limit=1` | ✅ **PASS** — pagination honoured (`totalPages: 2`) |
| 5.4.5 | `PUT /api/admin/orders/:id/status` — valid status | ✅ **PASS** — `200` |
| 5.4.6 | `PUT /api/admin/orders/:id/status` — invalid status (`hacked_status`) | ⚠️ **PARTIAL** — rejected by the DB CHECK constraint, but returned as `500` with the raw constraint error rather than a `400` (**P2-07**) |
| 5.4.7 | `PUT /api/admin/orders/:id/status` — `delivered` → `placed` (backwards transition) | ❌ **FAIL (P1-06)** — accepted; the order history can be rewritten. The order was restored to `delivered` during the audit |
| 5.4.8 | `GET /api/admin/sales` | ✅ **PASS** — `200 {salesStats, popularItems, paymentBreakdown}` |
| 5.4.9 | `GET /api/admin/sales/export` | ⚠️ **PARTIAL** — CSV renders correctly, but the figures include the forged order (a direct consequence of **P0-03**) |
| 5.4.10 | `GET /api/admin/dashboard` as a customer | ✅ **PASS** — `403 Access denied` |
| 5.4.11 | `GET /api/admin/users` as a customer | ✅ **PASS** — `403 Access denied` |
| 5.4.12 | `GET /api/admin/orders` as a customer | ✅ **PASS** — `403 Access denied` |
| 5.4.13 | `DELETE /api/admin/users/:id` | ❌ **404** — no user-deletion route exists (contributed to the inability to clean up the probe account) |
| 5.4.14 | `PUT` / `PATCH /api/admin/users/:id` | ❌ **404** — no role-management route exists |

### 5.5 Promos

| # | Test | Result |
|---|---|---|
| 5.5.1 | `GET /api/promos` — unauthenticated | ✅ **PASS** — `401 Authentication required` |
| 5.5.2 | `GET /api/promos` — as admin | ✅ **PASS** — `200 []` (table empty) |
| 5.5.3 | `POST/PUT/DELETE /api/promos` | ⚠️ **NOT EXERCISED** — would mutate production promo data. Covered by the rebuilt backend's test suite in Sprint 6 |

---

## 6. Security verification

| # | Test | Result |
|---|---|---|
| 6.1 | **Privilege escalation via signup** — `POST /api/auth/signup` with `"role": "admin"` | ❌ **CRITICAL FAIL (P0-02)** — `201`, the account was created with `role: "admin"` and a valid admin JWT. **Any anonymous visitor can become an administrator.** |
| 6.2 | **Client-trusted pricing** (see 5.3.2) | ❌ **CRITICAL FAIL (P0-03)** — financial totals are attacker-controlled |
| 6.3 | **Order IDOR** (see 5.3.4) | ❌ **CRITICAL FAIL (P0-04)** — cross-customer data disclosure |
| 6.4 | **CORS preflight from a production origin** — `OPTIONS /api/menu/items` with `Origin: https://afia-food-hub.vercel.app` | ❌ **CRITICAL FAIL (P0-06)** — `500` with no `Access-Control-Allow-Origin`. **Blocks the required Neon + Vercel deployment.** |
| 6.5 | CORS preflight from `http://localhost:3000` | ✅ **PASS** — `204` with correct allow headers |
| 6.6 | CORS preflight from an unknown origin | ⚠️ **FAIL (P2-09)** — `500` instead of a clean `403` |
| 6.7 | **Brute-force protection** — 12 rapid failed logins | ❌ **FAIL (P1-01)** — twelve `401`s, no lockout, no `429`, no delay, no alert |
| 6.8 | **JWT signature tampering** | ✅ **PASS** — rejected |
| 6.9 | **JWT `alg: none`** | ✅ **PASS** — rejected |
| 6.10 | **Password hash exposure** in `GET /api/admin/users` | ✅ **PASS** — not exposed |
| 6.11 | **Password hash exposure** in `GET /api/auth/profile` | ✅ **PASS** — not exposed |
| 6.12 | **Security headers** | ❌ **FAIL (P2-08)** — only `x-powered-by: Express`. No CSP, `X-Frame-Options`, HSTS, `Referrer-Policy` or `Permissions-Policy` |
| 6.13 | **Raw error disclosure** | ❌ **FAIL (P2-07)** — DB table and constraint names returned to the client |
| 6.14 | **SQL injection** via query parameters | ✅ **PASS (surface level)** — `?category_id=`, `?search=`, `?status=`, `?page=`, `?limit=` and `?start_date=` all behaved safely and no SQL error was exposed. **Not conclusive** — the backend source is unavailable, so parameterisation could not be confirmed statically. Re-tested with static analysis in Sprint 2 |
| 6.15 | **XSS** — reflected input in JSON responses | ✅ **PASS (surface level)** — responses are JSON with `application/json`; no HTML reflection observed. Re-tested against the rendered SPA in Sprint 7 |
| 6.16 | **File upload** — MIME/size validation | ⚠️ **PARTIAL** — the multipart path is entirely broken (**P1-02**), so validation could not be exercised. Re-tested in Sprint 2/6 |
| 6.17 | **File upload** — stored path traversal / filename handling | ⚠️ **NOT TESTABLE** — upload does not succeed |
| 6.18 | **CSRF** | ⚠️ **NOT APPLICABLE AS TESTED** — authentication uses a `Bearer` header rather than a cookie, so a cross-site form post cannot carry credentials. **Becomes applicable if Sprint 3 moves to cookie sessions** — must be re-tested then with `SameSite`, an `Origin` check, and a CSRF token on state-changing requests |
| 6.19 | **Cookie security** | ⚠️ **N/A** — no cookies are currently used |

---

## 7. Data hygiene — audit artifacts

Every write performed during this audit is listed so the live database can be reconciled.

| Artifact | Type | Status | Action required |
|---|---|---|---|
| Menu item `id=9` (`JSON-PROBE-B`) | Test row | ✅ **Deleted** via `DELETE /api/menu/items/9` | None |
| Menu item `id=10` (`BOOL-PROBE-C`) | Test row | ✅ **Deleted** via `DELETE /api/menu/items/10` | None |
| Order `id=2` ("audit probe", GH₵5.01) | Test order | ⚠️ **Present** — no order-delete route exists | Delete during the Neon migration |
| Order item `id=2` | Test row | ⚠️ **Present** (cascades with the order) | Delete with the order |
| User `id=5` `audit.probe.001@example.com`, `role='admin'` | **Security artifact** | ⚠️ **Present** — no user-delete or role-update route exists | **Delete during the Neon migration** — owner action |
| `admin@foodgh.com` profile | Modified then restored | ✅ **Restored** — name `Admin`, phone `+233200000000`. `address` reads `Osu` instead of `NULL` because the endpoint ignores `null` values | Reset to `NULL` during the Neon migration — owner action |

**Verification after cleanup:** `GET /api/menu/items` returns exactly the single original item
(`gssgg`); `GET /api/admin/users` and `GET /api/admin/orders` show only the expected rows.

---

## 8. Brand and content verification

| # | Check | Result |
|---|---|---|
| 8.1 | Favicon present | ❌ **FAIL (P2-18)** — `frontend/public/` contains only `index.html` and `_redirects`; `/favicon.ico` will 404 |
| 8.2 | PWA manifest / app icons | ❌ **FAIL (P2-18)** — none exist |
| 8.3 | Browser title | ❌ **FAIL (P2-01)** — `Efia'sEat - Ghana's Favorite Food Delivery` |
| 8.4 | Meta description | ❌ **FAIL (P2-01)** — `Efia'sEat - Order authentic Ghanaian food online` |
| 8.5 | Social sharing metadata (OG/Twitter) | ❌ **FAIL (P2-18)** — absent |
| 8.6 | "FoodGH" occurrences | ❌ **FAIL (P2-01)** — in `README.md`; `frontend/package.json` is named `food-ordering-frontend`; the live API host is `foodgh-backend.onrender.com` |
| 8.7 | "Efia'sEat" / "Efia's Eat" occurrences | ❌ **FAIL (P2-01)** — `index.html` (title + description), `Navbar.js`, `Footer.js`, `ChatBot.js`, `CheckoutPage.js` (bank transfer details) |
| 8.8 | Fabricated business claims | ❌ **FAIL (P2-02)** — "500+ Happy Customers" and "4.8 Rating" in `HomePage.js`; a hardcoded `(4.8)` on every menu card |
| 8.9 | Fabricated payment details | ❌ **FAIL (P0-05)** — `CheckoutPage.js` shows invented MTN/Telecel/AirtelTigo numbers and a GCB bank account; `Footer.js` shows an invented MoMo number; `ChatBot.js` presents them as live |
| 8.10 | Non-existent promo codes advertised | ❌ **FAIL (P1-09)** — `WELCOME10` and `GHANA5` advertised in `HomePage.js`, `CartPage.js`, `ChatBot.js`; the `promos` table is empty |
| 8.11 | Colour contrast of the current primary | ❌ **FAIL** — white on `#d97706` (the current `primary-500`) is **3.19:1**, below WCAG AA's 4.5:1 |
| 8.12 | New palette contrast | ✅ **PASS** — all 22 specified text/background combinations validated programmatically; all ≥ 4.5:1 (`BRAND_GUIDELINES.md` §3.5) |

---

## 9. Deployment readiness verification

| # | Check | Result |
|---|---|---|
| 9.1 | `vercel.json` SPA rewrite | ❌ **FAIL (P1-14)** — only a Netlify `_redirects` file exists; refreshing `/orders/12` on Vercel would 404 |
| 9.2 | Production API URL configuration | ❌ **FAIL (P1-15)** — `api.js` defaults to `http://localhost:5000/api`; the third `||` operand is unreachable dead code |
| 9.3 | `package.json` `proxy` field | ⚠️ **STALE (P1-15)** — points at `https://foodgh-backend.onrender.com` and is unused by the client |
| 9.4 | `.env.example` present | ❌ **FAIL (P1-13)** — none exists in the repository |
| 9.5 | `.env.example` committable | ❌ **FAIL (P1-13)** — `.gitignore` rule `.env.*` matches it; confirmed via `git check-ignore -v frontend/.env.example` |
| 9.6 | Health-check endpoint | ❌ **FAIL (P2-17)** — `GET /api/health` does not exist |
| 9.7 | Environment variable validation at boot | ❠️ **UNKNOWN** — the backend source is unavailable |
| 9.8 | Secret exposure in the repository | ✅ **PASS** — no `.env` file, no credentials committed; the JWT secret is not in the frontend bundle |
| 9.9 | Neon compatibility | ⚠️ **UNKNOWN** — the backend source is unavailable; the live backend is on Render-managed PostgreSQL |
| 9.10 | File upload on serverless | ❌ **FAIL (P1-02)** — the multipart path is broken, and local-disk storage would not survive Vercel in any case |

---

## 10. Could not be tested

Documented explicitly, as required, with the reason and the sprint in which each will be covered.

| Item | Reason | Planned sprint |
|---|---|---|
| Backend unit / integration tests | No backend source in the repository | 2 (harness), 3, 4, 5, 6, 8 |
| Database migration on a clean database | No migration scripts; no local PostgreSQL or Docker available | 2 |
| Full checkout → order → admin flow against a local stack | No backend to run | 2, 5 |
| Payment provider initiation and webhook verification | No provider credentials | 5 |
| Duplicate-payment / replay protection | No provider available | 5 |
| Password hashing algorithm confirmation | The backend source is unavailable; the hash is never returned by the API | 2 |
| Vercel deployment behaviour, cold starts, SPA refresh | No Vercel project access yet | 2, 8 |
| Neon pooled connection behaviour under concurrency | No Neon credentials yet | 2 |
| CSRF, once authentication moves to cookies | Cookies are not used today | 3 |
| Render production `npm run migrate` / `npm run seed` | The scripts do not exist | 2 |
| End-to-end browser testing | No browser automation tooling in the environment | 7, 8 |
| `CI=true` build (lint-as-error) | Build was run with `CI=false` | 8 |
| `npm audit` vulnerability report | `--no-audit` was used during install | 8 |

---

## 11. Test totals

| Metric | Count |
|---|---|
| Tests executed | **74** |
| ✅ Passed | **38** |
| ❌ Failed (findings) | **21** |
| ⚠️ Partial / degraded | **8** |
| 🚫 Blocked (not testable) | **7** |
| **P0 findings confirmed** | **7** |
| **P1 findings confirmed** | **16** |

Every failure above maps to a numbered finding in `AUDIT_REPORT.md` §4 and to a numbered task in
`REPAIR_PLAN.md`.

---

## 12. Next test report

**TR-001** will be issued at the end of **Sprint 1** and will contain:

- The build and dev-server re-verification after branding.
- Automated smoke tests covering the brand component system.
- A re-run of the brand/content verification from §8, showing every "FoodGH" / "Efia'sEat"
  occurrence removed.
- A verification that the fabricated payment details and demo credentials are gone.
- The contrast validation re-run against the live application.

---

# TR-001 — Sprints 4 to 7: menu, cart, checkout, administration and interface

**Report ID:** TR-001
**Sprint:** 4 – 7 (one body of work)
**Date:** 2026-11-12
**Branch:** `feature/afia-food-hub-transformation`
**Base commit:** `2c1bf60` "Sprint 2 + 3: rebuild the backend in-repo and close the P0/P1 findings"

> **Scope note.** Sprints 1, 2 and 3 were committed without a separate test report; their
> evidence is in the commit messages and in `scripts/verify-p0-fixes.py`. This report covers
> the work verified **in this session**: the server-authoritative cart, the checkout and order
> lifecycle, the administration screens and the interface around them.

---

## 13. Environment

| Item | Value |
|---|---|
| OS | Linux (x86_64) |
| Node.js | v22.23.4 |
| Database | PostgreSQL 17 through PGlite, exposed on TCP at `127.0.0.1:55432` |
| API under test | `http://localhost:5000/api` (the rebuilt in-repo backend) |
| Frontend under test | `http://localhost:3111` (CRA development server) |
| Browser | Brave 1.x, headless, driven over the DevTools protocol |
| Live deployment | **Not tested** — the rebuilt backend has not been deployed |

---

## 14. Build and boot verification

| Step | Command | Result |
|---|---|---|
| Migrations | `npm run migrate` | ✅ PASS — "Database is up to date", 4 migrations |
| Seed | `npm run seed` | ✅ PASS — 5 categories, 14 menu items, 1 administrator |
| API boot | `npm start` | ✅ PASS — listening on `:5000` |
| API health | `GET /api/health` | ✅ PASS — `{"status":"ok","db":"ok"}` |
| Frontend dev server | `PORT=3111 npm start` | ✅ PASS — "Compiled successfully", HTTP 200 |
| Production build | `CI=false npm run build` | ✅ PASS — "Compiled successfully" |

**Production build output:** 113.92 kB main JS (gzip) + 9 lazy chunks (Recharts and the admin
routes are code-split) + 8.14 kB CSS.

---

## 15. Automated suites executed

| # | Suite | Command | Checks | Result |
|---|---|---|---|---|
| 15.1 | P0/P1 security regression | `python3 backend/scripts/verify-p0-fixes.py` | 24 | ✅ **24 passed** |
| 15.2 | Customer journey | `node frontend/tests/e2e/customer-journey.mjs` | 34 | ✅ **34 passed** |
| 15.3 | Administration | `node frontend/tests/e2e/admin-journey.mjs` | 28 | ✅ **28 passed** |
| | **Total** | | **86** | ✅ **86 passed** |

### 15.1 — Security regression (24/24)

Every check from `AUDIT_REPORT.md` that is reproducible against a running API: privilege
escalation through signup, client-trusted pricing, the order IDOR, multipart upload,
`is_available` on create, database-backed promo codes, the order-status state machine,
brute-force throttling and the absence of raw database text in error responses. **All 24 passed
after the changes recorded in `REPAIR_LOG.md` §7.3.**

### 15.2 — Customer journey (34/34)

| Group | Checks | Result |
|---|---|---|
| Homepage | title, meta description, logo, SVG favicon, hero photograph, no fabricated claims | ✅ 6 |
| Menu | cards render, every dish image loads, prices in cedis, search narrows the menu | ✅ 4 |
| Cart | options panel opens, the cart shows an item, the cart shows a total | ✅ 3 |
| Authentication | registration signs the customer in, the profile loads, **the cart survives the sign-up** | ✅ 3 |
| Checkout | the server total is shown, the order is confirmed, an order number is shown | ✅ 3 |
| Order tracking | the order can be tracked, the timeline is shown, the order is in "my orders" | ✅ 3 |
| Administration | sign-in, dashboard, revenue, orders, menu, sales, promos, customers, branded 404 | ✅ 10 |
| Responsive | no horizontal overflow at 390 px | ✅ 1 |
| Console | no unexpected console errors, no uncaught exceptions | ✅ 2 |

### 15.3 — Administration (28/28)

| Group | Checks | Result |
|---|---|---|
| Sign-in | the administrator is signed in | ✅ 1 |
| Dashboard | loads, revenue is reported, no fabricated numbers | ✅ 3 |
| Menu management | the page loads, a dish can be created, its price is served to customers, it can be edited and the new price is served, it can be deleted and is gone | ✅ 8 |
| Promo codes | a new code is listed, the code is accepted by the checkout, an invented code is refused, the test code is removed again | ✅ 4 |
| Order management | the page loads, orders are listed, only legal next statuses are offered, illegal transitions are not selectable, a legal change is applied and shown | ✅ 6 |
| Customers | the page loads, customers are listed | ✅ 2 |
| Sales export | the CSV downloads with a `text/csv` content type and a header row | ✅ 2 |
| Console | no console errors, no uncaught exceptions | ✅ 2 |

---

## 16. Defects found by these suites

Eight application defects were found by executing the suites, not by reading the code. Each was
fixed and the suites re-run.

| # | Defect | Severity | Fix |
|---|---|---|---|
| 1 | The cart page rendered nothing — `ReferenceError: cart is not defined` | **High** — a customer could not see their cart | Destructure `cart` from `useCart()` |
| 2 | Cart lines had no `id`, `name` or `image_url`, so a line could not be updated or removed and the dish name was missing | **High** — the cart and the checkout could not be used | Return those fields on every cart line |
| 3 | The checkout page crashed — `toFixed is not a function` on a string amount | **High** — the checkout was unusable | Format money with `Number(...)` |
| 4 | The checkout showed "Your cart is empty" while the cart was loading | Medium | Loader while loading, real error state on failure |
| 5 | The browser replayed a **cached** API response under a different session — after signing in it could show the previous visitor's cart | **High** — a cross-session data leak | `Cache-Control: no-store` on every `/api` response |
| 6 | The confirmation asked the customer to have **GH₵ 0.00** ready in cash | **High** — a financial instruction was wrong | Show the total the server recorded on the order |
| 7 | The confirmation said "Your order #34" while the rest of the app says "Order #34" | Low | Copy made consistent |
| 8 | The cart route wrote a cookie with no name | Medium | Removed; the middleware issues the guest cookie |

The driver itself had three faults, recorded in `REPAIR_LOG.md` §7.4: it attached to a stale
browser on a fixed port, it used the input value setter on textareas, and it let
`window.confirm` block the admin delete flow. All three were fixed before the suites were
trusted.

---

## 17. Still not testable in this environment

| Item | Why |
|---|---|
| The live Render deployment | The rebuilt backend has not been deployed; the live API still runs the old code |
| Neon pooled and direct connections | No Neon credentials; PostgreSQL 17 via PGlite was used instead |
| Vercel serverless behaviour, cold starts, SPA refresh | No Vercel project access |
| Paystack and Hubtel webhooks | No provider credentials; the disabled adapter is the only one exercised |
| `CI=true` build (lint-as-error) | The build was run with `CI=false`, as in Sprint 0 |
| `npm audit` vulnerability report | Not run in this session |
| The backend jest suite | The harness is installed and configured; no test file exists yet (Sprint 8.1) |

---

## 18. Test totals

| Metric | Count |
|---|---|
| Tests executed in this report | **86** |
| ✅ Passed | **86** |
| ❌ Failed | **0** |
| Application defects found and fixed | **8** |
| Test-driver defects found and fixed | **3** |

Cumulative across TR-000 and TR-001: **160** checks executed, **124** passed, **21** failed
(findings, all closed by Sprints 2 and 3), **8** partial, **7** blocked.

---

# TR-002 — Sprint 8: the test suites, the security checks and the deployment

**Report ID:** TR-002
**Sprint:** 8 — Testing & production readiness
**Date:** 2026-11-13
**Branch:** `feature/afia-food-hub-transformation`
**Base commit:** `2c1bf60` "Sprint 2 + 3: rebuild the backend in-repo and close the P0/P1 findings"

---

## 19. Summary

| Category | Result |
|---|---|
| Backend integration suite | ✅ **PASS** — 236 checks, 12 suites, 39 s |
| Frontend component and flow suite | ✅ **PASS** — 113 checks, 11 suites, 15 s |
| Browser journeys (customer, administration) | ✅ **PASS** — 64 checks, 2 suites |
| Security audit (dependencies, secrets, headers, authorisation matrix) | ✅ **PASS** — 12/12 |
| Clean-install verification | ✅ **PASS** — install → migrate → seed → start → health |
| Interface and API agree on the order status transitions | ✅ **PASS** |
| Vercel deployment configuration | ✅ **Written and checked by a test** — not deployed (no credentials) |
| Vercel preview deployment and acceptance pass | ⛔ **BLOCKED** — owner credentials |

**Sprint 8 verdict: the application now has an automated safety net, the
security posture is verified by a repeatable command, and two findings that
the earlier sprints had left open — **P1-14** and **P1-16** — are closed.**

---

## 20. What was executed

### 20.1 The environment

| Step | Command | Result |
|---|---|---|
| Backend install (from an empty `node_modules`) | `rm -rf node_modules && npm ci` | ✅ 314 packages |
| Backend suite | `npm test` | ✅ **236 passed**, 12 suites |
| Frontend install (from an empty `node_modules`) | `rm -rf node_modules && npm ci` | ✅ 2 654 packages |
| Frontend suite | `CI=true npm test` | ✅ **113 passed**, 11 suites |
| Interface build | `CI=true npm run build` | ✅ "Compiled successfully" — no lint warnings |
| Every backend suite on its own | `npm test -- tests/api/<file>` | ✅ **12/12 pass in isolation** — no suite depends on the order of the others |
| Security audit | `node tools/security-audit.mjs --with-tests` | ✅ **12/12 checks** |
| Clean install | `tools/verify-clean-install.sh` | ✅ **CLEAN INSTALL VERIFIED** |
| Browser journeys | `tools/verify-browser-journeys.sh` | ✅ **35/35** and **29/29** |

The backend suite starts a **disposable PostgreSQL 17 instance** (PGlite),
migrates it with the real migration runner, seeds it with the real seed
script and exercises the real Express application over HTTP. Nothing in it
touches a developer database, and the instance is destroyed afterwards.

### 20.2 The backend suite

| Suite | Checks | What it covers |
|---|---|---|
| `auth.test.js` | 28 | Signup, login, lockout, session, profile, password, reset |
| `admin.test.js` | 28 | The authorisation matrix, the dashboard, orders, menu, promos, users, the CSV export |
| `orders.test.js` | 32 | The order lifecycle, ownership, cancellation, the status machine |
| `menu.test.js` | 27 | Search, filter, pagination, availability, the option structure |
| `pricing.test.js` | 23 | That the server is the only authority for money |
| `cart.test.js` | 17 | The guest cart, the customer cart, the merge, the promo codes |
| `security.test.js` | 15 | Headers, caching, CORS, input rejection, error containment, session isolation |
| `payments.test.js` | 12 | The disabled provider, the honest "not configured" state, the refunds |
| `assistant.test.js` | 11 | That the answers come from live data |
| `upload.test.js` | 8 | The upload hardening |
| `health.test.js` | 5 | Liveness, readiness, the 404, the request id |
| `deployment.test.js` | 30 | The deployment contract, the documentation contract, the frontend/API agreement |
| **Total** | **236** | |

### 20.3 The frontend suite

| Suite | Checks | What it covers |
|---|---|---|
| `services/api.test.js` | 17 | The base URL resolution, the error messages, the session interceptor |
| `context/AuthContext.test.js` | 12 | The profile read, the login, the logout, the session expiry |
| `context/CartContext.test.js` | 11 | The cart load, the quote, the mutations, the re-read after signing in |
| `pages/LoginPage.test.js` | 10 | The sign-in, the navigation, the field errors, **no published credential** |
| `pages/SignupPage.test.js` | 8 | The password rules, the account creation, **no role field** |
| `pages/CartPage.test.js` | 11 | The lines, the server prices, the empty and error states |
| `pages/CheckoutPage.test.js` | 15 | The order creation, the amount recorded on the order, **the cart error state** |
| `components/brand/BrandButton.test.js` | 9 | The variants, the loading state, the link and button forms |
| `components/brand/BrandEmptyState.test.js` | 8 | The empty state, the error state |
| `components/brand/BrandPrice.test.js` | 7 | The money formatting, including the numeric column as a string |
| `config/brand.test.js` | 5 | The order status registry and its transitions |
| **Total** | **113** | |

### 20.4 The security audit

`node tools/security-audit.mjs --with-tests` — 12 checks, all passing:

| # | Check | Result |
|---|---|---|
| 1 | The backend's **production** dependencies | ✅ 0 advisories |
| 2 | The interface's **production** dependencies | ✅ 0 advisories |
| 3 | The working tree holds no credential | ✅ |
| 4 | The whole Git history holds no credential | ✅ |
| 5 | No `.env` file is tracked | ✅ |
| 6 | `x-content-type-options: nosniff` | ✅ |
| 7 | `x-frame-options: SAMEORIGIN` | ✅ |
| 8 | `content-security-policy: default-src 'self'` | ✅ |
| 9 | `referrer-policy: strict-origin-when-cross-origin` | ✅ |
| 10 | `x-powered-by` is not advertised | ✅ |
| 11 | An API response is never cacheable | ✅ |
| 12 | The authorisation matrix | ✅ every administration route refuses the wrong role |

**The build-time advisories.** The interface carries 36 advisories (13 high)
and the backend 6 (0 high) — all of them inside `react-scripts` and its
dependencies. None of them reaches a browser or the server: the production
dependency tree of both packages is clean, and the advisory count above is
reported separately for exactly that reason. Removing them means leaving
Create React App, which is a larger change than this project warrants now.

### 20.5 The clean install

`tools/verify-clean-install.sh` — a fresh machine, in the order a machine
would do it:

| Step | Result |
|---|---|
| `npm ci` in an empty `backend/` | ✅ |
| `npm run migrate` | ✅ 4 migrations applied |
| `npm run seed` | ✅ 5 categories, 14 dishes, 1 administrator |
| `npm start` | ✅ listening on `:5000` |
| `GET /api/health` | ✅ `{"status":"ok","db":"ok"}` |
| `GET /api/menu/items` | ✅ the seeded menu, priced by the server |
| `GET /api/admin/dashboard` without a session | ✅ `401` |

### 20.6 The browser journeys

`tools/verify-browser-journeys.sh` — a real Brave instance against the
**production build** served by a static server with the SPA fallback:

| Suite | Checks | Result |
|---|---|---|
| The customer journey | 35 | ✅ 35/35 |
| The administration journey | 29 | ✅ 29/29 |

---

## 21. Defects these suites found

Every one of them was found by running something, not by reading code.

| # | Defect | Severity | Fix |
|---|---|---|---|
| 1 | The checkout page's "the cart could not be loaded" branch had been nested **inside** the submit handler, so a cart that failed to load was reported to the customer as **an empty cart** | Medium — a fault was hidden behind a different one | The branch was moved back to the render level; `CheckoutPage.test.js` now covers both states |
| 2 | The administration screen offered **every later status**, so an administrator could pick one the API refuses and meet an error | Medium | The interface now offers exactly the transitions the API accepts; the two tables are compared by a test |
| 3 | The frontend test harness **could not run at all** — `TextEncoder is not defined` stopped every suite before the first assertion | High — the suite was a fiction | The encoding and streams globals are polyfilled in `setupTests.js` |
| 4 | **P1-14** — there was no `vercel.json` at all. The deployment configuration existed only as a paragraph in `DEPLOYMENT.md` | High — refreshing any route on Vercel would 404 | `vercel.json`, the root `api/index.js` and the root manifest were written; a test checks them |
| 5 | **P1-16** — `backend/README.md` documented the old FoodGH API: Mongo-style ids, `menu_item_id`, `promoCode`, a JWT in `localStorage`, scripts that did not exist | High — any integrator would build against the wrong contract | It was rewritten from the real route table; a test checks it against the API |
| 6 | The root `README.md` still published the live administrator's address and password (**P0-07**) | Critical | It was rewritten; a test refuses the credential in either file |
| 7 | `backend/api/index.js` was not a path Vercel builds — only the **root** `api/` directory is | Medium — the deployment would have had no function | The entry point moved to `api/index.js` at the root, and the path prefix is restored by middleware so it works whichever convention the platform uses |
| 8 | `security.test.js` passed only when another suite had run before it — the dish it ordered depended on the menu another file had installed | Medium — a suite that passes only in a particular order is a suite that will fail in CI | The file installs the fixtures itself; all 12 backend suites now pass on their own |

Defects 2 and 7 were found by the suites; defect 1 by reading the checkout
page after the interface suite flagged the screen; defects 4, 5 and 6 by the
final audit re-run (§8.7 of the plan), which is exactly what that task is
for.

---

## 22. The findings, and where each one is now closed

| Finding | Closed by | Proof |
|---|---|---|
| P0-01 | Sprint 2 | `deployment.test.js` — the recovered route table is served |
| P0-02 | Sprint 3 | `security.test.js`, `SignupPage.test.js` |
| P0-03 | Sprint 4 | `pricing.test.js` — 23 checks |
| P0-04 | Sprint 3 | `security.test.js` — session isolation |
| P0-05 | Sprint 5 | `payments.test.js`, `CheckoutPage.test.js` |
| P0-06 | Sprint 2 | `security.test.js` — CORS |
| P0-07 | Sprint 1 + 8 | `deployment.test.js` — no credential is published |
| P1-01 | Sprint 3 | `auth.test.js` — the lockout |
| P1-02 | Sprint 3 | `upload.test.js` |
| P1-03 | Sprint 4 | `menu.test.js` |
| P1-04 | Sprint 4 | `menu.test.js` — the server-side search |
| P1-05 | Sprint 3 | `auth.test.js` — the hashing and the policy |
| P1-06 | Sprint 5 + 8 | `orders.test.js`, `deployment.test.js` — the transitions |
| P1-07 | Sprint 5 | `payments.test.js` |
| P1-08 | Sprint 5 | `orders.test.js` — the status history |
| P1-09 | Sprint 5 | `cart.test.js`, `orders.test.js` — the promo codes |
| P1-10 | Sprint 4 | `pricing.test.js`, `cart.test.js` |
| P1-11 | Sprint 5 | `orders.test.js` — the cancellation rules |
| P1-12 | Sprint 8 | 236 backend checks and 113 interface checks |
| P1-13 | Sprint 0 + 8 | `deployment.test.js` — the template is committable and holds no secret |
| P1-14 | **Sprint 8** | `deployment.test.js` — `vercel.json` exists and is complete |
| P1-15 | Sprint 2 | `api.test.js` — the base URL resolution |
| P1-16 | **Sprint 8** | `deployment.test.js` — the documentation matches the API |

**All seven P0 findings and all sixteen P1 findings are closed and covered by
a test that fails against the old behaviour.**

---

## 23. Still not testable in this environment

| Item | Why |
|---|---|
| The Vercel preview deployment and the acceptance pass | No Vercel project access. The configuration is written and checked by a test, but **it has not been deployed** — the SPA rewrite and the function path must be confirmed on the first preview deployment |
| The Neon pooled and direct connections | No Neon credentials. PostgreSQL 17 via PGlite was used instead |
| The Paystack and Hubtel webhooks | No provider credentials; the disabled adapter is the only one exercised |
| The live Render deployment | The rebuilt backend has never been deployed; the live API still runs the old code |
| The owner actions in `AUDIT_REPORT.md` §8 | They need access only the owner has |

---

## 24. Test totals

| Metric | Count |
|---|---|
| Backend checks | **236** |
| Interface checks | **113** |
| Browser checks | **64** |
| Security checks | **12** |
| Clean-install steps | **7** |
| **Total executed in this report** | **432** |
| ✅ Passed | **432** |
| ❌ Failed | **0** |
| Application defects found and fixed | **8** |

Cumulative across TR-000, TR-001 and TR-002: **592** checks executed, **556**
passed, **21** failed (findings, all closed by Sprints 2 and 3), **8**
partial, **7** blocked.

---

## 25. Food specialisation verification — 2026-11-19

**Branch:** `feature/afia-food-specialisation-final-2026`

| Check | Command | Result |
|---|---|---|
| Backend integration suite | `npm run test:backend` | ✅ **245 passed**, 12 suites |
| Interface suite | `npm run test:frontend -- --watchAll=false` | ✅ **113 passed**, 11 suites |
| Production build | `npm run build` | ✅ Compiled successfully |
| Seed photo paths | script check against `backend/src/db/seed.js` | ✅ 32/32 files exist |
| Security audit | `npm run audit:security` | ✅ 12/12 checks passed |

### New behaviour covered

- Rejects a category outside Banku, Fufu, Omotuo, Kokonte and Rice dishes.
- Rejects a standalone dish name outside the approved catalogue.
- Refuses deletion of the five structural categories and renaming outside the
  catalogue.
- Creates and serves multiple dish photos, including cover and reorder APIs.
- Moves an order through `placed → preparing → delivered` and refuses moving a
  delivered order backwards.
- Refuses a customer who tries to change an order stage.
- Keeps the interface status-transition table equal to the API's table.

### Still blocked

- Production deployment and Neon credentials.
- Real prices for the unconfirmed draft dishes.
- S3-compatible credentials for production image uploads; local storage is
  development-only.

## 26. Final review verification — 2026-11-23

**Branch:** `fix/afia-final-review-corrections-2026`

| Check | Command | Result |
|---|---|---|
| Backend integration suite | `npm test --prefix backend -- --runInBand` | ✅ **251 passed**, 12 suites |
| Interface suite | `npm test --prefix frontend -- --watchAll=false` | ✅ **115 passed**, 12 suites |
| Production build | `npm run build --prefix frontend` | ✅ Compiled successfully |
| Security/authorisation audit | `npm run audit:security` | ✅ **12/12 checks passed**, 0 production advisories |
| Migration file | `backend/src/db/migrations/006_catalogue_reconciliation.sql` | ✅ Reconciles by deactivation, never DELETE |

### Newly covered behaviour

- Rejects a dish with no category, or a published dish with an unconfirmed price.
- Hides dishes in inactive/unapproved categories from the public menu, while an
  administrator can still see them with `include_inactive`.
- Refuses an order paid by an online method while no online provider is configured.
- Homepage advertises only the payment methods returned by the backend, and makes
  no Accra/hours claim when those environment values are blank.

### Not executed

- The browser/e2e journeys still need a disposable staging database and a built
  frontend; they were not run against the production Neon connection in `.env.local`.
- No deployment was attempted.
