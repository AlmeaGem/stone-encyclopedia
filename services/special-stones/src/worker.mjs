import { readConfig } from './config.mjs';
import { createAdapters } from './adapters.mjs';
import { createHandler } from './handler.mjs';
import { testHtml, testScript } from './test-screen.mjs';

// Test-only Worker. Never fall back to Node environment variables or live credentials.
export default {
  async fetch(request, env) {
    try {
      const config = readConfig(env);
      const url = new URL(request.url);
      const screenPath = new URL(config.testReturnUrl).pathname;
      if (
        request.method === 'GET' &&
        url.origin === config.publicOrigin &&
        (url.pathname === screenPath ||
          url.pathname === '/__special-test__/app.js')
      ) {
        const script = url.pathname === '/__special-test__/app.js';
        return new Response(script ? testScript : testHtml, {
          headers: {
            'Content-Type': script
              ? 'text/javascript; charset=utf-8'
              : 'text/html; charset=utf-8',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer',
            'X-Frame-Options': 'DENY',
            'Content-Security-Policy':
              "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src blob:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
          },
        });
      }
      return await createHandler(createAdapters(config), config)(request);
    } catch {
      return new Response('Service unavailable', {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }
  },
};
