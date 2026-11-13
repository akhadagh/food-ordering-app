import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// `numeric` columns arrive as strings by default so no precision is lost.
// Every money value in this application is handled as an integer number of
// minor units ( pesewas) or as a fixed-precision decimal string - never as a
// JavaScript float. See utils/money.js.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => value);
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value, 10));

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
      max: env.databasePoolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    pool.on('error', (err) => {
      // A pooled client errored out of band - log and let the pool replace it.
      // eslint-disable-next-line no-console
      console.error('[db] idle client error', err.message);
    });
  }
  return pool;
}

export function query(text, params) {
  return getPool().query(text, params);
}

/** Run a function inside a transaction, rolling back on any error. */
export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* the connection is already broken */
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export async function healthCheck() {
  const started = Date.now();
  const { rows } = await query('SELECT 1 AS ok');
  return { ok: rows[0].ok === 1, latencyMs: Date.now() - started };
}

export default { getPool, query, withTransaction, closePool, healthCheck };
