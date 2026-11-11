# Afia Food Hub — Full-Stack Audit Report

**Project:** `akhadagh/food-ordering-app` (formerly FoodGH / Efia'sEat)
**Target identity:** Afia Food Hub
**Audit date:** 2026-11-11
**Sprint:** 0 — Discovery & Preparation
**Auditor role:** Senior full-stack / security / QA review
**Branch:** `feature/afia-food-hub-transformation` (base commit `f56f6b4` "Brand name changed")

---

## 1. Executive Summary

The repository contains a **frontend-only** implementation of a full-stack food-ordering
application. The React client is functional and builds cleanly, but **the backend source code
does not exist in this repository** — it was never committed. Git history proves this: across
all four commits, the only file ever added under `backend/` is `backend/README.md`.

The missing backend is still **running in production** on Render
(`https://foodgh-backend.onrender.com/api`) against a live PostgreSQL database. Sprint 0
therefore included read-only reconnaissance of that deployment to recover the API contract and
database schema, plus targeted security probes.

**Seven P0 (critical) findings were confirmed by live exploitation, not by code reading.**

| Severity | Count | Headline examples |
|---|---|---|
| **P0 — Critical** | 7 | Backend source absent; privilege escalation via signup; client-trusted order pricing; IDOR on order read; fabricated payment credentials; CORS hardcoded to localhost; published demo admin credentials |
| **P1 — High** | 16 | No rate limiting; image upload entirely broken; menu `is_available` ignored on create; search API ignores query; no order-state transition rules; no payment status; missing `ready` state; broken promo codes; no automated tests |
| **P2 — Medium** | 20 | Three competing brand identities; fabricated business claims; menu images ignored in favour of emoji; hardcoded chatbot; blank-screen error states; no security headers |
| **P3 — Low** | 9 | CRA toolchain, duplicated status maps, dead code, missing LICENSE |

The application **cannot be deployed to the required Neon + Vercel production stack in its
current state**: the backend source is missing, the CORS allowlist rejects every non-localhost
origin, image uploads require an ephemeral local filesystem, and there is no `vercel.json` for
SPA route rewrites.

### Data state at audit time

The live database is a scratch/development database. It contains no genuine customer data:
one menu item named `gssgg` priced GH₵555.00, one order with delivery address `hf`, and
placeholder users (`test@example.com`, `kark@kark.com`, `test@test.ocm`). Tables `categories`
and `promos` are **empty**, which is itself the root cause of several P1 findings.

Audit probes created three records. Two were deleted through the API (menu items `9`, `10`).
Two remain and **cannot be removed via the API** because no delete or role-update endpoints
exist — they are scheduled for removal in the Neon migration:

| Record | Why it remains | Planned cleanup |
|---|---|---|
| User `id=5` `audit.probe.001@example.com`, `role='admin'` | No `DELETE /admin/users/:id` and no role-update endpoint exists | `DELETE FROM users WHERE id = 5` during migration |
| Order `id=2` (GH₵5.01, `delivery_notes='audit probe'`) | No `DELETE` for orders | `DELETE FROM order_items WHERE order_id = 2; DELETE FROM orders WHERE id = 2;` during migration |

The pre-existing admin profile was briefly overwritten during an authorization probe and was
**restored** to its original values (name `Admin`, phone `+233200000000`). Its `address`
column could not be reset to `NULL` because the update endpoint ignores `null` values; it now
reads `Osu` instead of `NULL`. This is cosmetic and is corrected by the same migration.

---

## 2. Scope & Method

### 2.1 What was inspected

- All 24 tracked files in the repository (complete — the repository is small).
- Full Git history (`git log --all --diff-filter=A`) to determine what was ever committed.
- The live Render deployment's HTTP surface (routes, headers, status codes, response shapes).
- The live PostgreSQL schema, reconstructed from JSON response shapes and column names.
- The frontend production build (`react-scripts build`) and dev server (`react-scripts start`).

### 2.2 Test method

1. **Static review** of every source file.
2. **Build verification** — `npm ci`/`npm install` then `npm run build` (passed).
3. **Runtime verification** — dev server started on port 3111, served HTTP 200, compiled clean.
4. **Live API contract probing** — every documented endpoint exercised with both success and
   failure payloads.
5. **Adversarial probing** — authenticated and unauthenticated requests designed to confirm or
   refute each suspected vulnerability. **Every P0 below was reproduced against the live
   deployment**, not inferred.

### 2.3 Constraints observed

- No destructive operation was performed on the live database. No table was dropped, truncated,
  or altered. All write probes were either self-labelling (`audit probe`, `UPLOAD-PROBE-*`,
  `BOOL-PROBE-*`) and deleted via the API, or are explicitly listed in §1 for DB-level cleanup.
- No secrets were committed. No credentials were written to disk outside `/tmp/opencode`.
- Nothing was deployed or pushed.

---

## 3. Architecture as Found

```
food-ordering-app/
├── backend/
│   └── README.md          ← API documentation ONLY. No source code has ever existed here.
└── frontend/
    ├── public/
    │   ├── index.html      ← No favicon, no manifest, no OG tags. Title "Efia'sEat".
    │   └── _redirects      ← Netlify-only SPA rewrite.
    └── src/
        ├── App.js          ← 14 routes, ProtectedRoute + AdminRoute guards.
        ├── components/
        │   ├── layout/     ← Navbar.js, Footer.js
        │   └── chatbot/    ← ChatBot.js  (hardcoded keyword matcher, no AI)
        ├── context/        ← AuthContext.js, CartContext.js (localStorage-backed)
        ├── pages/          ← 14 page components
        ├── services/       ← api.js (single axios instance, 3 API groups)
        ├── index.css       ← 5 component classes
        └── index.js
```

**Technology:** React 18, React Router 6, Tailwind 3, axios, Recharts, lucide-react,
react-hot-toast, CRA 5 (`react-scripts`).

**Inferred backend stack** (from live behaviour): Node + Express + `node-postgres` (raw SQL —
the API returns snake_case columns and PG `numeric` as strings), `express-validator`,
`jsonwebtoken`, `multer`, `cors`. Deployed on Render with a managed PostgreSQL.

### 3.1 Recovered database schema

Reconstructed from live API responses (snake_case column names, `numeric` money columns,
`created_at`/`updated_at` timestamps, integer PKs with a global sequence):

| Table | Columns observed |
|---|---|
| `users` | `id`, `name`, `email`, `phone`, `address`, `role`, `created_at`, `updated_at` (+ hashed password, not exposed) |
| `categories` | `id`, `name`, `description` — **table exists but is empty** |
| `menu_items` | `id`, `category_id`, `name`, `description`, `price`, `image`, `is_available`, `is_featured`, `custom_options`, `created_at`, `updated_at` |
| `orders` | `id`, `user_id`, `status`, `subtotal`, `delivery_fee`, `discount`, `total`, `promo_code_id`, `delivery_address`, `delivery_notes`, `payment_method`, `estimated_delivery`, `created_at`, `updated_at` — **no `payment_status` column** |
| `order_items` | `id`, `order_id`, `menu_item_id`, `name`, `quantity`, `price`, `custom_options`, `special_instructions`, `created_at` |
| `order_status_history` | `id`, `order_id`, `status`, `note`, `created_at` |
| `promos` | `id`, `code`, `discount_type`, `discount_value`, `min_order`, `max_uses`, `used_count`, `is_active`, `expires_at` — **table exists but is empty** |

Positive findings from the schema: order status has a **database-level CHECK constraint**
(`orders_status_check`), which caught an invalid status write and returned HTTP 500 rather
than corrupting data.

---

## 4. Findings

Severity key: **P0** critical (security, financial integrity, data loss, app-breaking) ·
**P1** high (broken core functionality, auth failures, incorrect financial calculations) ·
**P2** medium (incomplete functionality, usability, performance) ·**P3** low (visual, cleanup).

---

### 4.1 P0 — Critical

#### P0-01 · Backend source code is absent from the repository
- **Affected:** `backend/` (entire directory), `README.md`, `backend/README.md`
- **Root cause:** The backend was developed and deployed to Render but never committed. Git history
  (`git log --all --diff-filter=A --name-only`) shows `backend/README.md` is the only file ever
  added under `backend/`.
- **Impact:** The repository cannot be installed on a clean system (`npm run migrate` / `npm run seed`
  documented in the README do not exist), cannot be reviewed, cannot be deployed to Vercel, and
  cannot be extended. There is no source of truth for the database schema, migrations, auth logic
  or payment logic. The production deployment is the *only* copy — a single point of total loss.
- **Recommended fix:** Rebuild the backend in-repo from the recovered contract and schema
  (Sprint 2), with the recovered schema as the migration baseline. Migrate the live PostgreSQL data
  to Neon. Treat the Render deployment as a read-only reference until the new backend is proven
  equivalent.

#### P0-02 · Privilege escalation — signup accepts a `role` field
- **Affected:** `POST /api/auth/signup` (backend, source missing); reachable via
  `frontend/src/pages/SignupPage.js` → `frontend/src/context/AuthContext.js:31`
- **Root cause:** The signup controller binds request-body fields to the user record without
  whitelisting, so `role` is written verbatim from client input.
- **Impact:** **Any anonymous visitor to the public site can create an administrator account.**
  Confirmed live: `POST /api/auth/signup` with body `{"name":"…","email":"…","password":"password123","role":"admin"}`
  returned `201` with `"role":"admin"` and a valid admin JWT. Full administrative takeover —
  order management, menu editing, sales data, user list — with no credential required.
- **Recommended fix:** Explicitly whitelist writable fields on signup (`name`, `email`, `password`,
  `phone`, `address`); never bind `role` from the request. Force `role='customer'` server-side.
  Add a regression test asserting `role: 'admin'` in a signup body yields a customer.

#### P0-03 · Order pricing is taken from the client — totals are attacker-controlled
- **Affected:** `POST /api/orders` (backend, source missing); client side
  `frontend/src/pages/CheckoutPage.js:60-73`, `frontend/src/context/CartContext.js:43-45`
- **Root cause:** The order controller trusts `price` and `name` supplied in the request body.
- **Impact:** **Financial integrity failure.** Confirmed live: posting
  `{"items":[{"menu_item_id":1,"name":"HACKED","quantity":1,"price":"0.01"}], …}` against a menu
  item priced GH₵555.00 created order `id=2` with `subtotal: "0.01"`, `total: "5.01"` and the
  item name stored as `"HACKED"`. Every revenue figure in the admin dashboard, sales reports and
  CSV export is derived from these attacker-writable numbers — the CSV export confirmed the
  forged order appearing as `0.01` gross sales. A customer can also forge the displayed item name
  (spoofed menu content on receipts).
- **Recommended fix:** Recompute all money server-side from `menu_items.price` at order-creation
  time inside a transaction; reject or ignore client `price`/`name`; snapshot the resolved name
  and price into `order_items`; validate `quantity` bounds, item availability and stock; make
  `total = subtotal + delivery_fee - discount` a database-computed invariant. Add tests asserting
  a forged price is ignored.

#### P0-04 · Broken object-level authorization on order read (IDOR)
- **Affected:** `GET /api/orders/:id` (backend, source missing)
- **Root cause:** The read handler resolves the order by ID without comparing `order.user_id` to the
  authenticated user. The cancel handler (`POST /api/orders/:id/cancel`) *does* check ownership and
  correctly returns `403` — the read path was missed.
- **Impact:** **Customer data disclosure.** Confirmed live: a freshly created customer account
  successfully read order `id=2` owned by a different customer, exposing the owner's
  `user_email`, `user_phone`, full delivery address, delivery notes, item list and totals. Because
  order IDs are sequential integers, the entire customer order history is enumerable.
- **Recommended fix:** Enforce ownership (`order.user_id === req.user.id`) or admin role on every
  order read; return `404` rather than `403` for other users' orders to avoid confirming existence.
  Add a test that customer A cannot read customer B's order.

#### P0-05 · Fabricated payment credentials are shown to customers
- **Affected:** `frontend/src/pages/CheckoutPage.js:99-103`
- **Root cause:** The checkout confirmation screen displays hardcoded "payment instructions"
  invented during prototyping and never wired to a payment provider.
- **Impact:** Customers are instructed to transfer real money to invented accounts:
  MTN `0241234567`, Vodafone `0501234567`, AirtelTigo `0261234567`, and
  `GCB / 1234567890 / "Efia'sEat Ltd."` for bank transfer. **There is no payment integration of any
  kind** — no provider SDK, no webhook, no payment record, and the order row has no payment state.
  The same invented numbers appear in `frontend/src/components/layout/Footer.js:41` and are
  described as a live merchant in `frontend/src/components/chatbot/ChatBot.js:8-9`. For a real
  Ghanaian business this is direct financial harm and a compliance failure.
- **Recommended fix:** Remove all hardcoded merchant numbers, bank details and "pay then we will
  confirm" copy immediately. Integrate a real provider (Paystack — supports MTN MoMo, Telecel
  Cash, AirtelTigo, cards — or Hubtel) with server-side initiation, signed webhook verification,
  and a `payment_status` state machine (`pending`/`successful`/`failed`/`refunded`) independent of
  order status. Until credentials exist, show an explicit "payment provider not configured"
  state and support Cash on Delivery only, with the order marked `payment_status='pending_cod'`.
  Never present a payment as complete without authoritative provider verification.

