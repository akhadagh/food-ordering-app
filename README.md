# Afia Food Hub

Food ordering and delivery for Ghana — banku, fufu, omotuo, kokonte and rice
meals, cooked to order and delivered hot.

The application is a React single-page interface and a Node/Express API over
PostgreSQL. The API owns the money: every price the customer sees is
calculated by the server from the live menu.

---

## At a glance

| | |
|---|---|
| Interface | React 18, React Router 7, TanStack Query, Tailwind CSS, Recharts |
| API | Node 20+, Express 4, PostgreSQL (`node-postgres`), Zod |
| Deployment | Neon (PostgreSQL) + Vercel (the interface and the API in one project) |
| Documentation | [`DEPLOYMENT.md`](DEPLOYMENT.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`AUDIT_REPORT.md`](AUDIT_REPORT.md) · [`BRAND_GUIDELINES.md`](BRAND_GUIDELINES.md) · [`backend/README.md`](backend/README.md) — the API reference |

---

## What it does

**For the customer**

- Browse and search the menu by category, with real dish photography.
- Customise a dish — choose a protein, a portion, an extra — and see the
  price the kitchen calculates.
- A cart that survives a device change, and merges into the account when a
  guest signs up.
- Checkout by delivery or collection, with a promo code and cash on delivery.
- Order tracking with the kitchen's own status history.
- An assistant that answers from the live menu and the customer's own
  orders — and says so when it does not know.

**For the administrator**

- A dashboard of live figures: orders, revenue booked, revenue collected,
  revenue outstanding.
- Order management with the legal status transitions only.
- Menu and category management, with image upload.
- Sales reports by period, dish and payment method, and a CSV export of the
  same figures.
- Customer management: role assignment and deactivation.
- Promo codes with usage limits and expiry.

---

## Running it locally

### Prerequisites

- Node.js 20 or newer
- PostgreSQL 14 or newer (or the bundled PGlite instance — see below)

### 1. Install

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

### 2. Configure

```bash
cp .env.example backend/.env
cp .env.example frontend/.env     # keep only the REACT_APP_* block
```

Fill in the placeholders. `JWT_SECRET` and `JWT_REFRESH_SECRET` must each be
at least 32 characters; the API refuses to start in production with a weak
one. `npm run env:check --prefix backend` reports anything still missing.

### 3. Create the database

```bash
npm run migrate --prefix backend    # creates the schema
npm run seed --prefix backend       # loads the reference menu
```

The first administrator is created **only** from `BOOTSTRAP_ADMIN_EMAIL` and
`BOOTSTRAP_ADMIN_PASSWORD`. There is no default administrator credential
anywhere in this repository, and none is printed by any script.

### 4. Run

```bash
npm start --prefix backend     # the API on :5000
npm start --prefix frontend    # the interface on :3000
```

No PostgreSQL to install? The repository carries PostgreSQL 17 compiled to
WebAssembly, exposed over TCP:

```bash
node backend/scripts/dev-postgres.mjs --port 55432 --data-dir backend/.pgdata
```

### 5. Test

```bash
npm test                        # the backend suite and the interface suite
npm run audit:security          # dependency audit, secret scan, header scan, authorisation matrix
```

The backend suite starts a disposable PostgreSQL instance, migrates it with
the real migration runner and exercises the real application through HTTP.
Nothing in it touches a developer database.

---

## The API

The full reference is in [`backend/README.md`](backend/README.md). In short:

- The session lives in an **httpOnly cookie** — never in `localStorage`.
- Money is a **string** (`"40.00"`) and is always the **server's** figure.
- Ids are **integers**.
- Errors are `{"error": {"code": "...", "message": "..."}}`.
- Every response carries `Cache-Control: no-store`.

---

## Layout

```
afia-food-hub/
├── api/index.js            # the Vercel Function entry point
├── vercel.json             # the deployment configuration
├── backend/
│   ├── src/
│   │   ├── app.js          # the Express application
│   │   ├── config/         # environment and database pool
│   │   ├── db/             # migrations and seed
│   │   ├── middleware/      # authentication, validation, rate limiting
│   │   ├── routes/         # the HTTP surface
│   │   ├── services/       # the business rules
│   │   └── utils/
│   ├── tests/              # the integration suite
│   └── scripts/
├── frontend/
│   ├── src/
│   │   ├── components/     # brand, layout and chatbot components
│   │   ├── context/        # authentication and cart
│   │   ├── pages/          # the customer and administrator screens
│   │   └── services/       # the API client
│   └── tests/e2e/          # the browser journeys
└── tools/                  # the security audit and the clean-install check
```

---

## Payments

No payment provider is configured. The application says so plainly and offers
cash on delivery — it never shows an invented mobile-money number, and it
never reports a payment as complete without the provider confirming it.

When the owner's Paystack or Hubtel credentials arrive, the provider is
enabled by setting `PAYMENT_PROVIDER` and the matching secrets; the webhook
verifies the provider's signature before a payment is marked as paid.

---

## Brand

The identity — the emblem, the palette, the type scale and the component
system — is specified in [`BRAND_GUIDELINES.md`](BRAND_GUIDELINES.md) and
implemented in `frontend/src/components/brand/`. The photography is licensed
and credited in `frontend/public/brand/PHOTO-CREDITS.md`.
