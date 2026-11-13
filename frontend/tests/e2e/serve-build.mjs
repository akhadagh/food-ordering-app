/**
 * A static server for the production build, with the SPA fallback the
 * deployment needs.
 *
 * The end-to-end suites are pointed at this rather than at the development
 * server: it is what a visitor actually gets, it is far lighter on memory,
 * and it exercises the built bundle rather than the source.
 *
 *   node tests/e2e/serve-build.mjs [--port 3111] [--root ../build]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const port = Number(arg('port', process.env.PORT || 3111));
const root = path.resolve(process.cwd(), arg('root', 'build'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const requested = decodeURIComponent(url.pathname);
  const target = path.join(root, requested);

  // Never serve anything outside the build directory.
  const safe = target.startsWith(root) ? target : root;
  if (fs.existsSync(safe) && fs.statSync(safe).isFile()) {
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(safe)] || 'application/octet-stream' });
    fs.createReadStream(safe).pipe(res);
    return;
  }

  // A client route: the application decides what to show, not the server.
  const index = path.join(root, 'index.html');
  if (!fs.existsSync(index)) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('No build found. Run "npm run build" first.');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES['.html'] });
  fs.createReadStream(index).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} on http://localhost:${port}`);
});
