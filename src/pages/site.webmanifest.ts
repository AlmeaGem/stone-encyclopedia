import type { APIRoute } from 'astro';
import { appIconPath } from '../lib/app-icons';
import { pathTo, siteName } from '../lib/urls';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      id: pathTo(),
      name: `${siteName} by ALMÉA GEM`,
      short_name: 'ALMÉA GEM',
      lang: 'ja',
      start_url: pathTo(),
      scope: pathTo(),
      display: 'standalone',
      theme_color: '#faf7f2',
      background_color: '#faf7f2',
      icons: [192, 512].map((size) => ({
        src: appIconPath(size === 192 ? 'icon-192.png' : 'icon-512.png'),
        sizes: `${size}x${size}`,
        type: 'image/png',
        // The supplied artwork includes its own framing; do not crop it as a maskable icon.
        purpose: 'any',
      })),
    }),
    { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } },
  );
