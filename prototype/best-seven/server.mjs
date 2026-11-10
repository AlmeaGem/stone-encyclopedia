import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const files = new Map([
  ['/', [join(here, 'index.html'), 'text/html; charset=utf-8']],
  ['/app.js', [join(here, 'app.js'), 'text/javascript; charset=utf-8']],
  ['/engine.js', [join(here, 'engine.js'), 'text/javascript; charset=utf-8']],
  ['/style.css', [join(here, 'style.css'), 'text/css; charset=utf-8']],
  [
    '/review-data.json',
    [join(here, 'review-data.json'), 'application/json; charset=utf-8'],
  ],
  [
    '/wish-data.json',
    [
      join(here, '../diagnosis-v3/draft-data.json'),
      'application/json; charset=utf-8',
    ],
  ],
]);
const port = Number(process.env.BEST_SEVEN_PORT || 4178);
createServer(async (req, res) => {
  const item = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!item || !['GET', 'HEAD'].includes(req.method))
    return res.writeHead(404).end('Not found');
  try {
    const body = await readFile(item[0]);
    res.writeHead(200, {
      'Content-Type': item[1],
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'",
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(500).end('Unable to load trial');
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`非公開推薦試作: http://127.0.0.1:${port}/`),
);
