import { createApp } from './app.js';
import { env, assertEnv } from './config/env.js';
import { logger } from './utils/logger.js';
import { closePool } from './config/db.js';

/**
 * Local development / self-hosted entry point.
 *
 * On Vercel the API is served by api/index.js, which exports the app rather
 * than listening on a port.
 */

async function start() {
  try {
    assertEnv();
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`Afia Food Hub API listening on http://localhost:${env.port}`, {
      environment: env.nodeEnv,
      version: env.appVersion,
    });
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down.`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
