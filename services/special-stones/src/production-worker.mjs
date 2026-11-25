import { readProductionConfig } from './production-config.mjs';
import { createAdapters } from './adapters.mjs';
import { createHandler } from './handler.mjs';

// No test interface or dummy article is served by this entrypoint.
// A production reader and verified same-origin routing are required before activation.
export default {
  async fetch(request, env) {
    try {
      const config = readProductionConfig(env);
      if (new URL(request.url).origin !== config.publicOrigin)
        return new Response('Not found', {status:404,headers:{'Cache-Control':'no-store'}});
      if (!new URL(request.url).pathname.startsWith('/api/'))
        return new Response('Not found', {status:404,headers:{'Cache-Control':'no-store'}});
      return await createHandler(createAdapters(config), config)(request);
    } catch {
      return new Response('Service unavailable', {status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
    }
  },
};
