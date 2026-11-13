/**
 * Image uploads.
 *
 * The original multipart endpoint was entirely broken (audit finding P1-02).
 * These assertions cover the allowlist, the byte check and the size limit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { api, adminAgent, customerAgent } from '../helpers/api.js';
import { resetDatabase } from '../helpers/db.js';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/menu');

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

function pngBytes(size = 64) {
  return Buffer.concat([PNG_HEADER, Buffer.alloc(size, 1)]);
}

function jpegBytes(size = 64) {
  return Buffer.concat([JPEG_HEADER, Buffer.alloc(size, 2)]);
}

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
});

describe('uploading a dish image', () => {
  it('needs an administrator', async () => {
    const res = await api()
      .post('/api/menu/items')
      .attach('image', pngBytes(), 'dish.png')
      .field('name', 'Upload Test Jollof')
      .field('price', '40');

    expect(res.status).toBe(401);
  });

  it('refuses a customer', async () => {
    const { agent } = await customerAgent();

    const res = await agent
      .post('/api/menu/items')
      .attach('image', pngBytes(), 'dish.png')
      .field('name', 'Upload Test Jollof')
      .field('price', '40');

    expect(res.status).toBe(403);
  });

  it('accepts a real image and links it to the dish', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/menu/items')
      .attach('image', pngBytes(), 'jollof.png')
      .field('name', 'Upload Test Jollof')
      .field('price', '40');

    expect(res.status).toBe(201);
    expect(res.body.image_url).toMatch(/^\/uploads\/menu\//);
    expect(res.body.image_url).not.toContain('Upload Test Jollof.png'); // the name is randomised
  });

  it('accepts a JPEG', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/menu/items')
      .attach('image', jpegBytes(), 'kelewele.jpg')
      .field('name', 'Upload Test Kelewele')
      .field('price', '18');

    expect(res.status).toBe(201);
    expect(res.body.image_url).toMatch(/\.jpg$/);
  });

  it('refuses a file that is not an image type', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/menu/items')
      .attach('image', Buffer.from('#!/bin/sh\nrm -rf /'), 'payload.sh')
      .field('name', 'Sneaky')
      .field('price', '1');

    expect(res.status).toBe(400);
  });

  it('refuses a renamed script that claims to be an image', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/menu/items')
      .attach('image', Buffer.from('#!/bin/sh\nrm -rf /'), 'payload.png')
      .field('name', 'Sneaky')
      .field('price', '1');

    expect(res.status).toBe(400);
  });

  it('refuses a file over the size limit', async () => {
    const { agent } = await adminAgent();

    const res = await agent
      .post('/api/menu/items')
      .attach('image', pngBytes(2 * 1024 * 1024), 'huge.png')
      .field('name', 'Huge')
      .field('price', '1');

    expect(res.status).toBe(413);
  });

  it('creates the dish even when no image is sent', async () => {
    const { agent } = await adminAgent();

    const res = await agent.post('/api/menu/items').send({ name: 'Upload Test Plain Dish', price: 10 });

    expect(res.status).toBe(201);
    expect(res.body.image_url).toBeNull();
  });
});
