import { describe, expect, it } from 'vitest';
import stones from '../src/content/stones.json' with { type: 'json' };
import {
  dailyIndex,
  dailyOrder,
  millisecondsUntilTokyoMidnight,
} from '../src/lib/daily-discovery';

describe('daily discovery', () => {
  it('visits every stone exactly once in a deterministic shuffled cycle', () => {
    const ids = stones.map((s) => s.id);
    const order = dailyOrder(ids);
    expect(order).toEqual(dailyOrder([...ids].reverse()));
    expect(order).not.toEqual([...ids].sort());
    expect(new Set(order).size).toBe(210);
    const start = Date.UTC(2026, 0, 1) - 9 * 3600000;
    const days = Array.from(
      { length: 210 },
      (_, day) => order[dailyIndex(start + day * 86400000, order.length)],
    );
    expect(new Set(days).size).toBe(210);
    expect(order[dailyIndex(start + 210 * 86400000, 210)]).toBe(days[0]);
  });
  it('switches exactly at midnight in Japan regardless of visitor timezone', () => {
    const boundary = Date.parse('2026-11-04T15:00:00Z');
    expect(dailyIndex(boundary - 1, 210)).not.toBe(dailyIndex(boundary, 210));
    expect(millisecondsUntilTokyoMidnight(boundary - 1)).toBe(1);
    expect(millisecondsUntilTokyoMidnight(boundary)).toBe(86400000);
    expect(dailyIndex(Date.parse('2026-11-04T23:30:00+09:00'), 210)).toBe(
      dailyIndex(Date.parse('2026-11-04T06:30:00-08:00'), 210),
    );
  });
});
