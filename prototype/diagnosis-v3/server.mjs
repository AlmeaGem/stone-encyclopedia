import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/draft-data.json', ['draft-data.json', 'application/json; charset=utf-8']],
]);
const port = Number(process.env.PROTOTYPE_PORT || 4177);
createServer(async (req, res) => {
  const file = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!file || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const data = await readFile(join(root, file[0]));
    res.writeHead(200, {
      'Content-Type': file[1],
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'",
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(500).end('Unable to load prototype');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`非公開試作: http://127.0.0.1:${port}/`);
});