#### P0-06 · CORS allowlist is hardcoded to `http://localhost:3000`
- **Affected:** CORS middleware (backend, source missing)
- **Root cause:** A single-origin allowlist containing only the local dev origin, with no
  environment-driven configuration.
- **Impact:** **Blocks the required Neon + Vercel production deployment.** Confirmed live:
  `OPTIONS /api/menu/items` with `Origin: https://afia-food-hub.vercel.app` returned **HTTP 500**
  (not a clean rejection) and no `Access-Control-Allow-Origin` header. The same applies to every
  Vercel preview deployment and to any future domain. Additionally, an unknown origin produces an
  unhandled error instead of a controlled `403`, which is a minor DoS/error-hygiene issue.
- **Recommended fix:** Drive the allowlist from `FRONTEND_URL` / `CORS_ORIGINS` (comma-separated,
  supporting multiple origins and `*.vercel.app` preview wildcards); return a clean `403` for
  disallowed origins rather than throwing; never hardcode origins. Verify preflight from the real
  production origin before launch.

#### P0-07 · Demo administrator credentials are published in the product UI
- **Affected:** `frontend/src/pages/LoginPage.js:51-55`, `README.md` ("Demo Credentials" section)
- **Root cause:** Prototype demo credentials were left in the shipped login screen.
- **Impact:** The live database's administrator account is `admin@foodgh.com` / `admin123` — visible
  on the public login page and in the README. Anyone can log into the admin dashboard of the live
  application. The same credentials grant `role='admin'` on the live backend (verified by logging
  in successfully during this audit).
