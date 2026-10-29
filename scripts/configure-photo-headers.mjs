import { readFile, writeFile } from 'node:fs/promises';
const raw = process.env.PUBLIC_PHOTO_API_ORIGIN;
if (raw) {
  const u = new URL(raw);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    u.pathname !== '/' ||
    u.search ||
    u.hash
  )
    throw Error('PUBLIC_PHOTO_API_ORIGIN must be an HTTPS origin');
  const path = 'dist/_headers';
  const content = await readFile(path, 'utf8');
  await writeFile(
    path,
    content
      .replace("img-src 'self' data:", "img-src 'self' data: " + u.origin)
      .replace("connect-src 'self'", "connect-src 'self' " + u.origin),
  );
}
