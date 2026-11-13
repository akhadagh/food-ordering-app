/**
 * HTTP helpers for the integration suite.
 *
 * Every request goes through the real Express application - the same
 * middleware, routes and services the server runs - so a passing assertion
 * is a statement about the shipping application.
 */
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './db.js';

export const app = createApp();

export const ADMIN = {
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
};

let counter = 0;
export const uniqueEmail = (prefix = 'customer') => {
  counter += 1;
  return `${prefix}-${counter}-${Date.now()}@example.test`;
};

/** An agent that keeps cookies, like a browser. */
export const browser = () => request.agent(app);

/** A plain request with no cookie jar. */
export const api = () => request(app);

export async function signup(agent, overrides = {}) {
  const body = {
    name: 'Test Customer',
    email: uniqueEmail(),
    password: 'Password123',
    phone: '0241234567',
    ...overrides,
  };
  const res = await agent.post('/api/auth/signup').send(body);
  return { agent, res, body, token: res.body?.token, user: res.body?.user };
}

export async function signin(agent, email = ADMIN.email, password = ADMIN.password) {
  const res = await agent.post('/api/auth/login').send({ email, password });
  return { res, token: res.body?.token, user: res.body?.user };
}
export async function adminAgent() {
  const agent = browser();
  const { res, token, user } = await signin(agent);
  if (res.statusCode !== 200) {
    throw new Error(`The administrator could not sign in: ${JSON.stringify(res.body)}`);
  }
  return { agent, token, user };
}

export async function customerAgent() {
  const agent = browser();
  const { res, token } = await signup(agent);
  if (res.statusCode !== 201) {
    throw new Error(`The customer could not sign up: ${JSON.stringify(res.body)}`);
  }
  return { agent, token, user: res.body.user };
}

/** The Authorization header for a token. */
export const bearer = (token) => ({ Authorization: `Bearer ${token}` });

export default { app, browser, api, signup, signin, adminAgent, customerAgent, bearer };