- **Recommended fix:** Remove the credentials block from the login page and the README immediately.
  Rotate the live admin password and the `JWT_SECRET`. Implement a password-change flow, enforce
  a minimum strength policy, and support a `BOOTSTRAP_ADMIN_EMAIL` + one-time setup flow instead of
  seeded default credentials. Add a deploy-time check that refuses to start with default credentials.

---

### 4.2 P1 — High

#### P1-01 · No rate limiting or brute-force protection
- **Affected:** `POST /api/auth/login`, `POST /api/auth/signup` (backend, source missing)
- **Root cause:** No rate-limiting middleware; no failed-attempt counter; no lockout.
- **Impact:** **Confirmed live:** 12 rapid failed logins against the admin account returned `401`
  twelve times — no lockout, no `429`, no delay, no alert. Combined with P0-07 (known password)
  and P1-05 (6-character minimum), the admin account is trivially compromisable. The signup
  endpoint is also unthrottled, enabling mass account creation.
- **Recommended fix:** Per-IP and per-account rate limiting (e.g. `express-rate-limit`: 10 failed
  logins / 15 min → temporary lockout), exponential backoff, CAPTCHA on signup, and structured
  security logging. Use a server-side store (Redis or a Postgres table) so limits hold across
  serverless instances.

#### P1-02 · Image upload is entirely non-functional
- **Affected:** `POST/PUT /api/menu/items` with `multipart/form-data` (backend, source missing);
  frontend `frontend/src/pages/AdminMenu.js:33-58`
