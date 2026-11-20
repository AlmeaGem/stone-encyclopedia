// Isolated test interface. No credentials, real article text or private images are embedded.
export const testHtml = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>スペシャルストーン｜テスト環境</title>
<style>
:root{font-family:system-ui,sans-serif;color:#332b28;background:#f9f5ef;line-height:1.65}body{max-width:56rem;margin:auto;padding:1rem}h1{font-size:1.6rem}h2{font-size:1.15rem}section{background:white;border:1px solid #e4d7c8;border-radius:.6rem;padding:1rem;margin:1rem 0}label{display:block;margin:.7rem 0}input{display:block;box-sizing:border-box;padding:.6rem;width:100%;max-width:30rem}button{font:inherit;padding:.5rem .8rem;margin:.3rem .3rem .3rem 0;cursor:pointer}button:disabled{cursor:not-allowed}pre{white-space:pre-wrap;overflow-wrap:anywhere}img{display:block;max-width:100%;height:auto;margin:.5rem 0}.notice{color:#733e16}output{display:block;white-space:pre-wrap;overflow-wrap:anywhere}
</style></head><body>
<header><h1>スペシャルストーン テスト環境</h1><p class="notice">テスト専用です。テストアカウントとダミー素材のみ使用してください。</p></header>
<section><h2>ログイン・会員登録</h2><label>メールアドレス<input id="email" type="email" autocomplete="username"></label><label>パスワード<input id="password" type="password" autocomplete="current-password"></label><button id="login" type="button">ログイン</button><button id="signup" type="button">テスト会員を登録</button><button id="logout" type="button">ログアウト</button><p id="login-status">ログインしていません</p></section>
<section><h2>決済と閲覧権限</h2><p>単品150円／月額580円のテスト決済です。テスト用カードのみを使用してください。</p><button id="single" type="button">単品テスト決済</button><button id="monthly" type="button">月額テスト決済</button><button id="account" type="button">購入状況を確認</button><output id="account-result"></output><p>決済画面から戻った後は、再度ログインしてください。</p></section>
<section><h2>記事のアクセス確認</h2><label>記事ID<input id="article" value="chapter-one" maxlength="64" autocomplete="off"></label><button id="view" type="button">ログイン状態で記事を確認</button><button id="anonymous" type="button">未ログインで拒否を確認</button><pre id="article-result"></pre><div id="images"></div></section>
<section aria-live="polite"><h2>操作結果</h2><output id="message"></output></section>
<script src="/__special-test__/app.js" defer></script></body></html>`;

export const testScript = String.raw`'use strict';
(() => {
  let accessToken = null;
  let objectUrls = [];
  const $ = (id) => document.getElementById(id);
  const message = (text) => { $('message').textContent = text; };
  const clearContent = () => { for (const url of objectUrls) URL.revokeObjectURL(url); objectUrls = []; $('article-result').textContent = ''; $('images').replaceChildren(); };
  const call = async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (options.auth !== false && accessToken) headers.set('Authorization', 'Bearer ' + accessToken);
    const response = await fetch(path, { method: options.method || 'GET', headers, body: options.body, credentials: 'omit', cache: 'no-store', redirect: 'error' });
    return response;
  };
  const jsonPost = (path, body, auth = false) => call(path, {method:'POST', auth, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  async function auth(mode) {
    clearContent(); accessToken = null; $('password').setAttribute('aria-invalid','false');
    try {
      const response = await jsonPost('/api/auth/' + mode, {email:$('email').value.trim(), password:$('password').value});
      $('password').value = '';
      if (!response.ok) throw new Error('認証できませんでした。テスト用アカウントと設定を確認してください。');
      const data = await response.json();
      if (data.access_token) { accessToken = data.access_token; $('login-status').textContent = 'テスト環境にログイン中'; message('ログインしました。'); }
      else { $('login-status').textContent = 'ログインしていません'; message('登録確認が必要です。テスト用メールを確認してください。'); }
    } catch (error) { $('password').value = ''; $('login-status').textContent = 'ログインしていません'; message(error.message); }
  }
  $('login').addEventListener('click', () => auth('login'));
  $('signup').addEventListener('click', () => auth('signup'));
  $('logout').addEventListener('click', async () => {
    try { if (accessToken) { const r = await call('/api/auth/logout',{method:'POST'}); if (!r.ok) throw new Error('サーバー側のログアウトを確認できませんでした。'); } message('ログアウトしました。'); }
    catch (error) { message(error.message); }
    finally { accessToken = null; clearContent(); $('login-status').textContent = 'ログインしていません'; $('account-result').textContent = ''; }
  });
  async function checkout(kind) {
    if (!accessToken) { message('先にログインしてください。'); return; }
    const body = kind === 'single' ? {kind, article_id:$('article').value.trim()} : {kind};
    try {
      const response = await jsonPost('/api/checkout',body,true);
      if (!response.ok) throw new Error('テスト決済を開始できませんでした。');
      const data = await response.json(); const target = new URL(data.checkout_url);
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com' || target.username || target.password || target.port) throw new Error('決済先を確認できませんでした。');
      accessToken = null; clearContent(); location.assign(target.href);
    } catch (error) { message(error.message); }
  }
  $('single').addEventListener('click', () => checkout('single'));
  $('monthly').addEventListener('click', () => checkout('subscription'));
  $('account').addEventListener('click', async () => { try { const r = await call('/api/account'); if (!r.ok) throw new Error('購入状況を確認できませんでした。ログイン状態を確認してください。'); const d = await r.json(); $('account-result').textContent = JSON.stringify(d,null,2); message('購入状況を確認しました。'); } catch (e) { message(e.message); } });
  async function view(anonymous) {
    clearContent(); const id = $('article').value.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64) { message('記事IDを確認してください。'); return; }
    if (!anonymous && !accessToken) { message('先にログインしてください。'); return; }
    try {
      const r = await call('/api/articles/' + id,{auth:!anonymous});
      if (anonymous) { message(r.status === 401 || r.status === 403 ? '未ログインからのアクセスは拒否されました。' : '拒否を確認できませんでした（HTTP ' + r.status + '）。'); return; }
      if (!r.ok) { message(r.status === 401 || r.status === 403 ? '閲覧権限がありません（HTTP ' + r.status + '）。' : '記事を取得できませんでした（HTTP ' + r.status + '）。'); return; }
      $('article-result').textContent = await r.text();
      if (id === 'chapter-one') for (const gem of ['sapphire','ruby','emerald']) {
        const img = await call('/api/articles/' + id + '/assets/' + gem);
        if (img.ok) { const url = URL.createObjectURL(await img.blob()); objectUrls.push(url); const el = document.createElement('img'); el.src = url; el.alt = gem + '（テスト素材）'; $('images').append(el); }
      }
      message('記事を取得しました。');
    } catch { message('通信に失敗しました。'); }
  }
  $('view').addEventListener('click', () => view(false));
  $('anonymous').addEventListener('click', () => view(true));
})();`;
