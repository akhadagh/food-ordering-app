import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { BRAND, BUSINESS } from '../config/brand.js';

/**
 * The Afia Food Hub assistant.
 *
 * The original chatbot was a hardcoded keyword matcher that answered with
 * stale prices, promo codes that did not exist, and invented business facts
 * (audit finding P2-10). This implementation answers ONLY from live data:
 *
 *  - menu, price and availability questions are answered from the database
 *  - order questions are answered from the signed-in customer's own orders
 *  - payment questions are answered from the actual provider configuration
 *  - anything it does not know is declined, with a route to a human
 *
 * It never states an order status or a payment outcome that it has not read
 * from the database.
 */

const FAQ = {
  greeting:
    `Hello! I'm the ${BRAND.name} assistant. I can help with the menu, prices, ` +
    'availability, delivery, payments and your orders. What would you like to know?',
  thanks: "You're welcome! Anything else I can help you with?",
  goodbye: `Goodbye! Enjoy your meal — come back soon.`,
  help:
    'I can help you with:\n' +
    '• The menu, prices and what is available right now\n' +
    '• Delivery areas, times and fees\n' +
    '• How to pay (Mobile Money, card or cash on delivery)\n' +
    '• Tracking, cancelling or reviewing your orders\n' +
    '• Your profile and saved details\n\n' +
    'Just ask in your own words.',
  unknown:
    "I'm not sure I understand that one, and I don't want to guess. I can help with the menu, " +
    'prices, availability, delivery, payments and your own orders. If it is something else, ' +
    'the team will be happy to help you directly.',
};

const match = (text, ...needles) => needles.some((n) => text.includes(n));

async function menuAnswer(text) {
  // "how much is jollof", "is banku available", "what do you have"
  const { rows } = await query(
    `SELECT mi.name, mi.price, mi.is_available, mi.description, c.name AS category
       FROM menu_items mi
       LEFT JOIN categories c ON c.id = mi.category_id
      ORDER BY mi.name`
  );

  if (!rows.length) {
    return 'Our menu is being updated right now. Please check back in a moment.';
  }

  const lower = text.toLowerCase();

  // Look for a dish mentioned in the question.
  const named = rows.filter(
    (r) => r.name && lower.includes(r.name.toLowerCase().split(' ')[0])
  );

  if (named.length === 1) {
    const item = named[0];
    if (!item.is_available) {
      return `“${item.name}” is not available right now. Our team can tell you when it is back — ${BUSINESS.contactLine()}`;
    }
    const description = item.description ? ` ${item.description}` : '';
    return `${item.name} is GH₵ ${Number(item.price).toFixed(2)}.${description} It is available now.`;
  }

  if (named.length > 1) {
    const list = named
      .map(
        (r) =>
          `${r.name} — GH₵ ${Number(r.price).toFixed(2)}${r.is_available ? '' : ' (unavailable today)'}`
      )
      .join('\n');
    return `Here's what we have for that:\n${list}`;
  }

  // General menu question: list the available dishes.
  const available = rows.filter((r) => r.is_available);
  if (!available.length) {
    return 'Our kitchen is between services right now. Please check back shortly.';
  }
  const sample = available.slice(0, 6).map((r) => `${r.name} (GH₵ ${Number(r.price).toFixed(2)})`);
  return `Right now we have ${available.length} dish${available.length === 1 ? '' : 'es'} available, including:\n${sample.join('\n')}\n\nAsk me about any dish and I'll give you the full price and details.`;
}
async function availabilityAnswer(text) {
  const lower = text.toLowerCase();

  // The question is a sentence, not a dish name: "is sobolo available?" has
  // to be matched against the dishes on the menu, not searched for whole.
  const { rows } = await query('SELECT name, price, is_available FROM menu_items ORDER BY name');

  const named = rows.filter(
    (r) => r.name && (lower.includes(r.name.toLowerCase()) || lower.includes(r.name.toLowerCase().split(' ')[0]))
  );

  if (!named.length) {
    return 'I could not find that dish on the menu. What is it called?';
  }

  const item = named[0];
  return item.is_available
    ? `Yes — ${item.name} is available right now at GH₵ ${Number(item.price).toFixed(2)}.`
    : `Unfortunately ${item.name} is sold out right now. ${BUSINESS.contactLine()}`;
}

function deliveryAnswer() {
  const zones = env.deliveryZones.length ? env.deliveryZones.join(', ') : 'Accra';
  const fee = env.deliveryFee > 0 ? `GH₵ ${Number(env.deliveryFee).toFixed(2)}` : 'no delivery fee';
  const free = env.freeDeliveryThreshold > 0
    ? ` Orders over GH₵ ${Number(env.freeDeliveryThreshold).toFixed(2)} deliver free.`
    : '';
  const hours = env.businessHours ? ` We are open ${env.businessHours}.` : '';
  return `We deliver across ${zones}. The delivery fee is ${fee}.${free}${hours}`;
}

function paymentAnswer() {
  const methods = [];
  if (env.paymentProvider === 'paystack') {
    methods.push('MTN Mobile Money', 'Telecel Cash', 'AirtelTigo Money', 'debit or credit card');
  } else if (env.paymentProvider === 'hubtel') {
    methods.push('Mobile Money', 'debit or credit card');
  }
  methods.push('cash on delivery');

  const online = methods.length > 1;
  return online
    ? `You can pay with ${methods.join(', ')}. Mobile money is confirmed as soon as you approve the prompt on your phone, and the order status updates straight away.`
    : `Right now you can pay ${methods[0]} — the payment is made when your food arrives. Online mobile money payments are not switched on at the moment.`;
}

