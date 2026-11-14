import { test, expect } from '@playwright/test';

test('journal cards keep icons, labels and links readable at every viewport', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/articles/']) {
      await page.goto(path);
      const cards = page.locator('.journal-card');
      await expect(cards).toHaveCount(6);
      const issues = await cards.evaluateAll((nodes) => {
        const errors: string[] = [];
        const hrefs = new Set<string>();
        for (const node of nodes) {
          const card = node as HTMLAnchorElement;
          const icon = card.querySelector<SVGSVGElement>('.journal-icon');
          const title = card.querySelector<HTMLElement>('h2,h3');
          const label = card.querySelector<HTMLElement>('.journal-card-label');
          if (!icon || !title || !label) {
            errors.push('missing card content');
            continue;
          }
          if (!icon.querySelector('path,circle,ellipse'))
            errors.push('empty icon');
          if (
            icon.getAttribute('aria-hidden') !== 'true' ||
            icon.getAttribute('focusable') !== 'false'
          )
            errors.push('icon accessibility');
          if (!card.getAttribute('href')?.startsWith('/articles/'))
            errors.push('invalid destination');
          hrefs.add(card.getAttribute('href') || '');
          for (const el of [card, icon, title, label]) {
            const r = el.getBoundingClientRect();
            if (
              r.left < -1 ||
              r.right > innerWidth + 1 ||
              el.scrollWidth > el.clientWidth + 1
            )
              errors.push('clipped card');
          }
        }
        if (hrefs.size !== nodes.length) errors.push('duplicate destinations');
        if (document.documentElement.scrollWidth > innerWidth)
          errors.push('horizontal overflow');
        return errors;
      });
      expect(issues, `${width}px ${path}`).toEqual([]);
    }
  }
});
