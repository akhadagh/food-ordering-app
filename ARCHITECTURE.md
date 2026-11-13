# Afia Food Hub — Architecture

**Status:** Sprint 0 — documents the system **as found** and the **target** architecture.
**Last updated:** 2026-11-11

---

## 1. System Context — As Found

Afia Food Hub (formerly FoodGH / Efia'sEat) is a two-tier food-ordering and delivery platform
targeting the Ghanaian market: customers browse a menu of local dishes, customise them, check out
via mobile money or cash, track delivery, and administrators manage the menu, orders, promos and
sales reporting.

```
                    ┌──────────────────────┐
                    │   Browser / Mobile   │
                    └──────────┬───────────┘
                               │ HTTPS
                               │ XHR (axios, Bearer JWT)
                               ▼
        ┌──────────────────────────────────────────────┐
        │   React 18 SPA  (Vercel, static assets)      │
        │   React Router 6 · Tailwind 3 · Recharts     │
        └──��───────────────────────────────────────────┘
                               │  /api/*  (JSON over HTTPS)
                               ▼
        ┌──────────────────────────────────────────────┐
        │   Express API  (Render, Node)                 │
        │   SOURCE CODE NOT IN REPOSITORY              │
        │   node-postgres · express-validator · JWT     │
        │   multer · cors                              │
        └───────────────────┬──────────────────────────┘
                            │ SQL (node-postgres, raw)
                            ▼
        ┌──────────────────────────────────────────────┐
        │   PostgreSQL  (Render-managed)                │
        │   users · categories · menu_items             │
        │   orders · order_items · order_status_history │
        │   promos                                     │
        └──────────────────────────────────────────────┘
```

**Critical structural fact.** The Express API above is running in production but its source code
has never existed in this repository. `backend/` contains only `backend/README.md`. This is
recorded as finding **P0-01** in `AUDIT_REPORT.md`.

---

## 2. Repository Layout — As Found

```
food-ordering-app/
├── .gitignore                     # .gitignore rule `.env.*` also matches `.env.example`
├── README.md                      # Documents a backend that does not exist in the repo
├── AUDIT_REPORT.md                # Sprint 0 output
├── REPAIR_PLAN.md                 # Sprint 0 output
├── REPAIR_LOG.md                  # Sprint 0 output
├── TEST_REPORT.md                 # Sprint 0 output
├── ARCHITECTURE.md                # This file
├── BRAND_GUIDELINES.md            # Sprint 0 output
├── DEPLOYMENT.md                  # Sprint 0 output
├── .env.example                   # Sprint 0 output (placeholder values only)
├── backend/
│   └── README.md                  # API documentation — contradicts the live API
└── frontend/
    ├── package.json               # CRA 5 · no test script · unused "proxy" field
    ├── package-lock.json
    ├── postcss.config.js
    ├── tailwind.config.js         # primary/accent/ghana palettes, Inter font
    ├── public/
    │   ├── index.html             # title "Efia'sEat" · no favicon · no manifest · no OG tags
    │   └── _redirects             # Netlify SPA rewrite only
    └── src/
        ├── index.js               # React 18 root, StrictMode
        ├── index.css              # Tailwind layers + 5 component classes
        ├── App.js                 # Router, 14 routes, ProtectedRoute / AdminRoute
        ├── components/
        │   ├── chatbot/ChatBot.js
        │   └── layout/{Navbar.js, Footer.js}
        ├── context/
        │   ├── AuthContext.js     # localStorage token + cached user
        │   └── CartContext.js     # localStorage cart
        ├── pages/                 # 14 pages (Home, Menu, Cart, Checkout, MyOrders,
        │                          #  OrderTracking, Login, Signup, Profile,
        │                          #  AdminDashboard, AdminOrders, AdminMenu,
        │                          #  AdminSales, AdminPromos)
        └── services/api.js        # axios instance + 5 API groups
```

---

## 3. Frontend Architecture — As Found

### 3.1 Routing

`frontend/src/App.js` defines 14 routes under a `BrowserRouter`.

| Route | Component | Guard |
|---|---|---|
| `/` | HomePage | public |
| `/menu` | MenuPage | public |
| `/cart` | CartPage | public |
| `/login` | LoginPage | public |
| `/signup` | SignupPage | public |
| `/checkout` | CheckoutPage | `ProtectedRoute` |
| `/orders` | MyOrdersPage | `ProtectedRoute` |
| `/orders/:id` | OrderTrackingPage | `ProtectedRoute` |
| `/profile` | ProfilePage | `ProtectedRoute` |
| `/admin` | AdminDashboard | `AdminRoute` |
| `/admin/orders` | AdminOrders | `AdminRoute` |
| `/admin/menu` | AdminMenu | `AdminRoute` |
| `/admin/sales` | AdminSales | `AdminRoute` |
| `/admin/promos` | AdminPromos | `AdminRoute` |

Guard semantics (`App.js:24-34`): `ProtectedRoute` redirects anonymous visitors to `/login`;
`AdminRoute` redirects non-admins to `/`. **Both are client-side only** — the real authorisation
boundary is the API's middleware, which was verified to correctly return `403` for admin routes
and `403` for cross-user order cancellation. The one confirmed gap is `GET /api/orders/:id`
(P0-04).

**Gap:** there is no catch-all 404 route, so any unknown path renders an empty shell.

### 3.2 State management

| State | Mechanism | Persistence | Notes |
|---|---|---|---|
| Authentication | `AuthContext` | `localStorage.token` + `localStorage.user` | 7-day JWT, no refresh. Loading flag is cleared before the profile request resolves (P2-13). |
| Cart | `CartContext` | `localStorage.cart` | Client-only. Money maths computed in the browser (P1-10). |
| Server data | None — no React Query / SWR / RTK Query | — | Every page hand-rolls `useEffect` + `useState` + `fetch`, mostly without `.catch()`. |
| Toasts | `react-hot-toast` | — | Global `<Toaster>`. |

**Assessment.** There is no server-state layer, so there is no cache, no request deduplication, no
automatic retry, and no shared loading/error state. Adding React Query in Sprint 7 would remove a
large amount of duplicated `useEffect` code and fix the blank-screen failure mode (P2-06).

### 3.3 API client

`frontend/src/services/api.js` — a single axios instance with a request interceptor that attaches
`Bearer <token>` from `localStorage`, and a response interceptor that clears the session and
hard-navigates to `/login` on any `401`.

```js
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api' || 'https://foodgh-backend.onrender.com/api';
```

The third operand is unreachable (P1-15). The effective default points production builds at
`localhost`.

Five API groups mirror the backend route table: `authAPI`, `menuAPI`, `orderAPI`, `adminAPI`,
`promoAPI`. `menuAPI.createItem/updateItem` accept an optional axios config for multipart uploads.

### 3.4 Design system (as found)

Tailwind 3 with two custom palettes plus the Ghana flag colours:

| Token family | Values | Role |
|---|---|---|
| `primary` | 50–900, base `#d97706` (amber) | Buttons, links, accents |
| `accent` | 50–900, base `#ef4444` (red) | Destructive actions |
| `ghana` | `gold #FCD116`, `green #006B3F`, `red #CE1126` | Unused except as chart colours in `AdminSales.js` |

Five component classes in `index.css`: `.btn-primary`, `.btn-secondary`, `.btn-danger`,
`.input-field`, `.card`, plus the `.page-container` layout wrapper. Typography is Inter
(Google Fonts, weights 300–800).

**Assessment.** The visual language is consistent and clean, which is worth keeping. What is
missing is a *brand* layer: no logo, no favicon, no real imagery, and a palette that is generic
amber rather than a deliberate identity. That is Sprint 1's job.

---

## 4. Backend Architecture — As Found (reconstructed)

Reconstructed by probing the live deployment. **The source is not in the repository.**

### 4.1 Inferred stack

| Layer | Technology | Confidence |
|---|---|---|
| Runtime | Node.js + Express | Confirmed (`x-powered-by: Express`) |
| Database access | `node-postgres`, raw SQL | Confirmed (snake_case columns, `numeric` as string, DB-level CHECK constraint error text) |
| Validation | `express-validator` | Confirmed (structured `errors[].path/.msg/.location` responses) |
| Auth | `jsonwebtoken`, HS256 | Confirmed (token payload `{userId, iat, exp}`; tampered and `alg:none` tokens both rejected) |
| File upload | `multer` | Confirmed (multipart route exists but is broken — P1-02) |
| CORS | `cors` | Confirmed (allowlist behaviour and `Vary: Origin, Access-Control-Request-Headers` headers) |
| Hosting | Render (free tier) + Render-managed PostgreSQL | Confirmed (`x-render-origin-server: Render`) |

### 4.2 Recovered schema

```sql
users(
  id serial PK, name text, email text, phone text, address text,
  role text, password text,             -- hashed; column name unverified
  created_at timestamptz, updated_at timestamptz
)

categories(
  id serial PK, name text, description text,
  created_at timestamptz, updated_at timestamptz   -- inferred, unverified
)

menu_items(
  id serial PK, category_id int FK→categories(id),
  name text NOT NULL, description text, price numeric(10,2) NOT NULL,
  image text, is_available boolean DEFAULT true, is_featured boolean DEFAULT false,
  custom_options jsonb DEFAULT '[]',
  created_at timestamptz, updated_at timestamptz
)

orders(
  id serial PK, user_id int FK→users(id),
  status text CHECK (orders_status_check),
  subtotal numeric(10,2), delivery_fee numeric(10,2), discount numeric(10,2), total numeric(10,2),
  promo_code_id int FK→promos(id),
  delivery_address text, delivery_notes text, payment_method text,
  estimated_delivery timestamptz,
  created_at timestamptz, updated_at timestamptz
  -- NOTE: no payment_status column  (P1-07)
)

order_items(
  id serial PK, order_id int FK→orders(id) ON DELETE CASCADE, menu_item_id int FK→menu_items(id),
  name text, quantity int, price numeric(10,2),
  custom_options jsonb DEFAULT '[]', special_instructions text,
  created_at timestamptz
)

order_status_history(
  id serial PK, order_id int FK→orders(id) ON DELETE CASCADE,
  status text, note text, created_at timestamptz
)

promos(
  id serial PK, code text, discount_type text, discount_value numeric,
  min_order numeric, max_uses int, used_count int DEFAULT 0,
  is_active boolean DEFAULT true, expires_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)
```

Money is `numeric` and is therefore returned to the client as a **string** (`"555.00"`), which is
why the frontend calls `parseFloat()` on nearly every monetary field.

### 4.3 Route table — recovered and verified

| Method | Path | Auth | Verified behaviour |
|---|---|---|---|
| POST | `/api/auth/signup` | public | `201`; accepts `role` from body → **P0-02** |
| POST | `/api/auth/login` | public | `200` + `{user, token}`; no rate limiting → **P1-01** |
| GET | `/api/auth/profile` | bearer | `200` |
| PUT | `/api/auth/profile` | bearer | Updates name/phone/address; ignores `null`; cannot change role or password |
| GET | `/api/menu/categories` | public | `200 []` (table empty) |
| GET | `/api/menu/items` | public | `200`; `category_id` and `is_featured` filter correctly; **`search` ignored** → P1-04 |
| GET | `/api/menu/items/:id` | public | `200` / `404 {"message":"Menu item not found"}` |
| POST | `/api/menu/items` | admin | `201`; **multipart broken** (P1-02); **`is_available` ignored** (P1-03) |
| PUT | `/api/menu/items/:id` | admin | `200`; honours `is_available`; multipart broken |
| DELETE | `/api/menu/items/:id` | admin | `200` (verified — used to clean up probe items) |
| POST/PUT/DELETE | `/api/menu/categories[/:id]` | admin | CRUD; `403` for customers |
| POST | `/api/orders` | bearer | `201`; **trusts client prices/names** → P0-03 |
| GET | `/api/orders/my-orders` | bearer | `200 {orders,total,page,totalPages}` |
| GET | `/api/orders/:id` | bearer | **No ownership check** → P0-04 |
| POST | `/api/orders/:id/cancel` | bearer | `403` for another user's order (correctly authorised) |
| POST | `/api/orders/validate-promo` | bearer | Expects `{code}`; `{promoCode}` → `500`; WELCOME10 invalid → P1-09 |
| GET | `/api/admin/dashboard` | admin | `200` aggregate stats (revenue is attacker-influenced via P0-03) |
| GET | `/api/admin/orders` | admin | `200 {orders,total,page,totalPages}`; `?status=` filter |
| PUT | `/api/admin/orders/:id/status` | admin | DB CHECK rejects bad values (as `500`); **no transition rules** → P1-06 |
| GET | `/api/admin/sales` | admin | `200 {salesStats,popularItems,paymentBreakdown}` |
| GET | `/api/admin/sales/export` | admin | `200` CSV (revenue is attacker-influenced via P0-03) |
| GET | `/api/admin/users` | admin | `200` (no password field leaked) |
| GET | `/api/promos` | admin | `200 []` (empty table) |
| POST/PUT/DELETE | `/api/promos[/:id]` | admin | CRUD |
| GET | `/api/health` | — | **Does not exist** → P2-17 |

### 4.4 Order status vocabulary

Observed values (lowercase, snake_case): `placed`, `confirmed`, `preparing`, `out_for_delivery`,
`delivered`, `cancelled`. A DB CHECK constraint (`orders_status_check`) enforces membership.

**Missing:** `ready` (P1-08) and any payment dimension (P1-07).

---

## 5. Target Architecture — Neon + Vercel

This is the architecture the transformation converges on. It is designed to preserve every
working behaviour recorded in §5 of `AUDIT_REPORT.md` while resolving the P0/P1 findings.

### 5.1 Deployment topology

```
                          ┌────────────────────────────────────────┐
   Browser ─── HTTPS ───► │  Vercel — Project: afia-food-hub        │
                          │                                         │
                          │  ┌───────────────────────────────────┐  │
                          │  │ /api/*  →  Node serverless fns    │  │
                          │  │          (api/index.js)           │  │
                          │  │          Express app, no listen() │  │
                          │  └───────────────────────────────────┘  │
                          │  ┌───────────────────────────────────┐  │
                          │  │ /*      →  static SPA build       │  │
                          │  │          (frontend/build)        │  │
                          │  └───────────────────────────────────┘  │
                          └────────────────────┬───────────────────┘
                                               │ serverless driver
                                               │ (pooled, ≤10 conns)
                                               ▼
                          ┌────────────────────────────────────────┐
                          │  Neon — PostgreSQL (Lakebase)           │
                          │  pooled connection string for the API  │
                          │  direct connection string for migrations│
                          └────────────────────────────────────────┘
```

**One Vercel project** hosts both the static SPA and the API functions, so there is no
cross-origin request in production and CORS becomes a defence-in-depth control rather than a
functional requirement. (Splitting into two projects is supported by the same code via
`FRONTEND_URL`; `DEPLOYMENT.md` covers both.)

### 5.2 Backend: adapting Express for Vercel

The existing Express application is *almost* serverless-compatible. Three adaptations are needed:

1. **Entry point.** Export the app instead of calling `app.listen()`:
   ```js
   // api/index.js  (repository root — Vercel builds every file in the root api/ directory)
   import { createApp } from '../backend/src/app.js';
   const app = createApp({ restoreApiPrefix: true });
   export default app;
   ```
   Vercel invokes the exported handler for every request under `/api`.
   `restoreApiPrefix` puts the `/api` prefix back on the request path when the platform
   hands it over without one, so the routes are matched the same way in every environment.

2. **Pooled connections.** A serverless function must not open a new PostgreSQL pool per
   invocation. Use Neon's **pooled** connection string (the `-pooler` host) with `max: 1` per
   instance, and the **direct** string only for migrations.
   ```js
   // Neon serverless driver
   import { neon } from '@neondatabase/serverless';
   const sql = neon(process.env.DATABASE_URL);           // pooled
   ```
   The `pg` client also works against the pooler, but the serverless driver is the lower-latency
   choice and avoids idle-in-transaction timeouts.

3. **Body parsing and uploads.** Vercel's Node runtime already parses JSON bodies, but Express's
   `express.json()` must be retained for local development. **Multipart file uploads must not use
   the local filesystem** — Vercel's filesystem is read-only except for `/tmp`, which does not
   persist across invocations. Menu images therefore go to **Neon Object Storage** (or Vercel
   Blob), with the public URL stored in `menu_items.image`.

### 5.3 Request flow — order creation (the security-critical path)

The current implementation trusts the client. The target flow makes the server authoritative:

```
Customer browser                    API function                      Neon
      │                                  │                              │
      ├─ POST /api/orders ──────────────►│                              │
      │  {items:[{menu_item_id,qty}],    │ 1. authenticate (JWT)        │
      │   delivery_address,              │ 2. BEGIN                    ──►│
      │   payment_method, promo_code}    │ 3. SELECT menu_items         │
      │                                  │    FOR UPDATE (lock rows)  ──►│
      │                                  │ 4. validate availability,    │
      │                                  │    compute price server-side │
      │                                  │ 5. recompute promo discount ──►│
      │                                  │ 6. INSERT orders + items  ──►│
      │                                  │ 7. INSERT status history  ──►│
      │                                  │ 8. COMMIT                   ──►│
      │                                  │ 9. initiate payment (if not COD)
      │◄─ 201 {order, payment:{...}} ────┤                              │
      │  ⚠ client-supplied price/name are NEVER persisted                │
```

Money is computed once, on the server, inside a transaction, from the current `menu_items` rows.

### 5.4 Data model changes (target)

All changes are **additive** — no column is dropped or retyped, so existing rows migrate cleanly.

| Change | Purpose | Finding |
|---|---|---|
| `orders.payment_status` (`pending`/`authorized`/`paid`/`failed`/`refunded`) | Payment state independent of order state | P1-07 |
| `orders.payment_provider`, `orders.payment_reference`, `orders.paid_at`, `orders.refunded_at` | Provider traceability and idempotency | P1-07, §8 of the brief |
| `orders.status` CHECK extended with `ready` | Complete the required lifecycle | P1-08 |
| `orders.customer_phone` | Order-level contact snapshot, independent of later profile edits | Data modelling |
| `orders.fulfilment_type` (`delivery`/`pickup`) | The brief requires adapting statuses to pickup vs delivery | Brief §5 |
| `orders.cancellation_reason` | Customer cancellation feedback | P1-11 |
| `menu_items.stock_quantity` | Stock availability, checked at order time | Brief §5 |
| `menu_items.custom_options` → structured JSONB `{name, type, options:[{label, price_delta}]}` | Real pricing of customisations | P2-04 |
| `promos.is_active`, `used_count`, `min_order`, `max_uses` | Already present; populate and enforce | P1-09 |
| `users.role` CHECK constraint (`customer`/`admin`) | Defence in depth against escalation | P0-02 |
| `users.password` → bcrypt hash (cost 12) | Confirm/upgrade hashing | P1-05 |
| Indexes: `menu_items(category_id)`, `menu_items(is_available)`, `orders(user_id)`, `orders(status)`, `orders(created_at)`, `order_items(order_id)`, `promos(code)` | Query performance | Brief §11 |

### 5.5 Authentication and authorisation (target)

| Control | Target implementation | Fixes |
|---|---|---|
| Password hashing | bcrypt, cost ≥ 12, with a rehash-on-login upgrade path | P1-05 |
| Signup field whitelist | Only `name`, `email`, `password`, `phone`, `address`; `role` forced to `customer` | **P0-02** |
| Password policy | ≥ 8 chars (≥ 10 recommended), breach-list screening | P1-05 |
| Login rate limiting | Per-IP + per-account, backed by a shared store so limits hold across serverless instances | P1-01 |
| Session storage | `httpOnly`, `Secure`, `SameSite=Lax` cookie; short access token + rotating refresh token | P2-12 |
| Token lifetime | Access 15 min, refresh 7 days, rotation on use | P2-12 |
| Secret management | `JWT_SECRET` ≥ 32 bytes from the environment only; rotated from the live value | P0-07 |
| Authorisation | Single `requireAuth` + `requireAdmin` middleware; ownership checks in the **service** layer, not per-route | **P0-04** |
| Object-level authorisation | Every order query is scoped by `user_id` (or explicitly elevated for admin) | **P0-04** |
| Helmet | CSP, `X-Frame-Options`, HSTS, `Referrer-Policy`, `Permissions-Policy` | P2-08 |
| CORS | `FRONTEND_URL` / `CORS_ORIGINS` from the environment; multiple origins; clean `403` for unknown origins | **P0-06**, P2-09 |
| Input validation | `express-validator` on every write route; unknown body fields rejected | P0-02 |
| Error handling | A single error middleware returning `{error:{code,message}}`; internals never leaked | P2-07 |
| Logging | Structured JSON logs with a request id; auth failures and admin mutations audited | Brief §6 |
| Upload hardening | MIME + size allowlist, random filenames, storage in object storage | P1-02 |

### 5.6 Payment architecture (target)

```
   Order created (payment_status = pending)
        │
        ├─ Cash on Delivery  → payment_status = pending_cod; no provider call
        │
        └─ Mobile money / card
                │
                ▼
        POST {provider}/payment/initialize        (server → provider)
                │  amount, currency GHS, reference, callback_url
                ▼
        payment_status = pending, payment_reference = <provider reference>
                │
                ▼
        Provider prompts the customer (USSD push / redirect)
                │
                ▼
        POST {provider}/webhook                   (provider → server)
                │  ⚠ signature verified BEFORE any state change
                │  ⚠ reference looked up, transition idempotent
                ▼
        payment_status = paid | failed ; paid_at recorded
                │
                ▼
        Order status advances independently (placed → confirmed → …)
```

**Rules enforced in code:**
- An order is **never** marked paid from a client callback.
- The webhook signature is verified with the provider's secret before the database is touched.
- Replayed webhooks are idempotent (unique index on `payment_reference` + status guard).
- Amounts are compared against the server-computed order total; a mismatch raises an alert and
  does not mark the order paid.
- With no credentials configured, mobile money and card options are hidden and Cash on Delivery
  is offered with an explicit "pay on delivery" state — **never a simulated success**.

Paystack is the recommended provider: it natively supports **MTN MoMo, Telecel Cash,
AirtelTigo Money** and cards in Ghana, which covers the target market on one integration. Hubtel
is the documented alternative. Both require owner-provided credentials (Audit §8, item 7).

### 5.7 Observability and operations (target)

| Concern | Target |
|---|---|
| Health check | `GET /api/health` — liveness + DB round-trip, returns `{status, db, uptime, version}` |
| Readiness | `GET /api/health/ready` — verifies the DB connection pool before serving traffic |
| Structured logging | JSON logs, `X-Request-Id` propagated end-to-end |
| Error reporting | Server-side error boundary; no stack traces to clients |
| Rate limiting | Shared store (Postgres table or Upstash Redis) so limits are global, not per-instance |
| Migrations | Versioned, additive, idempotent; run against the Neon **direct** connection; never auto-run on deploy |
| Backups | Neon branch + point-in-time recovery; branch before every migration |

### 5.8 Frontend target (unchanged structure, upgraded foundations)

The existing React structure is retained — it is sound. Sprint 1+ changes:

| Change | Sprint | Rationale |
|---|---|---|
| Brand tokens, logo, favicon, banner, imagery | 1 | Branding |
| API base URL from a single validated env var | 2 | P1-15 |
| React Query for server state (caching, loading, error, retry) | 7 | P2-06 |
| Shared order-status registry | 7 | P3-03 |
| `httpOnly` cookie session; remove the `localStorage` token | 3 | P2-12 |
| Server-authoritative cart and pricing | 4 | P1-10, P0-03 |
| Server-returned order quote at checkout | 5 | P1-10 |
| Branded 404/500 routes, error boundaries | 7 | P2-17 |
| Accessibility pass (focus traps, names, landmarks, skip link) | 7 | P2-19 |
| Unit + integration tests (RTL) | 8 | P1-12 |
| Vite migration (optional) | 8 | P3-02 |

---

## 6. Dependency Map — What Depends On What

```
                      ┌──────────────────────────────┐
                      │  frontend/src/App.js         │
                      │  (Router + Route guards)     │
                      └───┬───────────┬───────────┬──┘
                          │           │           │
             ┌────────────▼───┐  ┌────▼─────┐  ┌──▼──────────────┐
             │ Navbar / Footer│  │  Pages   │  │  ChatBot        │
             └────────┬───────┘  └────┬─────┘  └──┬──────────────┘
                      │                 │           │
              ┌───────▼──────┐  ┌──────▼──────┐    │
              │ AuthContext  │  │ CartContext │    │
              └───────┬──────┘  └──────┬──────┘    │
                      └────────┬────────┘           │
                               │                    │
                     ┌─────────▼────────────────────▼──┐
                     │  frontend/src/services/api.js   │
                     │  axios + interceptors            │
                     └─────────────────┬────────────────┘
                                       │ HTTP /api/*
              ┌────────────────────────▼────────────────────────┐
              │  Express API  (to be rebuilt in-repo)           │
              │  routes → controllers → services → db layer    │
              └────────────────────────┬────────────────────────┘
                                       │ SQL
              ┌────────────────────────▼────────────────────────┐
              │  PostgreSQL (Neon)                              │
              │  users · categories · menu_items · orders      │
              │  order_items · order_status_history · promos   │
              └─────────────────────────────────────────────────┘

  Cross-cutting:  React Router 6 (navigation)
                  Tailwind 3 (design tokens)
                  lucide-react (icons)
                  react-hot-toast (notifications)
                  Recharts (admin charts only — heaviest dependency, lazy-load in Sprint 7)
```

**Dependencies worth acting on:**

| Observation | Action |
|---|---|
| `recharts` (~450 kB) is used only on the admin sales page | Lazy-load it with `React.lazy` — Sprint 7 |
| `react-scripts` 5 pulls in a large deprecated ESLint/TypeScript tree | Consider a Vite migration — Sprint 8 |
| No server-state library; every page hand-rolls fetching | React Query — Sprint 7 |
| `@types/*` optional platform binaries were dropped by `npm install` on this Linux host | Harmless; the lockfile is unchanged |

---

## 7. Environment Variables (Target)

Exact names to be confirmed against the rebuilt backend's `config/env.js` in Sprint 2.

**Backend / API**

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | yes | `development` / `production` |
| `DATABASE_URL` | yes | **Pooled** Neon connection string (serverless runtime) |
| `DATABASE_URL_DIRECT` | yes | **Direct** Neon connection string (migrations only) |
| `JWT_SECRET` | yes | ≥ 32 random bytes. Rotate from the live value. |
| `JWT_REFRESH_SECRET` | yes | Separate refresh-token secret |
| `FRONTEND_URL` | yes | Comma-separated allowed origins (prod + preview) |
| `CORS_ORIGINS` | no | Overrides `FRONTEND_URL` if preferred |
| `COOKIE_DOMAIN` | no | Cookie scope |
| `TRUST_PROXY` | no | `1` on Vercel for correct client IPs / rate limiting |
| `UPLOAD_DRIVER` | no | `neon` \| `vercel` \| `local` |
| `UPLOAD_BUCKET` | no | Bucket/container name for object storage |
| `PAYMENT_PROVIDER` | no | `paystack` \| `hubtel` \| `disabled` |
| `PAYSTACK_SECRET_KEY` | no | Required when `PAYMENT_PROVIDER=paystack` |
| `PAYSTACK_WEBHOOK_SECRET` | no | Required for webhook signature verification |
| `HUBTEL_CLIENT_ID` / `HUBTEL_CLIENT_SECRET` / `HUBTEL_MERCHANT_ID` | no | Hubtel alternative |
| `DELIVERY_FEE` | no | Default delivery fee (e.g. `5.00`) — server-authoritative |
| `BOOTSTRAP_ADMIN_EMAIL` | no | First-run admin provisioning instead of seeded credentials |
| `BOOTSTRAP_ADMIN_PASSWORD` | no | One-time only; must be changed on first login |
| `LOG_LEVEL` | no | `error` \| `warn` \| `info` \| `debug` |

**Frontend**

| Variable | Required | Purpose |
|---|---|---|
| `REACT_APP_API_URL` | yes (production) | API base URL, e.g. `https://afia-food-hub.vercel.app/api` |
| `REACT_APP_BRAND_NAME` | no | Brand label override (defaults to "Afia Food Hub") |

A complete placeholder-only `.env.example` is provided at the repository root. No real credential
is committed anywhere in the repository.

---

## 8. Data Migration Path — Live Render PostgreSQL → Neon

1. **Inventory.** Take a read-only dump of the live schema and row counts before any change.
2. **Provision.** Create the Neon project; note the pooled and direct connection strings.
3. **Schema.** Apply the migration chain against Neon. All migrations are additive and idempotent.
4. **Data.** Copy `users`, `categories`, `menu_items`, `orders`, `order_items`,
   `order_status_history`, `promos` preserving original primary keys, so foreign keys remain valid.
   Password hashes are copied **only after** the hashing algorithm is confirmed to match
   (P1-05); if it cannot be confirmed, user passwords are reset rather than migrated.
5. **Clean.** Remove the two audit artifacts (user `id=5`, order `id=2`) and reset
   `admin@foodgh.com.address` to `NULL` — see `AUDIT_REPORT.md` §8.
6. **Verify.** Row counts and financial totals must match the source exactly, order by order.
7. **Cut over.** Point `DATABASE_URL` at Neon. Run the API against Neon and execute a full
   acceptance pass (auth → menu → cart → checkout → order → admin).
8. **Decommission.** Only after the acceptance pass passes, the Render deployment is retired.

**Constraint:** no step above is executed without explicit owner approval.

---

## 9. Architectural Decisions Record

| # | Decision | Rationale | Sprint |
|---|---|---|---|
| ADR-01 | Rebuild the backend in-repo rather than attempt to recover the Render source | The source has never been committed and cannot be recovered from the deployment artefact; the recovered contract + schema are sufficient to rebuild safely | 2 |
| ADR-02 | Single Vercel project for SPA + API | Eliminates cross-origin traffic in production; CORS becomes defence-in-depth | 2 |
| ADR-03 | Neon serverless driver against the **pooled** connection string | Prevents connection exhaustion under serverless concurrency | 2 |
| ADR-04 | Express app exported as a handler (`export default app`) rather than `app.listen()` | Required for Vercel Functions | 2 |
| ADR-05 | Server-side money authority; the client never supplies a price | Fixes P0-03 and makes all financial reporting trustworthy | 2/5 |
| ADR-06 | `payment_status` is a separate column from `status` | Required by the brief; enables paid-but-undelivered and refunded-but-delivered | 2/5 |
| ADR-07 | Object storage for menu images, never the local filesystem | Vercel's filesystem is ephemeral except `/tmp` | 2 |
| ADR-08 | Keep the existing React structure; upgrade foundations incrementally | The structure is sound; a rewrite would discard working behaviour without fixing the actual defects | 1–8 |
| ADR-09 | Adopt React Query for server state | Removes duplicated fetching logic and fixes the blank-screen failure mode | 7 |
| ADR-10 | Paystack as the primary Ghana payment provider; Hubtel documented as the alternative | Paystack natively covers MTN MoMo, Telecel Cash, AirtelTigo and cards | 5 |
| ADR-11 | All migrations additive and idempotent; no destructive migration without approval | Protects existing data and the live database | 2 |
| ADR-12 | Keep internal identifiers (`foodgh` host, DB names) where changing them would break compatibility; change all customer-facing branding | The brief permits retaining technical identifiers where compatibility requires it | 1 |
