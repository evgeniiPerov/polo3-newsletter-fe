// Static file server for the tests and screenshots, bound to localhost. Port: PORT from the environment, or 4317.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PORT = Number(process.env.PORT) || 4317;
const NOT_FOUND_CODES = new Set(['ENOENT', 'EISDIR', 'ENOTDIR']);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

export function startServer(port = PORT) {
  const server = http.createServer(async (req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const filePath = path.join(ROOT, urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] ?? 'application/octet-stream' });
      res.end(body);
    } catch (error) {
      res.writeHead(NOT_FOUND_CODES.has(error.code) ? 404 : 500).end();
    }
  });
  // Rejects when the port is taken (EADDRINUSE) instead of hanging.
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, 'localhost', () => resolve(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await startServer();
  process.stdout.write(`Serving ${ROOT} at http://localhost:${PORT}\n`);
}