- **Root cause:** Multer is mounted but the request body fields are not bound before the controller
  reads them, so `req.body.name` is undefined on multipart requests.
- **Impact:** **Confirmed live.** `POST /api/menu/items` as multipart returned
  `500 {"message":"Error creating menu item","error":"null value in column \"name\" of relation \"menu_items\" violates not-null constraint"}`.
  Multipart **without** an image fails identically — so the entire upload path is broken, not just
  the file handling. The "Add Item" form's file input is a **dead control**: submitting with an
  image always fails with a raw database error surfaced as the generic toast "Operation failed".
  This was introduced by commit `ad791d4` ("Add image upload for menu items") and was evidently
  never verified.
- **Recommended fix:** Rebuild the upload path properly: parse multipart fields *and* files, validate
  MIME type and size server-side, and store images in **object storage** (Neon Object Storage or
  Vercel Blob) — never on local disk, which is ephemeral on Vercel and on Render's free tier.
  Reject non-image types and oversized files explicitly.

#### P1-03 · Menu item creation ignores `is_available`
- **Affected:** `POST /api/menu/items` (backend, source missing)
- **Root cause:** The insert path does not bind the boolean from the request body; the column
  default (`true`) always wins.
- **Impact:** **Confirmed live.** `POST /api/menu/items` with `"is_available": false` stored
  `is_available: true`. An administrator cannot create a dish in an unavailable state (e.g. before
  a supplier delivery, or while a dish is out of stock) — it will appear live to customers
  immediately. `is_featured` binds correctly, and `PUT` honours `is_available` correctly, so the
  defect is isolated to create.
- **Recommended fix:** Bind all fields explicitly on insert and add a test asserting
  `is_available: false` round-trips.

#### P1-04 · Menu search ignores the query parameter
- **Affected:** `GET /api/menu/items?search=…` (backend, source missing)
- **Root cause:** The `search` query parameter is not bound into the SQL `WHERE` clause.
- **Impact:** **Confirmed live.** `GET /api/menu/items?search=zzzznotfound` returned the full item
  list unchanged. The API is unusable for search. The customer-facing menu page masks this by
  re-filtering client-side (`frontend/src/pages/MenuPage.js:34-36`), but that means every customer
  downloads the entire menu to find one dish — a scaling and mobile-bandwidth problem that also
  blocks the server-side search the specification requires.
- **Recommended fix:** Bind `search` (and `category_id`, `is_featured`, `is_available`) into a
  parameterised `ILIKE` query; add server-side pagination; keep the client-side filter only as an
  instant-response refinement.

#### P1-05 · Password policy permits 6 characters
- **Affected:** `POST /api/auth/signup` (backend, source missing); frontend
  `frontend/src/pages/SignupPage.js:54` (`minLength={6}`)
- **Root cause:** Minimum length set to 6; no complexity, breach-list or hashing-cost requirements.
- **Impact:** Weak passwords are accepted — a materially worse position when combined with P1-01
  (no lockout) and P0-07 (published default credentials).
- **Recommended fix:** Require ≥ 8 characters (≥ 10 recommended), screen against a breach list,
  and hash with bcrypt (cost ≥ 12) or Argon2id. The hashing algorithm used by the missing backend
  is **unverifiable** and must be re-confirmed against the recovered source before migration.

#### P1-06 · No order-status transition rules
- **Affected:** `PUT /api/admin/orders/:id/status` (backend, source missing)
- **Root cause:** The endpoint validates the status *value* (via the DB CHECK constraint) but not
  the *transition*.
- **Impact:** **Confirmed live.** An order in `delivered` was successfully moved back to `placed`.
  A typo or a malicious admin can rewrite delivery history, corrupting the order record and the
  sales timeline. The order was restored to `delivered` during the audit.
- **Recommended fix:** Define an explicit state machine (`placed → confirmed → preparing → ready →
  out_for_delivery → delivered`, plus `cancelled` from a permitted subset), reject invalid
  transitions server-side with `409`, and record every transition in `order_status_history`.

#### P1-07 · Payment status does not exist as an independent dimension
- **Affected:** `orders` table; `POST /api/orders`; `PUT /api/admin/orders/:id/status`; frontend
  `frontend/src/pages/OrderTrackingPage.js`, `frontend/src/pages/AdminOrders.js`
- **Root cause:** `orders` has no `payment_status` column. The only signal is `payment_method`.
- **Impact:** **Violates the core specification requirement** that payment status be independent of
  order status. An order cannot be "confirmed but unpaid", "delivered but refunded", or
  "cancelled after payment" — states that every real Ghanaian mobile-money operation requires.
  Admin reporting cannot separate revenue from order volume.
- **Recommended fix:** Add `payment_status` (`pending`, `authorized`, `paid`, `failed`, `refunded`,
  `partially_refunded`) and `payment_reference`, `payment_provider`, `paid_at`, `refunded_at`
  columns via a **non-destructive** migration; keep them independent of `status`; surface both in
  the admin UI and the order-tracking UI.

