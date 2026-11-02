import { test, expect, devices } from '@playwright/test';
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('supplied icons use content-versioned URLs on desktop, iPhone and Android browser profiles', async ({
  browser,
}, info) => {
  const files = [
    'favicon.ico',
    'favicon-32.png',
    'favicon-48.png',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
  ];
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file + '\0');
    hash.update(await readFile('public/' + file));
  }
  const version = hash.digest('hex').slice(0, 16);
  const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
  const iconUrl = (file: string) => `${base}${file}?v=${version}`;
  for (const [name, options] of [
    ['desktop', { viewport: { width: 1440, height: 1000 } }],
    ['iphone', devices['iPhone 13']],
    ['android', devices['Pixel 5']],
  ] as const) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.goto(base);
    const apple = page.locator('link[rel="apple-touch-icon"]');
    const applePath = await apple.getAttribute('href');
    expect(applePath).toBe(iconUrl('apple-touch-icon.png'));
    for (const [path, size] of [
      [applePath!, 180],
      [iconUrl('icon-192.png'), 192],
      [iconUrl('icon-512.png'), 512],
      [iconUrl('favicon-32.png'), 32],
      [iconUrl('favicon-48.png'), 48],
    ] as const) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(200);
      const bytes = await response.body();
      const filename = new URL(path, 'http://localhost').pathname.slice(
        base.length,
      );
      expect(bytes.equals(await readFile('public/' + filename))).toBe(true);
      const meta = await sharp(bytes).metadata();
      expect([meta.width, meta.height]).toEqual([size, size]);
    }
    for (const [size, type] of [
      ['32x32', 'image/png'],
      ['48x48', 'image/png'],
      ['16x16 32x32 48x48', 'image/x-icon'],
    ]) {
      await expect(
        page.locator(`link[rel="icon"][sizes="${size}"]`),
      ).toHaveAttribute(
        'href',
        iconUrl(
          type === 'image/x-icon'
            ? 'favicon.ico'
            : `favicon-${size.split('x')[0]}.png`,
        ),
      );
    }
    const favicon = await page.request.get(iconUrl('favicon.ico'));
    expect(
      (await favicon.body()).equals(await readFile('public/favicon.ico')),
    ).toBe(true);
    expect(favicon.status()).toBe(200);
    expect((await favicon.body()).subarray(0, 4)).toEqual(
      Buffer.from([0, 0, 1, 0]),
    );
    const manifestPath = await page
      .locator('link[rel="manifest"]')
      .getAttribute('href');
    expect(manifestPath).toBe(iconUrl('site.webmanifest'));
    const manifest = await (await page.request.get(manifestPath!)).json();
    expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual([
      iconUrl('icon-192.png'),
      iconUrl('icon-512.png'),
    ]);
    for (const icon of manifest.icons)
      expect((await page.request.get(icon.src)).status()).toBe(200);
    expect(manifest.start_url).toBe(base);
    expect(manifest.scope).toBe(base);
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
