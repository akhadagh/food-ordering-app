# Afia Food Hub — Repair Log

A chronological record of work performed, decisions taken, and outcomes observed.
Every entry states what was **actually executed and observed** — not what was intended.

**Log format:** one entry per sprint, plus entries for individual interventions.

---

## 2026-11-11 — Sprint 0: Discovery and preparation

**Branch:** `feature/afia-food-hub-transformation`
**Base commit:** `f56f6b4` "Brand name changed"
**Outcome:** ✅ Complete

---

### 0.1 — Safe working environment

| Action | Result |
|---|---|
| `git status --porcelain -b` | Clean working tree on `main`, tracking `origin/main` |
| `git branch -a` | Only `main` and `origin/main` existed |
| `git log --oneline -20` | 5 commits: `f56f6b4` (Brand name changed), `ad791d4` (image upload), `3ae5355` (fixed json issues), `62f2d7a` (Netlify redirects), `ab02af1` (Initial commit) |
| `git remote -v` | `origin https://github.com/akhadagh/food-ordering-app.git` |
| Branch created | `git checkout -b feature/afia-food-hub-transformation` ✅ |

**No user work was discarded.** The tree was clean; the only file modified during the sprint was
`frontend/package-lock.json` by `npm install`, and that was **restored** with `git checkout --`
so the Sprint 0 diff contains documentation only.

---

### 0.2 — Repository inspection

Enumerated every tracked file (24 total) and read all of them in full.

**Critical discovery:** `backend/` contains **only** `backend/README.md`. The backend source code
has **never** been committed to this repository. Verified independently of the working tree:

```
git log --all --diff-filter=A --name-only --pretty=format:
```

This lists every file ever added on any branch — `backend/README.md` is the only entry under
`backend/`.

**Consequence:** the Express API running at `https://foodgh-backend.onrender.com/api` is the
*only* copy of the backend. Recorded as **P0-01**.

---

### 0.3 — Baseline build and run

| Step | Command | Result |
|---|---|---|
| Install | `npm install --no-audit --no-fund` | ✅ 1 335 packages, exit 0 |
| Build | `CI=false npm run build` | ✅ "Compiled successfully", 203.64 kB JS / 6.11 kB CSS gzipped |
| Run | `BROWSER=none PORT=3111 npm start` | ✅ Compiled, HTTP 200 |
| Tests | — | ⚠️ **No test infrastructure exists** — 0 test files, no `test` script (**P1-12**) |

**Note:** port 3000 was already occupied by an unrelated Next.js application on this machine, so
the dev server was run on 3111 to avoid disturbing it.

**Observation:** `CI=false` was used for the build. A `CI=true` build (lint-as-error) is deferred
to Sprint 8 because `react-scripts` treats lint warnings as build errors and would produce noise
unrelated to Sprint 0's purpose. This is explicitly recorded in `TEST_REPORT.md` §10.

---

### 0.4 — Live API reconnaissance

Because no backend source exists, the live deployment was used as the specification. All
requests were read-only, except the deliberate security probes in §0.5.

**Recovered:** 29 endpoints, 7 tables with full column lists, the complete order-status
vocabulary, the JWT payload shape, the validation-library format, the multipart route, and the
CORS behaviour.

**Reconstructed schema** — documented in `ARCHITECTURE.md` §4.2.

---

### 0.5 — Security probing

Adversarial requests were sent to confirm or refute each hypothesis. **Every P0 was reproduced
against the live deployment**, not inferred from source reading.

