import { describe, expect, it } from 'vitest';
import { birthNumber } from '../src/lib/birth-number';
describe('birth number', () => {
  it('reduces the supplied examples', () => {
    expect(birthNumber('1991-06-05')).toEqual({ number: 4, steps: [31, 4] });
    expect(birthNumber('1968-11-28')).toEqual({ number: 9, steps: [36, 9] });
  });
  it('preserves 11 and 22 at any complete reduction', () => {
    expect(birthNumber('2000-01-08')).toEqual({ number: 11, steps: [11] });
    expect(birthNumber('1990-01-02')).toEqual({ number: 22, steps: [22] });
    expect(birthNumber('1909-09-19')).toEqual({ number: 11, steps: [38, 11] });
  });
  it('rejects malformed and impossible dates', () => {
    for (const date of [
      '',
      '2023-02-29',
      '0000-01-01',
      '2020-13-01',
      '2020-04-31',
    ])
      expect(() => birthNumber(date)).toThrow();
    expect(birthNumber('2024-02-29').number).toBe(3);
  });
});
