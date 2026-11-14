import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import manuscripts from '../src/content/editorial-13.json';
import {
  editorialManuscript,
  editorialPairTarget,
} from '../src/lib/editorial-13';
import { stones } from '../src/lib/content';

const entries = [
  ['s047', 'サンストーン'],
  ['s116', 'シーブルーカルセドニー'],
  ['s080', 'ジェダイト'],
  ['s048', 'シトリン'],
  ['s037', 'ジャスパー'],
  ['s139', 'スギライト'],
  ['s008', 'スモーキークォーツ'],
  ['s084', 'セラフィナイト'],
  ['s121', 'ソーダライト'],
  ['s122', 'ターコイズ'],
  ['s057', 'タイガーアイ'],
  ['s140', 'チャロアイト'],
] as const;

describe('approved gemstone additions', () => {
  it.each(entries)(
    '%s has complete structured manuscript for %s',
    (id, name) => {
      const article = editorialManuscript(id)!;
      expect(stones.find((stone) => stone.id === id)?.name).toBe(name);
      expect(article.title).toContain(name);
      const slug = stones.find((stone) => stone.id === id)!
        .slug as keyof typeof manuscripts;
      expect(manuscripts[slug]).toBe(
        readFileSync(`editorial/manuscripts/additional-13/${slug}.txt`, 'utf8'),
      );
      expect(
        article.parts.spirit.filter((line) => /^0[1-5]｜/.test(line)),
      ).toHaveLength(5);
      expect(
        article.parts.fortunes.filter((line) =>
          /^(恋愛運|仕事運|金運|人間関係)｜/.test(line),
        ),
      ).toHaveLength(4);
      expect(
        article.parts.pairings.filter((line) => line.includes(' × ')),
      ).toHaveLength(4);
      for (const lines of Object.values(article.parts))
        expect(lines.length).toBeGreaterThan(0);
    },
  );
  it('does not invent links for unregistered trade names or the private draft', () => {
    expect(editorialPairTarget('レッドルチルクォーツ')).toBeUndefined();
    expect(editorialPairTarget('ニュージェイド')).toBeUndefined();
    expect(editorialPairTarget('チベットアゲート')).toBeUndefined();
    expect(editorialManuscript('s212')).toBeUndefined();
  });
  it('resolves existing partner stones to published pages', () => {
    expect(editorialPairTarget('シーブルーカルセドニー')?.id).toBe('s116');
    expect(editorialPairTarget('スギライト')?.id).toBe('s139');
  });
});
