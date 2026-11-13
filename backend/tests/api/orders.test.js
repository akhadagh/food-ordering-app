/**
 * Checkout, the order record, the order state machine and cancellation.
 */
import { api, browser, adminAgent, customerAgent } from '../helpers/api.js';
import { resetDatabase, ITEM } from '../helpers/db.js';

beforeEach(async () => {
  await resetDatabase();
});

const ORDER = {
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
};

describe('placing an order', () => {
  it('needs a session', async () => {
    const res = await api().post('/api/orders').send(ORDER);

    expect(res.status).toBe(401);
  });

  it('creates the order at the server price', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/orders').send(ORDER);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('placed');
    expect(res.body.subtotal).toBe('40.00');
    expect(res.body.delivery_fee).toBe('5.00');
    expect(res.body.total).toBe('45.00');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe('Jollof Rice');
    expect(res.body.items[0].price).toBe('40.00');
    expect(res.body.items[0].quantity).toBe(1);
  });

  it('refuses a price sent by the client', async () => {
    const { agent } = await customerAgent();

    const res = await agent
      .post('/api/orders')
      .send({
        ...ORDER,
        items: [{ ...ORDER.items[0], price: 0.01, name: 'Cheap Jollof' }],
      });

    // The line schema is strict: a client cannot attach a price or a name to
    // a line. The server prices every line from the menu table.
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
  });

  it('records the dish name and price from the menu, not from the client', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/orders').send(ORDER);

    expect(res.status).toBe(201);
    expect(res.body.items[0].name).toBe('Jollof Rice');
    expect(res.body.items[0].price).toBe('40.00');
    expect(res.body.total).toBe('45.00');
  });

  it('refuses an empty order', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/orders').send({ ...ORDER, items: [] });

    expect(res.status).toBe(400);
  });

  it('refuses an order with no address', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/orders').send({ ...ORDER, deliveryAddress: '' });

    expect(res.status).toBe(400);
  });

  it('refuses an order with no phone number', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/orders').send({ ...ORDER, customerPhone: '' });

    expect(res.status).toBe(400);
  });

  it('refuses an unknown fulfilment type', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/orders').send({ ...ORDER, fulfilmentType: 'teleport' });

    expect(res.status).toBe(400);
  });

  it('refuses an unknown payment method', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/orders').send({ ...ORDER, paymentMethod: 'gold_bars' });

    expect(res.status).toBe(400);
  });

  it('accepts a pickup order', async () => {
    const { agent } = await customerAgent();

    const res = await agent
      .post('/api/orders')
      .send({ ...ORDER, fulfilmentType: 'pickup', deliveryAddress: 'Afia Food Hub, Accra' });

    expect(res.status).toBe(201);
    expect(res.body.fulfilment_type).toBe('pickup');
  });

  it('records a cash order as pending on delivery', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/orders').send(ORDER);

    expect(res.body.payment_status).toBe('pending_cod');
    expect(res.body.payment_method).toBe('cash');
  });

  it('records a mobile money order as pending', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/orders').send({ ...ORDER, paymentMethod: 'mtn_momo' });

    expect(res.status).toBe(201);
    expect(res.body.payment_status).toBe('pending');
  });

  it('writes the first line of the status history', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/orders').send(ORDER);

    const order = await agent.get(`/api/orders/${res.body.id}`);
    expect(order.body.status_history).toHaveLength(1);
    expect(order.body.status_history[0].status).toBe('placed');
  });

  it('takes the dish off the shelf', async () => {
    const { agent } = await customerAgent();

    await agent.post('/api/orders').send(ORDER);

    const item = await api().get(`/api/menu/items/${ITEM.waakye}`);
    expect(Number(item.body.stock_quantity)).toBe(2);

    await agent
      .post('/api/orders')
      .send({ ...ORDER, items: [{ menuItemId: ITEM.waakye, quantity: 2 }] });

    const after = await api().get(`/api/menu/items/${ITEM.waakye}`);
    expect(Number(after.body.stock_quantity)).toBe(0);
  });
});

describe('duplicate submission', () => {
  it('returns the same order when the same key is sent twice', async () => {
    const { agent } = await customerAgent();
    const key = `checkout-${Date.now()}`;

    const first = await agent.post('/api/orders').set('Idempotency-Key', key).send(ORDER);
    expect(first.status).toBe(201);

    const second = await agent.post('/api/orders').set('Idempotency-Key', key).send(ORDER);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.deduplicated).toBe(true);

    const list = await agent.get('/api/orders/my-orders');
    expect(list.body.total).toBe(1);
  });

  it('creates a separate order for a different key', async () => {
    const { agent } = await customerAgent();

    const first = await agent.post('/api/orders').send(ORDER);
    const second = await agent.post('/api/orders').send(ORDER);

    expect(first.body.id).not.toBe(second.body.id);
  });
});

