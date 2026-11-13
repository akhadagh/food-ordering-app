/**
 * Administration: the dashboard, the reports, the CSV export, customer
 * management and promo codes.
 */
import { api, adminAgent, customerAgent } from '../helpers/api.js';
import { resetDatabase, ITEM } from '../helpers/db.js';

beforeEach(async () => {
  await resetDatabase();
});

const ORDER = {
  items: [{ menuItemId: ITEM.palmWine, quantity: 2 }],
  deliveryAddress: '12 Independence Avenue, Accra',
  customerPhone: '0241234567',
  paymentMethod: 'cash',
  fulfilmentType: 'delivery',
};

describe('the authorisation matrix', () => {
  const ADMIN_ROUTES = [
    ['get', '/api/admin/dashboard'],
    ['get', '/api/admin/orders'],
    ['get', '/api/admin/sales'],
    ['get', '/api/admin/sales/export'],
    ['get', '/api/admin/users'],
    ['get', '/api/promos'],
    ['post', '/api/admin/orders/1/status'],
    ['post', '/api/admin/orders/1/refund'],
    ['post', '/api/menu/items'],
    ['put', '/api/menu/items/1'],
    ['delete', '/api/menu/items/1'],
    ['post', '/api/menu/categories'],
    ['put', '/api/admin/users/2/role'],
    ['put', '/api/admin/users/2/status'],
    ['post', '/api/promos'],
    ['put', '/api/promos/1'],
    ['delete', '/api/promos/1'],
  ];

  it('refuses every administration route to an anonymous caller', async () => {
    for (const [method, path] of ADMIN_ROUTES) {
      const res = await api()[method](path).send({});
      expect([401, 404]).toContain(res.status);
      expect(res.status).toBe(401);
    }
  });

  it('refuses every administration route to a customer', async () => {
    const { agent } = await customerAgent();

    for (const [method, path] of ADMIN_ROUTES) {
      const res = await agent[method](path).send({});
      expect(res.status).toBe(403);
    }
  });

  it('lets an administrator through', async () => {
    const { agent } = await adminAgent();

    const allowed = [
      ['get', '/api/admin/dashboard'],
      ['get', '/api/admin/orders'],
      ['get', '/api/admin/sales'],
      ['get', '/api/admin/sales/export'],
      ['get', '/api/admin/users'],
      ['get', '/api/promos'],
    ];

    for (const [method, path] of allowed) {
      const res = await agent[method](path);
      expect(res.status).toBe(200);
    }
  });
});

describe('the dashboard', () => {
  it('reports the real figures', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    await customer.post('/api/orders').send(ORDER);

    const res = await admin.get('/api/admin/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.totalOrders).toBe(1);
    expect(res.body.pendingOrders).toBe(1);
    expect(res.body.totalUsers).toBeGreaterThanOrEqual(2);
    expect(res.body.totalMenuItems).toBe(4);
    expect(Number(res.body.totalRevenue)).toBe(25);
  });

  it('does not invent a figure', async () => {
    const { agent } = await adminAgent();

    const res = await agent.get('/api/admin/dashboard');
    expect(res.body).not.toHaveProperty('rating');
    expect(res.body).not.toHaveProperty('happyCustomers');
    expect(res.body).not.toHaveProperty('growth');
  });

  it('separates booked revenue from collected revenue', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    await customer.post('/api/orders').send(ORDER);

    const res = await admin.get('/api/admin/dashboard');
    expect(Number(res.body.totalRevenue)).toBe(25);
    expect(Number(res.body.collectedRevenue)).toBe(0);
    expect(Number(res.body.outstandingRevenue)).toBe(25);
  });
});

describe('order administration', () => {
  it('lists every order', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    await customer.post('/api/orders').send(ORDER);

    const res = await admin.get('/api/admin/orders');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.orders[0].user_email).toBeTruthy();
  });

  it('searches for an order', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send(ORDER);

    const res = await admin.get('/api/admin/orders').query({ search: String(created.body.id) });
    expect(res.body.total).toBe(1);

    const none = await admin.get('/api/admin/orders').query({ search: '999999' });
    expect(none.body.total).toBe(0);
  });

  it('filters by status', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    await customer.post('/api/orders').send(ORDER);

    const placed = await admin.get('/api/admin/orders').query({ status: 'placed' });
    expect(placed.body.total).toBe(1);

    const delivered = await admin.get('/api/admin/orders').query({ status: 'delivered' });
    expect(delivered.body.total).toBe(0);
  });
});

describe('the sales report', () => {
  it('reports the days, the popular dishes and the payment methods', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    await customer.post('/api/orders').send(ORDER);

    const res = await admin.get('/api/admin/sales');

    expect(res.status).toBe(200);
    expect(res.body.salesStats.length).toBe(1);
    expect(res.body.salesStats[0].net_sales).toBe('25.00');
    expect(res.body.salesStats[0].gross_sales).toBe('20.00');
    expect(res.body.salesStats[0].delivery_fees).toBe('5.00');
    expect(res.body.popularItems[0]).toMatchObject({ name: 'Palm Wine', total_quantity: 2 });
    expect(res.body.paymentBreakdown[0]).toMatchObject({ payment_method: 'cash', count: 1 });
  });

  it('exports the same figures as a CSV', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    await customer.post('/api/orders').send(ORDER);

    const res = await admin.get('/api/admin/sales/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=/);

    const csv = res.text;
    expect(csv.split('\n')[0]).toContain('Date,Orders,Gross Sales (GHS)');
    expect(csv).toContain('Palm Wine');
    expect(csv).toContain('Total Revenue (GHS)');
  });

  it('reports an empty period as an empty report, not as an error', async () => {
    const { agent } = await adminAgent();

    const res = await agent.get('/api/admin/sales').query({ start_date: '2000-01-01', end_date: '2000-01-02' });

    expect(res.status).toBe(200);
    expect(res.body.salesStats).toEqual([]);
  });
});

