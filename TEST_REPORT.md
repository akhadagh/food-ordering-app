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
