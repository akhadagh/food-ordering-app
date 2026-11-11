/**
 * A local PostgreSQL for development and testing, without installing
 * PostgreSQL.
 *
 * PGlite is PostgreSQL 17 compiled to WebAssembly. It is exposed over a
 * local TCP socket so the application connects with the ordinary `pg`
 * driver - exactly the code path used against Neon in production.
 *
 *   node scripts/dev-postgres.mjs [--port 55432] [--data-dir .pgdata]
 *
 * Then point DATABASE_URL at it:
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/postgres
 */
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const port = Number(arg('port', process.env.PGPORT || 55432));
const host = arg('host', '127.0.0.1');
const dataDir = path.resolve(process.cwd(), arg('data-dir', '.pgdata'));

fs.mkdirSync(path.dirname(dataDir), { recursive: true });

const db = await PGlite.create({ dataDir });
const server = new PGLiteSocketServer({ db, port, host });

await server.start();

console.log('');
console.log('  PostgreSQL (PGlite) is running');
console.log(`  connection string: postgresql://postgres:postgres@${host}:${port}/postgres`);
console.log(`  data directory:    ${dataDir}`);
console.log('');
console.log('  Press Ctrl+C to stop.');
console.log('');

const stop = async () => {
  console.log('\n  Stopping PostgreSQL…');
  await server.stop().catch(() => {});
  await db.close().catch(() => {});
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
