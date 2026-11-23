/**
 * The deployment contract.
 *
 * The configuration that puts the application on Vercel is code as much as
 * the application is: a missing rewrite means refreshing a route 404s, a
 * missing dependency means the function cannot start, and a drifting
 * dependency list means the deployed function is not the one that was
 * tested.
 *
 * These checks read the real files, so a change to any of them that breaks
 * the deployment is caught here rather than in production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { apiPrefix } from '../../src/middleware/apiPrefix.js';
import { createApp } from '../../src/app.js';
import { canTransition } from '../../src/services/order.service.js';
import { api, adminAgent, customerAgent } from '../helpers/api.js';
import { resetDatabase, ITEM } from '../helpers/db.js';

beforeEach(async () => {
  // The fixtures give every assertion an exact price and an exact dish.
  await resetDatabase();
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
const exists = (relative) => fs.existsSync(path.join(ROOT, relative));

describe('P0-07 · no credential is published', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const apiReadme = fs.readFileSync(path.join(ROOT, 'backend/README.md'), 'utf8');

  it('publishes no credential in the repository README', () => {
    // The live administrator's address and password were printed in this
    // file and on the login page.
    expect(readme).not.toMatch(/admin@foodgh\.com/i);
    expect(readme).not.toMatch(/admin123/i);
    expect(readme.toLowerCase()).not.toContain('demo credential');
  });

  it('publishes no credential in the API documentation', () => {
    expect(apiReadme).not.toMatch(/admin@foodgh\.com/i);
    expect(apiReadme).not.toMatch(/admin123/i);
  });

  it('names the place the administrator comes from instead', () => {
    expect(readme).toContain('BOOTSTRAP_ADMIN_EMAIL');
    expect(apiReadme).toContain('BOOTSTRAP_ADMIN_EMAIL');
  });
});

describe('P1-16 · the API documentation matches the API', () => {
  const apiReadme = fs.readFileSync(path.join(ROOT, 'backend/README.md'), 'utf8');

  it('does not describe the API that no longer exists', () => {
    expect(apiReadme).not.toContain('foodgh-backend.onrender.com');
    expect(apiReadme).not.toMatch(/Efia/i);
    expect(apiReadme).not.toContain('category=rice');
  });

  it('documents the field names the API actually accepts', () => {
    expect(apiReadme).toContain('menuItemId');
    expect(apiReadme).toContain('deliveryAddress');
    expect(apiReadme).toContain('customerPhone');
    expect(apiReadme).toContain('fulfilmentType');
    expect(apiReadme).toContain('paymentMethod');
  });

  it('documents the scripts that exist', () => {
    for (const script of ['npm run migrate', 'npm run seed', 'npm run env:check', 'npm test']) {
      expect(apiReadme).toContain(script);
    }
  });

  it('documents every route the API serves', () => {
    const documented = [
      '/api/auth/signup',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/refresh',
      '/api/auth/profile',
      '/api/auth/password',
      '/api/auth/availability',
      '/api/menu/categories',
      '/api/menu/items',
      '/api/menu/payment-methods',
      '/api/orders/cart',
      '/api/orders/quote',
      '/api/orders/validate-promo',
      '/api/orders/my-orders',
      '/api/admin/dashboard',
      '/api/admin/orders',
      '/api/admin/sales',
      '/api/admin/sales/export',
      '/api/admin/users',
      '/api/promos',
      '/api/payments/provider',
      '/api/assistant/message',
      '/api/health',
    ];

    for (const route of documented) {
      expect(apiReadme).toContain(route);
    }
  });

  it('explains that the session is a cookie, not a token in local storage', () => {
    expect(apiReadme).toContain('httpOnly');
    expect(apiReadme).not.toMatch(/stores the token in localStorage/i);
  });
});

describe('P1-14 · the Vercel configuration', () => {
  it('exists', () => {
    expect(exists('vercel.json')).toBe(true);
  });

  it('serves the built interface as the site root', () => {
    const vercel = readJson('vercel.json');

    expect(vercel.outputDirectory).toBe('frontend/build');
    expect(vercel.buildCommand).toContain('frontend');
  });

  it('rewrites every route that is not the API to the interface', () => {
    const vercel = readJson('vercel.json');
    const spa = vercel.rewrites.find((r) => r.destination === '/index.html');

    expect(spa).toBeTruthy();
    // The API must not be swallowed by the interface.
    expect(spa.source).toContain('api');
  });

  it('sends the API to the function', () => {
    const vercel = readJson('vercel.json');
    const apiRewrite = vercel.rewrites.find((r) => r.source.startsWith('/api'));

    expect(apiRewrite).toBeTruthy();
    expect(apiRewrite.destination).toBe('/api');
  });

  it('declares the function it serves the API from', () => {
    const vercel = readJson('vercel.json');

    expect(Object.keys(vercel.functions)).toContain('api/index.js');
    expect(exists('api/index.js')).toBe(true);
  });

  it('never lets a browser or a proxy cache an API response', () => {
    const vercel = readJson('vercel.json');
    const apiHeaders = vercel.headers.find((h) => h.source.startsWith('/api'));

    expect(apiHeaders).toBeTruthy();
    expect(apiHeaders.headers.map((h) => h.value).join(' ')).toContain('no-store');
  });

  it('exports the application from the function instead of listening on a port', () => {
    const source = fs.readFileSync(path.join(ROOT, 'api/index.js'), 'utf8');

    expect(source).toContain('export default app');
    expect(source).not.toMatch(/^\s*app\.listen\(/m);
  });
});

describe('P1-13 · the environment', () => {
  it('keeps the environment template committable', () => {
    // The .gitignore rule `.env.*` also matched `.env.example`, so the
    // template could not be committed at all.
    expect(exists('.env.example')).toBe(true);
  });

  it('holds no secret in the environment template', () => {
    const template = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');

    // Every secret is either empty or an obvious placeholder.
    const secrets = template
      .split('\n')
      .filter((line) => /^[A-Z0-9_]*(SECRET|API_KEY|PASSWORD)[A-Z0-9_]*=/.test(line))
      // PASSWORD_MIN_LENGTH is a policy, not a credential.
      .filter((line) => !/MIN_LENGTH|POLICY/.test(line));

    expect(secrets.length).toBeGreaterThan(0);

    for (const line of secrets) {
      const value = line.slice(line.indexOf('=') + 1).trim();
      expect(value === '' || /REPLACE|CHANGE|your-|example|placeholder/i.test(value)).toBe(true);
    }
  });
});

describe('the function and the local server ship the same dependencies', () => {
  it('lists the same runtime dependencies in both manifests', () => {
    const root = readJson('package.json');
    const backend = readJson('backend/package.json');

    // The function is built from the root manifest; the application is run
    // from the backend one. If the two drift, the deployed function is not
    // the one the test suite exercised.
    expect(Object.keys(root.dependencies).sort()).toEqual(Object.keys(backend.dependencies).sort());
  });

  it('lists the same versions in both manifests', () => {
    const root = readJson('package.json');
    const backend = readJson('backend/package.json');

    for (const [name, range] of Object.entries(root.dependencies)) {
      expect(backend.dependencies[name]).toBe(range);
    }
  });

  it('runs the same commands from the root', () => {
    const root = readJson('package.json');

    expect(root.scripts.migrate).toContain('backend');
    expect(root.scripts.seed).toContain('backend');
    expect(root.scripts.test).toContain('backend');
  });
});

describe('the function answers on the path it is served at', () => {
  it('restores the prefix when the platform strips it', () => {
    const middleware = apiPrefix();
    const req = { url: '/menu/items' };

    middleware(req, {}, () => {});
    expect(req.url).toBe('/api/menu/items');
  });

  it('leaves a path that already carries the prefix alone', () => {
    const middleware = apiPrefix();
    const req = { url: '/api/menu/items?limit=3' };

    middleware(req, {}, () => {});
    expect(req.url).toBe('/api/menu/items?limit=3');
  });

  it('keeps the query string', () => {
    const middleware = apiPrefix();
    const req = { url: '/menu/items?limit=3' };

    middleware(req, {}, () => {});
    expect(req.url).toBe('/api/menu/items?limit=3');
  });

  it('drops the path parameter injected by the Vercel rewrite', () => {
    const middleware = apiPrefix();
    const req = {
      url: '/api/menu/categories?path=categories&include_inactive=true',
      query: { path: 'categories', include_inactive: 'true' },
    };

    middleware(req, {}, () => {});
    expect(req.url).toBe('/api/menu/categories?include_inactive=true');
    expect(req.query.path).toBeUndefined();
    expect(req.query.include_inactive).toBe('true');
  });

  it('is idempotent', () => {
    const middleware = apiPrefix();
    const req = { url: '/api/health' };

    middleware(req, {}, () => {});
    middleware(req, {}, () => {});
    expect(req.url).toBe('/api/health');
  });

  it('serves the real routes when the prefix was stripped', async () => {
    // The application as the function builds it, asked for a route the way a
    // platform that strips the prefix would ask for it.
    const serverless = createApp({ restoreApiPrefix: true });

    const res = await request(serverless).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('the interface and the API agree', () => {
  const STATUSES = [
    'placed',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ];

  /**
   * The transitions the interface offers.
   *
   * The interface is a browser application built by webpack, so its source
   * cannot be imported here. The table is read out of the file instead —
   * and if the export is renamed, this fails loudly rather than quietly
   * comparing nothing.
   */
  const interfaceTransitions = () => {
    const source = fs.readFileSync(path.join(ROOT, 'frontend/src/config/brand.js'), 'utf8');
    const match = source.match(/export const ORDER_STATUS_TRANSITIONS = (\{[\s\S]*?\n\});/);

    if (!match) {
      throw new Error('frontend/src/config/brand.js no longer declares ORDER_STATUS_TRANSITIONS.');
    }

    // eslint-disable-next-line no-new-func
    return new Function(`return ${match[1]};`)();
  };

  it('offers exactly the status transitions the API accepts', () => {
    // The administration screen used to offer every later status, so an
    // administrator could pick one the API refuses and meet an error.
    const offered = interfaceTransitions();

    for (const from of STATUSES) {
      for (const to of STATUSES) {
        expect((offered[from] || []).includes(to)).toBe(canTransition(from, to));
      }
    }
  });

  it('refuses a transition the interface does not offer', async () => {
    const { agent: customer } = await customerAgent();
    const { agent: admin } = await adminAgent();

    const created = await customer.post('/api/orders').send({
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

    // "Delivered" is not one step from "Placed".
    const refused = await admin
      .put(`/api/admin/orders/${created.body.id}/status`)
      .send({ status: 'delivered' });

    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('conflict');
  });
});

