import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import rawStones from '../../src/content/stones.json' with { type: 'json' };
const stones = rawStones.filter((stone) => stone.status === 'published');
import {
  approvedManuscript,
  manuscriptItems,
  manuscriptPairings,
} from '../../src/lib/approved-manuscripts';

import editorialData from '../../src/content/editorial-13.json' with { type: 'json' };
import first from '../../src/content/editorial-first-five.json' with { type: 'json' };
import second from '../../src/content/editorial-second-five.json' with { type: 'json' };
import third from '../../src/content/editorial-third-five.json' with { type: 'json' };
import fourth from '../../src/content/editorial-fourth-five.json' with { type: 'json' };
const supplemented = new Set([
  ...Object.keys(first),
  ...Object.keys(second),
  ...Object.keys(third),
  ...Object.keys(fourth),
]);

const plain = (text: string) => text.replace(/\*\*/g, '').replace(/\s/g, '');
for (let start = 0; start < stones.length; start += 20) {
  const batch = stones.slice(start, start + 20);
  test(`manuscripts ${start + 1}-${start + batch.length}`, async ({ page }) => {
    test.setTimeout(300000);
    for (const stone of batch) {
      await page.goto(`/stones/${stone.slug}/`);
      const manuscript = approvedManuscript(stone.id);
      await expect(page.locator('h1')).toHaveText(stone.name);
      await expect(page.locator('h1 + .manuscript-catchphrase')).toHaveText(
        manuscript.catchphrase,
      );
      if (stone.id === 's110') {
        const rendered = plain(await page.locator('.detail-body').innerText());
        for (const section of manuscript.sections) {
          if (section.kind === 'pairings') {
            for (const pair of manuscriptPairings(section)) {
              const target = stones.find((item) => item.id === pair.stoneId)!;
              const entry = page.locator('#pairing .aqua-card').filter({
                has: page.locator(`a[href$="/stones/${target.slug}/"]`),
              });
              await expect(entry).toHaveCount(1);
              await expect(entry).toContainText(
                pair.description.replace(/\*\*/g, ''),
              );
            }
          } else {
            for (const item of manuscriptItems(section))
              expect(rendered, `${stone.id}: ${section.heading}`).toContain(
                plain(item),
              );
          }
        }
        await expect(page.locator('#pairing .aqua-card')).toHaveCount(5);
      } else if (stone.slug in editorialData) {
        const rendered = plain(await page.locator('.detail-body').innerText());
        for (const section of manuscript.sections) {
          if (section.kind === 'pairings') {
            for (const pair of manuscriptPairings(section)) {
              const target = stones.find((item) => item.id === pair.stoneId);
              expect(target, `${stone.id}: ${pair.name}`).toBeDefined();
              const card = page.locator('.editorial-pair').filter({
                has: page.locator(`a[href$="/stones/${target!.slug}/"]`),
              });
              await expect(card).toHaveCount(1);
              await expect(card).toContainText(
                pair.description.replace(/\*\*/g, ''),
              );
            }
          } else {
            for (const item of manuscriptItems(section))
              expect(rendered, `${stone.id}: ${section.heading}`).toContain(
                plain(item),
              );
          }
        }
      } else if (supplemented.has(stone.id)) {
        const rendered = plain(await page.locator('.detail-body').innerText());
        for (const section of manuscript.sections) {
          if (section.kind === 'pairings') {
            for (const pair of manuscriptPairings(section)) {
              const target = stones.find((item) => item.id === pair.stoneId);
              expect(target, `${stone.id}: ${pair.name}`).toBeDefined();
              const entry = page
                .locator('#pairing .manuscript-paragraph')
                .filter({
                  has: page.locator(`a[href$="/stones/${target!.slug}/"]`),
                });
              await expect(entry).toHaveCount(1);
              await expect(entry).toContainText(
                pair.description.replace(/\*\*/g, ''),
              );
            }
          } else {
            for (const item of manuscriptItems(section))
              expect(rendered, `${stone.id}: ${section.heading}`).toContain(
                plain(item),
              );
          }
        }
      } else {
        const rendered = await page
          .locator('.manuscript-paragraph, .manuscript-wishes li')
          .allTextContents();
        const expected = manuscript.sections
          .flatMap((s) => manuscriptItems(s))
          .map(plain)
          .sort();
        expect(rendered.map(plain).sort(), stone.id).toEqual(expected);
      }
      if (stone.id === 's211') {
        // The approved Sardonyx revision consolidates the original handling text here.
        await expect(page.locator('#care')).toContainText(
          '染色などの処理が施された石は、長時間水に浸したり、薬品に触れさせたりしないようにしましょう。',
        );
        await expect(page.locator('#care')).toContainText(
          '柔らかい布を使って優しく汚れを拭き取ってください。',
        );
      } else {
        await expect(page.locator('#care')).toContainText(
          stone.handling.replace(
            /^移行資料の注意メモ[：:]/u,
            '取り扱いの注意：',
          ),
        );
      }
      await expect(page.locator('.detail-body')).not.toContainText(
        /Codex|編集メモ|制作区分/,
      );
    }
  });
}

test('approved long copy remains readable at phone and desktop widths', async ({
  page,
}, info) => {
  for (const width of [375, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const id of ['s001', 's007', 's178', 's187', 's205', 's210']) {
      const stone = stones.find((s) => s.id === id)!;
      await page.goto(`/stones/${stone.slug}/`);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const reading = await page
        .locator('.manuscript-paragraph')
        .first()
        .evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize),
            width: el.getBoundingClientRect().width,
            viewport: innerWidth,
          };
        });
      expect(reading.ratio).toBeGreaterThanOrEqual(1.8);
      expect(reading.width).toBeLessThanOrEqual(768);
      expect(reading.width).toBeLessThan(reading.viewport);
      const sizes = await page
        .locator('h1, .manuscript-section h2')
        .evaluateAll((nodes) =>
          nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)),
        );
      expect(sizes[0]).toBeGreaterThan(Math.max(...sizes.slice(1)));
      await expect(page.locator('.manuscript-wishes li').first()).toBeVisible();
      if (
        info.project.name === 'desktop' &&
        ['s001', 's210'].includes(id) &&
        [390, 1440].includes(width)
      ) {
        await mkdir('test-results/approved-manuscripts', { recursive: true });
        await page.screenshot({
          path: `test-results/approved-manuscripts/${id}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
});
