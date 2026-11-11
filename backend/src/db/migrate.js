/**
 * Migration runner.
 *
 *   node src/db/migrate.js           apply pending migrations
 *   node src/db/migrate.js --status  show what is applied and what is pending
 *
 * Migrations are plain .sql files in ./migrations, applied in filename order
 * and recorded in the schema_migrations table. Each file runs inside its own
 * transaction so a failure leaves the database untouched.
 *
 * Migrations ALWAYS run against the DIRECT connection string. The pooled
 * string is for the running application only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env, validateEnv } from '../config/env.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const connectionString = env.databaseUrlDirect || env.databaseUrl;

if (!connectionString) {
  logger.error('No DATABASE_URL_DIRECT or DATABASE_URL configured. Cannot run migrations.');
  process.exit(1);
}

if (!env.databaseUrlDirect) {
  logger.warn(
    'DATABASE_URL_DIRECT is not set - falling back to DATABASE_URL. Migrations should run on the direct Neon connection.'
  );
}

const client = new pg.Client({
  connectionString,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
});

async function ensureTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function status() {
  await ensureTable();
  const { rows } = await client.query('SELECT filename, applied_at FROM schema_migrations ORDER BY filename');
  const applied = new Map(rows.map((r) => [r.filename, r.applied_at]));
  const files = listMigrationFiles();

  const lines = [];
  for (const file of files) {
    const at = applied.get(file);
    lines.push(`  ${at ? 'applied ' : 'PENDING'}  ${file}${at ? `  (${at.toISOString()})` : ''}`);
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
  const pending = files.filter((f) => !applied.has(f));
  // eslint-disable-next-line no-console
  console.log(`\n${files.length} migrations, ${pending.length} pending.`);
  return pending.length;
}

async function migrate() {
  await ensureTable();
  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));
  const files = listMigrationFiles();
  const pending = files.filter((f) => !applied.has(f));

  if (!pending.length) {
    logger.info('Database is up to date.', { migrations: files.length });
    return;
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    logger.info(`Applying ${file}`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info(`Applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error(`Migration ${file} failed: ${err.message}`);
      throw err;
    }
  }

  logger.info('All migrations applied.', { applied: pending.length });
}

async function main() {
  const { ok, problems } = validateEnv({ strict: false });
  if (!ok) {
    logger.warn('Environment is not fully configured:', problems);
  }

  await client.connect();
  try {
    if (process.argv.includes('--status')) {
      await status();
    } else {
      await migrate();
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