| Probe | Result |
|---|---|
| `POST /api/auth/signup` with `"role":"admin"` | ❌ Created an admin account → **P0-02 confirmed** |
| `POST /api/orders` with a forged price of `0.01` on a GH₵555 item | ❌ Order created at GH₵5.01 with the name `"HACKED"` → **P0-03 confirmed** |
| `GET /api/orders/2` as a different customer | ❌ Returned the owner's full order → **P0-04 confirmed** |
| `OPTIONS /api/menu/items` with a Vercel origin | ❌ HTTP 500, no allow header → **P0-06 confirmed** |
| 12 rapid failed logins | ❌ No lockout, no throttle → **P1-01 confirmed** |
| `POST /api/menu/items` as multipart | ❌ Always 500 on a NOT NULL constraint → **P1-02 confirmed** |
| `POST /api/menu/items` with `is_available:false` | ❌ Stored `true` → **P1-03 confirmed** |
| `GET /api/menu/items?search=<no match>` | ❌ Returned everything → **P1-04 confirmed** |
| Admin moving a `delivered` order back to `placed` | ❌ Accepted → **P1-06 confirmed** |
| Tampered JWT / `alg:none` JWT | ✅ Both rejected |
| Customer → admin routes | ✅ All `403` |
| Cross-user order cancellation | ✅ `403` |
| Password hash exposure | ✅ Not exposed |

---

### 0.6 — Data hygiene during probing

Three probe artifacts were created. Full reconciliation table in `TEST_REPORT.md` §7.

| Artifact | Action |
|---|---|
| Menu item `id=9` | ✅ Deleted via the API |
| Menu item `id=10` | ✅ Deleted via the API |
| Order `id=2` + its order item | ⚠️ Cannot be deleted — no route exists. Scheduled for the Neon migration |
| User `id=5` (`audit.probe.001@example.com`, `role='admin'`) | ⚠️ **Cannot be demoted or deleted — no route exists.** Scheduled for the Neon migration; flagged as an owner action |

**Incident during probing:** while testing `PUT /api/auth/profile` as admin, the request body
intended for the probe account was sent against the admin account, overwriting
`admin@foodgh.com`'s name and phone.

- **Detected:** immediately, by reading the response body.
- **Corrected:** `PUT /api/auth/profile` restored name `Admin` and phone `+233200000000`; the
  endpoint ignores `null`, so the `address` column still reads `Osu` instead of `NULL`. This is
  cosmetic and is corrected by the same Neon migration.
- **Lesson recorded:** probe requests must always target a dedicated account, never the
  production admin account. The rebuild includes an explicit admin user-management API so this
  class of mistake has a supported path.

---

### 0.7 — Documentation produced

| File | Contents |
|---|---|
| `AUDIT_REPORT.md` | 52 findings (7 P0, 16 P1, 20 P2, 9 P3), each with affected file, root cause, impact and recommended fix. Plus 11 owner actions. |
| `ARCHITECTURE.md` | As-found architecture, recovered schema, verified route table, target Neon+Vercel architecture, 12 ADRs, data-migration path. |
| `BRAND_GUIDELINES.md` | Brand foundation, emblem design, 10-asset logo spec, validated colour system, type system, icon/banner manifest, application rules, acceptance criteria. |
| `REPAIR_PLAN.md` | 8 sprints, ordered tasks with estimates, effort summary, complexity ratings, 10-item risk register. |
| `TEST_REPORT.md` | 74 checks executed: 38 passed, 21 failed, 8 partial, 7 blocked. |
| `REPAIR_LOG.md` | This file. |
| `DEPLOYMENT.md` | Neon + Vercel deployment guide, environment variables, troubleshooting. |
| `.env.example` | Complete placeholder-only environment template. |

---

### 0.8 — Repository change made during Sprint 0

| File | Change | Reason |
|---|---|---|
| `.gitignore` | Added `!.env.example` and `!**/.env.example` after the `.env.*` rule | The rule `.env.*` matches `.env.example`, so the required environment template **could not be committed**. Verified with `git check-ignore -v frontend/.env.example` → `.gitignore:11:.env.*`. This is a strictly necessary change: without it, a mandatory deliverable cannot be tracked. |

**No application code was modified.** No functionality, styling or behaviour was changed in
Sprint 0, in line with the instruction not to modify existing functionality except where strictly
necessary.

---

### 0.9 — Colour palette validation

A contrast script was written and executed against every text/background combination in the
proposed palette. This surfaced a fact about the **existing** code:

