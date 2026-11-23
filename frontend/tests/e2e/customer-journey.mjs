/**
 * End-to-end browser test for the Afia Food Hub customer journey.
 *
 * Drives a real browser against the running frontend and API:
 *   browse → sign in → add to cart → checkout → order → track → admin
 *
 * Usage:
 *   node tests/e2e/customer-journey.mjs
 *
 * Environment:
 *   FRONTEND_URL  default http://localhost:3111
 *   API_URL       default http://localhost:5000/api
 *   ADMIN_EMAIL   required for a seeded administrator
 *   ADMIN_PASSWORD required for that administrator
 */
import fs from 'node:fs';
import path from 'node:path';
import { Browser, sleep } from './browser.mjs';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3111';
const API = process.env.API_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'e2e.admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'E2E-Test-Only-2026';
const SHOTS = path.resolve(process.cwd(), 'tests/e2e/screenshots');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  -> ${detail}` : ''}`);
};

const uniqueEmail = `e2e.${Date.now()}@example.com`;

async function main() {
  const browser = new Browser();
  await browser.launch();

  try {
    /* ------------------------------------------------------ homepage -- */
    console.log('\n=== Homepage ===');
    await browser.goto(`${FRONTEND}/`, { waitFor: 'main' });
    await browser.waitForText('Real Ghanaian food');

    const title = await browser.evaluate('return document.title;');
    check('the page title names Afia Food Hub', title.includes('Afia Food Hub'), title);

    const description = await browser.evaluate(
      'return document.querySelector(\'meta[name="description"]\')?.content || "";'
    );
    check('the meta description is present', description.length > 40);

    const logoOk = await browser.evaluate(
      'const i = document.querySelector(\'img[src*="afia-logo-horizontal"]\'); return !!i && i.complete && i.naturalWidth > 0;'
    );
    check('the logo renders', logoOk);

    const favicon = await browser.evaluate(
      'return !!document.querySelector(\'link[rel="icon"][type="image/svg+xml"]\');'
    );
    check('the SVG favicon is referenced', favicon);

    const heroImgOk = await browser.evaluate(
      'const i = document.querySelector(\'img[src*="hero-fufu-palmnut"]\'); return !!i && i.complete && i.naturalWidth > 0;'
    );
    check('the hero photograph loads', heroImgOk);

    const claims = await browser.evaluate(
      'const t = document.body.innerText; return t.includes("500+") || t.includes("4.8 Rating");'
    );
    check('no fabricated customer-count or rating claims', !claims);

    await browser.screenshot(path.join(SHOTS, '01-homepage.png'));

    /* ---------------------------------------------------------- menu -- */
    console.log('\n=== Menu ===');
    await browser.goto(`${FRONTEND}/menu`, { waitFor: 'main' });
    await browser.waitForText('Our menu');
    await sleep(900);

    const cardCount = await browser.evaluate(
      'return document.querySelectorAll(\'article\').length;'
    );
    check('menu cards render', cardCount > 0, `${cardCount} cards`);

    const brokenImages = await browser.evaluate(
      'return Array.from(document.querySelectorAll("img")).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);'
    );
    check('every dish image loads', brokenImages.length === 0, brokenImages.join(', '));

    const prices = await browser.evaluate(
      'return (document.body.innerText.match(/GH₵\\s?\\d+\\.\\d\\d/g) || []).length;'
    );
    check('prices are shown in cedis', prices > 0, `${prices} prices`);

    // Search actually filters.
    await browser.type('#menu-search', 'jollof');
    await sleep(1200);
    const afterSearch = await browser.evaluate(
      'return document.querySelectorAll(\'article\').length;'
    );
    check('search narrows the menu', afterSearch > 0 && afterSearch < cardCount, `${afterSearch} of ${cardCount}`);

    await browser.screenshot(path.join(SHOTS, '02-menu.png'));

    /* --------------------------------------------------------- cart -- */
    console.log('\n=== Cart ===');
    await browser.goto(`${FRONTEND}/menu`, { waitFor: 'main' });
    await sleep(1200);

    // Every published dish has a confirmed price and may require a choice;
    // this is the flow the kitchen actually needs.
    await browser.type('#menu-search', 'Banku with Okra');
    await sleep(1400);
    const choseOptions = await browser.evaluate(`
      const btn = Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === 'Choose options');
      if (!btn) return false;
      btn.click();
      return true;
    `);
    check('a dish with options opens the options panel', choseOptions);
    await sleep(700);
    await browser.clickByText('Fish', 'button');
    await sleep(300);
    await browser.clickByText('Add GH₵', 'button');
    await sleep(1500);

    await browser.goto(`${FRONTEND}/cart`, { waitFor: 'main' });
    await sleep(900);
    const cartText = await browser.text();
    check('the cart shows an item', cartText.includes('Order summary'), cartText.slice(0, 120));
    check('the cart shows a total', /GH₵\s?\d+\.\d\d/.test(cartText));
    await browser.screenshot(path.join(SHOTS, '03-cart.png'));

    /* ------------------------------------------------------- sign in -- */
    console.log('\n=== Authentication ===');
    await browser.goto(`${FRONTEND}/signup`, { waitFor: 'main' });
    await browser.type('#name', 'End To End');
    await browser.type('#email', uniqueEmail);
    await browser.type('#phone', '+233201234567');
    await browser.type('#password', 'Test1234');
    await browser.clickByText('Create account', 'button');
    await sleep(2500);

    let body = await browser.text();
    check('registration signs the customer in', !body.includes('Create your account'), body.slice(0, 140));

    await browser.goto(`${FRONTEND}/profile`, { waitFor: 'main' });
    await sleep(900);
    body = await browser.text();
    check('the profile page loads for a signed-in customer', body.includes('End To End'), body.slice(0, 140));
    await browser.screenshot(path.join(SHOTS, '04-profile.png'));

    // The guest cart is merged into the new account, so nothing is lost when
    // a customer signs up after browsing.
    await browser.goto(`${FRONTEND}/cart`, { waitFor: 'main' });
    await sleep(1200);
    body = await browser.text();
    check(
      'the cart survives the sign-up',
      body.includes('Order summary') && body.includes('GH₵'),
      body.slice(0, 160)
    );

    /* ------------------------------------------------------ checkout -- */
    console.log('\n=== Checkout ===');
    await browser.goto(`${FRONTEND}/checkout`, { waitFor: 'main' });
    await sleep(900);

    await browser.type('#phone', '+233201234567');
    await browser.type('#address', '12 Oxford Street, Osu, Accra');
    await sleep(300);
    await browser.screenshot(path.join(SHOTS, '05-checkout.png'));

    const checkoutText = await browser.text();
    check('the checkout shows the server total', /Total/.test(checkoutText));

    await browser.clickByText('Place order', 'button');
    await sleep(3000);

    body = await browser.text();
    check('the order is confirmed', body.includes('Order placed'), body.slice(0, 200));
    const orderMatch = body.match(/Order #(\d+)/);
    check('an order number is shown', Boolean(orderMatch), body.slice(0, 200));
    await browser.screenshot(path.join(SHOTS, '06-order-placed.png'));

    /* --------------------------------------------------- order track -- */
    if (orderMatch) {
      const orderId = orderMatch[1];
      await browser.goto(`${FRONTEND}/orders/${orderId}`, { waitFor: 'main' });
      await sleep(1200);
      body = await browser.text();
      check('the order can be tracked', body.includes(`Order #${orderId}`), body.slice(0, 160));
      check('the status timeline is shown', body.includes('Timeline'), body.slice(0, 200));
      await browser.screenshot(path.join(SHOTS, '07-order-tracking.png'));

      await browser.goto(`${FRONTEND}/orders`, { waitFor: 'main' });
      await sleep(900);
      body = await browser.text();
      check('the order appears in "my orders"', body.includes(`Order #${orderId}`));
    }

    /* --------------------------------------------------------- admin -- */
    console.log('\n=== Administration ===');
    await browser.goto(`${FRONTEND}/login`, { waitFor: 'main' });
    await sleep(600);
    await browser.type('#email', ADMIN_EMAIL);
    await browser.type('#password', ADMIN_PASSWORD);
    await browser.clickByText('Sign in', 'button');
    await sleep(2500);

    body = await browser.text();
    check('the administrator is signed in', !body.includes('Welcome back'), body.slice(0, 140));

    await browser.goto(`${FRONTEND}/admin`, { waitFor: 'main' });
    await sleep(1200);
    body = await browser.text();
    check('the dashboard loads', body.includes('Dashboard'), body.slice(0, 140));
    check('the dashboard shows revenue', body.includes('Revenue booked'), body.slice(0, 200));
    await browser.screenshot(path.join(SHOTS, '08-admin-dashboard.png'));

    await browser.goto(`${FRONTEND}/admin/orders`, { waitFor: 'main' });
    await sleep(1200);
    body = await browser.text();
    check('the admin orders page loads', body.includes('Manage orders'), body.slice(0, 140));
    await browser.screenshot(path.join(SHOTS, '09-admin-orders.png'));

    await browser.goto(`${FRONTEND}/admin/menu`, { waitFor: 'main' });
    await sleep(1200);
    body = await browser.text();
    check('the admin menu page loads', body.includes('Manage menu'), body.slice(0, 140));
    await browser.screenshot(path.join(SHOTS, '10-admin-menu.png'));

    await browser.goto(`${FRONTEND}/admin/sales`, { waitFor: 'main' });
    await sleep(1800);
    body = await browser.text();
    check('the sales report loads', body.includes('Sales & reports'), body.slice(0, 140));
    check('the sales report shows revenue figures', /GH₵\s?\d/.test(body));
    await browser.screenshot(path.join(SHOTS, '11-admin-sales.png'));

    await browser.goto(`${FRONTEND}/admin/promos`, { waitFor: 'main' });
    await sleep(1000);
    body = await browser.text();
    check('the promo page loads', body.includes('Promo codes'), body.slice(0, 140));
    await browser.screenshot(path.join(SHOTS, '12-admin-promos.png'));

    await browser.goto(`${FRONTEND}/admin/users`, { waitFor: 'main' });
    await sleep(1200);
    body = await browser.text();
    check('the customers page loads', body.includes('Customers'), body.slice(0, 140));
    await browser.screenshot(path.join(SHOTS, '13-admin-users.png'));

    /* ------------------------------------------------------ 404 page -- */
    await browser.goto(`${FRONTEND}/this-page-does-not-exist`, { waitFor: 'main' });
    await sleep(600);
    body = await browser.text();
    check('an unknown route shows the branded 404', body.includes('404'), body.slice(0, 140));

    /* --------------------------------------------------- mobile view -- */
    console.log('\n=== Responsive ===');
    await browser.setViewport(390, 844);
    await browser.goto(`${FRONTEND}/menu`, { waitFor: 'main' });
    await sleep(1200);
    const overflow = await browser.evaluate(
      'return document.documentElement.scrollWidth > window.innerWidth + 2;'
    );
    check('no horizontal overflow on a 390px viewport', !overflow);
    await browser.screenshot(path.join(SHOTS, '14-mobile-menu.png'));

    /* --------------------------------------------------- console log -- */
    console.log('\n=== Browser console ===');
    const realErrors = browser.consoleErrors.filter(
      (e) => !/favicon|Download the React DevTools|net::ERR_/.test(e)
    );
    check('no unexpected console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));
    check('no uncaught exceptions', browser.pageErrors.length === 0, browser.pageErrors.slice(0, 2).join(' | '));
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${'='.repeat(62)}`);
  console.log(`  ${passed}/${results.length} end-to-end checks passed`);
  console.log(`  screenshots: ${SHOTS}`);
  console.log(`${'='.repeat(62)}\n`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error('\nE2E RUN FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
