import { createApp } from '../src/app.js';

/**
 * Vercel serverless entry point.
 *
 * The Express application is EXPORTED, not listened on - Vercel invokes the
 * exported handler for every request under /api. Calling app.listen() here
 * would hang the function.
 */
const app = createApp();

export default app;
