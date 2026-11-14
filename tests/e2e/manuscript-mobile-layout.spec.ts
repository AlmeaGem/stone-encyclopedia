import { test, expect } from '@playwright/test';
import rawStones from '../../src/content/stones.json' with { type: 'json' };
const stones = rawStones.filter((stone) => stone.status === 'published');
import {
  approvedManuscript,
  manuscriptPairings,
} from '../../src/lib/approved-manuscripts';

import editorialData from '../../src/content/editorial-13.json' with { type: 'json' };

const byId = new Map(stones.map((stone) => [stone.id, stone]));
const normalized = (s: string) => s.replace(/\s/g, '');

test('all approved headings and pairing links retain their content and responsive layout', async ({
  page,
}, info) => {
  test.setTimeout(600000);
  const widths = info.project.name === 'mobile' ? [375, 390, 430] : [1440];
  let total = 0;
  for (const stone of stones) {
    const manuscript = approvedManuscript(stone.id);
    const expectedPairs = manuscript.sections
      .filter((section) => section.kind === 'pairings')
      .flatMap(manuscriptPairings);
    total += expectedPairs.length;
    await page.goto(`/stones/${stone.slug}/`, {
      waitUntil: 'domcontentloaded',
    });
    const editorial = editorialData[stone.slug as keyof typeof editorialData];
    if (editorial) {
      for (const pair of expectedPairs) {
        const target = byId.get(pair.stoneId)!;
        const card = page
          .locator('.editorial-pair')
          .filter({ has: page.locator(`a[href="/stones/${target.slug}/"]`) });
        await expect(card, `${stone.id}: ${pair.name}`).toHaveCount(1);
        await expect(card).toContainText(pair.description.replace(/\*\*/g, ''));
      }
      for (const line of editorial
        .split('\n')
        .slice(
          editorial
            .split('\n')
            .indexOf('相性のよい天然石｜おすすめの組み合わせ') + 1,
          editorial
            .split('\n')
            .findIndex((line) => line.startsWith('組み合わせ')),
        )
        .filter((line) => line.includes(' × '))) {
        const name = line.split(' × ')[1].trim();
        const card = page.locator('.editorial-pair').filter({ hasText: line });
        await expect(card).toHaveCount(1);
        const target = stones.find(
          (item) =>
            item.name === name || (item.aliases as string[]).includes(name),
        );
        if (target)
          await expect(card.locator('a')).toHaveAttribute(
            'href',
            `/stones/${target.slug}/`,
          );
        else await expect(card.locator('a')).toHaveCount(0);
      }
    } else {
      const entries = page.locator('.manuscript-pairings > p');
      expect(await entries.count(), stone.id).toBe(expectedPairs.length);
      for (const [index, pair] of expectedPairs.entries()) {
        const entry = entries.nth(index);
        await expect(
          entry.locator('a.manuscript-pairing-name'),
        ).toHaveAttribute('href', `/stones/${byId.get(pair.stoneId)!.slug}/`);
        expect(
          normalized((await entry.textContent())!),
          `${stone.id}: ${pair.name}`,
        ).toBe(
          normalized(`${pair.name}：${pair.description.replace(/\*\*/g, '')}`),
        );
      }
    }
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      const issues = await page.evaluate((mobile) => {
        const errors: string[] = [];
        if (document.documentElement.scrollWidth > innerWidth)
          errors.push('page overflow');
        for (const h of document.querySelectorAll(
          '.manuscript-section h2, .manuscript-subsection h3, .manuscript-care h3',
        )) {
          const text = h.textContent || '';
          const bars = (text.match(/｜/g) || []).length;
          const breaks = h.querySelectorAll('br.manuscript-heading-break');
          if (bars !== breaks.length) errors.push(`heading separators ${text}`);
          if (h.scrollWidth > h.clientWidth + 1)
            errors.push(`heading overflow ${text}`);
          for (const br of breaks) {
            if ((getComputedStyle(br).display !== 'none') !== mobile)
              errors.push(`heading break visibility ${text}`);
            if (mobile) {
              const before = document.createRange(),
                after = document.createRange();
              before.setStartBefore(br);
              before.setEndBefore(br);
              const previous = br.previousSibling,
                next = br.nextSibling;
              if (
                previous?.nodeType === Node.TEXT_NODE &&
                next?.nodeType === Node.TEXT_NODE &&
                previous.textContent?.trim() &&
                next.textContent?.trim()
              ) {
                before.selectNodeContents(previous);
                after.selectNodeContents(next);
                const last = Array.from(before.getClientRects()).at(-1),
                  first = after.getClientRects()[0];
                if (last && first && first.top <= last.top)
                  errors.push(`heading did not break ${text}`);
              }
            }
          }
        }
        for (const entry of document.querySelectorAll(
          '.manuscript-pairings > p',
        )) {
          const name = entry.querySelector('a')!,
            desc = entry.querySelector('.manuscript-pairing-description')!;
          const a = name.getBoundingClientRect(),
            b = desc.getBoundingClientRect();
          if (mobile && b.top < a.bottom)
            errors.push(`pair overlap ${name.textContent}`);
          if (mobile && Math.abs(a.left - b.left) > 1)
            errors.push(`pair alignment ${name.textContent}`);
          if (entry.scrollWidth > entry.clientWidth + 1)
            errors.push(`pair overflow ${name.textContent}`);
          const style = getComputedStyle(desc);
          if (
            mobile &&
            parseFloat(style.lineHeight) / parseFloat(style.fontSize) < 1.8
          )
            errors.push(`pair line-height ${name.textContent}`);
        }
        return errors;
      }, width <= 430);
      expect(issues, `${stone.id} at ${width}px`).toEqual([]);
    }
  }
  expect(total).toBe(631);
});
