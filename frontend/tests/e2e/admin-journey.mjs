/**
 * End-to-end browser test for the Afia Food Hub administration screens.
 *
 * Exercises the management surfaces a kitchen manager actually uses:
 *   sign in → dashboard → menu CRUD → promo codes → order status → customers
 *
 * Usage:
 *   node tests/e2e/admin-journey.mjs
 *
 * Environment:
 *   FRONTEND_URL  default http://localhost:3111
 *   API_URL       default http://localhost:5000/api
 *   ADMIN_EMAIL   default admin@afiafoodhub.com
 *   ADMIN_PASSWORD default ChangeMe-Afia-2026
 */
import fs from 'node:fs';
import path from 'node:path';
import { Browser, sleep } from './browser.mjs';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3111';
const API = process.env.API_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@afiafoodhub.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe-Afia-2026';
const SHOTS = path.resolve(process.cwd(), 'tests/e2e/screenshots');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  -> ${detail}` : ''}`);
};

const stamp = Date.now();
const dishName = `E2E Test Dish ${stamp}`;
const promoCode = `E2E${String(stamp).slice(-6)}`;

/** Call the API directly, with the admin session cookie from the browser. */
async function apiAsAdmin(browser, method, apiPath, body) {
  return browser.evaluate(`
    const res = await fetch(${JSON.stringify(API + apiPath)}, {
      method: ${JSON.stringify(method)},
      credentials: 'include',
      headers: ${body ? "{ 'Content-Type': 'application/json' }" : '{}'},
      ${body ? `body: JSON.stringify(${JSON.stringify(body)}),` : ''}
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  `);
}

