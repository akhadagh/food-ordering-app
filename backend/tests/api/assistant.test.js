/**
 * The customer assistant.
 *
 * The original chatbot was a keyword matcher that answered with stale prices
 * and invented promo codes (audit finding P2-10). These assertions require
 * every answer to be grounded in the database.
 */
import { api, customerAgent } from '../helpers/api.js';
import { resetDatabase, ITEM } from '../helpers/db.js';

beforeEach(async () => {
  await resetDatabase();
});

const ask = (message, agent = null) => {
  const request = agent ? agent.post('/api/assistant/message') : api().post('/api/assistant/message');
  return request.send({ message });
};

describe('the assistant', () => {
  it('answers a greeting', async () => {
    const res = await ask('hello');

    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/Afia Food Hub/);
  });

  it('answers with the price on the menu, not a remembered one', async () => {
    const res = await ask('how much is jollof rice');

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('40.00');
  });

  it('does not offer a dish that is unavailable', async () => {
    const res = await ask('is sobolo available');

    expect(res.status).toBe(200);
    expect(res.body.reply.toLowerCase()).toMatch(/not available|sold out/);
  });

  it('tells the customer how to pay, honestly', async () => {
    const res = await ask('how can I pay?');

    expect(res.status).toBe(200);
    expect(res.body.reply.toLowerCase()).toContain('cash on delivery');
    expect(res.body.reply.toLowerCase()).toMatch(/not switched on|not available|right now/);
  });

  it('states the delivery fee that is configured', async () => {
    const res = await ask('what is the delivery fee?');

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('5.00');
  });

  it('declines rather than guessing', async () => {
    const res = await ask('do you sell fresh python in season?');

    expect(res.status).toBe(200);
    expect(res.body.reply.length).toBeGreaterThan(0);
    expect(res.body.reply).not.toMatch(/GH₵\s*0\.00.*python/i);
  });

  it('will not discuss another customer\'s order', async () => {
    const { agent } = await customerAgent();

    const res = await ask('where is my order?', agent);

    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/have not placed an order yet/i);
  });

  it('reports the status of the customer\'s own order', async () => {
    const { agent } = await customerAgent();

    await agent
      .post('/api/orders')
      .send({
        items: [{ menuItemId: ITEM.palmWine, quantity: 1 }],
        deliveryAddress: '12 Independence Avenue, Accra',
        customerPhone: '0241234567',
        paymentMethod: 'cash',
        fulfilmentType: 'delivery',
      })
      .expect(201);

    const res = await ask('where is my order?', agent);

    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/order #\d+/);
    expect(res.body.reply).toContain('placed');
  });

  it('asks a signed-out visitor to sign in for order questions', async () => {
    const res = await ask('where is my order?');

    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/Sign in/i);
  });

  it('refuses an empty message', async () => {
    const res = await ask('');

    expect(res.status).toBe(400);
  });

  it('refuses an unknown field', async () => {
    const res = await api()
      .post('/api/assistant/message')
      .send({ message: 'hello', sessionId: 'x', role: 'admin' });

    expect(res.status).toBe(400);
  });
});
