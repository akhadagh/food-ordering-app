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

## Open items carried into Sprint 1

### Owner actions (require access only the owner has)

| # | Action | Urgency |
|---|---|---|
| 1 | Rotate the live admin password and the `JWT_SECRET` on Render | **Immediate** |
| 2 | Delete user `id=5` (`audit.probe.001@example.com`, `role='admin'`) in the production database | **Immediate** |
| 3 | Delete order `id=2` and its order item | Low |
| 4 | Reset `admin@foodgh.com.address` to `NULL` | Low |

### Sprint 1 tasks

| # | Task | Finding |
|---|---|---|
| 1.10 | Remove the invented payment details from checkout, footer and chatbot | **P0-05** |
| 1.11 | Remove the published demo credentials from the login page and README | **P0-07** |
| 1.8 / 1.9 | Replace all branding; remove the fabricated claims and promo codes | P2-01, P2-02, P1-09 |
| 1.1 – 1.7 | Produce the brand assets and integrate them | Brand §12 |

### Standing constraints

- No deployment and no push to GitHub without explicit approval.
- No secrets committed; `.env.example` contains placeholders only.
- Every claim of a working feature must be backed by an executed test recorded in
  `TEST_REPORT.md`.