describe('reading orders', () => {
  it('lists only the customer\'s own orders', async () => {
    const first = await customerAgent();
    const second = await customerAgent();

    await first.agent.post('/api/orders').send(ORDER);

    const list = await second.agent.get('/api/orders/my-orders');
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(0);
    expect(list.body.orders).toEqual([]);
  });

  it('lists the customer\'s orders with their items', async () => {
    const { agent } = await customerAgent();
    await agent.post('/api/orders').send(ORDER);

    const list = await agent.get('/api/orders/my-orders');
    expect(list.body.total).toBe(1);
    expect(list.body.orders[0].items).toHaveLength(1);
    expect(list.body.orders[0].items[0].name).toBe('Jollof Rice');
  });

  it('filters the list by status', async () => {
    const { agent } = await customerAgent();
    await agent.post('/api/orders').send(ORDER);

    const placed = await agent.get('/api/orders/my-orders').query({ status: 'placed' });
    expect(placed.body.total).toBe(1);

    const delivered = await agent.get('/api/orders/my-orders').query({ status: 'delivered' });
    expect(delivered.body.total).toBe(0);
  });

  it('serves the order to its owner', async () => {
    const { agent } = await customerAgent();
    const created = await agent.post('/api/orders').send(ORDER);

    const res = await agent.get(`/api/orders/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('hides another customer\'s order', async () => {
    const first = await customerAgent();
    const second = await customerAgent();

    const created = await first.agent.post('/api/orders').send(ORDER);

    const res = await second.agent.get(`/api/orders/${created.body.id}`);
    expect(res.status).toBe(404);
  });

  it('hides another customer\'s order from the administrator? No - the administrator may read it', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send(ORDER);

    const res = await admin.get(`/api/orders/${created.body.id}`);
    expect(res.status).toBe(200);
  });
});

describe('cancelling an order', () => {
  it('cancels an order the customer has just placed', async () => {
    const { agent } = await customerAgent();
    const created = await agent.post('/api/orders').send(ORDER);

    const res = await agent.post(`/api/orders/${created.body.id}/cancel`).send({ reason: 'Changed my mind' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('refuses to cancel an order that is already on its way', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send(ORDER);
    await admin.put(`/api/admin/orders/${created.body.id}/status`).send({ status: 'confirmed' });
    await admin.put(`/api/admin/orders/${created.body.id}/status`).send({ status: 'preparing' });

    const res = await customer.post(`/api/orders/${created.body.id}/cancel`).send({});
    expect(res.status).toBe(422);
  });

  it('will not let a customer cancel another customer\'s order', async () => {
    const first = await customerAgent();
    const second = await customerAgent();

    const created = await first.agent.post('/api/orders').send(ORDER);
    const res = await second.agent.post(`/api/orders/${created.body.id}/cancel`).send({});

    expect(res.status).toBe(404);
  });

  it('puts the stock back', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send({
      ...ORDER,
      items: [{ menuItemId: ITEM.waakye, quantity: 2 }],
    });

    const during = await api().get(`/api/menu/items/${ITEM.waakye}`);
    expect(Number(during.body.stock_quantity)).toBe(0);

    await customer.post(`/api/orders/${created.body.id}/cancel`).send({});
    const after = await api().get(`/api/menu/items/${ITEM.waakye}`);
    expect(Number(after.body.stock_quantity)).toBe(2);
  });
});

describe('the order state machine', () => {
  it('walks an order from placed to delivered', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send(ORDER);
    const id = created.body.id;

    const flow = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    for (const status of flow) {
      const res = await admin.put(`/api/admin/orders/${id}/status`).send({ status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }

    const order = await customer.get(`/api/orders/${id}`);
    expect(order.body.status).toBe('delivered');
    expect(order.body.status_history).toHaveLength(6);
  });

  it('refuses an illegal transition', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send(ORDER);
    const res = await admin.put(`/api/admin/orders/${created.body.id}/status`).send({ status: 'delivered' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('conflict');
  });

  it('refuses to move a delivered order back', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send(ORDER);
    const id = created.body.id;

    for (const status of ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']) {
      await admin.put(`/api/admin/orders/${id}/status`).send({ status });
    }

    const back = await admin.put(`/api/admin/orders/${id}/status`).send({ status: 'preparing' });
    expect(back.status).toBe(409);
  });

  it('refuses an unknown status', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send(ORDER);
    const res = await admin.put(`/api/admin/orders/${created.body.id}/status`).send({ status: 'teleported' });

    expect(res.status).toBe(400);
  });

  it('refuses a customer who tries to move the order', async () => {
    const { agent: customer } = await customerAgent();

    const created = await customer.post('/api/orders').send(ORDER);
    const res = await customer.put(`/api/admin/orders/${created.body.id}/status`).send({ status: 'delivered' });

    expect(res.status).toBe(403);
  });

  it('keeps the payment state separate from the order state', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send(ORDER);
    const id = created.body.id;

    for (const status of ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']) {
      await admin.put(`/api/admin/orders/${id}/status`).send({ status });
    }

    const order = await admin.get(`/api/orders/${id}`);
    expect(order.body.status).toBe('delivered');
    expect(order.body.payment_status).toBe('pending_cod');
  });
});
