import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/schema';
import {
  publicStone,
  publicCopyFields,
  publicStoneCopy,
} from '../src/lib/public-stone';
const raw = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
it('renders reviewed reader copy without changing any source record, safety, identity, search or reference fields', () => {
  const snapshot = JSON.stringify(raw);
  const rendered = validateCatalog(raw.map(publicStone));
  expect(rendered).toHaveLength(210);
  for (let i = 0; i < raw.length; i++) {
    for (const field of Object.keys(raw[i]))
      if (!publicCopyFields.includes(field as any))
        expect(rendered[i][field as keyof (typeof raw)[number]]).toEqual(
          raw[i][field as keyof (typeof raw)[number]],
        );
    expect(rendered[i].shapes).toBe(
      '形だけで運勢や効果の強さは決まりません。波動も大切です。',
    );
    for (const field of publicCopyFields) {
      const text = rendered[i][field] || '';
      expect(text, `${raw[i].id}.${field}`).not.toMatch(
        /という表現が適切|編集(?:上|提案)|書籍では|今回の調査|紹介します|説明できます|言い換え|掲載テーマ|既存の象徴/u,
      );
    }
  }
  expect(JSON.stringify(raw)).toBe(snapshot);
});
it('keeps every before/after change tied to the exact current source and refuses silently overriding a newer manuscript', () => {
  for (const [id, fields] of Object.entries(publicStoneCopy)) {
    const stone = raw.find((s) => s.id === id)!;
    expect(stone).toBeDefined();
    for (const [field, edit] of Object.entries(fields)) {
      expect(stone[field as keyof typeof stone]).toBe(edit!.before);
      expect(edit!.text).not.toBe(edit!.before);
      expect(edit!.text.length).toBeGreaterThan(10);
    }
  }
  expect(() =>
    publicStone({ ...raw[1], spiritualEffects: '別の新しい承認原稿' }),
  ).toThrow('比較元が変わっています');
});
it('keeps spiritual themes and uncertainty explicit while retaining P0 safety word for word', () => {
  const stones = raw.map(publicStone),
    at = (id: string) => stones.find((s) => s.id === id)!;
  for (const phrase of ['罪悪感', '信念', '守護'])
    expect(at('s002').spiritualEffects).toContain(phrase);
  expect(at('s048').spiritualEffects).toContain('商売繁盛・富');
  expect(at('s007').spiritualEffects).toContain('引き寄せ');
  expect(at('s031').legend).toContain('未確認');
  expect(at('s204').legend).toContain('近現代');
  for (const id of [
    's007',
    's035',
    's038',
    's056',
    's068',
    's079',
    's103',
    's128',
    's145',
    's172',
    's178',
  ])
    expect(at(id).handling).toBe(raw.find((s) => s.id === id)!.handling);
});
