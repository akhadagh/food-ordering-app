import { createApp } from '../backend/src/app.js';

/**
 * The Vercel Function entry point.
 *
 * Vercel builds every file in the project's root `api/` directory into a
 * function, and serves it at the path of the file - so this file answers
 * `/api` and everything under it.
 *
 * The application is EXPORTED, never listened on: Vercel invokes the
 * exported handler for every request, and calling `app.listen()` here would
 * hang the function.
 *
 * `restoreApiPrefix` puts the `/api` prefix back on the request path when
 * the platform hands it over without one, so the routes are matched the same
 * way here as in local development.
 */
const app = createApp({ restoreApiPrefix: true });

export default app;
