# Afia Food Hub — Repair Plan

**Version:** 1.2
**Date:** 2026-11-13
**Basis:** `AUDIT_REPORT.md` (Sprint 0 findings)
**Status:** Sprints 0–7 complete. Sprint 8 is complete except for 8.6, which
needs the owner's Vercel access.

---

## 1. Guiding principles

1. **Security and financial integrity first.** Nothing ships that trusts the client's money or
   lets an anonymous visitor become an administrator.
2. **The backend is rebuilt, not guessed.** No source exists (P0-01). The recovered contract and
   schema are the specification; everything else is verified by test, not by assumption.
3. **No unreviewed rewrite.** The React structure, the route map and the design language of the
   existing app are preserved. The backend is the only piece rebuilt from scratch, because it is
   the only piece with no source.
4. **Verify, then claim.** A task is not complete until the behaviour has been exercised and the
   result recorded in `TEST_REPORT.md`.
5. **Additive database changes only.** No destructive migration runs without explicit approval.
6. **Git checkpoint per sprint.** Every sprint ends in a reviewed commit on
   `feature/afia-food-hub-transformation`.

---

## 2. Sprint plan

| Sprint | Theme | Sprints' primary outcome | Depends on |
|---|---|---|---|
| 0 | Discovery & preparation | ✅ **Complete** — audit, architecture, brand direction, baseline verified | — |
| 1 | Brand identity | ✅ **Complete** — Afia Food Hub identity live across every surface | Sprint 0 |
| 2 | Core application & infrastructure | ✅ **Complete** — backend in-repo, running on PostgreSQL, deployable to Vercel | Sprint 0 |
| 3 | Authentication & security | ✅ **Complete** — secure, rate-limited, non-escalatable auth | Sprint 2 |
| 4 | Menu & shopping cart | ✅ **Complete** — server-authoritative menu, options, pricing, cart | Sprint 2, 3 |
| 5 | Checkout, payments & orders | ✅ **Complete** (5.5–5.6 credential-gated) — verified payment lifecycle, correct order state machine | Sprint 2, 3, 4 |
| 6 | Administration | ✅ **Complete** — accurate dashboard, order/menu/promo management, real reports | Sprint 2, 5 |
| 7 | UI/UX & performance | ✅ **Complete** — responsive, accessible, fast, resilient | Sprint 1, 4, 5, 6 |
| 8 | Testing & production readiness | ⏳ **8.1–8.5, 8.7 complete** — 349 automated checks, 12/12 security checks, the deployment configuration; **8.6 blocked** on Vercel access | All |

### Adjusted order — justification

The brief's order is followed except for three deliberate adjustments, each with a technical
dependency behind it:

| Adjustment | Reason |
|---|---|
| **Sprint 2 (backend) before Sprint 4 (menu/cart)** | The menu, cart and checkout cannot be correctly repaired without a backend that owns pricing. Frontend-only work on the cart would be thrown away. |
| **Sprint 3 (auth/security) before Sprint 4** | The P0 auth defects (role escalation, IDOR, brute force) live in the backend being rebuilt in Sprint 2, so they are fixed at the source rather than patched later. |
| **Brand (Sprint 1) before infrastructure (Sprint 2)** | Kept as the brief specifies. Branding is frontend-only and depends on nothing, so it proceeds in parallel with backend work without conflict. |

**Parallelisation.** Sprints 1 (frontend) and 2 (backend) touch disjoint file trees and can run
concurrently. Sprint 5's payment work is gated on credentials and can be scaffolded in advance.

---

## 3. Sprint 0 — Discovery & preparation ✅

### Completed