describe('P0-01 · the contract the frontend was written against', () => {
  it('serves every endpoint the recovered contract listed', async () => {
    // The route table recovered from the live deployment in Sprint 0. A
    // missing route would break a page that used to work.
    const routes = [
      ['get', '/api/auth/profile'],
      ['get', '/api/menu/categories'],
      ['get', '/api/menu/items'],
      ['get', '/api/menu/items/1'],
      ['get', '/api/orders/my-orders'],
      ['get', '/api/orders/1'],
      ['get', '/api/admin/dashboard'],
      ['get', '/api/admin/orders'],
      ['get', '/api/admin/sales'],
      ['get', '/api/admin/sales/export'],
      ['get', '/api/admin/users'],
      ['get', '/api/promos'],
      ['get', '/api/health'],
    ];

    for (const [method, route] of routes) {
      const res = await api()[method](route);
      expect(res.status).not.toBe(404);
      expect(res.body?.error?.code).not.toBe('not_found');
    }
  });

  it('serves the endpoints the rebuild added', async () => {
    const routes = [
      ['get', '/api/orders/cart'],
      ['get', '/api/menu/payment-methods'],
      ['get', '/api/payments/provider'],
      ['get', '/api/health/ready'],
      ['get', '/api/auth/availability'],
    ];

    for (const [method, route] of routes) {
      const res = await api()[method](route);
      expect(res.status).not.toBe(404);
    }
  });

  it('names the API at its root', async () => {
    const res = await api().get('/api');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Afia Food Hub API');
  });
});
