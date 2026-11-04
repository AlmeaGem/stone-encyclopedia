export const LIBRARY_KEY = 'almea-stone-library-v1';

export function readLibrary(storage: Storage): string[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(LIBRARY_KEY) || '[]');
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string =>
                typeof id === 'string' && /^s\d{3}$/.test(id),
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}

export function writeLibrary(storage: Storage, ids: string[]): boolean {
  try {
    storage.setItem(LIBRARY_KEY, JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
}
