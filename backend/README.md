# Afia Food Hub API

The Afia Food Hub API — food ordering and delivery for Ghana.

This document describes the API **as it is implemented**. Every endpoint below
is served by `backend/src/app.js`, and the request and response shapes are the
ones the integration suite (`backend/tests/api/`) exercises.

| | |
|---|---|
| Local development | `http://localhost:5000/api` |
| Production | `https://afia-food-hub.vercel.app/api` |
| Stack | Node 20+, Express 4, PostgreSQL (`node-postgres`) |
| Source | `backend/src` — routes → services → `pg` pool |

> This file replaced the earlier "FoodGH Backend API" document, which
> described an API that no longer existed: Mongo-style identifiers, a
> `menu_item_id` body field, `promoCode` instead of `code`, a JWT kept in
> `localStorage`, and `npm run migrate` / `npm run seed` scripts that were
> never written. That was finding **P1-16**.

---

## 1. Conventions

### 1.1 The session

The session lives in an **httpOnly cookie**. There is no token in
`localStorage` and no token in the URL, so a script injected into the page
cannot read it.

| Cookie | Purpose |
|---|---|
| `afia_access` | The access token. Sent with every request by the browser. |
| `afia_refresh` | The refresh token. Rotated on every refresh. |
| `afia_guest` | Identifies a guest cart. Issued on the first cart request. |

The token is **also** returned in the `token` field of the signup and login
responses, so a non-browser client (a mobile app, a script) can use it:

```http
Authorization: Bearer <token>
```

The cookie is preferred when both are present. `Set-Cookie` carries
`HttpOnly`, `SameSite=Lax` and `Secure` in production.

### 1.2 Money

Money is a **string** in every response, exactly as PostgreSQL's `numeric`
column delivers it: `"40.00"`, never `40` and never `40.0`. Parse it before
doing arithmetic with it.

Every price — the cart quote, the order total, the delivery fee, the
discount — is calculated by the **server** from the `menu_items` table. A
client that sends a `price`, a `name` or a `discount` is rejected: the
request schema is strict and unknown fields are refused.

### 1.3 Identifiers

Ids are integers from a PostgreSQL sequence, not Mongo-style strings:
`"menuItemId": 12`, never `"64f123…"`.

### 1.4 Errors

