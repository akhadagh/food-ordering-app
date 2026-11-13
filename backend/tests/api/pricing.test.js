/**
 * Pricing.
 *
 * The server is the only authority for money (audit finding P0-03). These
 * assertions are the ones that would fail if the client could state its own
 * price, its own discount or its own customisation.
 */
import { api, adminAgent, customerAgent } from '../helpers/api.js';
import { resetDatabase, ITEM } from '../helpers/db.js';

beforeEach(async () => {
  await resetDatabase();
});

const quote = (body) => api().post('/api/orders/quote').send(body);

describe('the server prices the cart', () => {
  it('prices a dish from the menu', async () => {
    const res = await quote({
      items: [{ menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Chicken' }] }],
    });

    expect(res.status).toBe(200);
    expect(res.body.subtotal).toBe('40.00');
    expect(res.body.delivery_fee).toBe('5.00');
    expect(res.body.discount).toBe('0.00');
    expect(res.body.total).toBe('45.00');
    expect(res.body.items[0].name).toBe('Jollof Rice');
    expect(res.body.items[0].unit_price).toBe('40.00');
  });

  it('multiplies by the quantity', async () => {
    const res = await quote({
      items: [{ menuItemId: ITEM.jollof, quantity: 3, customOptions: [{ option: 'Protein', value: 'Chicken' }] }],
    });

    expect(res.body.subtotal).toBe('120.00');
    expect(res.body.total).toBe('125.00');
  });

  it('adds the price of the chosen option', async () => {
    const res = await quote({
      items: [{ menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Goat meat' }] }],
    });

    expect(res.body.items[0].unit_price).toBe('50.00');
    expect(res.body.total).toBe('55.00');
  });

  it('adds the price of every chosen option', async () => {
    const res = await quote({
      items: [
        {
          menuItemId: ITEM.jollof,
          quantity: 1,
          customOptions: [
            { option: 'Protein', value: 'Goat meat' },
            { option: 'Portion', value: 'Large' },
          ],
        },
      ],
    });

    expect(res.body.items[0].unit_price).toBe('60.00');
    expect(res.body.total).toBe('65.00');
  });

  it('refuses a price sent by the client', async () => {
    const res = await quote({
      items: [
        {
          menuItemId: ITEM.jollof,
          quantity: 1,
          price: 0.01,
          customOptions: [{ option: 'Protein', value: 'Chicken' }],
        },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
  });

  it('refuses a discount sent by the client', async () => {
    const res = await quote({
      items: [{ menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Chicken' }] }],
      discount: 40,
    });

    expect(res.status).toBe(400);
  });

  it('refuses a total sent by the client', async () => {
    const res = await quote({
      items: [{ menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Chicken' }] }],
      total: 1,
    });

    expect(res.status).toBe(400);
  });
});

describe('customisation is validated against the dish', () => {
  it('refuses an option the dish does not offer', async () => {
    const res = await quote({
      items: [
        {
          menuItemId: ITEM.jollof,
          quantity: 1,
          customOptions: [
            { option: 'Protein', value: 'Chicken' },
            { option: 'Free Extra Rice', value: 'Yes' },
          ],
        },
      ],
    });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/Unknown option/);
  });

  it('refuses a value the option does not have', async () => {
    const res = await quote({
      items: [{ menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Tuna' }] }],
    });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/not available for/);
  });

  it('refuses a missing required option', async () => {
    const res = await quote({ items: [{ menuItemId: ITEM.jollof, quantity: 1 }] });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/Please choose an option/);
  });

  it('refuses a customisation on a dish that offers none', async () => {
    const res = await quote({
      items: [{ menuItemId: ITEM.palmWine, quantity: 1, customOptions: [{ option: 'Protein', value: 'Chicken' }] }],
    });

    expect(res.status).toBe(400);
  });
});

describe('availability is checked when the cart is priced', () => {
  it('refuses a dish that is unavailable', async () => {
    const res = await quote({ items: [{ menuItemId: ITEM.sobolo, quantity: 1 }] });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/currently unavailable/);
  });

  it('refuses more than the kitchen has', async () => {
    const res = await quote({ items: [{ menuItemId: ITEM.waakye, quantity: 5 }] });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/left in stock/);
  });

  it('allows what the kitchen has', async () => {
    const res = await quote({ items: [{ menuItemId: ITEM.waakye, quantity: 2 }] });

    expect(res.status).toBe(200);
    expect(res.body.subtotal).toBe('70.00');
  });

  it('refuses a dish that is not on the menu', async () => {
    const res = await quote({ items: [{ menuItemId: 999999, quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no longer available/);
  });

  it('refuses an empty cart', async () => {
    const res = await quote({ items: [] });

    expect(res.status).toBe(400);
  });

  it('refuses a quantity of zero', async () => {
    const res = await quote({ items: [{ menuItemId: ITEM.jollof, quantity: 0 }] });

    expect(res.status).toBe(400);
  });
});

describe('promo codes are honoured from the database', () => {
  beforeEach(async () => {
    const { agent } = await adminAgent();
    await agent
      .post('/api/promos')
      .send({ code: 'SAVE10', discountType: 'percentage', discountValue: 10 })
      .expect(201);
  });

  it('applies the discount the administrator created', async () => {
    const res = await quote({
      items: [{ menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Chicken' }] }],
      promoCode: 'SAVE10',
    });

    expect(res.status).toBe(200);
    expect(res.body.discount).toBe('4.00');
    expect(res.body.total).toBe('41.00');
    expect(res.body.promo.code).toBe('SAVE10');
  });

  it('matches the code whatever its case', async () => {
    const res = await quote({
      items: [{ menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Chicken' }] }],
      promoCode: 'save10',
    });

    expect(res.status).toBe(200);
    expect(res.body.discount).toBe('4.00');
  });

  it('refuses a code that does not exist', async () => {
    const res = await quote({
      items: [{ menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Chicken' }] }],
      promoCode: 'NOTREAL',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/not valid/);
  });

  it('validates a code without creating an order', async () => {
    const res = await api()
      .post('/api/orders/validate-promo')
      .send({ code: 'SAVE10', subtotal: 40 });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discount).toBe('4.00');
  });

  it('refuses an invented code at the checkout', async () => {
    const res = await api().post('/api/orders/validate-promo').send({ code: 'INVENTED' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.message).toMatch(/not valid/);
  });
});

describe('a signed-in customer gets the same price as a guest', () => {
  it('does not vary by session', async () => {
    const { agent } = await customerAgent();
    const items = [
      { menuItemId: ITEM.jollof, quantity: 1, customOptions: [{ option: 'Protein', value: 'Chicken' }] },
    ];

    const guest = await quote({ items });
    const customer = await agent.post('/api/orders/quote').send({ items });

    expect(customer.status).toBe(200);
    expect(customer.body.total).toBe(guest.body.total);
  });
});
