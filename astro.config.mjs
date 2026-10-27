import { defineConfig } from 'astro/config';
if (
  process.env.PUBLIC_LAUNCH === 'true' &&
  (!process.env.SITE_URL ||
    !process.env.SITE_URL.startsWith('https://') ||
    process.env.SITE_URL.includes('.invalid'))
)
  throw new Error('公開には本番のHTTPS SITE_URLを設定してください');
export default defineConfig({
  site: process.env.SITE_URL || 'https://stone-encyclopedia.example.invalid',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  compressHTML: true,
  vite: { build: { assetsInlineLimit: 0 } },
});