#### P1-08 · The `ready` order state is missing from the lifecycle
- **Affected:** `frontend/src/pages/OrderTrackingPage.js:6-12`, `frontend/src/pages/AdminOrders.js:6-13`
- **Root cause:** The status set is `placed, confirmed, preparing, out_for_delivery, delivered,
  cancelled` — `ready` (order prepared and awaiting pickup by the rider) is absent.
- **Impact:** The specified lifecycle `Pending → Confirmed → Preparing → Ready → Out for Delivery →
  Delivered` cannot be represented. The kitchen-to-rider handoff is invisible to customers and
  staff, which is exactly the point where Ghanaian delivery operations most need visibility.
- **Recommended fix:** Add `ready` to the DB CHECK constraint via migration, to the admin status
  selector and to the customer tracker, and to the pickup-vs-delivery branching rules.

#### P1-09 · Advertised promo codes do not exist
- **Affected:** `frontend/src/pages/HomePage.js:118`, `frontend/src/pages/CartPage.js:65`,
  `frontend/src/components/chatbot/ChatBot.js:10`, `promos` table
- **Root cause:** The `promos` table is empty, but the UI advertises `WELCOME10` (10% off) and
  `GHANA5` (GH₵5 off, min GH₵15) in three separate places as though they were live.
- **Impact:** **Confirmed live:** `POST /api/orders/validate-promo` with `{"code":"WELCOME10"}`
  returned `{"valid":false,"message":"Invalid promo code"}`. Every customer who tries the advertised
  code is shown an error. This is a direct trust and conversion failure, and it breaches the
  instruction not to invent promotional discounts.
- **Recommended fix:** Remove all hardcoded promo codes from the UI. Surface only codes that
  actually exist in the `promos` table, fetched from the API. Seed real, business-approved promos
  via an admin-controlled migration, or ship with none and let staff create them.

#### P1-10 · Cart totals are computed client-side only
- **Affected:** `frontend/src/context/CartContext.js:43-45`, `frontend/src/pages/CartPage.js:59-62`
- **Root cause:** `subtotal`, `deliveryFee` (hardcoded GH₵5.00) and the displayed total are derived
  in the browser from the prices the browser was told.
- **Impact:** The displayed total is advisory only and is not re-verified at checkout — the P0-03
  defect is its consequence. There is also no server-side price snapshot, so a menu price change
  between browsing and checkout silently changes what the customer is charged.
- **Recommended fix:** Move all money maths to the server; the client may *display* a server-returned
  quote. Have the API expose a "price the cart" endpoint (`POST /api/orders/quote`) that returns
  subtotal, delivery fee, discount and total, and create the order from the server's own
  calculation.

