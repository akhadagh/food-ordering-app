import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { badRequest, unprocessable } from '../utils/errors.js';
import { signRequest } from '../utils/s3-signature.js';

/**
 * Menu image storage.
 *
 * The filesystem on Vercel (and on Render's free tier) is ephemeral, so the
 * local driver is refused in production by the environment validator. The
 * production driver is any S3-compatible object store - Neon Object Storage
 * exposes an S3-compatible API.
 *
 * Drivers:
 *   local - filesystem, development only
 *   blob  - Vercel Blob (the production default when BLOB_READ_WRITE_TOKEN is set)
 *   s3    - S3-compatible object storage (Neon Object Storage, R2, MinIO)
 */

const ALLOWED_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ROOT = path.resolve(process.cwd(), 'uploads');

export function validateImage(file) {
  if (!file) throw badRequest('Choose an image to upload.');
  if (!ALLOWED_MIME[file.mimetype]) {
    throw badRequest('Upload a JPEG, PNG, WebP or GIF image.');
  }
  if (file.size > env.uploadMaxBytes) {
    throw badRequest(
      `That image is too large. The maximum size is ${Math.round(env.uploadMaxBytes / (1024 * 1024))} MB.`
    );
  }
  // Verify the bytes really are an image, not a renamed script.
  const buffer = file.buffer;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer.slice(1, 4).toString('ascii') === 'PNG';
  const isGif = buffer.slice(0, 3).toString('ascii') === 'GIF';
  const isWebp = buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP';
  if (!isJpeg && !isPng && !isGif && !isWebp) {
    throw badRequest('That file is not a valid image.');
  }
  return true;
}

function safeName(original) {
  const ext = path.extname(original || '').toLowerCase().slice(0, 8);
  const base = path
    .basename(original || 'image', path.extname(original || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'image';
  return `${base}${ext}`;
}

/* ---------------------------------------------------------------- local -- */

async function storeLocal(file) {
  const dir = path.join(ROOT, 'menu');
  await fs.promises.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}-${safeName(file.originalname)}`;
  await fs.promises.writeFile(path.join(dir, filename), file.buffer);
  const base = env.uploadPublicUrl || '/uploads';
  return { url: `${base.replace(/\/$/, '')}/menu/${filename}`, key: `menu/${filename}` };
}

/* ------------------------------------------------------------------ s3 -- */

async function storeS3(file) {
  const {
    S3_ENDPOINT = '',
    S3_BUCKET = '',
    S3_ACCESS_KEY_ID = '',
    S3_SECRET_ACCESS_KEY = '',
    S3_REGION = 'auto',
    S3_PUBLIC_URL = '',
  } = process.env;

  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw unprocessable('Image storage is not configured right now.');
  }

  const key = `menu/${crypto.randomUUID()}-${safeName(file.originalname)}`;
  const endpoint = new URL(S3_ENDPOINT);
  const url = `${endpoint.origin}/${S3_BUCKET}/${key}`;

  const signed = signRequest({
    method: 'PUT',
    url,
    headers: {
      'content-type': file.mimetype,
      'content-length': String(file.size),
    },
    payload: file.buffer,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    region: S3_REGION,
    service: 's3',
  });

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: signed.authorization,
      'x-amz-date': signed.stamp,
      'x-amz-content-sha256': signed.payloadHash,
      'content-type': file.mimetype,
    },
    body: file.buffer,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.error('storage.s3_upload_failed', { status: response.status, body: body.slice(0, 300) });
    throw unprocessable('We could not save that image. Please try again.');
  }

  const publicBase = (S3_PUBLIC_URL || env.uploadPublicUrl || '').replace(/\/$/, '');
  return { url: publicBase ? `${publicBase}/${key}` : url, key };
}

/* ---------------------------------------------------------------- blob -- */

async function storeBlob(file) {
  if (!env.blobReadWriteToken) {
    throw unprocessable('Image storage is not configured right now.');
  }

  const key = `menu/${crypto.randomUUID()}-${safeName(file.originalname)}`;
  const endpoint = new URL('https://blob.vercel-storage.com/');
  endpoint.searchParams.set('pathname', key);

  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${env.blobReadWriteToken}`,
        'content-type': file.mimetype,
        'x-content-type': file.mimetype,
        'x-add-random-suffix': '0',
        'x-vercel-blob-access': 'public',
      },
      body: file.buffer,
    });
    const raw = await response.text();
    let blob = {};
    try {
      blob = raw ? JSON.parse(raw) : {};
    } catch {
      blob = {};
    }
    if (!response.ok || !blob.url) {
      logger.error('storage.blob_upload_failed', {
        status: response.status,
        body: raw.slice(0, 300),
      });
      throw unprocessable('We could not save that image. Please try again.');
    }
    return { url: blob.url, key: blob.pathname || key };
  } catch (err) {
    if (err.status === 422) throw err;
    logger.error('storage.blob_upload_failed', { message: err.message });
    throw unprocessable('We could not save that image. Please try again.');
  }
}

/* ---------------------------------------------------------------------- */

export async function storeImage(file) {
  validateImage(file);
  if (env.uploadDriver === 'blob') return storeBlob(file);
  if (env.uploadDriver === 's3') return storeS3(file);
  if (env.uploadDriver === 'local') {
    if (env.isProd) {
      throw unprocessable('Image storage is not configured right now.');
    }
    return storeLocal(file);
  }
  throw unprocessable('Image storage is not configured right now.');
}

export { ALLOWED_MIME };
export default { storeImage, validateImage };
