/**
 * The server-side cart: the guest cart, the customer's cart and the merge
 * that happens when a guest signs up.
 */
import { api, browser, customerAgent } from '../helpers/api.js';
import { resetDatabase, ITEM } from '../helpers/db.js';

beforeEach(async () => {
  await resetDatabase();
});

describe('the guest cart', () => {
  it('issues a cart token on the first read', async () => {
    const res = await api().get('/api/orders/cart');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.quote.total).toBe('0.00');

    const cookies = res.headers['set-cookie'] || [];
    const guest = cookies.find((c) => c.startsWith('afia_guest='));
    expect(guest).toBeTruthy();
    expect(guest).toMatch(/HttpOnly/i);
  });

  it('holds the dish that was added', async () => {
    const agent = browser();

    const added = await agent
      .post('/api/orders/cart/items')
      .send({ menuItemId: ITEM.jollof, quantity: 2 });
    expect(added.status).toBe(201);

    const cart = await agent.get('/api/orders/cart');
    expect(cart.status).toBe(200);
    expect(cart.body.items).toHaveLength(1);
    expect(cart.body.items[0]).toMatchObject({
      name: 'Jollof Rice',
      quantity: 2,
      menuItemId: ITEM.jollof,
    });
    expect(cart.body.items[0].id).toBeTruthy();
    expect(cart.body.items[0].image_url).toBeTruthy();
  });

  it('prices the cart from the server', async () => {
    const agent = browser();
    await agent
      .post('/api/orders/cart/items')
      .send({
        menuItemId: ITEM.jollof,
        quantity: 1,
        customOptions: [{ option: 'Protein', value: 'Goat meat' }],
      })
      .expect(201);

    const cart = await agent.get('/api/orders/cart');
    expect(cart.body.quote.subtotal).toBe('50.00');
    expect(cart.body.quote.total).toBe('55.00');
  });

  it('merges the same dish and the same options into one line', async () => {
    const agent = browser();
    const options = [{ option: 'Protein', value: 'Chicken' }];

    await agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.jollof, quantity: 1, customOptions: options });
    await agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.jollof, quantity: 2, customOptions: options });

    const cart = await agent.get('/api/orders/cart');
    expect(cart.body.items).toHaveLength(1);
    expect(cart.body.items[0].quantity).toBe(3);
  });

  it('keeps a different option on a separate line', async () => {
    const agent = browser();

    await agent
      .post('/api/orders/cart/items')
      .send({ menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Chicken' }] });
    await agent
      .post('/api/orders/cart/items')
      .send({ menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Goat meat' }] });

    const cart = await agent.get('/api/orders/cart');
    expect(cart.body.items).toHaveLength(2);
  });

  it('changes the quantity of a line', async () => {
    const agent = browser();
    await agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.friedRice, quantity: 1 });

    const cart = await agent.get('/api/orders/cart');
    const lineId = cart.body.items[0].id;

    const res = await agent.put(`/api/orders/cart/items/${lineId}`).send({ quantity: 5 });
    expect(res.status).toBe(200);

    const after = await agent.get('/api/orders/cart');
    expect(after.body.items[0].quantity).toBe(5);
  });

  it('removes a line', async () => {
    const agent = browser();
    await agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.friedRice, quantity: 1 });

    const cart = await agent.get('/api/orders/cart');
    const lineId = cart.body.items[0].id;

    const res = await agent.delete(`/api/orders/cart/items/${lineId}`);
    expect(res.status).toBe(200);

    const after = await agent.get('/api/orders/cart');
    expect(after.body.items).toHaveLength(0);
  });

  it('removes a line when the quantity is set to zero', async () => {
    const agent = browser();
    await agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.friedRice, quantity: 1 });

    const cart = await agent.get('/api/orders/cart');
    const lineId = cart.body.items[0].id;

    await agent.put(`/api/orders/cart/items/${lineId}`).send({ quantity: 0 });

    const after = await agent.get('/api/orders/cart');
    expect(after.body.items).toHaveLength(0);
  });

  it('empties the cart', async () => {
    const agent = browser();
    await agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.friedRice, quantity: 1 });

    const res = await agent.delete('/api/orders/cart');
    expect(res.status).toBe(200);

    const after = await agent.get('/api/orders/cart');
    expect(after.body.items).toHaveLength(0);
  });

  it('refuses a dish that is unavailable', async () => {
    const agent = browser();

    const res = await agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.kokonteGroundnut, quantity: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/currently unavailable/);
  });

  it('refuses a dish that is not on the menu', async () => {
    const agent = browser();

    const res = await agent.post('/api/orders/cart/items').send({ menuItemId: 999999, quantity: 1 });

    expect(res.status).toBe(404);
  });

  it('refuses an unknown field', async () => {
    const agent = browser();

    const res = await agent
      .post('/api/orders/cart/items')
      .send({ menuItemId: ITEM.friedRice, quantity: 1, price: 0.01 });

    expect(res.status).toBe(400);
  });
});

describe('the customer cart', () => {
  it('follows the customer, not the browser', async () => {
    const { agent } = await customerAgent();

    await agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.friedRice, quantity: 1 });

    const cart = await agent.get('/api/orders/cart');
    expect(cart.body.items).toHaveLength(1);
  });

  it('is not visible to another customer', async () => {
    const first = await customerAgent();
    const second = await customerAgent();

    await first.agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.friedRice, quantity: 1 });

    const other = await second.agent.get('/api/orders/cart');
    expect(other.body.items).toHaveLength(0);
  });

  it('will not let another customer change a line', async () => {
    const first = await customerAgent();
    const second = await customerAgent();

    await first.agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.friedRice, quantity: 1 });
    const cart = await first.agent.get('/api/orders/cart');
    const lineId = cart.body.items[0].id;

    const res = await second.agent.put(`/api/orders/cart/items/${lineId}`).send({ quantity: 9 });

    expect(res.status).toBe(404);
  });
});

describe('the merge when a guest signs up', () => {
  it('carries the guest cart into the new account', async () => {
    const agent = browser();
    await agent.post('/api/orders/cart/items').send({ menuItemId: ITEM.jollof, quantity: 2 });

    const before = await agent.get('/api/orders/cart');
    expect(before.body.items).toHaveLength(1);

    const signup = await agent.post('/api/auth/signup').send({
      name: 'New Customer',
      email: `merge-${Date.now()}@example.test`,
      password: 'Password123',
    });
    expect(signup.status).toBe(201);

    const after = await agent.get('/api/orders/cart');
    expect(after.body.items).toHaveLength(1);
    expect(after.body.items[0].name).toBe('Jollof Rice');
    expect(after.body.items[0].quantity).toBe(2);
  });

  it('carries the guest cart into an existing account at sign-in', async () => {
    const { agent: customer, user } = await customerAgent();

    const guest = browser();
    await guest.post('/api/orders/cart/items').send({ menuItemId: ITEM.friedRice, quantity: 3 });

    const res = await guest.post('/api/auth/login').send({
      email: user.email,
      password: 'Password123',
    });
    expect(res.status).toBe(200);

    const cart = await customer.get('/api/orders/cart');
    expect(cart.body.items).toHaveLength(1);
    expect(cart.body.items[0].quantity).toBe(3);
  });
});