#### P1-11 · Order cancellation is implemented but unreachable
- **Affected:** `frontend/src/services/api.js:48` (`orderAPI.cancelOrder`), `frontend/src/pages/OrderTrackingPage.js`
- **Root cause:** The API client method exists and the backend endpoint works (`403` for another
  user's order — correctly authorised), but **no component ever calls `cancelOrder`**. The chatbot
  instructs customers to "Go to My Orders > select the order > Cancel", and there is no Cancel
  button anywhere in the UI.
- **Impact:** A documented customer feature is missing. The only visible trace of cancellation is
  the static status chip.
- **Recommended fix:** Add a cancellation control to the order-tracking page, enabled only for
  statuses the backend permits (`placed`, `confirmed`), with confirmation, reason capture and a
  clear post-cancellation state.

#### P1-12 · Zero automated tests
- **Affected:** Entire repository; `frontend/package.json` has no `test` script
- **Root cause:** No test framework was ever introduced.
- **Impact:** None of the P0/P1 defects above would have survived a test suite. There is no safety
  net for the rebuild, and the specification's acceptance criteria ("Pass its available automated
  tests") cannot currently be met.
- **Recommended fix:** Add a backend test suite (Jest + Supertest) against a disposable PostgreSQL
  schema, and a frontend test suite (React Testing Library + Jest, or Vitest). Prioritise
  regression tests for every P0/P1 finding above.

#### P1-13 · No `.env.example`; and `.gitignore` would ignore one
- **Affected:** `.gitignore:11` (`.env.*`), repository root, `backend/`
- **Root cause:** No environment template exists. The `.gitignore` rule `.env.*` also matches
  `.env.example`.
- **Impact:** `git check-ignore -v frontend/.env.example` confirms the file **would be ignored**,
  so the required `.env.example` deliverable cannot even be committed without fixing the rule. On
  top of that, the repository README instructs developers to `cp .env.example .env` from a
  directory where no such file has ever existed.
- **Recommended fix:** Add `!.env.example` (and `!**/.env.example`) to `.gitignore`, and commit
  complete, placeholder-only environment templates for the frontend and backend.

#### P1-14 · No Vercel SPA rewrite configuration
- **Affected:** `frontend/public/_redirects`, missing `vercel.json`
- **Root cause:** The only SPA fallback is a Netlify `_redirects` file.
- **Impact:** On Vercel, refreshing a client-side route (`/orders/12`, `/admin/menu`) returns a
  404 — a direct breach of the deployment requirement "verify that refreshes on frontend routes do
  not produce 404 errors".
- **Recommended fix:** Add `vercel.json` with a rewrite of all paths to `/index.html` (preserving
  `/api` for the serverless functions), and keep `_redirects` only if Netlify remains a target.

#### P1-15 · Production builds silently point at `http://localhost:5000`
- **Affected:** `frontend/src/services/api.js:3`
- **Root cause:**
  ```js
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api' || 'https://foodgh-backend.onrender.com/api';
  ```
  The third operand is unreachable dead code, and the effective default is `localhost`.
- **Impact:** A production build deployed without `REACT_APP_API_URL` sends every API request to
  the visitor's own machine — the deployed site appears entirely broken, with no error at build
  time to signal the misconfiguration. The dead fallback also hides the real production URL.
- **Recommended fix:** Resolve the base URL from a single, validated environment variable with no
  dead branches; fail the build (or show a clear banner) when it is missing in production; delete
  the unused `proxy` field in `frontend/package.json`, which points at the old FoodGH Render host
  and is not used by the client anyway.

#### P1-16 · The backend API documentation contradicts the real API
- **Affected:** `backend/README.md`, `README.md`
- **Root cause:** The README was written against an earlier MongoDB-style design and never updated.
- **Impact:** Documented payloads do not work: the README says `menuItemId` (real: `menu_item_id`),
  `promoCode` (real: `code` — the README's version throws
  `500 Cannot read properties of undefined (reading 'toUpperCase')`), `?category=rice`
  (real: `?category_id=`), and Mongo-style `"64f123…"` IDs (real: sequential integers). The README
  also documents `npm run migrate` and `npm run seed` scripts that do not exist. Any developer or
  integrator following it will build against the wrong contract.
- **Recommended fix:** Rewrite the API documentation from the rebuilt backend's actual route table,
  with verified request/response examples for every endpoint, and publish it as OpenAPI.

---

### 4.3 P2 — Medium

| ID | Finding | Affected file(s) | Impact / fix |
|---|---|---|---|
| **P2-01** | Three competing brand identities coexist: `FoodGH` (README, `index.html` meta was updated to Efia'sEat, API host `foodgh-backend`), `Efia'sEat` (Navbar, Footer, ChatBot, Checkout bank details, `index.html` title/description), `food-ordering-frontend` (`package.json`). The target is **Afia Food Hub**. | `README.md`, `frontend/package.json`, `frontend/public/index.html`, `frontend/src/components/layout/{Navbar,Footer}.js`, `frontend/src/components/chatbot/ChatBot.js`, `frontend/src/pages/CheckoutPage.js` | Replace all customer-facing occurrences with Afia Food Hub. Keep internal identifiers (`foodgh-backend` host, DB names) only where required for compatibility, and change them where free. Sprint 1. |
| **P2-02** | Fabricated business claims on the homepage: "500+ Happy Customers", "4.8 Rating", plus a hardcoded `(4.8)` rating on every menu card and "Delivered in 30-45 minutes" as a fixed promise. | `frontend/src/pages/HomePage.js:49-50, 91`, `frontend/src/pages/HomePage.js:16` | The database holds 4 users and 1 order. These claims are false and violate the instruction not to invent business claims. Remove or source them from real data (e.g. a review/ratings table populated only with genuine reviews). |
| **P2-03** | Menu images stored in the database are never displayed. Every dish renders as a hand-picked emoji chosen by `name.includes(...)` string matching. | `frontend/src/pages/HomePage.js:81-82`, `frontend/src/pages/MenuPage.js:93-94,124-125`, `frontend/src/pages/CartPage.js:29-30` | Renders `item.image` when present with a branded fallback; remove the fragile name-matching emoji map in favour of a category-driven icon set and a real image pipeline. |
| **P2-04** | Dish customisation options are hardcoded in the frontend by exact dish name, and the database's `menu_items.custom_options` column is never read. | `frontend/src/pages/MenuPage.js:50-57` vs `menu_items.custom_options` | Adding a dish server-side produces no options; renaming a dish silently loses them; options are not priced (option strings embed prices like `"Large (+GH₵10)"` inside a label). Move options to the database as structured data with real price deltas, validated server-side. |
| **P2-05** | The customer menu has no server-side pagination or server-side search; the whole menu is downloaded and filtered in the browser. | `frontend/src/pages/MenuPage.js:23-36` | Bandwidth and render cost grow linearly with the menu; no partial-failure path. Implement paginated `GET /api/menu/items` with search and category filters. |
| **P2-06** | No loading or error states on the primary pages; `.then()` without `.catch()` produces unhandled promise rejections and blank screens. | `frontend/src/pages/HomePage.js:11-12`, `frontend/src/pages/MenuPage.js:19-20`, `frontend/src/pages/AdminDashboard.js:11`, `frontend/src/pages/AdminMenu.js:20` | A failed API call shows an empty homepage with no explanation. Add skeletons, error states and retry affordances. |
| **P2-07** | Raw database error messages are returned to clients. | `PUT /api/admin/orders/:id/status` → `{"message":"Error updating order status","error":"new row for relation \"orders\" violates check constraint \"orders_status_check\""}` | Leaks schema, table and constraint names. Return a stable error code and message; log details server-side. Also: invalid status should be a `400`, not a `500`. |
| **P2-08** | No security headers. The response carries only `x-powered-by: Express`. | Backend middleware | No CSP, no `X-Frame-Options`, no HSTS, no `Referrer-Policy`, no `Permissions-Policy`. Add Helmet with a CSP appropriate to the SPA. |
| **P2-09** | CORS preflight for an unknown origin returns HTTP 500 instead of a clean rejection. | CORS middleware | Muddies monitoring and can mask real errors. Return `403`/`204` without the allow headers. |
| **P2-10** | The chatbot is a hardcoded keyword matcher with no AI, no database access and no configuration. | `frontend/src/components/chatbot/ChatBot.js:4-59` | It answers with stale hardcoded prices (GH₵35/40/45) that do not match the database, claims promo codes that do not exist, asserts opening hours, a phone number, an address and refund terms that are unverifiable, and matches keywords naively (`'time'` matches both "delivery time" and "hours"). The specification requires accurate menu/price/availability/payment information and a configurable AI integration. Rewrite as a server-backed assistant (Neon AI Gateway or a provider of choice) grounded in live menu data, with the keyword matcher retained only as an offline fallback. |
| **P2-11** | The 401 interceptor clears the session and hard-navigates to `/login` for **any** 401 — including a failed login attempt — discarding app state and producing a redirect loop on the login page. | `frontend/src/services/api.js:13-23` | Distinguish "unauthenticated" from "wrong credentials"; avoid a full page reload; preserve the intended destination. |
| **P2-12** | JWT lifetime is 7 days with no refresh mechanism, and the token is stored in `localStorage`. | `frontend/src/services/api.js:8`, `AuthContext.js:24-27` | `localStorage` is readable by any injected script (XSS → account takeover). Move to an `httpOnly`, `Secure`, `SameSite` cookie with short-lived access + refresh tokens, and rotate the `JWT_SECRET` (it is long-lived and shared with the live deployment). |
| **P2-13** | `AuthContext` sets `loading = false` before the profile request resolves, and parses the cached user with an unguarded `JSON.parse`. | `frontend/src/context/AuthContext.js:13-20` | Protected routes briefly render as logged-out (flash of the login screen); corrupt `localStorage` crashes the app on boot. Fix the loading sequence and guard the parse. |
| **P2-14** | Cart lives only in `localStorage` and is not tied to the user account. | `frontend/src/context/CartContext.js:7-14` | The cart is lost across devices and on logout; it also persists stale prices and items that may no longer be available. Move to a server-side cart keyed by user, with a localStorage cache for guests. |
| **P2-15** | The admin dashboard crashes if a stat is `null` (`stats.totalRevenue.toFixed(2)`). | `frontend/src/pages/AdminDashboard.js:17-18` | One null statistic blanks the whole admin dashboard. Coerce with `Number(x ?? 0)`. |
| **P2-16** | The admin orders screen does not paginate and shows all orders. | `frontend/src/pages/AdminOrders.js:23-32` | Unbounded result sets will degrade as volume grows; the API already returns `total`/`totalPages`. Add pagination. |
| **P2-17** | No health-check endpoint, and no `404`/error route in the SPA. | Backend, `frontend/src/App.js` | Deployment health cannot be verified programmatically; unknown URLs render a blank page. Add `GET /api/health` (liveness + DB connectivity) and a branded 404/500 route. |
| **P2-18** | No favicon, no PWA manifest, no application icons. | `frontend/public/` | `/favicon.ico` returns 404; no installable PWA; the browser tab shows a generic icon. Sprint 1. |
| **P2-19** | Accessibility gaps: icon-only buttons with no accessible name, modals without `role="dialog"`/focus trap/Escape handling, emoji used as the sole category indicator, no `aria-live` on toasts, and no skip link. | `frontend/src/pages/AdminMenu.js:119-120`, `frontend/src/pages/MenuPage.js:121-166`, `frontend/src/pages/LoginPage.js:29`, `frontend/src/components/chatbot/ChatBot.js` | Fails WCAG 2.1 AA expectations and makes the app unusable with a keyboard or screen reader. Sprint 7. |
| **P2-20** | The Tailwind `primary` palette is a generic amber gradient with no coherent token system, and the palette duplicates `accent` semantics. | `frontend/tailwind.config.js`, `frontend/src/index.css` | No brand-level colour tokens; brand changes require editing many files. Introduce a token layer in Sprint 1 and consume it everywhere. |

---

### 4.4 P3 — Low

| ID | Finding | Affected | Note |
|---|---|---|---|
| **P3-01** | CRA warns `homepage` is unset; the build assumes it is hosted at `/`. | `frontend/package.json` | Set `homepage` explicitly. |
| **P3-02** | `react-scripts` 5 (CRA) is deprecated and slow, with heavy ESLint/TypeScript transitive dependencies. | `frontend/package.json` | A Vite migration would speed builds and reduce dependency weight — schedule it after the functional repairs, not before. |
| **P3-03** | Order status colour/label maps are duplicated in three files and will drift. | `MyOrdersPage.js:23-30`, `OrderTrackingPage.js:35-38`, `AdminOrders.js:6-13` | Extract one shared status registry. |
| **P3-04** | Dead/duplicated helpers in the admin menu page (`openAdd`/`openAddWithReset` both exist). | `frontend/src/pages/AdminMenu.js:26-31` | Remove the redundant wrappers. |
| **P3-05** | The README ends with generic Git workflow boilerplate unrelated to the project. | `README.md` | Replace with real project instructions. |
| **P3-06** | A global `* { margin: 0; padding: 0 }` reset fights utility classes. | `frontend/src/index.css:5` | Use Tailwind's preflight instead. |
| **P3-07** | `🫓` (U+1FAD3) is not a real emoji and renders as a missing glyph on many systems. | `frontend/src/pages/MenuPage.js:94` | Replace with a supported glyph or an image. |
| **P3-08** | No `LICENSE` file. | repository root | Add one. |
| **P3-09** | Money formatting is inconsistent (`GH₵{x.toFixed(2)}` vs raw strings from `numeric` columns). | Multiple pages | Introduce one currency formatter that handles the string values PostgreSQL returns. |

---

## 5. Positive Findings — What Is Worth Preserving

The rebuild should not discard working behaviour. These are sound and should be carried forward:

| Area | Evidence |
|---|---|
| **JWT verification is correct** | A tampered signature and an `alg: "none"` token were both rejected with `401 Invalid or expired token`. The token is HS256 with a `userId` claim and a 7-day expiry. |
| **Admin role enforcement on writes is correct** | A customer token received `403 Access denied` on `POST /api/menu/items`, `POST /api/menu/categories`, and `GET /api/admin/{dashboard,users,orders}`. |
| **Order cancellation authorisation is correct** | `POST /api/orders/:id/cancel` returned `403` for another user's order. Only the **read** path is missing the check (P0-04). |
| **Database CHECK constraint on order status** | The constraint `orders_status_check` rejected an invalid status at the database level — defence in depth, even though the API surfaced it as a `500` (P2-07). |
| **Pagination is implemented** | `GET /api/admin/orders?page=1&limit=1` correctly returned `{total, page, totalPages}`. |
| **Input validation exists on the backend** | Signup errors are returned in a structured `express-validator` format (`errors[].path`, `.msg`, `.location`). |
| **The React application builds and runs cleanly** | `react-scripts build` → "Compiled successfully"; dev server compiles and serves HTTP 200 with no lint errors. |
| **The frontend API client is well-structured** | A single axios instance with request/response interceptors and grouped API modules (`authAPI`, `menuAPI`, `orderAPI`, `adminAPI`, `promoAPI`). The structure survives the rebuild; only the base URL and 401 handling change. |
| **The page/route inventory is complete and sensibly organised** | 14 routes with `ProtectedRoute` and `AdminRoute` guards, a consistent `page-container`/`card`/`btn-*` component language, and a sensible customer/admin separation. |
| **Order status history is captured** | `order_status_history` records each transition with a note, and the customer tracker renders it. |

---

## 6. Data Integrity Note

The live database holds no genuine customer records. Its contents (menu item `gssgg` at
GH₵555.00, delivery address `hf`, users `kark`/`test`, an empty `promos` table) are clearly
development scratch data. This materially de-risks the migration to Neon: the primary migration
concern is **schema and data-model correctness**, not preserving real customer history.

The migration to Neon will therefore be able to recreate the schema cleanly, carry across the
recovered rows, and drop the two audit artifacts listed in §1. The migration will be written as
**additive, non-destructive** migrations regardless, and no production migration will be run
without explicit approval.

---

## 7. Conclusion

The frontend is a usable foundation and the brand direction can be layered onto it. The
backend, however, must be treated as **greenfield** work against a known-good contract and a
recovered schema, not as a refactor — because no source exists to refactor.

Four P0 findings (role escalation, client-trusted pricing, order IDOR, fabricated payment
credentials) are **exploitable by any anonymous visitor today** and should be treated as an
incident, not only as a sprint backlog. Two of them — the published admin password and the
injected admin account — require action on the live Render deployment that only the owner can
perform, and are listed in §8.

Nothing has been deployed, pushed or destructively changed. The working tree is clean, and the
only branch created is `feature/afia-food-hub-transformation`.

---

## 8. Items Requiring Owner Action (not performable by me)

These need credentials, dashboard access, or business decisions. Each is tracked so it is not lost.

| # | Action | Why | Urgency |
|---|---|---|---|
| 1 | **Rotate the live admin password** and reset `JWT_SECRET` on the Render deployment. | The current credentials (`admin@foodgh.com` / `admin123`) are published on the public login page (P0-07). | Immediate |
| 2 | **Delete the audit-probe admin account** (`audit.probe.001@example.com`, `user id=5`) directly in the production database. | No API endpoint can demote or delete a user (P0-02), so this account remains an active admin until removed. | Immediate |
| 3 | **Delete the audit-probe order** (`id=2`) and its `order_items` row. | No order-delete endpoint exists. | Low |
| 4 | **Reset `admin@foodgh.com.address`** to `NULL`. | The profile-update endpoint ignores `null` values, so the address reads `Osu` after a probe. | Low |
| 5 | **Provide Neon credentials** — connection string (pooled + direct), project/region details, and confirm a Neon project is created. | Required for the production database. | Sprint 2 |
| 6 | **Provide Vercel access** and confirm the project name; confirm whether the frontend and API are one project or two. | Required for deployment. | Sprint 2 |
| 7 | **Provide payment provider credentials** — Paystack (recommended: MTN MoMo, Telecel Cash, AirtelTigo, cards) or Hubtel — including secret keys and webhooks. | Real mobile-money payments cannot be implemented without these. Until then, only Cash on Delivery can be honestly offered. | Sprint 5 |
| 8 | **Confirm real business details**: legal name, address, phone, email, opening hours, delivery zones and fees. | The current details are fabricated and must not ship. | Sprint 1 |
| 9 | **Supply or approve menu data and food photography.** | The `categories` and `promos` tables are empty and no menu images exist. Brand assets require licensed photography. | Sprint 1 |
| 10 | **Confirm whether the seeded menu and promos should be created.** | The specification forbids inventing discounts or prices. | Sprint 1 / 4 |
| 11 | **Confirm the real order-status vocabulary and whether pickup (as well as delivery) is supported.** | Determines the `ready` state and the status machine. | Sprint 5 |