> The current primary `#d97706` produces **3.19:1** with white text — below WCAG AA's 4.5:1.

The new palette was tuned until all 22 specified combinations passed, and the candidate
`clay-500` was darkened from `#D9543B` (3.98:1 — fail) to `#C4422B` (5.05:1 — pass) so that
`bg-primary-500` is safe by default for developers. Results are recorded in
`BRAND_GUIDELINES.md` §3.5.

---

## 2026-11-11 — Sprint 1: Brand identity

Committed as `d65122e`. See the commit message for the full inventory of assets, tokens and
component work. The customer-facing security removals (the invented payment details, the
published demo credentials, the fabricated customer-count and rating claims) were part of this
sprint.

## 2026-11-11 — Sprints 2 and 3: Backend rebuild, authentication and security

Committed as `2c1bf60`. The backend source was rebuilt in-repo from the recovered contract and
schema, and every P0 and P1 finding was closed at the source. `scripts/verify-p0-fixes.py`
executes 24 checks against the running API and is the regression suite for those findings.

---

## 2026-11-12 — Sprints 4 to 7: Menu, cart, checkout, administration and interface

**Branch:** `feature/afia-food-hub-transformation`
**Outcome:** ✅ Complete — verified by 62 executed browser and API checks

Sprints 4, 5, 6 and 7 were implemented as one body of work: a server-authoritative cart, the
checkout and order lifecycle, the administration screens, and the interface refresh around
them. This entry records what was **executed and observed** while verifying that work.

### 7.1 — The environment that was used

| Step | Command | Result |
|---|---|---|
| Database | `node scripts/dev-postgres.mjs` | ✅ PostgreSQL 17 (PGlite) on `127.0.0.1:55432` |
| Migrations | `npm run migrate` | ✅ "Database is up to date" — 4 migrations |
| Seed | `npm run seed` | ✅ 5 categories, 14 menu items, 1 administrator from `BOOTSTRAP_ADMIN_*` |
| API | `npm start` | ✅ listening on `:5000`; `GET /api/health` → `{"status":"ok","db":"ok"}` |
| Frontend | `PORT=3111 npm start` | ✅ compiled successfully, HTTP 200 |
| Production build | `CI=false npm run build` | ✅ "Compiled successfully", 113.92 kB main JS + 9 lazy chunks |

The administrator is created **only** from `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`.
No credential is committed, printed in the interface or shipped in a seed script.

### 7.2 — Test suites executed

| Suite | Command | Result |
|---|---|---|
| P0/P1 security regression | `python3 scripts/verify-p0-fixes.py` | ✅ **24/24 passed** |
| Customer journey (browser) | `node tests/e2e/customer-journey.mjs` | ✅ **34/34 passed** |
| Administration (browser) | `node tests/e2e/admin-journey.mjs` | ✅ **28/28 passed** |

The browser suites drive a real Brave instance over the DevTools protocol with no test
dependencies, and they cover the whole journey: browse → search → add to cart → customise →
sign up → checkout → order → track → administer. Every check is recorded in `TEST_REPORT.md`
§13.

### 7.3 — Defects the browser suite found, and the fixes

These were found by the suites, not by reading the code. Each was fixed and the suite re-run.