Every failure answers with the same envelope. Only `code` and `message` are
safe to show to a person; database text, constraint names and stack traces
never reach the client.

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Some of the details provided are not valid.",
    "details": [{ "field": "email", "message": "That email is not valid." }]
  }
}
```

| Code | Status | Meaning |
|---|---|---|
| `validation_failed` | 400 | The body, query or parameters did not validate. `details` lists the fields. |
| `invalid_json` | 400 | The request body was not readable JSON. |
| `unauthorized` | 401 | No session, or the session has expired. |
| `forbidden` | 403 | Signed in, but not allowed to do this. |
| `not_found` | 404 | The record does not exist, or belongs to somebody else. |
| `conflict` | 409 | The record already exists (a duplicate email, for instance). |
| `unprocessable` | 422 | The request was well-formed but cannot be carried out. |
| `payload_too_large` | 413 | The body or the upload was too large. |
| `invalid_upload` | 400 | The uploaded file was not an accepted image. |
| `service_unavailable` | 503 | The database could not be reached. |
| `internal_error` | 500 | Something went wrong on the server. |
| `too_many_requests` | 429 | The rate limit was reached. |

### 1.5 Responses are never cached

Every `/api` response carries `Cache-Control: no-store`, and the API answers
conditional requests with the body rather than `304`. A cached body replayed
under a different session is how one customer can be shown another's cart.

---

## 2. Authentication

### `POST /api/auth/signup`

Create an account. A guest cart is merged into the new account.

```http
POST /api/auth/signup
Content-Type: application/json
```

```json
{
  "name": "Kwame Mensah",
  "email": "kwame@example.com",
  "password": "Password123",
  "phone": "0241234567",
  "address": "12 Oxford Street, Osu, Accra"
}
```

`name`, `email` and `password` are required. `phone` and `address` are
optional. The password must be at least 8 characters. **`role` is not
accepted** — a body containing it is refused with `validation_failed`, and
every new account is a customer. (Finding **P0-02**.)

`201`:

```json
{
  "user": { "id": 7, "name": "Kwame Mensah", "email": "kwame@example.com", "role": "customer", "phone": "0241234567", "address": "12 Oxford Street, Osu, Accra", "created_at": "2026-11-12T09:14:22.101Z" },
  "token": "eyJhbGciOi…"
}
```

### `POST /api/auth/login`

```json
{ "email": "kwame@example.com", "password": "Password123" }
```

`200` with the same `{ user, token }` body. Repeated failures from one
account are locked out for `LOGIN_LOCKOUT_MINUTES`; the lockout is stored in
the database, so it survives a restart.

### `POST /api/auth/logout`

Clears both cookies. `200` `{ "message": "Signed out." }`.

### `POST /api/auth/refresh`

Rotates the refresh token and issues a new pair. `200` `{ "token": "…" }`.

### `GET /api/auth/profile` — requires a session

`200` with the user record.

### `PUT /api/auth/profile` — requires a session

```json
{ "name": "Kwame A. Mensah", "phone": "0241234567", "address": "12 Oxford Street, Osu" }
```

Only those three fields may be changed. `role`, `password` and `email` are
refused. `200` with the updated user.

### `PUT /api/auth/password` — requires a session

```json
{ "currentPassword": "Password123", "newPassword": "AnotherPassword1" }
```

`200` `{ "message": "Password updated." }`.

### `POST /api/auth/password/forgot`

```json
{ "email": "kwame@example.com" }
```

Always answers `200`, whether or not the address is registered — the
response must not reveal which accounts exist.

### `POST /api/auth/password/reset`

```json
{ "token": "…the token from the email…", "newPassword": "AnotherPassword1" }
```

### `GET /api/auth/availability`

```http
GET /api/auth/availability?email=kwame@example.com
```

`200` `{ "available": true }` — whether the address is free to register.

---

## 3. Menu

### `GET /api/menu/categories`

`200` with an array of categories: `id`, `name`, `slug`, `description`,
`sort_order`, `is_active`. Add `?include_inactive=true` as an administrator
to see hidden categories.

The only categories are **Banku**, **Fufu**, **Omotuo**, **Kokonte** and
**Rice dishes**. Creating, renaming or deleting outside that list is refused.

### `GET /api/menu/items`

Query parameters: `category_id`, `search`, `featured`, `available`, `page`,
`limit`.

```http
GET /api/menu/items?category_id=1&search=jollof&limit=20
```

`200` with an array of dishes:

```json
[
  {
    "id": 1,
    "category_id": 1,
    "name": "Jollof Rice",
    "slug": "jollof-rice",
    "description": "Smoky Ghanaian jollof rice.",
    "price": "40.00",
    "image_url": "/brand/food/jollof-rice.jpg",
    "images": [
      { "id": 3, "url": "/brand/food/jollof-rice.jpg", "sort_order": 0, "is_cover": true },
      { "id": 4, "url": "/brand/food/rice/jollof-3.jpg", "sort_order": 1, "is_cover": false }
    ],
    "is_available": true,
    "is_featured": true,
    "stock_quantity": 0,
    "custom_options": [
      {
        "name": "Protein",
        "type": "single",
        "required": true,
        "options": [
          { "label": "Chicken", "price_delta": 0 },
          { "label": "Goat meat", "price_delta": 10 }
        ]
      }
    ],
    "created_at": "2026-11-12T09:14:22.101Z",
    "updated_at": "2026-11-12T09:14:22.101Z"
  }
]
```

The search, the category filter and the pagination are all performed by the
database (findings **P1-04**, **P2-05**).

### `GET /api/menu/items/:id`

`200` with one dish, or `404` `{ "error": { "code": "not_found", "message": "Menu item not found." } }`.

### `GET /api/menu/payment-methods`

The payment methods the customer may choose, and whether an online provider
is configured.

```json
{
  "provider": "disabled",
  "onlineEnabled": false,
  "currency": "GHS",
  "methods": [{ "id": "cash", "label": "Cash on delivery", "online": false }]
}
```

When no provider is configured, `cash` is the only method and
`onlineEnabled` is `false`. The API never reports a method it cannot take
payment through (finding **P0-05**).

### `POST /api/menu/items` — administrator

`multipart/form-data` (an image is optional) or `application/json`.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required. |
| `category_id` | integer | Required. |
| `description` | string | Optional. |
| `price` | number | Required. The price of the dish. |
| `image` | file | Optional. One JPEG, PNG, WebP or GIF, up to `UPLOAD_MAX_BYTES`. |
| `images` | file[] | Optional. Up to eight more photographs of the same dish. |
| `is_available` | boolean | Optional, default `true`. |
| `is_featured` | boolean | Optional, default `false`. |
| `stock_quantity` | integer | Optional. `0` means unlimited. |
| `custom_options` | array | Optional. The options the customer may choose. |

`201` with the created dish.

### `PUT /api/menu/items/:id` — administrator

The same fields, all optional. `200` with the updated dish.

### `DELETE /api/menu/items/:id` — administrator

`200` `{ "message": "Menu item deleted." }`. Existing orders keep their own
snapshot of the dish name and price.

### `POST /api/menu/items/:id/images` — administrator

`multipart/form-data` with one or more `images` files. The first uploaded
photograph becomes the cover when the dish has no cover yet. `201` with the
updated dish.

### `PUT /api/menu/items/:id/images` — administrator

```json
{ "images": [{ "id": 4, "sort_order": 0, "is_cover": true }] }
```

Reorders the existing gallery and chooses the cover.

### `DELETE /api/menu/items/:id/images/:imageId` — administrator

Removes one photograph from the dish. If it was the cover, the next
photograph becomes the cover.

### `POST /api/menu/categories` · `PUT /api/menu/categories/:id` · `DELETE /api/menu/categories/:id` — administrator

`name`, `slug`, `description` and `sort_order`. Only the five approved
categories exist. Their names and slugs cannot be changed, they cannot be
deleted, and they can be hidden with `is_active: false`.

---

## 4. Cart

A cart belongs to the session. A signed-in customer has one cart; a visitor
has a guest cart, identified by the `afia_guest` cookie. When a guest signs
in or signs up, the guest cart is merged into the customer's cart.

### `GET /api/orders/cart`

`200`:

```json
{
  "id": 3,
  "guestToken": null,
  "items": [
    {
      "id": 11,
      "menuItemId": 1,
      "name": "Jollof Rice",
      "quantity": 2,
      "customOptions": [{ "option": "Protein", "value": "Chicken" }],
      "specialInstructions": "",
      "image_url": "/brand/food/jollof-rice.jpg"
    }
  ],
  "quote": {
    "subtotal": "80.00",
    "delivery_fee": "5.00",
    "discount": "0.00",
    "total": "85.00",
    "items": [{ "menu_item_id": 1, "line_total": "80.00", "image_url": "/brand/food/jollof-rice.jpg" }]
  },
  "issues": []
}
```

`issues` explains a cart the kitchen cannot price — for example a dish that
now needs an option that was not chosen:

```json
{ "issues": [{ "code": "cart_invalid", "message": "Choose a protein for your jollof rice." }] }
```

### `POST /api/orders/cart/items`

```json
{
  "menuItemId": 1,
  "quantity": 2,
  "customOptions": [{ "option": "Protein", "value": "Chicken" }],
  "specialInstructions": "Extra spicy"
}
```

`201` `{ "message": "Added to cart." }`. The same dish with the same options
is merged into one line; the same dish with different options becomes a
second line.

### `PUT /api/orders/cart/items/:id`

```json
{ "quantity": 3 }
```

`200` `{ "message": "Cart updated." }`. A quantity of `0` removes the line.

### `DELETE /api/orders/cart/items/:id`

`200` `{ "message": "Item removed." }`.

### `DELETE /api/orders/cart`

`200` `{ "message": "Cart cleared." }`.

### `POST /api/orders/quote`

Prices a cart without creating an order.

```json
{
  "items": [{ "menuItemId": 1, "quantity": 2, "customOptions": [{ "option": "Protein", "value": "Chicken" }] }],
  "promoCode": "WELCOME10"
}
```

`200` with the same `quote` object the cart carries. This is the single
source of every amount the interface displays (finding **P1-10**).

### `POST /api/orders/validate-promo`

```json
{ "code": "WELCOME10", "subtotal": 80 }
```

`200`:

```json
{ "valid": true, "discount": 8, "promo": { "id": 1, "code": "WELCOME10", "discount_type": "percentage", "discount_value": 10 } }
```

An unknown or expired code answers `200` with `{ "valid": false, "message": "…" }`
— an invalid code is a normal outcome, not a server error.

---

## 5. Orders

### `POST /api/orders` — requires a session

```json
{
  "items": [
    {
      "menuItemId": 1,
      "quantity": 2,
      "customOptions": [{ "option": "Protein", "value": "Chicken" }],
      "specialInstructions": ""
    }
  ],
  "deliveryAddress": "12 Oxford Street, Osu, Accra",
  "deliveryNotes": "Near the traffic light",
  "customerPhone": "0241234567",
  "paymentMethod": "cash",
  "fulfilmentType": "delivery",
  "promoCode": "WELCOME10"
}
```

| Field | Required | Notes |
|---|---|---|
| `items` | yes | 1–60 lines. `price` and `name` are not accepted. |
| `deliveryAddress` | yes | 4–400 characters. |
| `customerPhone` | yes | 6–30 characters. |
| `paymentMethod` | yes | Only a method currently returned by `GET /api/menu/payment-methods` is accepted. With no online provider configured this is `cash` only; attempts to use an offline online method are refused with 422. |
| `fulfilmentType` | no | `delivery` (default) or `pickup`. |
| `deliveryNotes` | no | Up to 500 characters. |
| `promoCode` | no | Validated against the database. |

The order is priced by the server inside a transaction, so a forged price
cannot exist (finding **P0-03**).

`201` with the order:

```json
{
  "id": 34,
  "user_id": 7,
  "status": "placed",
  "payment_status": "pending_cod",
  "subtotal": "80.00",
  "delivery_fee": "5.00",
  "discount": "0.00",
  "total": "85.00",
  "promo_code": null,
  "delivery_address": "12 Oxford Street, Osu, Accra",
  "delivery_notes": "Near the traffic light",
  "customer_phone": "0241234567",
  "fulfilment_type": "delivery",
  "payment_method": "cash",
  "estimated_delivery": "2026-11-12T10:02:00.000Z",
  "created_at": "2026-11-12T09:17:00.000Z",
  "items": [
    { "id": 51, "menu_item_id": 1, "name": "Jollof Rice", "quantity": 2, "price": "40.00", "custom_options": [{ "option": "Protein", "value": "Chicken" }], "special_instructions": "" }
  ],
  "status_history": [{ "id": 1, "status": "placed", "note": null, "created_at": "2026-11-12T09:17:00.000Z" }]
}
```

**Idempotency.** Send an `Idempotency-Key` header with the order. Repeating
the request with the same key returns the order that was already created
(`200`) instead of creating a second one.

```http
Idempotency-Key: af-1731406620-x7f3ka91d
```

### `GET /api/orders/my-orders` — requires a session

Query parameters: `page`, `limit`, `status`.

```json
{ "orders": [ /* orders */ ], "total": 12, "page": 1, "totalPages": 3 }
```

Only the signed-in customer's orders. Another customer's order answers `404`,
not `403` (finding **P0-04**).

### `GET /api/orders/:id` — requires a session

`200` with one order, including its `items` and `status_history`. A
customer asking for somebody else's order receives `404`.

### `POST /api/orders/:id/cancel` — requires a session

```json
{ "reason": "Changed my mind" }
```

`200` with the cancelled order. Only an order that has not left the kitchen
can be cancelled; anything else is refused with `422`.

---

## 6. Payments

### `GET /api/payments/provider`

```json
{ "provider": "disabled", "onlineEnabled": false, "currency": "GHS" }
```

### `POST /api/orders/:id/payment` — requires a session

Starts the payment for an order. While no provider is configured this is
refused with `422` and a message pointing the customer at cash on delivery.
The API never reports a payment as complete on its own word.

### `POST /api/orders/:id/payment/refresh` — requires a session

Asks the provider to re-check a pending payment. `200` with the updated
order.

### `POST /api/payments/:provider/webhook`

The provider's callback. The signature is verified **before** the body is
read, and the result is confirmed against the provider's own verification
endpoint — the body alone is never trusted to decide that money moved.

### `POST /api/admin/orders/:id/refund` — administrator

```json
{ "reason": "The customer was charged twice" }
```

---

## 7. Administration

Every route in this section requires an administrator. A customer receives
`403`; an anonymous caller receives `401`.

### `GET /api/admin/dashboard`

```json
{
  "totalOrders": 12,
  "pendingOrders": 3,
  "confirmedOrders": 1,
  "preparingOrders": 2,
  "readyOrders": 0,
  "outForDeliveryOrders": 1,
  "deliveredOrders": 4,
  "cancelledOrders": 1,
  "totalUsers": 9,
  "totalCustomers": 8,
  "totalMenuItems": 14,
  "availableMenuItems": 13,
  "totalRevenue": 940.00,
  "collectedRevenue": 612.00,
  "outstandingRevenue": 328.00,
  "totalDiscounts": 40.00,
  "todayRevenue": 128.00
}
```

Every figure comes from a live aggregate. `totalRevenue` is the revenue
**booked**; `collectedRevenue` is the revenue actually **collected** —
the two are reported separately because they are not the same number.

### `GET /api/admin/orders`

Query parameters: `page`, `limit`, `status`, `search`.
`200` `{ "orders": [ … ], "total": 12, "page": 1, "totalPages": 3 }`.

### `PUT /api/admin/orders/:id/stage`

```json
{ "stage": "preparing", "note": "On the stove" }
```

`stage` is one of `placed`, `preparing`, `delivered` — the three stages the
customer sees. The API still records the detailed internal statuses
(`confirmed`, `ready`, `out_for_delivery`) while walking the legal
transitions, so order history is never rewritten. Moving a delivered order
back to an earlier stage is refused with `409`.

### `PUT /api/admin/orders/:id/status`

```json
{ "status": "preparing", "note": "On the stove" }
```

`status` is one of `placed`, `confirmed`, `preparing`, `ready`,
`out_for_delivery`, `delivered`, `cancelled`. Only the legal transitions are
accepted; an illegal one is refused with `422` (finding **P1-06**).

### `GET /api/admin/sales`

Query parameters: `start_date`, `end_date` (`YYYY-MM-DD`).

```json
{
  "salesStats": { "totalOrders": 12, "grossSales": 980.00, "totalDiscounts": 40.00, "deliveryFees": 60.00, "netSales": 940.00, "collectedSales": 612.00, "avgOrderValue": 78.33 },
  "popularItems": [{ "name": "Jollof Rice", "total_quantity": 14, "total_revenue": 560.00 }],
  "paymentBreakdown": [{ "payment_method": "cash", "order_count": 9, "total": 700.00 }]
}
```

### `GET /api/admin/sales/export`

The same figures as a CSV file, for the same period. `text/csv` with a
`Content-Disposition` header.

### `GET /api/admin/users`

Query parameters: `page`, `limit`, `search`.
`200` `{ "users": [ … ], "total": 9, "page": 1, "totalPages": 1 }`. The
password hash is never included.

### `PUT /api/admin/users/:id/role`

```json
{ "role": "admin" }
```

`role` is `customer` or `admin`. An administrator cannot change their own
role.

### `PUT /api/admin/users/:id/status`

```json
{ "is_active": false }
```

A deactivated account is refused at its next request, even with a valid
token.

---

## 8. Promo codes

Administrator only.

### `GET /api/promos`

`200` with an array of promo codes: `id`, `code`, `discount_type`
(`percentage` or `fixed`), `discount_value`, `min_order`, `max_uses`,
`used_count`, `is_active`, `expires_at`.

### `POST /api/promos`

```json
{
  "code": "WELCOME10",
  "discount_type": "percentage",
  "discount_value": 10,
  "min_order": 50,
  "max_uses": 100,
  "expires_at": "2026-12-31T23:59:59.000Z"
}
```

### `PUT /api/promos/:id` · `DELETE /api/promos/:id`

---

## 9. The assistant

### `POST /api/assistant/message`

```json
{ "message": "What do you have for dinner?", "sessionId": "…" }
```

`200` `{ "reply": "…", "sessionId": "…" }`.

The answer is written from the **live** menu, the configured delivery fee and
the signed-in customer's own orders. It never states an order status or a
payment outcome it has not read from the database, and it does not discuss
another customer's order.

---

## 10. Health

### `GET /api/health`

```json
{ "status": "ok", "db": "ok", "latencyMs": 3, "version": "1.0.0", "environment": "production", "uptimeSeconds": 412 }
```

`200` when the database answers, `503` when it does not.

### `GET /api/health/ready`

`200` `{ "status": "ready" }`, or `503` `{ "status": "not_ready", "reason": "…" }`.

### `GET /api`

`200` `{ "name": "Afia Food Hub API", "version": "1.0.0", "documentation": "…" }`.

---

## 11. Running it locally

```bash
cd backend
npm ci
cp ../.env.example .env          # then fill in the placeholders
npm run migrate                  # creates the schema
npm run seed                     # loads the reference menu
npm start                        # listens on :5000
```

The scripts that exist are:

| Script | What it does |
|---|---|
| `npm run dev` | Starts the API with `node --watch`. |
| `npm start` | Starts the API. |
| `npm run migrate` | Applies the migrations in `src/db/migrations`. |
| `npm run migrate:status` | Reports which migrations have been applied. |
| `npm run seed` | Loads the reference menu and categories. |
| `npm run env:check` | Validates the environment and refuses to start with a weak secret. |
| `npm test` | The integration suite, against a disposable PostgreSQL instance. |

The first administrator is created **only** from `BOOTSTRAP_ADMIN_EMAIL` and
`BOOTSTRAP_ADMIN_PASSWORD`. There is no default administrator credential
anywhere in this codebase (finding **P0-07**).