| # | Task | Result |
|---|---|---|
| 0.1 | Inspect the Git working tree, branch, uncommitted changes and history | Clean tree on `main`; 5 commits; **backend never committed** |
| 0.2 | Create `feature/afia-food-hub-transformation` | Created from `f56f6b4`; `main` untouched |
| 0.3 | Map the full repository | 24 tracked files; complete frontend, no backend source |
| 0.4 | Establish the baseline build | `npm install` + `npm run build` → **Compiled successfully** |
| 0.5 | Run the app | Dev server compiles and serves HTTP 200 on port 3111 |
| 0.6 | Run existing tests | **No test infrastructure exists** — 0 test files, no `test` script (P1-12) |
| 0.7 | Probe the live API and recover the schema | 29 endpoints, 7 tables, full route table recovered |
| 0.8 | Adversarial security verification | **7 P0 + 16 P1 confirmed by exploitation** |
| 0.9 | Write `AUDIT_REPORT.md` | 52 findings classified P0–P3 with file, cause, impact, fix |
| 0.10 | Write `ARCHITECTURE.md` | As-found architecture, target Neon+Vercel architecture, 12 ADRs |
| 0.11 | Write `BRAND_GUIDELINES.md` | Palette validated to WCAG AA, type system, 10-asset logo spec, manifest |
| 0.12 | Write `REPAIR_PLAN.md`, `TEST_REPORT.md`, `REPAIR_LOG.md`, `DEPLOYMENT.md`, `.env.example` | Sprint 0 documentation set complete |

### Baseline metrics

| Metric | Value |
|---|---|
| Frontend build | ✅ Pass (`203.64 kB` JS / `6.11 kB` CSS gzipped) |
| Frontend dev server | ✅ Pass (HTTP 200) |
| Lint errors blocking build | 0 |
| Automated tests | **0** |
| Backend in repo | **No** |
| P0 findings | 7 (all confirmed live) |
| P1 findings | 16 |
| P2 findings | 20 |
| P3 findings | 9 |

---

## 4. Sprint 1 — Brand identity

**Objective.** Replace the generic identity with a coherent, professional Afia Food Hub brand,
applied throughout the product.

### Tasks

| # | Task | Addresses | Est. |
|---|---|---|---|
| 1.1 | Design the emblem ("The Afia Bowl") and produce all 10 SVG logo assets | §3 of brand guidelines | 8 h |
| 1.2 | Produce all 8 icon/favicon assets (SVG, ICO, 16/32 PNG, apple-touch, 192/512, maskable) | P2-18 | 4 h |
| 1.3 | Build the token layer: CSS custom properties + Tailwind `theme.extend.colors` | P2-20 | 3 h |
| 1.4 | Typography: load Fraunces + Inter, define the type scale, apply `tabular-nums` to prices | Brand §4 | 3 h |
| 1.5 | Source or commission photography; produce the hero (3 crops), promotional banners, category banners, social cover | Brand §6–7 | 10 h |
| 1.6 | Build the reusable brand component system (`components/brand/`) | Brand §9.1 | 8 h |
| 1.7 | Update `frontend/public/index.html`: title, meta description, OG/Twitter cards, favicons, manifest, theme colour | P2-18 | 2 h |
| 1.8 | Replace every customer-facing occurrence of FoodGH / Efia'sEat | P2-01 | 4 h |
| 1.9 | Remove fabricated claims ("500+ happy customers", "4.8 rating") and the non-existent promo codes | P2-02, P1-09 | 2 h |
| 1.10 | Remove the invented payment details from checkout, footer and chatbot | **P0-05** | 2 h |
| 1.11 | Remove the demo-credentials block from the login page and README | **P0-07** | 0.5 h |
| 1.12 | Create `frontend/public/brand/README.md` asset manifest with licences | Brief §3G | 2 h |
| 1.13 | Verify: brand review across all screens, mobile/tablet/desktop, dark and light | Acceptance | 4 h |

**Exit criteria.** Every criterion in `BRAND_GUIDELINES.md` §12 is met and demonstrable.

**Risks.** Photography may not be available from the owner in time — mitigation: use licensed
Unsplash/Pexels images with recorded attribution, and keep the photography in a single swappable
directory so commissioned images can replace them later without code changes.

---

## 5. Sprint 2 — Core application & infrastructure

