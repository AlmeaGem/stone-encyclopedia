import { test, expect } from '@playwright/test';

test('editorial cards keep folios horizontal and actions aligned at every viewport', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/articles/']) {
      await page.goto(path);
      const issues = await page.locator('.article-grid').evaluate((grid) => {
        const errors: string[] = [];
        const rows = new Map<number, number[]>();
        for (const card of grid.querySelectorAll<HTMLElement>(
          '.article-card',
        )) {
          const cover = card.querySelector<HTMLElement>('.article-cover')!;
          const folio = cover.querySelector<HTMLElement>('strong')!;
          const label = cover.querySelector<HTMLElement>('span')!;
          const range = document.createRange();
          range.selectNodeContents(folio);
          if (range.getClientRects().length !== 1) errors.push('folio wraps');
          if (
            label.getBoundingClientRect().right >
            folio.getBoundingClientRect().left
          )
            errors.push('folio overlaps label');
          const rect = card.getBoundingClientRect();
          const action = card
            .querySelector<HTMLElement>('.open-label')!
            .getBoundingClientRect();
          const row = Math.round(rect.top);
          rows.set(row, [...(rows.get(row) || []), action.bottom]);
          for (const word of card.querySelectorAll('.title-run')) {
            range.selectNodeContents(word);
            if (range.getClientRects().length !== 1)
              errors.push('protected title word wraps');
          }
        }
        for (const bottoms of rows.values())
          if (Math.max(...bottoms) - Math.min(...bottoms) > 1)
            errors.push('actions misaligned');
        if (document.documentElement.scrollWidth > innerWidth)
          errors.push('horizontal overflow');
        return errors;
      });
      expect(issues, `${width}px ${path}`).toEqual([]);
    }
  }
});
