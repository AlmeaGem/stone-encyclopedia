// Local browser test with fake responses only; no external credentials or services.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { testHtml, testScript } from '../src/test-screen.mjs';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.TEST_CHROMIUM_PATH || undefined,
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let purchased = false;
  let checkoutMode = '';
  const calls = [];
  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    calls.push({ path: url.pathname, auth: req.headers().authorization || '' });
    const json = (status, data) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    if (url.origin === 'https://checkout.stripe.com')
      return route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'fake checkout',
      });
    if (url.origin !== 'https://test.example') return route.abort();
    if (url.pathname === '/special-stones/')
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: testHtml,
      });
    if (url.pathname === '/__special-test__/app.js')
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: testScript,
      });
    if (url.pathname === '/api/auth/login')
      return json(200, { access_token: 'fake-login-token' });
    if (url.pathname === '/api/auth/logout')
      return json(200, { signed_out: true });
    if (url.pathname === '/api/checkout') {
      checkoutMode = req.postDataJSON().kind;
      return json(200, { checkout_url: 'https://checkout.stripe.com/fake' });
    }
    if (url.pathname === '/api/articles/chapter-one') {
      if (!req.headers().authorization)
        return json(401, { error: 'Authentication required' });
      if (!purchased) return json(403, { error: 'Purchase required' });
      return route.fulfill({
        status: 200,
        contentType: 'text/markdown',
        body: '<img src=x onerror="window.xss=true">\nダミー本文',
      });
    }
    if (url.pathname.startsWith('/api/articles/chapter-one/assets/'))
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
      });
    return json(404, {});
  });
  await page.goto('https://test.example/special-stones/');
  await page.locator('#anonymous').click();
  await page.getByText('未ログインからのアクセスは拒否されました。').waitFor();
  await page.locator('#email').fill('user@example.test');
  await page.locator('#password').fill('password-for-test');
  await page.locator('#login').click();
  await page.getByText('テスト環境にログイン中').waitFor();
  assert.equal(await page.locator('#password').inputValue(), '');
  await page.locator('#view').click();
  await page.getByText('閲覧権限がありません（HTTP 403）。').waitFor();
  purchased = true;
  await page.locator('#view').click();
  await page.getByText('記事を取得しました。').waitFor();
  assert.match(
    await page.locator('#article-result').textContent(),
    /ダミー本文/,
  );
  assert.equal(await page.locator('#images img').count(), 3);
  assert.equal(await page.evaluate(() => window.xss === true), false);
  assert.equal(
    await page.evaluate(() => sessionStorage.length + localStorage.length),
    0,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator('#monthly').click();
  await page.waitForURL('https://checkout.stripe.com/fake');
  assert.equal(checkoutMode, 'subscription');
  await page.goto('https://test.example/special-stones/');
  await page.locator('#email').fill('user@example.test');
  await page.locator('#password').fill('password-for-test');
  await page.locator('#login').click();
  await page.getByText('テスト環境にログイン中').waitFor();
  await page.locator('#logout').click();
  await page.getByText('ログアウトしました。').waitFor();
  await page.locator('#password').fill('password-for-test');
  await page.locator('#login').click();
  await page.getByText('テスト環境にログイン中').waitFor();
  await page.locator('#single').click();
  await page.waitForURL('https://checkout.stripe.com/fake');
  assert.equal(checkoutMode, 'single');
  assert.ok(
    calls.some(
      (c) =>
        c.path === '/api/articles/chapter-one' &&
        c.auth === 'Bearer fake-login-token',
    ),
  );
  console.log(
    'Browser: login, anonymous denial, unpurchased denial, authorized dummy article/images, XSS handling, 390px/1440px, logout, single and subscription checkout passed.',
  );
} finally {
  await browser.close();
}