**Objective.** A real, in-repo backend on Neon-compatible PostgreSQL, deployable to Vercel.

### Tasks

| # | Task | Addresses | Est. |
|---|---|---|---|
| 2.1 | Scaffold `backend/` (Express, ESM, layered: routes → controllers → services → db) | **P0-01** | 6 h |
| 2.2 | Environment config module with fail-fast validation; `.env.example` | P1-13 | 3 h |
| 2.3 | PostgreSQL pool against the Neon **pooled** string; migration runner on the **direct** string | Brief (Neon) | 5 h |
| 2.4 | Write the full migration chain — additive and idempotent | ADR-11 | 8 h |
| 2.5 | Recreate the recovered schema exactly (7 tables), then apply additive changes | P1-07, P1-08 | 6 h |
| 2.6 | Migrate the live data to Neon; verify row counts and financial totals | Audit §6 | 5 h |
| 2.7 | Structured logging, request IDs, global error handler | P2-07, P2-08 | 4 h |
| 2.8 | Helmet security headers + CSP | P2-08 | 2 h |
| 2.9 | CORS driven by `FRONTEND_URL` / `CORS_ORIGINS`; clean `403` for unknown origins | **P0-06** | 2 h |
| 2.10 | `GET /api/health` + `GET /api/health/ready` | P2-17 | 1.5 h |
| 2.11 | Vercel serverless entry point (`export default app`), `vercel.json` SPA rewrites | P1-14 | 3 h |
| 2.12 | Object-storage upload driver for menu images (no local filesystem) | **P1-02** | 5 h |
| 2.13 | Fix the frontend API base URL (single validated env var; fail loudly in production) | P1-15 | 1.5 h |
| 2.14 | Fix `.gitignore` so `.env.example` is committable | P1-13 | 0.5 h |
| 2.15 | Set up the test harness (Jest + Supertest + a disposable Postgres schema) | P1-12 | 5 h |

**Exit criteria.** `npm ci && npm run migrate && npm start` works on a clean machine; the API
serves every recovered endpoint against Neon; `vercel.json` rewrites SPA routes; no local
filesystem dependency remains.

**Risks.**

| Risk | Severity | Mitigation |
|---|---|---|
| Neon credentials not yet provided | **High** | Build against local PostgreSQL (or a Neon dev branch) first; Neon is a configuration change, not a code change |
| Live-data migration loses rows | High | Row-count and total reconciliation at every step; dry run first; backups in Neon branches |
| Serverless cold starts | Medium | Neon pooled string; keep the pool small and warm; avoid connection-per-request |
| Hashing algorithm of the old backend unconfirmed | Medium | If unconfirmed, reset user passwords during migration rather than carry hashes across |

---

## 6. Sprint 3 — Authentication & security

**Objective.** Close every P0 authentication/authorization finding and harden the perimeter.

### Tasks

| # | Task | Addresses | Est. |
|---|---|---|---|
| 3.1 | Signup field whitelist; `role` forced to `customer`; DB CHECK on `users.role` | **P0-02** | 2 h |
| 3.2 | Ownership checks in the **service** layer for every order read/write | **P0-04** | 4 h |
| 3.3 | Server-side price authority: recompute all money from `menu_items` in a transaction | **P0-03** | 8 h |
| 3.4 | Password hashing (bcrypt ≥ 12) + rehash-on-login + policy ≥ 8 chars | P1-05 | 4 h |
| 3.5 | Rate limiting: per-IP and per-account, shared store | P1-01 | 4 h |
| 3.6 | `httpOnly` cookie sessions; short access + rotating refresh tokens | P2-12 | 6 h |
| 3.7 | Rotate `JWT_SECRET`; separate refresh secret; bootstrap-admin flow replacing seeded credentials | **P0-07** | 3 h |
| 3.8 | Strict input validation on every write route; reject unknown body fields | P0-02 | 5 h |
| 3.9 | File-upload hardening: MIME + size allowlist, random filenames | P1-02 | 3 h |
| 3.10 | Security headers, CSP tightening, security audit logging | P2-08 | 3 h |
| 3.11 | Security regression test suite covering every P0 | P1-12 | 6 h |

