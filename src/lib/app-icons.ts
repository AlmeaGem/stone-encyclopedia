import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathTo } from './urls';

const files = [
  'favicon.ico',
  'favicon-32.png',
  'favicon-48.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
] as const;
const hash = createHash('sha256');
for (const file of files) {
  hash.update(file + '\0');
  hash.update(readFileSync(resolve('public', file)));
}
// Evaluated at build time. Changing any supplied icon gives every icon a fresh URL.
export const appIconVersion = hash.digest('hex').slice(0, 16);
export function appIconPath(file: (typeof files)[number] | 'site.webmanifest') {
  return `${pathTo(file)}?v=${appIconVersion}`;
}