describe('customer management', () => {
  it('lists the customers', async () => {
    const { agent } = await adminAgent();

    const res = await agent.get('/api/admin/users');

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.users[0]).toHaveProperty('email');
  });

  it('searches for a customer', async () => {
    const { agent: customer, user } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const res = await admin.get('/api/admin/users').query({ search: user.email });

    expect(res.body.total).toBe(1);
    expect(res.body.users[0].email).toBe(user.email);
  });

  it('changes a role', async () => {
    const { agent: customer, user } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const users = await admin.get('/api/admin/users').query({ search: user.email });
    const id = users.body.users[0].id;

    const res = await admin.put(`/api/admin/users/${id}/role`).send({ role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  it('refuses an unknown role', async () => {
    const { agent: customer, user } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const users = await admin.get('/api/admin/users').query({ search: user.email });
    const id = users.body.users[0].id;

    const res = await admin.put(`/api/admin/users/${id}/role`).send({ role: 'superuser' });
    expect(res.status).toBe(400);
  });

  it('deactivates a customer', async () => {
    const { agent: customer, user } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const users = await admin.get('/api/admin/users').query({ search: user.email });
    const id = users.body.users[0].id;

    const res = await admin.put(`/api/admin/users/${id}/status`).send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });

  it('will not let the administrator change their own role', async () => {
    const { agent, user } = await adminAgent();

    const res = await agent.put(`/api/admin/users/${user.id}/role`).send({ role: 'customer' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/your own role/i);
  });

  it('will not let the administrator deactivate themselves', async () => {
    const { agent, user } = await adminAgent();

    const res = await agent.put(`/api/admin/users/${user.id}/status`).send({ is_active: false });

    expect(res.status).toBe(400);
  });
});

describe('promo codes', () => {
  it('creates a code', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/promos')
      .send({ code: 'WELCOME5', discountType: 'fixed', discountValue: 5, maxUses: 100 });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe('WELCOME5');
    expect(res.body.discount_type).toBe('fixed');
  });

  it('refuses a duplicate code', async () => {
    const { agent } = await adminAgent();
    await agent.post('/api/promos').send({ code: 'WELCOME5', discountValue: 5 }).expect(201);

    const res = await agent.post('/api/promos').send({ code: 'welcome5', discountValue: 5 });
    expect(res.status).toBe(409);
  });

  it('refuses a percentage over one hundred', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/promos')
      .send({ code: 'TOOMUCH', discountType: 'percentage', discountValue: 150 });

    expect(res.status).toBe(400);
  });

  it('refuses a code with no value', async () => {
    const { agent } = await adminAgent();

    const res = await agent.post('/api/promos').send({ code: 'NOVALUE' });
    expect(res.status).toBe(400);
  });

  it('lists, edits and deletes a code', async () => {
    const { agent } = await adminAgent();

    const created = await agent.post('/api/promos').send({ code: 'EDITME', discountValue: 5 }).expect(201);

    const listed = await agent.get('/api/promos');
    expect(listed.body.map((p) => p.code)).toContain('EDITME');

    const updated = await agent.put(`/api/promos/${created.body.id}`).send({ discountValue: 8 });
    expect(updated.status).toBe(200);
    expect(Number(updated.body.discount_value)).toBe(8);

    const deleted = await agent.delete(`/api/promos/${created.body.id}`);
    expect(deleted.status).toBe(200);

    const after = await agent.get('/api/promos');
    expect(after.body.map((p) => p.code)).not.toContain('EDITME');
  });

  it('counts a redeemed code', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const promo = await admin
      .post('/api/promos')
      .send({ code: 'ONCEONLY', discountType: 'percentage', discountValue: 10 })
      .expect(201);

    await customer.post('/api/orders').send({
      ...ORDER,
      promoCode: 'ONCEONLY',
    });

    const res = await admin.get('/api/promos');
    const found = res.body.find((p) => p.code === 'ONCEONLY');
    expect(found.used_count).toBe(1);
    expect(promo.body.code).toBe('ONCEONLY');
  });

  it('refuses a code that has reached its usage limit', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    await admin.post('/api/promos').send({ code: 'LIMITED', discountValue: 5, maxUses: 1 }).expect(201);

    await customer.post('/api/orders').send({ ...ORDER, promoCode: 'LIMITED' }).expect(201);

    const res = await customer.post('/api/orders').send({ ...ORDER, promoCode: 'LIMITED' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/usage limit/i);
  });

  it('refuses an expired code', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    await admin
      .post('/api/promos')
      .send({ code: 'EXPIRED', discountValue: 5, expiresAt: '2020-01-01T00:00:00.000Z' })
      .expect(201);

    const res = await customer.post('/api/orders').send({ ...ORDER, promoCode: 'EXPIRED' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/expired/i);
  });

  it('refuses a code below its minimum order', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    await admin.post('/api/promos').send({ code: 'BIGSPEND', discountValue: 5, minOrder: 1000 }).expect(201);

    const res = await customer.post('/api/orders').send({ ...ORDER, promoCode: 'BIGSPEND' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/minimum order/i);
  });
});
