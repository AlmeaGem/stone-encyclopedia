import { readProductionConfig } from './production-config.mjs';
import { createAdapters } from './adapters.mjs';
import { createHandler } from './handler.mjs';
import { productionHtml, productionScript } from './production-screen.mjs';
import { specialChapters } from './catalog.mjs';

// Production member interface. Private content is never embedded in the HTML.
export default {
  async fetch(request, env) {
    try {
      const config = readProductionConfig(env);
      if (new URL(request.url).origin !== config.publicOrigin)
        return new Response('Not found', {status:404,headers:{'Cache-Control':'no-store'}});
      const path = new URL(request.url).pathname;
      if (request.method === 'GET' && (path === new URL(config.testReturnUrl).pathname || path === '/__special-members__/app.js')) {
        const js = path === '/__special-members__/app.js';
        return new Response(js ? 'const ALMEA_SALES_ENABLED = '+JSON.stringify(config.salesEnabled)+';\nconst ALMEA_CHAPTERS = '+JSON.stringify(specialChapters.map(({id,title,description,illustrations,cover,width,height,number})=>({id,title,description,illustrations,cover,width,height,number})))+';\n'+productionScript : productionHtml, {headers:{
          'Content-Type':js?'text/javascript; charset=utf-8':'text/html; charset=utf-8',
          'Cache-Control':'private, no-store',
          'X-Content-Type-Options':'nosniff',
          'Referrer-Policy':'no-referrer',
          'X-Frame-Options':'DENY',
          'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        }});
      }
      if (!path.startsWith('/api/'))
        return new Response('Not found', {status:404,headers:{'Cache-Control':'no-store'}});
      return await createHandler(createAdapters(config), config)(request);
    } catch {
      return new Response('Service unavailable', {status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
    }
  },
};