**Exit criteria.** Every P0 in `AUDIT_REPORT.md` has a passing automated regression test that
fails against the old behaviour.

---

## 7. Sprint 4 — Menu & shopping cart

| # | Task | Addresses | Est. |
|---|---|---|---|
| 4.1 | Server-side menu search, category filter and pagination | P1-04, P2-05 | 5 h |
| 4.2 | Fix `is_available` binding on create | P1-03 | 1 h |
| 4.3 | Structured `custom_options` with real price deltas, validated server-side | P2-04 | 6 h |
| 4.4 | Stock availability check at add-to-cart and at order time | Brief §5 | 4 h |
| 4.5 | Server-authoritative cart (user-scoped) with a guest `localStorage` cache | P1-10, P2-14 | 8 h |
| 4.6 | Server-side quote endpoint — the single source of every displayed money value | P1-10 | 4 h |
| 4.7 | Render real dish photography with a branded placeholder | P2-03 | 3 h |
| 4.8 | Cart and menu test suite | P1-12 | 5 h |

---

## 8. Sprint 5 — Checkout, payments & orders

| # | Task | Addresses | Est. |
|---|---|---|---|
| 5.1 | Checkout flow: delivery vs pickup, address capture, server quote | Brief §5 | 6 h |
| 5.2 | `payment_status` column + full payment state machine, independent of order status | P1-07 | 5 h |
| 5.3 | Order status machine with transitions and `ready` state | P1-06, P1-08 | 5 h |
| 5.4 | Idempotent order creation (duplicate-submission protection) | Brief §5 | 3 h |
| 5.5 | Paystack integration: server-side initiation, signed webhook verification, idempotency | P0-05, Brief §8 | 10 h |
| 5.6 | Hubtel alternative — adapter interface, documented as not configured | Brief §8 | 4 h |
| 5.7 | "Payment provider not configured" state — COD only, never a simulated success | P0-05 | 2 h |
| 5.8 | Order cancellation UI + server rules | P1-11 | 4 h |
| 5.9 | Order tracking with status history and polling | P1-08 | 4 h |
| 5.10 | Payment and order lifecycle test suite | P1-12 | 6 h |

> **Credential gate.** Tasks 5.5 and 5.6 are blocked on owner-provided credentials. Until then
> 5.7 ships and the UI offers Cash on Delivery with an honest "pay on delivery" state.

---

## 9. Sprint 6 — Administration

| # | Task | Addresses | Est. |
|---|---|---|---|
| 6.1 | Dashboard statistics from real aggregates; null-safe rendering | P2-15 | 4 h |
| 6.2 | Order management: filters, pagination, bulk-safe status transitions | P2-16, P1-06 | 6 h |
| 6.3 | Menu management: CRUD, image upload via object storage, categories | P1-02, P1-03 | 6 h |
| 6.4 | Promo management: real codes only, usage limits, expiry enforcement | P1-09 | 5 h |
| 6.5 | Sales reports: revenue by period, item, payment method — all from live data | P0-03 | 5 h |
| 6.6 | CSV export reflecting the same figures | P0-03 | 2 h |
| 6.7 | Customer management with role assignment and deactivation | P0-02 | 4 h |
| 6.8 | Admin test suite | P1-12 | 4 h |

---

## 10. Sprint 7 — UI/UX & performance

