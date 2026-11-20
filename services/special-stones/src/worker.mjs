import { readConfig } from './config.mjs';
import { createAdapters } from './adapters.mjs';
import { createHandler } from './handler.mjs';

// Test-only Worker. Never fall back to Node environment variables or live credentials.
export default {
  async fetch(request, env) {
    try {
      const config = readConfig(env);
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
