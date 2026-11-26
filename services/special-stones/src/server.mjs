import { createServer } from 'node:http';
import { readConfig } from './config.mjs';
import { createAdapters } from './adapters.mjs';
import { createHandler } from './handler.mjs';
const config = readConfig();
const handle = createHandler(createAdapters(config), config);
// LOCAL TEST ONLY. A hardened production deployment is deliberately not configured.
const server = createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 65536) {
        res.writeHead(413);
        res.end();
        return;
      }
      chunks.push(chunk);
    }
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const init = { method: req.method, headers: req.headers };
    if (!['GET', 'HEAD'].includes(req.method))
      init.body = Buffer.concat(chunks);
    const result = await handle(new Request(url, init));
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(Buffer.from(await result.arrayBuffer()));
  } catch {
    res.writeHead(500, { 'Cache-Control': 'no-store' });
    res.end();
  }
});
server.listen(4381, '127.0.0.1', () =>
  console.log('Special Stones test API listening on loopback only'),
);
