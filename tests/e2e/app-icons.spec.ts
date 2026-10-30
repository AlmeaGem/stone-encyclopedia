import { test, expect, devices } from '@playwright/test';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

test('supplied icons load on desktop, iPhone Safari and Android browser profiles', async ({
  browser,
}, info) => {
  for (const [name, options] of [
    ['desktop', { viewport: { width: 1440, height: 1000 } }],
    ['iphone', devices['iPhone 13']],
    ['android', devices['Pixel 5']],
  ] as const) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.goto('/');
    const apple = page.locator('link[rel="apple-touch-icon"]');
    const applePath = await apple.getAttribute('href');
    expect(applePath).toBe('/apple-touch-icon.png');
    for (const [path, size] of [
      [applePath!, 180],
      ['/icon-192.png', 192],
      ['/icon-512.png', 512],
      ['/favicon-32.png', 32],
      ['/favicon-48.png', 48],
    ] as const) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(200);
      const meta = await sharp(await response.body()).metadata();
      expect([meta.width, meta.height]).toEqual([size, size]);
    }
    const favicon = await page.request.get('/favicon.ico');
    expect(favicon.status()).toBe(200);
    expect((await favicon.body()).subarray(0, 4)).toEqual(
      Buffer.from([0, 0, 1, 0]),
    );
    const manifestPath = await page
      .locator('link[rel="manifest"]')
      .getAttribute('href');
    const manifest = await (await page.request.get(manifestPath!)).json();
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
      ['192x192', '512x512'],
    );
    expect(
      manifest.icons.every(
        (icon: { purpose: string }) => icon.purpose === 'any',
      ),
    ).toBe(true);
    await expect(page.locator('link[href*="favicon.svg"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex,nofollow',
    );
    // Review the actual supplied artwork, not a browser home-screen simulation.
    await page.goto(applePath!);
    if (info.project.name === 'desktop') {
      await mkdir('test-results/app-icons', { recursive: true });
      await page.screenshot({ path: `test-results/app-icons/${name}.png` });
    }
    await context.close();
  }
});
