/**
 * The security perimeter: headers, caching, CORS, input rejection and
 * error containment.
 *
 * These are the checks behind the P0 and P1 findings in AUDIT_REPORT.md that
 * are observable from the outside.
 */
import { api, browser, signup, adminAgent, customerAgent, bearer } from '../helpers/api.js';
import { resetDatabase, ITEM } from '../helpers/db.js';

beforeEach(async () => {
  // The fixtures give every assertion an exact dish and an exact price, so
  // this file does not depend on which other files ran before it.
  await resetDatabase();
});

describe('security headers', () => {
  it('sets the hardening headers and hides the framework', async () => {
    const res = await api().get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('response caching', () => {
  it('never lets a browser or a proxy cache an API response', async () => {
    const res = await api().get('/api/menu/items');

    // A cached GET answered with 304 is what made the browser replay one
    // customer's cart to another customer (defect 5 in REPAIR_LOG.md).
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('answers a conditional request with the body, not a 304', async () => {
    const res = await api()
      .get('/api/menu/items')
      .set('If-None-Match', '"a-cache-validator-from-an-older-session"');

    // A 304 makes the browser replay the body it cached - possibly under a
    // different session. The API never negotiates one.
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.headers.etag).toBeUndefined();
  });
});

describe('CORS', () => {
  it('allows a configured origin', async () => {
    const res = await api().get('/api/health').set('Origin', 'http://localhost:3111');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3111');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow an unknown origin', async () => {
    const res = await api().get('/api/health').set('Origin', 'https://evil.example');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers a preflight for a configured origin', async () => {
    const res = await api()
      .options('/api/orders')
      .set('Origin', 'http://localhost:3111')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3111');
  });
});

describe('input rejection', () => {
  it('refuses an unknown field in a signup body', async () => {
    const res = await api().post('/api/auth/signup').send({
      name: 'Escalator',
      email: 'escalator@example.test',
      password: 'Password123',
      role: 'admin',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
    expect(JSON.stringify(res.body.error.details)).toContain('role');
  });

  it('refuses a body that is not an object', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .set('Content-Type', 'application/json')
      .send('"not-an-object"');

    expect(res.status).toBe(400);
  });

  it('refuses a request body over the size limit', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({ name: 'x'.repeat(2 * 1024 * 1024), email: 'big@example.test' });

    expect(res.status).toBe(413);
  });
});

describe('error containment', () => {
  it('never returns database text to the client', async () => {
    const { agent, token } = await customerAgent();

    const res = await agent.get('/api/orders/not-a-number').set(bearer(token));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/relation "|pg_|SQLSTATE|postgres/i);
  });

  it('does not leak a stack trace', async () => {
    const res = await api().get('/api/menu/items/999999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'not_found', message: 'Menu item not found.' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\(.*:\d+:\d+\)/);
  });
});

describe('session isolation', () => {
  it('does not let one customer see another customer\'s orders', async () => {
    const first = await customerAgent();
    const second = await customerAgent();

    const created = await first.agent
      .post('/api/orders')
      .send({
        items: [
          {
            menuItemId: ITEM.jollof,
            quantity: 1,
            customOptions: [{ option: 'Protein', value: 'Chicken' }],
          },
        ],
        deliveryAddress: '12 Independence Avenue, Accra',
        customerPhone: '0241234567',
        paymentMethod: 'cash',
        fulfilmentType: 'delivery',
      });

    expect(created.status).toBe(201);
    const orderId = created.body.id;

    const stolen = await second.agent.get(`/api/orders/${orderId}`);
    expect(stolen.status).toBe(404);
  });

  it('keeps a deactivated customer out even with a valid token', async () => {
    const { agent: admin } = await adminAgent();
    const customer = await customerAgent();

    const users = await admin.get('/api/admin/users?search=').expect(200);
    const row = users.body.users.find((u) => u.email === customer.user.email);
    expect(row).toBeTruthy();

    const deactivated = await admin
      .put(`/api/admin/users/${row.id}/status`)
      .send({ is_active: false })
      .expect(200);

    expect(deactivated.body.is_active).toBe(false);

    const res = await customer.agent.get('/api/auth/profile').set(bearer(customer.token));
    expect(res.status).toBe(401);
  });

  it('reads the role from the database, not from the token', async () => {
    const { agent: admin, token: adminToken } = await adminAgent();
    const customer = await customerAgent();

    // The customer is promoted to administrator...
    const users = await admin.get('/api/admin/users').expect(200);
    const row = users.body.users.find((u) => u.email === customer.user.email);
    await admin.put(`/api/admin/users/${row.id}/role`).send({ role: 'admin' }).expect(200);

    // ...and the same token now carries the new role, because the role is
    // re-read on every request.
    const allowed = await customer.agent.get('/api/admin/dashboard').set(bearer(customer.token));
    expect(allowed.status).toBe(200);

    // Demote again and the same token is refused.
    await admin.put(`/api/admin/users/${row.id}/role`).send({ role: 'customer' }).expect(200);
    const refused = await customer.agent.get('/api/admin/dashboard').set(bearer(customer.token));
    expect(refused.status).toBe(403);
    expect(adminToken).toBeTruthy();
  });
});

describe('guest and customer carts stay apart', () => {
  it('does not show one guest cart to another guest', async () => {
    const guestA = browser();
    const guestB = browser();

    await guestA.post('/api/orders/cart/items').send({ menuItemId: 1, quantity: 1 }).expect(201);

    const other = await guestB.get('/api/orders/cart');
    expect(other.status).toBe(200);
    expect(other.body.items).toHaveLength(0);

    const mine = await guestA.get('/api/orders/cart');
    expect(mine.body.items).toHaveLength(1);
  });
});
