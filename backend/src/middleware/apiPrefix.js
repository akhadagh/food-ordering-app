/**
 * Keeps the API reachable whatever the platform does with the path prefix.
 *
 * The application mounts every route under `/api`. When it runs as a Vercel
 * function the request arrives at the function's own path, and the platform
 * may hand it over either with the `/api` prefix intact (`/api/menu/items`)
 * or without it (`/menu/items`) - the two conventions differ between
 * runtimes and between routing configurations.
 *
 * Rather than depend on which one applies, the prefix is restored here, once,
 * before any route is matched. The middleware is idempotent: a request that
 * already carries the prefix is left exactly as it is.
 */

/** The prefix every API route is mounted under. */
export const API_PREFIX = '/api';

/**
 * Restores the `/api` prefix on a request path.
 *
 * @param {string} prefix the prefix the application mounts its routes under
 * @returns {import('express').RequestHandler}
 */
export const apiPrefix = (prefix = API_PREFIX) => (req, res, next) => {
  const [pathname] = req.url.split('?');

  const alreadyPrefixed =
    pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`);

  if (!alreadyPrefixed) {
    req.url = `${prefix}${req.url}`;
  }

  next();
};

export default apiPrefix;
