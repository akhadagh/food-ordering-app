/**
 * The menu: browsing, searching, filtering and the administration of dishes
 * and categories.
 */
import { api, browser, adminAgent, customerAgent } from '../helpers/api.js';
import { resetDatabase, ITEM } from '../helpers/db.js';

beforeEach(async () => {
  await resetDatabase();
});

describe('the public menu', () => {
  it('lists the dishes', async () => {
    const res = await api().get('/api/menu/items');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);
    expect(res.body.map((i) => i.name)).toContain('Jollof Rice');
  });

  it('serves the price the kitchen set', async () => {
    const res = await api().get('/api/menu/items');

    const jollof = res.body.find((i) => i.id === ITEM.jollof);
    expect(Number(jollof.price)).toBe(40);
  });

  it('narrows the menu with a search term', async () => {
    const res = await api().get('/api/menu/items').query({ search: 'jollof' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Jollof Rice');
  });

  it('returns nothing for a term that matches no dish', async () => {
    const res = await api().get('/api/menu/items').query({ search: 'zzzznotonthemenu' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('filters by category', async () => {
    const res = await api().get('/api/menu/items').query({ category_id: 2 });

    expect(res.status).toBe(200);
    expect(res.body.every((i) => i.category_id === 2)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('filters by category slug', async () => {
    const res = await api().get('/api/menu/items').query({ category: 'rice-dishes' });

    expect(res.status).toBe(200);
    expect(res.body.every((i) => i.category_slug === 'rice-dishes')).toBe(true);
  });

  it('filters by availability', async () => {
    const res = await api().get('/api/menu/items').query({ is_available: 'true' });

    expect(res.status).toBe(200);
    expect(res.body.every((i) => i.is_available === true)).toBe(true);
    expect(res.body).toHaveLength(3);
  });

  it('paginates', async () => {
    const res = await api().get('/api/menu/items').query({ limit: 2, offset: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('refuses a page size that is not a number', async () => {
    const res = await api().get('/api/menu/items').query({ limit: 'many' });
    expect(res.status).toBe(400);
  });

  it('serves one dish', async () => {
    const res = await api().get(`/api/menu/items/${ITEM.jollof}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Jollof Rice');
    expect(Array.isArray(res.body.custom_options)).toBe(true);
  });

  it('answers an unknown dish with a 404', async () => {
    const res = await api().get('/api/menu/items/999999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('lists the categories with their dish counts', async () => {
    const res = await api().get('/api/menu/categories');

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    const rice = res.body.find((c) => c.slug === 'rice-dishes');
    expect(Number(rice.item_count)).toBe(2);
  });

  it('offers only cash while no payment provider is configured', async () => {
    const res = await api().get('/api/menu/payment-methods');

    expect(res.status).toBe(200);
    expect(res.body.provider).toBe('disabled');
    expect(res.body.onlineEnabled).toBe(false);
    expect(res.body.methods).toHaveLength(1);
    expect(res.body.methods[0].id).toBe('cash');
  });
});

describe('administering the menu', () => {
  it('refuses an anonymous administrator', async () => {
    const res = await api().post('/api/menu/items').send({ name: 'Sneaky', price: 1 });

    expect(res.status).toBe(401);
  });

  it('refuses a customer', async () => {
    const { agent } = await customerAgent();

    const res = await agent.post('/api/menu/items').send({ name: 'Sneaky', price: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden');
  });

  it('creates a dish', async () => {
    const { agent } = await adminAgent();

    const res = await agent.post('/api/menu/items').send({
      name: 'Kelewele',
      description: 'Spiced fried plantain.',
      price: 18,
      category_id: 2,
    });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Kelewele');
    expect(Number(res.body.price)).toBe(18);
    expect(res.body.slug).toBe('kelewele');
  });

  it('binds is_available on create (P1-03)', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/menu/items')
      .send({ name: 'Sold Out Today', price: 12, is_available: false });

    expect(res.status).toBe(201);
    expect(res.body.is_available).toBe(false);

    // ...and the dish really is off the customer menu.
    const menu = await api().get('/api/menu/items').query({ is_available: 'true' });
    expect(menu.body.map((i) => i.id)).not.toContain(res.body.id);
  });

  it('binds is_featured on create', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/menu/items')
      .send({ name: 'Featured Dish', price: 20, is_featured: true });

    expect(res.status).toBe(201);
    expect(res.body.is_featured).toBe(true);
  });

  it('refuses a dish with no name', async () => {
    const { agent } = await adminAgent();

    const res = await agent.post('/api/menu/items').send({ price: 20 });

    expect(res.status).toBe(400);
  });

  it('refuses a dish with a negative price', async () => {
    const { agent } = await adminAgent();

    const res = await agent.post('/api/menu/items').send({ name: 'Free Food', price: -5 });

    expect(res.status).toBe(400);
  });

  it('refuses an unknown field', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/menu/items')
      .send({ name: 'Sneaky', price: 20, is_admin: true });

    expect(res.status).toBe(400);
  });

  it('serves the edited price to the customer', async () => {
    const { agent } = await adminAgent();

    const updated = await agent
      .put(`/api/menu/items/${ITEM.palmWine}`)
      .send({ price: 12.5, name: 'Palm Wine (large)' });

    expect(updated.status).toBe(200);

    const menu = await api().get('/api/menu/items').query({ search: 'Palm Wine' });
    const served = menu.body.find((i) => i.id === ITEM.palmWine);
    expect(Number(served.price)).toBe(12.5);
    expect(served.name).toBe('Palm Wine (large)');
  });

  it('toggles availability', async () => {
    const { agent } = await adminAgent();

    const res = await agent.put(`/api/menu/items/${ITEM.palmWine}`).send({ is_available: false });
    expect(res.status).toBe(200);
    expect(res.body.is_available).toBe(false);

    const back = await agent.put(`/api/menu/items/${ITEM.palmWine}`).send({ is_available: true });
    expect(back.body.is_available).toBe(true);
  });

  it('deletes a dish', async () => {
    const { agent } = await adminAgent();

    const res = await agent.delete(`/api/menu/items/${ITEM.palmWine}`);
    expect(res.status).toBe(200);

    const gone = await api().get(`/api/menu/items/${ITEM.palmWine}`);
    expect(gone.status).toBe(404);
  });

  it('creates a category', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/menu/categories')
      .send({ name: 'Grills', description: 'Straight off the fire.', sort_order: 3 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Grills');
    expect(res.body.slug).toBe('grills');
  });

  it('refuses a category with no name', async () => {
    const { agent } = await adminAgent();

    const res = await agent.post('/api/menu/categories').send({ description: 'No name' });
    expect(res.status).toBe(400);
  });

  it('keeps the dishes when a category is deleted', async () => {
    const { agent } = await adminAgent();

    await agent.delete('/api/menu/categories/1').expect(200);

    const menu = await api().get('/api/menu/items');
    expect(menu.body.length).toBe(4);

    const jollof = menu.body.find((i) => i.id === ITEM.jollof);
    const palmWine = menu.body.find((i) => i.id === ITEM.palmWine);
    expect(jollof.category_id).toBeNull();
    expect(palmWine.category_id).toBe(2);
  });
});
