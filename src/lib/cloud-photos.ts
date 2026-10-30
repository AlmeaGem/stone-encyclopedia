/** Optional public endpoint only. Never contains Access credentials or API keys. */
export function cloudPhotoOrigin(raw: string | undefined): string | undefined {
  if (!raw) return;
  try {
    const u = new URL(raw);
    if (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      u.pathname === '/' &&
      !u.search &&
      !u.hash
    )
      return u.origin;
  } catch {
    /* Disabled when unconfigured. Existing static photos remain intact. */
  }
}
