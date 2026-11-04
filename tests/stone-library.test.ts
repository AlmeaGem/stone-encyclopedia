import { describe, expect, it } from 'vitest';
import {
  LIBRARY_KEY,
  readLibrary,
  writeLibrary,
} from '../src/lib/stone-library';

describe('stone library storage', () => {
  it('persists IDs and safely ignores malformed data', () => {
    let value = '["s001","invalid","s001",3,"s210"]';
    const storage = {
      getItem: () => value,
      setItem: (key: string, next: string) => {
        expect(key).toBe(LIBRARY_KEY);
        value = next;
      },
    } as unknown as Storage;
    expect(readLibrary(storage)).toEqual(['s001', 's210']);
    expect(writeLibrary(storage, ['s210'])).toBe(true);
    expect(readLibrary(storage)).toEqual(['s210']);
    value = '{';
    expect(readLibrary(storage)).toEqual([]);
  });
  it('handles blocked storage without throwing', () => {
    const storage = {
      getItem: () => {
        throw Error('blocked');
      },
      setItem: () => {
        throw Error('blocked');
      },
    } as unknown as Storage;
    expect(readLibrary(storage)).toEqual([]);
    expect(writeLibrary(storage, ['s001'])).toBe(false);
  });
});
