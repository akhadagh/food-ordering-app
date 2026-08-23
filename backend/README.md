# FoodGH Backend API

This document lists the backend API endpoints used by the frontend application.

Base URL:

```bash
https://foodgh-backend.onrender.com/api
```

For local development, use:

```bash
http://localhost:5000/api
```

## Authentication

Most protected routes require a JWT token in the Authorization header:

```http
Authorization: Bearer <token>
```

The frontend stores the token in localStorage under `token`.

---

## Auth

### 1) Register a new user

```http
POST /api/auth/signup
```

Request body:

```json
{
  "name": "Kwame Boateng",
  "email": "kwame@example.com",
  "password": "password123",
  "phone": "+233240000000"
}
```

### 2) Log in

```http
POST /api/auth/login
```

Request body:

```json
{
  "email": "kwame@example.com",
  "password": "password123"
}
```

### 3) Get current user profile

```http
GET /api/auth/profile
```

Requires auth token.

### 4) Update current user profile

```http
PUT /api/auth/profile
```

Requires auth token.

Request body example:

```json
{
  "name": "Kwame Boateng",
  "phone": "+233240000001",
  "address": "Accra, Ghana"
}
```

---

## Menu

### 1) Get all categories

```http
GET /api/menu/categories
```

### 2) Get menu items

```http
GET /api/menu/items
```

Optional query params:

```http
GET /api/menu/items?category=rice&search=jollof
```

### 3) Get a single menu item

```http
GET /api/menu/items/:id
```

### 4) Create a menu item

```http
POST /api/menu/items
```

Requires admin auth.

Example body:

```json
{
  "name": "Jollof Rice",
  "description": "Classic Ghanaian jollof rice",
  "price": 40,
  "category": "Rice Dishes",
  "image": "https://example.com/jollof.jpg",
  "available": true
}
```

### 5) Update a menu item

```http
PUT /api/menu/items/:id
```

Requires admin auth.

### 6) Delete a menu item

```http
DELETE /api/menu/items/:id
```

Requires admin auth.

### 7) Create a menu category

```http
POST /api/menu/categories
```

Requires admin auth.

### 8) Update a menu category

```http
PUT /api/menu/categories/:id
```

Requires admin auth.

### 9) Delete a menu category

```http
DELETE /api/menu/categories/:id
```

Requires admin auth.

---

## Orders

### 1) Create an order

```http
POST /api/orders
```

Requires auth token.

Example body:

```json
{
  "items": [
    {
      "menuItemId": "64f123...",
      "quantity": 2,
      "price": 40
    }
  ],
  "deliveryAddress": "Accra, Ghana",
  "paymentMethod": "MTN MoMo",
  "promoCode": "SAVE10"
}
```

### 2) Get my orders

```http
GET /api/orders/my-orders
```

Requires auth token.

### 3) Get order details

```http
GET /api/orders/:id
```

Requires auth token.

### 4) Cancel an order

```http
POST /api/orders/:id/cancel
```

Requires auth token.

### 5) Validate promo code

```http
POST /api/orders/validate-promo
```

Example body:

```json
{
  "promoCode": "SAVE10"
}
```

---

## Admin

### 1) Get dashboard stats

```http
GET /api/admin/dashboard
```

Requires admin auth.

### 2) Get all orders for admin

```http
GET /api/admin/orders
```

Requires admin auth.

Optional query params can be used for filtering or pagination.

### 3) Update order status

```http
PUT /api/admin/orders/:id/status
```

Requires admin auth.

Example body:

```json
{
  "status": "Preparing"
}
```

### 4) Get sales data

```http
GET /api/admin/sales
```

Requires admin auth.

### 5) Export sales CSV

```http
GET /api/admin/sales/export
```

Requires admin auth.

### 6) Get all users

```http
GET /api/admin/users
```

Requires admin auth.

---

## Promotions

### 1) Get all promos

```http
GET /api/promos
```

### 2) Create a promo

```http
POST /api/promos
```

Requires admin auth.

Example body:

```json
{
  "code": "SAVE10",
  "discountType": "percentage",
  "discountValue": 10,
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

### 3) Update a promo

```http
PUT /api/promos/:id
```

Requires admin auth.

### 4) Delete a promo

```http
DELETE /api/promos/:id
```

Requires admin auth.

---

## Example curl commands

Login:

```bash
curl -X POST https://foodgh-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kwame@example.com","password":"password123"}'
```

Get profile:

```bash
curl https://foodgh-backend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer <token>"
```

Get menu items:

```bash
curl https://foodgh-backend.onrender.com/api/menu/items
```

---

## Notes

- The frontend client for these routes is defined in [frontend/src/services/api.js](../frontend/src/services/api.js).
- The app expects a JSON API with REST-style routes under `/api`.
- When running locally, set the frontend environment variable to:

```env
REACT_APP_API_URL=http://localhost:5000/api
```
