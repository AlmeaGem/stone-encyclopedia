import { it, expect } from 'vitest';
import { isSiteHistoryUrl } from '../src/lib/history-navigation';

it('accepts only same-origin history entries within the deployment base', () => {
  const allowed = (value: string) =>
    isSiteHistoryUrl(
      value,
      '/stone-encyclopedia/',
      'https://almeagem.github.io',
    );
  expect(
    allowed('https://almeagem.github.io/stone-encyclopedia/stones/?q=rose#top'),
  ).toBe(true);
  expect(allowed('https://almeagem.github.io/stone-encyclopedia')).toBe(true);
  for (const url of [
    'https://example.com/',
    'https://user:password@almeagem.github.io/stone-encyclopedia/',
    'https://almeagem.github.io/other/',
    'https://almeagem.github.io/stone-encyclopedia-evil/',
    'javascript:history.back()',
    'https://almeagem.github.io.evil.test/stone-encyclopedia/',
  ])
    expect(allowed(url)).toBe(false);
});