| # | Task | Addresses | Est. |
|---|---|---|---|
| 7.1 | React Query for server state (cache, loading, error, retry) | P2-06, ADR-09 | 8 h |
| 7.2 | Loading skeletons, error states, empty states, branded 404/500 routes | P2-06, P2-17 | 6 h |
| 7.3 | Accessibility pass: focus traps, accessible names, landmarks, skip link, `aria-live` | P2-19 | 8 h |
| 7.4 | Responsive verification: 360 / 768 / 1024 / 1440 px | Brief §10 | 5 h |
| 7.5 | Image optimisation: `srcset`, WebP, lazy loading, LCP hero priority | P2-03, Brief §11 | 4 h |
| 7.6 | Lazy-load Recharts; code-split admin routes | Brief §11 | 3 h |
| 7.7 | Shared order-status registry; remove duplicated maps | P3-03 | 2 h |
| 7.8 | Chatbot rewrite: server-backed, grounded in live menu data, configurable | P2-10 | 8 h |

---

## 11. Sprint 8 — Testing & production readiness

| # | Task | Addresses | Est. | Result |
|---|---|---|---|---|
| 8.1 | Backend integration suite (auth, authz, menu, cart, checkout, payments, orders, admin) | P1-12 | 10 h | ✅ **236 checks, 12 suites** — each suite passes on its own |
| 8.2 | Frontend component and flow tests (RTL) | P1-12 | 8 h | ✅ **113 checks, 11 suites** |
| 8.3 | Security checks: dependency audit, secret scan, header scan, authz matrix | Brief §7 | 5 h | ✅ **12/12** — `node tools/security-audit.mjs --with-tests` |
| 8.4 | Clean-install verification on a fresh machine | Brief §6 | 3 h | ✅ `tools/verify-clean-install.sh` |
| 8.5 | Deployment documentation (`DEPLOYMENT.md`) and runbooks | Brief §13 | 4 h | ✅ updated to the configuration that now exists |
| 8.6 | Vercel preview deployment and full acceptance test | Brief §16 | 5 h | ⛔ **Blocked** — needs the owner's Vercel access |
| 8.7 | Final audit re-run; verify every P0/P1 is closed | Sprint 8 | 4 h | ✅ **All 7 P0 and 16 P1 closed**; **P1-14** and **P1-16** were found open and closed here |

> **What the final re-run found.** P1-14 and P1-16 had been *documented* rather
> than *done*: there was no `vercel.json`, and the API reference still
> described the old FoodGH API. The root `README.md` was still publishing the
> live administrator's credential (P0-07). All three are closed, and a test
> now refuses each of them coming back.

---

## 12. Effort summary

| Sprint | Theme | Estimated effort |
|---|---|---|
| 0 | Discovery & preparation | ✅ Complete |
| 1 | Brand identity | ~53 h |
| 2 | Core application & infrastructure | ~58 h |
| 3 | Authentication & security | ~48 h |
| 4 | Menu & shopping cart | ~36 h |
| 5 | Checkout, payments & orders | ~49 h (10 h credential-gated) |
| 6 | Administration | ~36 h |
| 7 | UI/UX & performance | ~44 h |
| 8 | Testing & production readiness | ~39 h |
| | **Total** | **~363 h** (excluding Sprint 0) |

**Complexity rating**

| Sprint | Complexity | Reason |
|---|---|---|
| 0 | Low | Read-only analysis |
| 1 | Medium | Design-led; asset production and wide but shallow frontend changes |
| 2 | **High** | Greenfield backend + schema + serverless + Neon + deployment plumbing |
| 3 | **High** | Security-critical; every change can lock users out if wrong |
| 4 | Medium-High | Touches pricing across the stack |
| 5 | **High** | Financial correctness + external provider integration + state machines |
| 6 | Medium | Mostly read/reporting surfaces |
| 7 | Medium | Broad but low-risk; improves every surface |
| 8 | Medium-High | Test suites must cover the earlier sprints' surface area |

---