async function main() {
  const browser = new Browser();
  await browser.launch();

  try {
    /* ------------------------------------------------------- sign in -- */
    console.log('\n=== Sign in ===');
    await browser.goto(`${FRONTEND}/login`, { waitFor: 'main' });
    await sleep(600);
    await browser.type('#email', ADMIN_EMAIL);
    await browser.type('#password', ADMIN_PASSWORD);
    await browser.clickByText('Sign in', 'button');
    await sleep(2500);

    let body = await browser.text();
    check('the administrator is signed in', !body.includes('Welcome back'), body.slice(0, 140));

    /* ------------------------------------------------------ dashboard -- */
    console.log('\n=== Dashboard ===');
    await browser.goto(`${FRONTEND}/admin`, { waitFor: 'main' });
    await sleep(1500);
    body = await browser.text();
    check('the dashboard loads', body.includes('Dashboard'), body.slice(0, 140));
    check('revenue is reported', body.includes('Revenue booked'), body.slice(0, 200));
    check('no fabricated numbers', !body.includes('500+') && !body.includes('4.8'));
    await browser.screenshot(path.join(SHOTS, '20-admin-dashboard.png'));

    /* ------------------------------------------------------ menu CRUD -- */
    console.log('\n=== Menu management ===');
    await browser.goto(`${FRONTEND}/admin/menu`, { waitFor: 'main' });
    await sleep(1500);
    body = await browser.text();
    check('the menu page loads', body.includes('Manage menu'), body.slice(0, 140));

    // Remove any dish left behind by an earlier run, so the checks below
    // count only the dish this run created.
    const stale = await browser.evaluate(`
      const list = await fetch(${JSON.stringify(API + '/menu/items?search=E2E%20Test%20Dish&limit=100')}, {
        credentials: 'include',
      });
      const items = await list.json();
      const leftovers = items.filter((i) => (i.name || '').startsWith('E2E Test Dish '));
      for (const item of leftovers) {
        await fetch(${JSON.stringify(API + '/menu/items/')} + item.id, {
          method: 'DELETE',
          credentials: 'include',
        });
      }
      return leftovers.length;
    `);
    if (stale) console.log(`  (removed ${stale} dish(es) left by an earlier run)`);

    await browser.clickByText('Add dish', 'button');
    await sleep(700);
    await browser.type('#dish-name', dishName);
    await browser.type('#dish-description', 'A dish created by the end-to-end test.');
    await browser.type('#dish-price', '18.50');
    await browser.type('#dish-stock', '6');
    await browser.clickInDialog('Add dish');
    await sleep(2000);

    body = await browser.text();
    check('the new dish appears in the menu', body.includes(dishName), body.slice(0, 200));
    check(
      'the new dish shows its price',
      body.includes('18.50') || body.includes('18.5'),
      body.slice(0, 200)
    );

    // The dish must be on the public menu, priced by the server.
    const publicMenu = await browser.evaluate(`
      const res = await fetch(${JSON.stringify(API + '/menu/items?search=E2E%20Test%20Dish&limit=100')});
      const items = await res.json();
      return items
        .filter((i) => i.name === ${JSON.stringify(dishName)})
        .map((i) => ({ name: i.name, price: i.price, available: i.is_available }));
    `);
    check(
      'the dish is on the customer menu at the price the admin entered',
      publicMenu.length === 1 && publicMenu[0].price === '18.50',
      JSON.stringify(publicMenu)
    );

    // Edit it.
    const edited = await browser.evaluate(`
      const rows = Array.from(document.querySelectorAll('tr'));
      const row = rows.find((r) => (r.innerText || '').includes(${JSON.stringify(dishName)}));
      if (!row) return false;
      const button = row.querySelector('button[aria-label^="Edit"]');
      if (!button) return false;
      button.click();
      return true;
    `);
    check('the dish can be opened for editing', edited);
    await sleep(700);
    await browser.type('#dish-price', '21.00');
    await browser.clickInDialog('Update dish');
    await sleep(2000);

    const afterEdit = await browser.evaluate(`
      const res = await fetch(${JSON.stringify(API + '/menu/items?search=E2E%20Test%20Dish&limit=100')});
      const items = await res.json();
      return items.filter((i) => i.name === ${JSON.stringify(dishName)}).map((i) => i.price);
    `);
    check('the edited price is served to customers', afterEdit[0] === '21.00', JSON.stringify(afterEdit));

    // Delete it again.
    const deleted = await browser.evaluate(`
      const rows = Array.from(document.querySelectorAll('tr'));
      const row = rows.find((r) => (r.innerText || '').includes(${JSON.stringify(dishName)}));
      if (!row) return false;
      const button = row.querySelector('button[aria-label^="Delete"]');
      if (!button) return false;
      button.click();
      return true;
    `);
    check('the dish can be deleted', deleted);
    await sleep(2000);
    body = await browser.text();
    check('the deleted dish is gone', !body.includes(dishName), body.slice(0, 200));
    await browser.screenshot(path.join(SHOTS, '21-admin-menu.png'));

    /* ---------------------------------------------------------- promos -- */
    console.log('\n=== Promo codes ===');
    await browser.goto(`${FRONTEND}/admin/promos`, { waitFor: 'main' });
    await sleep(1200);
    await browser.clickByText('New promo', 'button');
    await sleep(700);
    await browser.type('#promo-code', promoCode);
    await browser.type('#promo-value', '10');
    await browser.clickInDialog('Create');
    await sleep(2000);

    body = await browser.text();
    check('the new promo code is listed', body.includes(promoCode), body.slice(0, 200));

    // A code that exists in the database must work at checkout.
    const promoCheck = await apiAsAdmin(browser, 'POST', '/orders/validate-promo', {
      code: promoCode,
      subtotal: 50,
    });
    check(
      'the promo code is accepted by the checkout',
      promoCheck.status === 200 && promoCheck.data?.valid === true,
      JSON.stringify(promoCheck)
    );

    // A code that does not exist must not be.
    const bogus = await apiAsAdmin(browser, 'POST', '/orders/validate-promo', {
      code: 'NOT-A-REAL-CODE',
      subtotal: 50,
    });
    check(
      'an invented promo code is refused',
      bogus.status === 200 && bogus.data?.valid === false,
      JSON.stringify(bogus)
    );
    await browser.screenshot(path.join(SHOTS, '22-admin-promos.png'));

    /* ---------------------------------------------------------- orders -- */
    console.log('\n=== Order management ===');
    await browser.goto(`${FRONTEND}/admin/orders`, { waitFor: 'main' });
    await sleep(1500);
    body = await browser.text();
    check('the orders page loads', body.includes('Manage orders'), body.slice(0, 140));

    const orderCards = await browser.evaluate(`
      return Array.from(document.querySelectorAll('article'))
        .map((a) => (a.innerText || '').split('\\n')[0])
        .filter(Boolean)
        .slice(0, 5);
    `);
    check('orders are listed', orderCards.length > 0, JSON.stringify(orderCards));

    // Moving an order forward must work; skipping a step must not.
    const statusChange = await browser.evaluate(`
      const select = document.querySelector('select[id^="status-"]');
      if (!select) return { ok: false, reason: 'no order with a status control' };
      const current = select.value;
      const allowed = Array.from(select.options)
        .filter((o) => !o.disabled && o.value !== current)
        .map((o) => o.value);
      const disabled = Array.from(select.options)
        .filter((o) => o.disabled && o.value !== current)
        .map((o) => o.value);
      return { ok: true, current, allowed, disabled, id: select.id };
    `);
    check(
      'only the legal next statuses are offered',
      statusChange.ok && statusChange.allowed.length > 0,
      JSON.stringify(statusChange)
    );
    check(
      'illegal status transitions are not selectable',
      statusChange.ok && statusChange.disabled.length > 0,
      JSON.stringify(statusChange.disabled)
    );

    if (statusChange.ok && statusChange.allowed.length) {
      const next = statusChange.allowed[0];
      const orderId = String(statusChange.id).replace('status-', '');
      const moved = await browser.evaluate(`
        const select = document.getElementById(${JSON.stringify(statusChange.id)});
        if (!select) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        setter.call(select, ${JSON.stringify(next)});
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      `);
      check('a legal status change can be selected', moved);

      // The server is the authority on the new status, so it is asked
      // directly rather than read back out of a list that may still be
      // refreshing.
      let stored = null;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        stored = await browser.evaluate(`
          const res = await fetch(${JSON.stringify(API + '/admin/orders?limit=100')}, {
            credentials: 'include',
          });
          const data = await res.json();
          const order = (data.orders || []).find((o) => String(o.id) === ${JSON.stringify(orderId)});
          return order ? order.status : null;
        `);
        if (stored === next) break;
        await sleep(500);
      }
      check('the server recorded the new status', stored === next, `${stored} (wanted ${next})`);

      // And the screen must show it.
      let shown = false;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        body = await browser.text();
        if (body.toLowerCase().includes(next.replace(/_/g, ' '))) {
          shown = true;
          break;
        }
        await sleep(500);
      }
      check('the order status is shown on the screen', shown, body.slice(0, 200));
    }
    await browser.screenshot(path.join(SHOTS, '23-admin-orders.png'));

    /* ---------------------------------------------------------- users -- */
    console.log('\n=== Customers ===');
    await browser.goto(`${FRONTEND}/admin/users`, { waitFor: 'main' });
    await sleep(1500);
    body = await browser.text();
    check('the customers page loads', body.includes('Customers'), body.slice(0, 140));
    check('customers are listed', body.includes('@'), body.slice(0, 200));
    await browser.screenshot(path.join(SHOTS, '24-admin-users.png'));

    /* ------------------------------------------------------- sales CSV -- */
    console.log('\n=== Sales export ===');
    const csv = await browser.evaluate(`
      const res = await fetch(${JSON.stringify(API + '/admin/sales/export')}, { credentials: 'include' });
      const text = await res.text();
      return { status: res.status, type: res.headers.get('content-type'), head: text.slice(0, 400) };
    `);
    check('the sales CSV downloads', csv.status === 200 && csv.type.includes('text/csv'), JSON.stringify(csv).slice(0, 200));
    check('the CSV has a header row', /order|revenue|total/i.test(csv.head || ''), (csv.head || '').slice(0, 120));

    /* --------------------------------------------------- console log -- */
    console.log('\n=== Browser console ===');
    const realErrors = browser.consoleErrors.filter(
      (e) => !/favicon|Download the React DevTools|net::ERR_/.test(e)
    );
    check('no unexpected console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));
    check('no uncaught exceptions', browser.pageErrors.length === 0, browser.pageErrors.slice(0, 2).join(' | '));

    /* -------------------------------------------------------- cleanup -- */
    const cleaned = await browser.evaluate(`
      const list = await fetch(${JSON.stringify(API + '/promos')}, { credentials: 'include' });
      const promos = await list.json();
      let removed = 0;
      for (const promo of promos) {
        if (promo.code !== ${JSON.stringify(promoCode)}) continue;
        await fetch(${JSON.stringify(API + '/promos/')} + promo.id, {
          method: 'DELETE',
          credentials: 'include',
        });
        removed += 1;
      }
      return removed;
    `);
    check('the test promo code is removed again', cleaned === 1, `${cleaned} removed`);
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${'='.repeat(62)}`);
  console.log(`  ${passed}/${results.length} administration checks passed`);
  console.log(`  screenshots: ${SHOTS}`);
  console.log(`${'='.repeat(62)}\n`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error('\nADMIN E2E RUN FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
