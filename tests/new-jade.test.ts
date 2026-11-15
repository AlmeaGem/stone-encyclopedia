import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { stones } from '../src/lib/content';
import {
  editorialManuscript,
  editorialPairTarget,
} from '../src/lib/editorial-13';
import { sitemapPaths } from '../src/lib/seo-policy';

it('registers New Jade separately from serpentine and jade while preserving the reserved s212', () => {
  const stone = stones.find((item) => item.id === 's213')!;
  expect(stones).toHaveLength(212);
  expect(stones.some((item) => item.id === 's212')).toBe(false);
  expect(stone).toMatchObject({
    name: 'ニュージェイド',
    english: 'New Jade',
    slug: 'new-jade',
    kind: 'trade',
  });
  expect(stone.related).toContain('s079');
  expect(stones.find((item) => item.id === 's079')?.slug).toBe('serpentine');
  expect(sitemapPaths).toContain('stones/new-jade/');
  const manuscript = editorialManuscript('s213')!;
  expect(
    manuscript.parts.spirit.filter((line) => /^0[1-5]｜/.test(line)),
  ).toHaveLength(5);
  for (const name of [
    'クリソプレーズ',
    'プレナイト',
    'フローライト',
    'マラカイト',
  ])
    expect(editorialPairTarget(name)).toBeDefined();
  expect(manuscript.parts.nature.join('')).toContain('正式な鉱物名ではなく');
});

it('keeps the submitted original and serves its approved derivative', async () => {
  const original = readFileSync('editorial/assets/new-jade/s213-original.png');
  expect(createHash('sha256').update(original).digest('hex')).toBe(
    'b44571cd52ee4acd5858ddcff1b994e0c3d0aa8b01aab8fdccb133a29d754a9d',
  );
  const sha =
    '3fd2a1db113b7ebbb884bdc7316409f2e5c4f9fc0dd87bec1636a3145d299cc2';
  const derivative = readFileSync(`assets/approved-images/s213/${sha}.webp`);
  expect(createHash('sha256').update(derivative).digest('hex')).toBe(sha);
  expect(await sharp(derivative).metadata()).toMatchObject({
    format: 'webp',
    width: 960,
    height: 640,
  });
});