async function ordersAnswer(user, text) {
  if (!user) {
    return 'Sign in and I can look up your orders, their status and their progress. Open “My orders” and everything is there.';
  }

  const lower = text.toLowerCase();

  const { rows: latest } = await query(
    `SELECT id, status, payment_status, total, created_at, estimated_delivery
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3`,
    [user.id]
  );

  if (!latest.length) {
    return 'You have not placed an order yet. When you do, I can tell you exactly where it is.';
  }

  if (match(lower, 'track', 'where', 'status', 'progress', 'delivery of', 'my order')) {
    const order = latest[0];
    const status = order.status.replace(/_/g, ' ');
    const payment = order.payment_status.replace(/_/g, ' ');
    const eta = order.estimated_delivery
      ? ` It should arrive around ${new Date(order.estimated_delivery).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}.`
      : '';
    return `Your latest order #${order.id} is currently ${status}, and the payment is ${payment}.${eta} Open “My orders” for the full timeline.`;
  }

  const summary = latest
    .map((o) => `#${o.id} — ${o.status.replace(/_/g, ' ')} — GH₵ ${Number(o.total).toFixed(2)}`)
    .join('\n');
  return `Here are your recent orders:\n${summary}\n\nOpen “My orders” for the full timeline and any actions.`;
}

function cancelAnswer() {
  return 'You can cancel an order from “My orders” while it is still placed or confirmed. Once the kitchen has started preparing it, we can no longer cancel it — please call us instead and we will help.';
}

function profileAnswer(user) {
  if (!user) return 'Sign in and you can review your name, phone number and saved delivery address.';
  const bits = [`Your name on the account is ${user.name}.`];
  if (user.phone) bits.push(`We reach you on ${user.phone}.`);
  if (user.address) bits.push(`Your saved delivery address is ${user.address}.`);
  return `${bits.join(' ')} You can change these any time under “Profile”.`;
}

/* ------------------------------------------------------------------ *
 * Optional AI layer
 * ------------------------------------------------------------------ */

async function aiAnswer(text, context) {
  if (env.aiProvider === 'none' || !env.aiApiKey || !env.aiModel) return null;

  try {
    const system = [
      `You are the customer assistant for ${BRAND.name}, a Ghanaian food ordering service.`,
      'Answer ONLY using the supplied menu, delivery and payment facts.',
      'Never invent a price, a dish, an order status, a payment outcome or a discount.',
      'If the facts do not contain the answer, say so and suggest contacting the team.',
      'Keep answers under 60 words. Prices are in Ghana cedis (GH₵).',
    ].join(' ');

    const response = await fetch(env.aiApiBase || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.aiModel,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'system', content: `Facts:\n${JSON.stringify(context)}` },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!response.ok) {
      logger.warn('assistant.ai_failed', { status: response.status });
      return null;
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content.trim() : null;
  } catch (err) {
    logger.warn('assistant.ai_error', { message: err.message });
    return null;
  }
}

/* ------------------------------------------------------------------ */

/**
 * Answer a customer question.
 * `user` is the signed-in customer or null.
 */
export async function answer(text, user = null) {
  const lower = String(text || '').toLowerCase().trim();
  if (!lower) return FAQ.help;

  if (match(lower, 'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening')) {
    return FAQ.greeting;
  }
  if (match(lower, 'thank')) return FAQ.thanks;
  if (match(lower, 'bye', 'goodbye', 'see you')) return FAQ.goodbye;
  if (match(lower, 'help', 'what can you do', 'what do you do')) return FAQ.help;

  // Facts the assistant is allowed to reason over.
  // The category lives on `categories`, not on `menu_items`, so the tables
  // have to be joined - selecting it from `menu_items` made every question
  // that reached this point fail with a database error.
  const { rows: menu } = await query(
    `SELECT mi.name, mi.price, mi.is_available, mi.description, c.name AS category
       FROM menu_items mi
       LEFT JOIN categories c ON c.id = mi.category_id
      ORDER BY mi.name`
  );
  const context = {
    menu: menu.slice(0, 60),
    delivery: {
      zones: env.deliveryZones,
      fee: env.deliveryFee,
      freeThreshold: env.freeDeliveryThreshold,
      hours: env.businessHours,
    },
    payments: {
      provider: env.paymentProvider,
      onlineEnabled: env.paymentProvider !== 'disabled',
      methods: [
        'MTN Mobile Money',
        'Telecel Cash',
        'AirtelTigo Money',
        'card',
        'cash on delivery',
      ],
    },
  };

  const ai = await aiAnswer(text, context);
  if (ai) return ai;

  if (match(lower, 'cancel', 'cancellation')) return cancelAnswer();
  if (match(lower, 'track', 'where is', 'status', 'progress', 'my order', 'orders')) {
    return ordersAnswer(user, lower);
  }
  if (match(lower, 'pay', 'payment', 'momo', 'mobile money', 'telecel', 'vodafone', 'airteltigo', 'card', 'cash')) {
    return paymentAnswer();
  }
  if (match(lower, 'deliver', 'delivery', 'fee', 'charge', 'zone', 'area', 'open', 'hours', 'close')) {
    return deliveryAnswer();
  }
  if (match(lower, 'profile', 'address', 'phone', 'my details', 'account')) {
    return profileAnswer(user);
  }
  if (match(lower, 'available', 'in stock', 'sold out', 'still have')) {
    return availabilityAnswer(lower);
  }
  if (match(lower, 'menu', 'food', 'dish', 'dishes', 'eat', 'serve', 'price', 'cost', 'how much', 'what do you have', 'jollof', 'banku', 'fufu', 'waakye', 'kenkey', 'rice', 'soup')) {
    return menuAnswer(lower);
  }

  return FAQ.unknown;
}

export default { answer };