## 13. Risks register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Owner credentials not provided** (Neon, Vercel, Paystack/Hubtel, business details) | **High** | **High** — blocks Sprints 2, 5 and the production launch | Build against local/dev infrastructure first; ship a clearly-labelled "provider not configured" state rather than a fake integration; escalate the request list in `AUDIT_REPORT.md` §8 |
| R2 | Live admin account and probe artifacts remain until acted upon | **High** | **High** — the admin credential is published on the login page | Requires owner action (Audit §8 items 1–3); cannot be fixed in code alone; rotate the password and delete the row before any launch |
| R3 | Production data loss during the Neon migration | Low | **Critical** | Neon branch before every migration; row-count and total reconciliation; dry run; explicit approval gate |
| R4 | Rebuilt backend diverges from the live behaviour the frontend expects | Medium | Medium | The recovered route table and response shapes are the contract; write a contract test suite against the live deployment **before** rewriting it |
| R5 | Scope creep in the brand (over-design) delays functional work | Medium | Medium | The brand guidelines define the system and the acceptance criteria; new elements require a guideline amendment |
| R6 | Payment integration blocked → the platform looks incomplete at launch | Medium | Medium | Launch with Cash on Delivery clearly labelled and honest payment-state messaging; add mobile money when credentials land |
| R7 | Vercel serverless behaviour differs from local Express (cold starts, no filesystem) | Medium | Medium | `api/index.js` entry point, pooled Neon driver, object storage for uploads — all decided in ADR-02/03/04/07 |
| R8 | The chatbot fabricates answers if left hardcoded | Medium | Medium | Sprint 7 rewrites it against live data; until then, remove the specific invented claims in Sprint 1 |
| R9 | Regression in an existing working feature | Low | Medium | The existing frontend behaviour is recorded in `AUDIT_REPORT.md` §5; regression tests are written before the corresponding change |
| R10 | Time between the audit and the fix leaves the live app exposed | **High** | **High** | Owner action items in Audit §8 are the mitigation; a "hot-fix" path (remove the demo credentials and the fake payment details) is deliberately the first task in Sprint 1 |

---

## 14. Definition of done (applies to every sprint)

1. The code change is implemented and **exercised**, not merely written.
2. Relevant automated tests exist, pass, and are recorded in `TEST_REPORT.md`.
3. No pre-existing test regressed. Failures are documented, never hidden.
4. `AUDIT_REPORT.md` findings addressed by the sprint are marked closed with evidence.
5. `REPAIR_PLAN.md` and `REPAIR_LOG.md` are updated.
6. Documentation (`.env.example`, `DEPLOYMENT.md`, `README.md`, API docs) reflects reality.
7. A reviewed Git commit is created on `feature/afia-food-hub-transformation`.
8. Nothing is deployed or pushed without explicit approval.

---

## 15. Immediate next step

**Sprint 8.6 — the Vercel preview deployment and the acceptance pass.** It is
the only part of Sprint 8 that is not done, and it needs the owner's Vercel
access.

Everything else is in place and verified by **349 automated checks** (236
backend, 113 interface) and **64 browser checks** against a production build:

1. **The deployment is ready to be deployed, but has never been deployed.**
   `vercel.json`, the root `api/index.js` and the root manifest are written
   and checked by `backend/tests/api/deployment.test.js`. On the first preview
   deployment, confirm three things before promoting anything:
   - `curl -i https://<preview>/api/health` → `200`, `db: ok`
   - open `/orders/12` directly in the browser → the interface, not a 404
     (this is the SPA rewrite, finding **P1-14**)
   - `curl -i https://<preview>/orders/12` → `200` with the interface's HTML
2. **The acceptance pass** — the customer and administration journeys
   (`tools/verify-browser-journeys.sh`) against the preview URL, with
   `REACT_APP_API_URL` pointed at the preview.
3. **The owner actions in `AUDIT_REPORT.md` §8**, which need access only the
   owner has: rotate the live admin password and `JWT_SECRET`, delete the
   probe admin account, delete the probe order.

The credential-gated work — Neon, Paystack, Hubtel — still needs the owner's
credentials. Until they arrive the application ships the honest "provider not
configured" state rather than a simulated payment.

> **Owner actions that remain outstanding regardless of sprint order** are listed in
> `AUDIT_REPORT.md` §8. Items 1–3 (rotate the admin password, delete the probe admin account,
> delete the probe order) are the most urgent, because they require access only the owner has.
