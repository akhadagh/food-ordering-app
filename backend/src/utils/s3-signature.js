import crypto from 'node:crypto';

/**
 * AWS Signature Version 4 (query-string-free, header signing).
 *
 * Implemented directly so the application can talk to any S3-compatible
 * object store - including Neon Object Storage - without pulling in a large
 * SDK. The implementation is verified against the published AWS SigV4 test
 * vector in tests/s3-signature.test.js.
 */

const EMPTY_SHA256 = crypto.createHash('sha256').update('').digest('hex');
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
const sha256Hex = (data) => crypto.createHash('sha256').update(data).digest('hex');

const encodeRfc3986 = (value) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

/** "20240115T101010Z" -> "20240115" */
const amzDate = (date) => date.toISOString().replace(/[:-]|\.\d{3}/g, '');

/**
 * Build the canonical request, string to sign and signature.
 *
 * @param {object} options
 * @param {string} options.method
 * @param {string} options.url
 * @param {object} options.headers  extra headers (host is added automatically)
 * @param {Buffer|string} options.payload
 * @param {string} options.accessKeyId
 * @param {string} options.secretAccessKey
 * @param {string} options.region
 * @param {string} options.service
 * @param {Date}   options.date
 * @param {boolean} [options.unsignedPayload]
 */
export function signRequest({
  method,
  url,
  headers = {},
  payload = '',
  accessKeyId,
  secretAccessKey,
  region,
  service,
  date = new Date(),
  unsignedPayload = false,
}) {
  const target = new URL(url);
  const stamp = amzDate(date);
  const dateStamp = stamp.slice(0, 8);
  const payloadHash = unsignedPayload ? UNSIGNED_PAYLOAD : sha256Hex(payload);

  const allHeaders = {
    host: target.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': stamp,
    ...headers,
  };

  // Canonical headers must be lowercase, sorted and trimmed.
  const canonicalHeaderEntries = Object.entries(allHeaders)
    .map(([k, v]) => [k.toLowerCase().trim(), String(v).trim().replace(/\s+/g, ' ')])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const canonicalHeaders = canonicalHeaderEntries
    .map(([k, v]) => `${k}:${v}\n`)
    .join('');
  const signedHeaders = canonicalHeaderEntries.map(([k]) => k).join(';');

  const canonicalQuery = [...target.searchParams.entries()]
    .map(([k, v]) => [encodeRfc3986(k), encodeRfc3986(v)])
    .sort(([a, av], [b, bv]) => (a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const canonicalRequest = [
    method.toUpperCase(),
    target.pathname || '/',
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    stamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service),
    'aws4_request'
  );
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    canonicalRequest,
    stringToSign,
    signature,
    signedHeaders,
    credentialScope,
    payloadHash,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    stamp,
    dateStamp,
  };
}

export { EMPTY_SHA256, UNSIGNED_PAYLOAD, sha256Hex, encodeRfc3986 };
export default signRequest;
