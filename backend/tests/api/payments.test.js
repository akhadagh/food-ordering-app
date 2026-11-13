/**
 * The payment lifecycle with no provider configured.
 *
 * The platform must offer Cash on Delivery and say so honestly. It must
 * never simulate a successful online payment (audit finding P0-05).
 */
import { api, adminAgent, customerAgent } from '../helpers/api.js';
import { resetDatabase, ITEM } from '../helpers/db.js';

beforeEach(async () => {
  await resetDatabase();
});

const ORDER = {
  items: [{ menuItemId: ITEM.palmWine, quantity: 1 }],
  deliveryAddress: '12 Independence Avenue, Accra',
  customerPhone: '0241234567',
  paymentMethod: 'cash',
  fulfilmentType: 'delivery',
};

describe('the configured provider', () => {
  it('reports that no online provider is configured', async () => {
    const res = await api().get('/api/payments/provider');

    expect(res.status).toBe(200);
    expect(res.body.provider).toBe('disabled');
    expect(res.body.onlineEnabled).toBe(false);
  });

  it('offers cash on delivery and nothing else', async () => {
    const res = await api().get('/api/menu/payment-methods');

    expect(res.body.methods).toHaveLength(1);
    expect(res.body.methods[0].id).toBe('cash');
    expect(res.body.methods[0].online).toBe(false);
  });
});

describe('starting a payment', () => {
  it('refuses an online payment and points the customer at cash', async () => {
    const { agent } = await customerAgent();
    const created = await agent.post('/api/orders').send({ ...ORDER, paymentMethod: 'mtn_momo' });

    const res = await agent.post(`/api/orders/${created.body.id}/payment`);

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/not available right now/i);
    expect(res.body.error.message).toMatch(/cash on delivery/i);
  });

  it('refuses to start a payment for a cash order', async () => {
    const { agent } = await customerAgent();
    const created = await agent.post('/api/orders').send(ORDER);

    const res = await agent.post(`/api/orders/${created.body.id}/payment`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/does not need online authorisation/i);
  });

  it('needs a session', async () => {
    const res = await api().post('/api/orders/1/payment');
    expect(res.status).toBe(401);
  });

  it('will not let one customer pay for another customer\'s order', async () => {
    const first = await customerAgent();
    const second = await customerAgent();

    const created = await first.agent.post('/api/orders').send({ ...ORDER, paymentMethod: 'mtn_momo' });
    const res = await second.agent.post(`/api/orders/${created.body.id}/payment`);

    expect(res.status).toBe(404);
  });

  it('refuses to refresh a payment that does not exist', async () => {
    const { agent } = await customerAgent();
    const created = await agent.post('/api/orders').send({ ...ORDER, paymentMethod: 'mtn_momo' });

    const res = await agent.post(`/api/orders/${created.body.id}/payment/refresh`);

    expect(res.status).toBe(422);
  });
});

describe('provider callbacks', () => {
  it('refuses a callback for a provider that is not configured', async () => {
    const res = await api()
      .post('/api/payments/paystack/webhook')
      .set('x-paystack-signature', 'anything')
      .send({ data: { reference: 'AFIA-1-1' } });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/Unknown payment provider/i);
  });

  it('refuses a callback for an unknown provider', async () => {
    const res = await api()
      .post('/api/payments/mysterypay/webhook')
      .set('x-signature', 'anything')
      .send({ reference: 'AFIA-1-1' });

    expect(res.status).toBe(422);
  });

  it('never marks an order paid from a callback while no provider is live', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send({ ...ORDER, paymentMethod: 'mtn_momo' });

    await api()
      .post('/api/payments/paystack/webhook')
      .set('x-paystack-signature', 'anything')
      .send({ data: { reference: 'AFIA-1-1', status: 'success', amount: 1500 } })
      .expect(422);

    const order = await admin.get(`/api/orders/${created.body.id}`);
    expect(order.body.payment_status).toBe('pending');
  });
});

describe('refunds', () => {
  it('refuses to refund an order that was never paid', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send(ORDER);
    const res = await admin.post(`/api/admin/orders/${created.body.id}/refund`).send({ reason: 'Test' });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/Only a paid order/i);
  });

  it('needs an administrator', async () => {
    const { agent: customer } = await customerAgent();
    const created = await customer.post('/api/orders').send(ORDER);

    const res = await customer.post(`/api/admin/orders/${created.body.id}/refund`).send({});
    expect(res.status).toBe(403);
  });
});