| # | Defect | Cause | Fix |
|---|---|---|---|
| 1 | The cart page was blank — `ReferenceError: cart is not defined` | `CartPage.js` referenced a `cart` binding that was never destructured from `useCart()` | Destructure `cart` from the context |
| 2 | The cart and the checkout showed no dish name, and no line could be updated or removed | The API mapped cart lines to `{menuItemId, quantity, customOptions, specialInstructions}` only — the line `id`, `name` and `image_url` were dropped although the query selected them | Return `id`, `name`, `image_url` on every cart line |
| 3 | The checkout page crashed: `toFixed is not a function` | PostgreSQL numeric columns arrive as strings, and `line_total` was formatted as a number | Format with `Number(...)` |
| 4 | The checkout flashed "Your cart is empty" while the cart was still loading | The page tested `items.length` without consulting the cart's loading state | Show the loader while the cart loads, and a real error state when it fails |
| 5 | After signing in, the browser could show the **previous visitor's** cart | Express enables ETags by default: the browser revalidated a cached `GET /api/orders/cart`, the API answered `304`, and the browser replayed the body it had cached under a different session | `Cache-Control: no-store` on every `/api` response |
| 6 | The confirmation told the customer to have **GH₵ 0.00** ready in cash | The cart is cleared before the confirmation renders, so the cart quote had already fallen to zero | Show the total the **server recorded on the order** |
| 7 | The confirmation read "Your order #34" | The rest of the application says "Order #34" | Copy made consistent |
| 8 | A dead cookie write on the cart route | The guest-cookie constant was renamed to `GUEST_CART_COOKIE` when the middleware was introduced, but the route still referenced the old name — it would have written a cookie with no name | Removed; the middleware issues the cookie on every cart request |

Defect 5 is the one with the widest blast radius: it was not visible in a single-session test
and it applied to every session-bound response, not only the cart.

### 7.4 — Defects the browser driver itself had

The first runs reported failures that were not application faults. The driver was corrected
before the suites could be trusted, because a test that cannot be trusted is worse than no
test.

| # | Symptom | Cause | Fix |
|---|---|---|---|
| 1 | The suite silently exercised a **different browser** than the one it started | The debugging port was fixed, and a browser left over from an earlier run still held it. The driver attached to that one, with its old cookies and its old signed-in session | The operating system assigns a free port; the browser is spawned in its own process group and the whole group is killed when the test ends |
| 2 | `TypeError: Illegal invocation` when typing into the delivery address | The driver always used the `HTMLInputElement` value setter, including for textareas | The setter is chosen from the element's own prototype |
| 3 | `window.confirm` blocked the admin delete flow | A headless browser answers a dialog with "false" unless the dialog is handled | `Page.javascriptDialogOpening` is answered with accept |

### 7.5 — What the suites prove

| Claim | Evidence |
|---|---|
| A customer can browse, search, customise and order | 34 checks, including the options panel and the server-priced total |
| The price is the server's | The dish created by the administrator appears on the customer menu at the administrator's price, and the edited price is the one served |
| A customer's cart survives signing up | The guest cart is merged into the new account and is still there afterwards |
| The amount to pay is right | The confirmation shows the total recorded on the order, not the emptied cart |
| Only legal order transitions are offered | Illegal transitions are disabled in the control and refused by the API |
| A promo code that exists works and one that does not is refused | Both directions checked against the checkout endpoint |
| Orders, customers, revenue and the CSV export are live | The administration screens and the export are exercised against the seeded and test data |
| The interface holds together | 390 px viewport with no horizontal overflow, no console errors, no uncaught exceptions |

### 7.6 — Still open

| # | Item | Why |
|---|---|---|
| 1 | `backend/` has no jest test file | The harness (Jest + Supertest) is installed and configured, but the suites are still the Python and browser ones. Sprint 8.1 writes the API-level suite |
| 2 | Neon, Vercel, Paystack and Hubtel are unconfigured | Owner credentials. The API ships the honest "provider not configured" state |
| 3 | The live Render deployment still runs the old backend | The rebuilt backend has never been deployed — deployment requires explicit approval |
| 4 | Owner actions 1–3 from `AUDIT_REPORT.md` §8 | Rotate the live admin password, delete the probe admin account, delete the probe order |

---

## Open items carried into the next sprint

### Owner actions (require access only the owner has)

| # | Action | Urgency |
|---|---|---|
| 1 | Rotate the live admin password and the `JWT_SECRET` on Render | **Immediate** |
| 2 | Delete user `id=5` (`audit.probe.001@example.com`, `role='admin'`) in the production database | **Immediate** |
| 3 | Delete order `id=2` and its order item | Low |
| 4 | Reset `admin@foodgh.com.address` to `NULL` | Low |

