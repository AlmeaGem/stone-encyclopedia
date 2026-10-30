export function resolvePath(base: string, path = '') {
  return base.replace(/\/?$/, '/') + path.replace(/^\//, '');
}
export function pathTo(path = '') {
  return resolvePath(import.meta.env.BASE_URL, path);
}
export function canonical(path = '') {
  return new URL(
    pathTo(path),
    import.meta.env.SITE || 'https://stone-encyclopedia.example.invalid',
  ).href;
}
export const launched = import.meta.env.PUBLIC_LAUNCH === 'true';
export const siteName = '天然石・パワーストーン大図鑑';
