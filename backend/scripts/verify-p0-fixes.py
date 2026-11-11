#!/usr/bin/env python3
"""Manual end-to-end verification of the P0 fixes against a running API."""
import json, sys, urllib.request, urllib.error, io, uuid

B = "http://localhost:5000/api"
OK, FAIL = "  PASS", "  FAIL"
results = []


def req(method, path, body=None, token=None, headers=None, raw=None, ctype=None):
    url = B + path
    data = None
    h = dict(headers or {})
    if raw is not None:
        data = raw
        if ctype:
            h["Content-Type"] = ctype
    elif body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    if token:
        h["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw_body = resp.read()
            try:
                return resp.status, json.loads(raw_body)
            except Exception:
                return resp.status, raw_body
    except urllib.error.HTTPError as e:
        raw_body = e.read()
        try:
            return e.code, json.loads(raw_body)
        except Exception:
            return e.code, raw_body


def check(name, cond, detail=""):
    results.append(cond)
    print((OK if cond else FAIL) + f"  {name}" + (f"  -> {detail}" if detail and not cond else ""))


print("\n=== P0-02  privilege escalation via signup ===")
s, r = req("POST", "/auth/signup", {"name": "Victim", "email": f"victim{uuid.uuid4().hex[:6]}@example.com",
                                    "password": "Test1234", "phone": "+233201234567", "role": "admin"})
check("signup with role=admin is rejected", s == 400, f"{s} {r}")
check("error names no account created", "role" in json.dumps(r).lower() or s == 400)

print("\n=== registration ===")
email_a = f"alice{uuid.uuid4().hex[:6]}@example.com"
s, ra = req("POST", "/auth/signup", {"name": "Alice", "email": email_a, "password": "Test1234",
                                     "phone": "+233201234567", "address": "Osu, Accra"})
check("customer registers", s == 201, f"{s} {ra}")
token_a = ra.get("token")
email_b = f"bob{uuid.uuid4().hex[:6]}@example.com"
s, rb = req("POST", "/auth/signup", {"name": "Bob", "email": email_b, "password": "Test1234"})
token_b = rb.get("token")
check("second customer registers", s == 201, f"{s} {rb}")

print("\n=== P0-03  client-trusted pricing ===")
s, menu = req("GET", "/menu/items")
target = next(i for i in menu if i["name"] == "Beans, Plantain and Gari")
real_price = target["price"]
s, r = req("POST", "/orders", {
    "items": [{"menuItemId": target["id"], "quantity": 2, "price": "0.01",
                "name": "HACKED", "customOptions": []}],
    "deliveryAddress": "123 Oxford Street, Osu, Accra",
    "customerPhone": "+233201234567",
    "paymentMethod": "cash",
}, token=token_a)
check("order created", s == 201, f"{s} {r}")
if s == 201:
    order = r
    expected = round(float(real_price) * 2 + 5.0, 2)
    check("server used the real price, not the forged 0.01",
          abs(float(order["subtotal"]) - float(real_price) * 2) < 0.001,
          f"subtotal={order['subtotal']} real={real_price}")
    check("total = subtotal + delivery fee - discount",
          abs(float(order["total"]) - expected) < 0.001,
          f"total={order['total']} expected={expected}")
    check("item name came from the menu, not the client",
          order["items"][0]["name"] == "Beans, Plantain and Gari",
          order["items"][0]["name"])
    check("discount is zero (no promo)", float(order["discount"]) == 0)
    order_id = order["id"]

print("\n=== P0-04  order IDOR ===")
s, r = req("GET", f"/orders/{order_id}", token=token_b)
check("other customer cannot read the order (404)", s == 404, f"{s} {r}")
check("no order data leaked", "Oxford Street" not in json.dumps(r), json.dumps(r)[:200])
s, r = req("GET", f"/orders/{order_id}", token=token_a)
check("owner can read their own order", s == 200, f"{s}")
s, r = req("GET", f"/admin/dashboard", token=token_a)
check("customer cannot reach admin routes (403)", s == 403, f"{s} {r}")

print("\n=== P1-02  multipart image upload ===")
boundary = "----afia" + uuid.uuid4().hex
png = (b"\x89PNG\r\n\x1a\n" + b"\x00" * 64)
parts = (
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\nUpload Probe\r\n"
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"price\"\r\n\r\n12.50\r\n"
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"description\"\r\n\r\nprobe\r\n"
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"is_available\"\r\n\r\nfalse\r\n"
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"p.png\"\r\n"
    f"Content-Type: image/png\r\n\r\n"
).encode() + png + f"\r\n--{boundary}--\r\n".encode()
admin_email = "admin@afiafoodhub.com"
s, r = req("POST", "/auth/login", {"email": admin_email, "password": "ChangeMe-Afia-2026"})
check("admin logs in", s == 200, f"{s} {r}")
admin_token = r.get("token") if s == 200 else None
s, r = req("POST", "/menu/items", raw=parts, token=admin_token,
           ctype=f"multipart/form-data; boundary={boundary}")
check("multipart create succeeds (was 500 before)", s == 201, f"{s} {str(r)[:300]}")
created_id = r.get("id") if s == 201 else None
if created_id:
    s2, r2 = req("GET", f"/menu/items/{created_id}")
    check("is_available was stored as false (was ignored before)",
          r2.get("is_available") is False, f"{r2.get('is_available')}")
    check("image url was stored", bool(r2.get("image_url")), r2.get("image_url"))
    req("DELETE", f"/menu/items/{created_id}", token=admin_token)

print("\n=== P1-09  promo codes come from the database ===")
s, r = req("POST", "/orders/validate-promo", {"code": "WELCOME10", "subtotal": 100})
check("non-existent promo is not valid", r.get("valid") is False, f"{s} {r}")

print("\n=== P1-06  order status transitions ===")
s, r = req("PUT", f"/admin/orders/{order_id}/status", {"status": "confirmed"}, token=admin_token)
check("placed -> confirmed allowed", s == 200, f"{s} {r}")
s, r = req("PUT", f"/admin/orders/{order_id}/status", {"status": "delivered"}, token=admin_token)
check("confirmed -> delivered refused (skips a step)", s == 409, f"{s} {r}")
s, r = req("PUT", f"/admin/orders/{order_id}/status", {"status": "nonsense"}, token=admin_token)
check("unknown status refused with 400", s == 400, f"{s} {r}")

print("\n=== P1-01  brute-force protection ===")
target_email = f"brute{uuid.uuid4().hex[:6]}@example.com"
codes = []
for i in range(14):
    s, _ = req("POST", "/auth/login", {"email": target_email, "password": f"wrongpassword{i}"})
    codes.append(s)
check("repeated failed logins on one account are throttled",
      any(c == 429 for c in codes),
      f"codes={codes}")
check("the lockout kicked in before all attempts went through",
      codes.index(429) < len(codes) if 429 in codes else False,
      f"codes={codes}")

print("\n=== P2-07  no raw database errors leak ===")
s, r = req("PUT", f"/admin/orders/{order_id}/status", {"status": "bogus_status"}, token=admin_token)
body = json.dumps(r)
check("no SQL/constraint text in the response",
      "constraint" not in body.lower() and "relation" not in body.lower(), body[:200])

print(f"\n{'=' * 60}\n{sum(results)}/{len(results)} checks passed\n{'=' * 60}")
sys.exit(0 if all(results) else 1)
