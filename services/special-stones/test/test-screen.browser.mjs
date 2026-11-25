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
  let signedIn = false;
  let pendingReads = 0;
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
    if (url.pathname === '/api/auth/login') {
      signedIn = true;
      return json(200, { access_token: 'fake-login-token', email: 'user@example.test' });
    }
    if (url.pathname === '/api/auth/restore')
      return signedIn ? json(200, { access_token: 'fake-login-token', email: 'user@example.test' }) : json(401, {});
    if (url.pathname === '/api/account')
      return json(200, {
        purchased_articles: purchased ? ['chapter-one'] : [],
        membership_until: null,
      });
    if (url.pathname === '/api/auth/logout') { signedIn = false; return json(200, { signed_out: true }); }
    if (url.pathname === '/api/checkout') {
      checkoutMode = req.postDataJSON().kind;
      return json(200, { checkout_url: 'https://checkout.stripe.com/fake' });
    }
    if (url.pathname === '/api/articles/chapter-one') {
      if (!req.headers().authorization)
        return json(401, { error: 'Authentication required' });
      if (pendingReads > 0) { pendingReads--; return json(403, { error: 'Purchase required' }); }
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
  assert.equal(await page.locator('#member-nav').isVisible(), false);
  await page.locator('#anonymous').click();
  await page.getByText('未ログインからのアクセスは拒否されました。').waitFor();
  await page.locator('#email').fill('user@example.test');
  await page.locator('#password').fill('password-for-test');
  await page.locator('#login').click();
  await page.getByText('テスト環境にログイン中').waitFor();
  assert.equal(await page.locator('#password').inputValue(), '');
  assert.equal(await page.locator('#auth-form').isVisible(), false);
  assert.equal(await page.locator('#signed-in').isVisible(), true);
  await page.getByText('第一章：未購入').waitFor();
  assert.equal(await page.locator('#member-nav').isVisible(), true);
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
  const loginCount = calls.filter(c => c.path === '/api/auth/login').length;
  pendingReads = 1;
  await page.goto('https://test.example/special-stones/?checkout=return&article=chapter-one');
  await page.getByText('記事を閲覧できます').waitFor();
  assert.equal(await page.locator('#purchase-section').isVisible(), false);
  assert.equal(await page.locator('#images img').count(), 3);
  assert.equal(calls.filter(c => c.path === '/api/auth/login').length, loginCount);
  await page.locator('#nav-library').click();
  await page.locator('#library-list').getByText('三つの宝石が教えてくれる、願いの叶え方').waitFor();
  assert.equal(await page.locator('#purchase-section').isVisible(), false);
  assert.equal(await page.locator('#reader-section').isVisible(), false);
  await page.locator('#library-list').getByRole('link', { name: '記事を読む' }).click();
  await page.getByText('記事を閲覧できます').waitFor();
  assert.equal(await page.locator('#images img').count(), 3);
  assert.equal(calls.filter(c => c.path === '/api/auth/login').length, loginCount);
  await page.locator('#back-to-account').click();
  await page.locator('#logout').click();
  assert.equal(await page.locator('#member-nav').isVisible(), false);
  await page.getByText('ログアウトしました。').waitFor();
  assert.equal(await page.locator('#auth-form').isVisible(), true);
  assert.equal(await page.locator('#signed-in').isVisible(), false);
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