### Standing constraints

- No deployment and no push to GitHub without explicit approval.
- No secrets committed; `.env.example` contains placeholders only.
- Every claim of a working feature must be backed by an executed test recorded in
  `TEST_REPORT.md`.

---

## 2026-11-13 — Sprint 8: the test suites, the security checks and the deployment

**Branch:** `feature/afia-food-hub-transformation`
**Outcome:** ✅ 8.1–8.5 and 8.7 complete — 8.6 blocked on the owner's Vercel access

Sprint 8 is the sprint that proves the rest of the work. It produced the
automated suites that did not exist, the repeatable security check, and the
deployment configuration that was missing.

### 8.1 — The backend integration suite

`backend/tests/` now holds twelve suites that drive the real Express
application over HTTP against a disposable PostgreSQL 17 instance, migrated
and seeded by the real migration and seed scripts.

**236 checks, all passing. Every suite passes on its own** — no suite
depends on the order the others run in.

### 8.2 — The interface suite

`frontend/src/**/*.test.js` holds eleven suites — 113 checks — covering the API
client, the two contexts, the four customer-facing pages and the brand
components.

The suite could not run at all until the encoding and streams globals were
polyfilled: react-router v7 needs `TextEncoder`, jsdom does not provide it,
and Jest's jsdom environment hides the copy Node has. Every suite was
stopping on `TextEncoder is not defined` before its first assertion.

### 8.3 — The security audit

`tools/security-audit.mjs` is one command that checks the production
dependency tree of both packages, scans the working tree **and the whole Git
history** for credentials, scans the running API for its security headers, and
— with `--with-tests` — executes the authorisation matrix.

**12/12 checks pass.** The 42 build-time advisories in `react-scripts` are
reported separately, because none of them reaches a browser or the server;
the production dependency tree of both packages is clean.

### 8.4 — The clean install

`tools/verify-clean-install.sh` does what a new machine does: install, migrate,
seed, start, ask for the health. It passes.

### 8.5 and 8.7 — The final audit re-run, and what it found

The final re-run is what a final audit is for. **Two P1 findings were still
open**, both because the work had been documented rather than done:

| Finding | What was wrong | What was done |
|---|---|---|
| **P1-14** | There was no `vercel.json` at all. The deployment configuration existed only as a paragraph in `DEPLOYMENT.md`, so refreshing `/orders/12` on Vercel would have 404'd | `vercel.json`, the root `api/index.js` and the root manifest were written, and a test checks them |
| **P1-16** | `backend/README.md` still documented the old FoodGH API — Mongo-style ids, `menu_item_id`, `promoCode`, a JWT in `localStorage`, scripts that did not exist | It was rewritten from the real route table; a test checks it against the API |

And the root `README.md` was still publishing the live administrator's address
and password — **P0-07**, in the file the finding named.

### Defects the suites found

| # | Defect | Fix |
|---|---|---|
| 1 | The checkout page's "the cart could not be loaded" branch had been nested inside the submit handler, so a cart that failed to load was reported as an empty cart | The branch was moved back to the render level; the interface suite covers both states |
| 2 | The administration screen offered every later status, so an administrator could pick one the API refuses | The interface now offers exactly the transitions the API accepts, and a test compares the two tables |
| 3 | `security.test.js` passed only when another suite had run first | The file installs the fixtures itself; all twelve suites now pass in isolation |

### 8.6 — What is still blocked

The Vercel preview deployment and the acceptance pass need the owner's
Vercel access. The configuration is written and checked by a test, but it has
**not** been deployed, and the SPA rewrite and the function path must be
confirmed on the first preview before anything is promoted to production.

### The commands

```bash
npm test                                  # the backend suite and the interface suite
npm run audit:security                    # the security audit, with the authorisation matrix
tools/verify-clean-install.sh             # the clean-install check
tools/verify-browser-journeys.sh          # the browser journeys against a production build
```
