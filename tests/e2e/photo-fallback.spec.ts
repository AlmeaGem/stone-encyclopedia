import { expect, test, type Page } from '@playwright/test';

const api = 'https://photos.example.test';
const photo = {
  stoneId: 's107',
  state: 'published',
  revision: 'test',
  alt: '試験用ローズクォーツ',
  photographer: 'テスト',
  sourceUrl: 'https://example.com/',
  license: 'Own photo',
  kind: 'illustrative',
};
const cors = { 'access-control-allow-origin': '*' };
async function openStone(page: Page) {
  await page.goto('/stones/rose-quartz/');
  const slot = page
    .locator('.cloud-photo-slot[data-cloud-photo="s107"]')
    .first();
  const original = slot.locator('.stone-figure.detail img');
  await original.scrollIntoViewIfNeeded();
  const src = await original.getAttribute('src');
  expect(src).toMatch(/^\/images\/s107\//);
  return { slot, src };
}

test('manifest failure keeps the approved static photo', async ({ page }) => {
  await page.route(`${api}/public/photos`, (route) =>
    route.fulfill({ status: 503, headers: cors }),
  );
  const failed = page.waitForResponse(`${api}/public/photos`);
  const { slot, src } = await openStone(page);
  await failed;
  await expect(slot.locator('img')).toHaveAttribute('src', src!);
  await expect(slot.locator('.stone-placeholder')).toHaveCount(0);
});

test('individual image 503 keeps the approved static photo', async ({
  page,
}) => {
  await page.route(`${api}/public/photos`, (route) =>
    route.fulfill({ json: { photos: [photo] }, headers: cors }),
  );
  let attempted = false;
  await page.route(`${api}/public/image/**`, (route) => {
    attempted = true;
    return route.fulfill({ status: 503, headers: cors });
  });
  const { slot, src } = await openStone(page);
  await expect.poll(() => attempted).toBe(true);
  await page.waitForTimeout(300);
  await expect(slot.locator('img')).toHaveAttribute('src', src!);
  await expect(slot.locator('.stone-placeholder')).toHaveCount(0);
});

test('a stalled replacement times out without hiding the approved static photo', async ({
  page,
}) => {
  test.setTimeout(40000);
  await page.route(`${api}/public/photos`, (route) =>
    route.fulfill({ json: { photos: [photo] }, headers: cors }),
  );
  let attempted = false;
  await page.route(`${api}/public/image/**`, async (route) => {
    attempted = true;
    await new Promise((resolve) => setTimeout(resolve, 12000));
    await route.abort().catch(() => {});
  });
  const { slot, src } = await openStone(page);
  await expect.poll(() => attempted).toBe(true);
  await page.waitForTimeout(10500);
  await expect(slot.locator('img')).toHaveAttribute('src', src!);
  await expect(slot.locator('.stone-placeholder')).toHaveCount(0);
});

test('unregistered or unpublished records keep the static photo; a valid image replaces it', async ({
  page,
}) => {
  let state: 'missing' | 'paused' | 'published' = 'missing';
  await page.route(`${api}/public/photos`, (route) =>
    route.fulfill({
      json: { photos: state === 'missing' ? [] : [{ ...photo, state }] },
      headers: cors,
    }),
  );
  let staticSrc = '';
  for (state of ['missing', 'paused'] as const) {
    const manifest = page.waitForResponse(`${api}/public/photos`);
    const { slot, src } = await openStone(page);
    await manifest;
    staticSrc = src!;
    await expect(slot.locator('img')).toHaveAttribute('src', src!);
    await expect(slot.locator('.stone-placeholder')).toHaveCount(0);
  }
  // Serve the actual static image so the cloud replacement must decode successfully.
  await page.route(`${api}/public/image/**`, async (route) => {
    const image = await page.request.get(`http://127.0.0.1:4321${staticSrc}`);
    await route.fulfill({
      status: 200,
      contentType: 'image/webp',
      body: await image.body(),
      headers: cors,
    });
  });
  state = 'published';
  await page.reload();
  const slot = page
    .locator('.cloud-photo-slot[data-cloud-photo="s107"]')
    .first();
  await page.locator('.stone-heading').scrollIntoViewIfNeeded();
  await expect(slot.locator('img')).toHaveAttribute('alt', photo.alt);
  await expect(slot.locator('img')).toHaveAttribute(
    'src',
    /public\/image\/s107/,
  );
});
