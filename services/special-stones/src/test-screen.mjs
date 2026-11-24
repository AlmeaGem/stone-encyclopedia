// Isolated test interface. No credentials, real article text or private images are embedded.
export const testHtml = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>スペシャルストーン｜テスト環境</title>
<style>
:root{font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:#4b3931;background:#f9f3ec;line-height:1.75;font-size:16px}
*{box-sizing:border-box}body{margin:0} [hidden]{display:none!important}
header{background:linear-gradient(120deg,#f1e3d9,#fff9f2 57%,#e8d3c4);text-align:center;padding:2.4rem 1rem 2rem;border-bottom:1px solid #dcc6b6}
.brand{font-family:Georgia,"Yu Mincho",serif;letter-spacing:.23em;font-size:1.4rem;color:#64463a;margin:0}
.eyebrow{font-size:.72rem;letter-spacing:.18em;color:#705541;margin:.5rem 0}
h1,h2,h3{font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-weight:600;line-height:1.5;color:#32231e}
h1{font-size:clamp(1.55rem,4vw,2.25rem);margin:.85rem 0}h2{font-size:1.3rem;margin:0 0 .8rem}h3{font-size:1.1rem;margin:0}
.notice{color:#705541;font-size:.83rem;margin:.75rem auto 0;max-width:38rem}
main{max-width:780px;margin:0 auto;padding:1.25rem 1rem 3rem}
section{background:#fffcf8;border:1px solid #e4d3c3;border-radius:14px;padding:clamp(1rem,3vw,1.8rem);margin:1rem 0;box-shadow:0 6px 20px #68402c0d}
label{display:block;margin:.8rem 0;font-size:.9rem;font-weight:600}
input{display:block;width:100%;padding:.85rem .9rem;margin-top:.3rem;border:1px solid #bda798;border-radius:7px;background:#fff;color:#32231e;font:inherit;min-width:0}
button{font:inherit;line-height:1.4;min-height:46px;padding:.7rem 1.05rem;border:1px solid #bfa795;border-radius:8px;background:#fffaf5;color:#64463a;cursor:pointer;overflow-wrap:anywhere}
button.primary{background:#754732;border-color:#754732;color:white}button:disabled{cursor:not-allowed;opacity:.6}
button:focus-visible,input:focus-visible{outline:3px solid #80543e;outline-offset:3px}
.actions{display:flex;gap:.65rem;flex-wrap:wrap;margin-top:1rem}.actions button{flex:1 1 10rem}
#login-status{color:#705d51;font-size:.88rem;margin:.8rem 0 0}
.signed-in{display:flex;align-items:center;gap:.85rem;flex-wrap:wrap}.signed-in .identity{flex:1;min-width:0;overflow-wrap:anywhere}.signed-in .identity p{margin:0}
.status{color:#365b46;font-weight:600;font-size:.9rem} .avatar{width:44px;height:44px;border:1px solid #d8bcaa;border-radius:50%;display:grid;place-items:center;color:#80543e;background:#f0e4d8}
.plans{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.1rem 0}
.plan{display:flex;flex-direction:column;gap:.5rem;background:#faf3eb;border:1px solid #e1cfc0;border-radius:10px;padding:1.1rem}
.price{font-family:Georgia,"Yu Mincho",serif;font-size:1.75rem;color:#4b3931}.price small{font:inherit;font-size:.8rem}
.plan p{font-size:.86rem;margin:0 0 .5rem}.plan button{margin-top:auto;width:100%}
.help{font-size:.86rem;color:#705d51}.account-panel{background:#f5ebe2;padding:.8rem 1rem;border-radius:8px;margin:1rem 0}
output,pre{display:block;white-space:pre-wrap;overflow-wrap:anywhere}pre{font-family:inherit;line-height:1.9;margin:1rem 0 0}pre:empty{display:none}
#images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.6rem}img{display:block;max-width:100%;height:auto;border-radius:8px}
#message{font-weight:600;color:#64463a}#message:empty::before{content:"操作結果がここに表示されます。";font-weight:400;color:#705d51}
@media(max-width:540px){.plans{grid-template-columns:1fr}.actions{flex-direction:column}.actions button{flex:auto;width:100%}header{padding-top:1.8rem}#images{grid-template-columns:1fr}}
</style></head><body>
<header><p class="brand">ALMÉA GEM</p><p class="eyebrow">SPECIAL STONES · MEMBER ACCOUNT</p><h1>スペシャルストーン</h1><p class="notice">テスト環境｜実際の課金は行われません。テスト用アカウント・カード・ダミー素材のみ使用してください。</p></header>
<main>
<section id="return-status" hidden role="status"><h2 id="return-title">購入状況を確認しています</h2><p id="return-detail" class="help"></p><div class="actions"><button id="retry-return" class="primary" type="button" hidden>閲覧権限を再確認</button><button id="back-to-account" type="button">マイアカウントへ</button></div></section>
<section id="auth-section" aria-labelledby="auth-heading"><h2 id="auth-heading">ログイン・会員登録</h2><div id="auth-form"><p class="help">会員登録済みの方はログインしてください。</p><label>メールアドレス<input id="email" type="email" autocomplete="username"></label><label>パスワード（8文字以上）<input id="password" type="password" minlength="8" maxlength="128" autocomplete="current-password"></label><div class="actions"><button id="login" class="primary" type="button">ログイン</button><button id="signup" type="button">テスト会員を登録</button></div></div><div id="signed-in" class="signed-in" hidden><span class="avatar" aria-hidden="true">◇</span><div class="identity"><p class="status">✓ ログイン済み</p><p id="member-email"></p></div><button id="logout" type="button">ログアウト</button></div><p id="login-status" role="status">ログインしていません</p></section>
<section id="purchase-section"><p class="eyebrow">MEMBERSHIP &amp; PURCHASE</p><h2>記事を購入する</h2><p class="help" id="purchase-help">購入するにはログインしてください。</p><div class="plans"><div class="plan"><h3>単品購入</h3><div class="price">¥150 <small>税込／記事</small></div><p>購入した記事を期限なく閲覧できます。</p><button id="single" class="primary" type="button" disabled>単品テスト決済</button></div><div class="plan"><h3>月額会員</h3><div class="price">¥580 <small>税込／月</small></div><p>会員期間中、すべての有料記事を閲覧できます。</p><button id="monthly" class="primary" type="button" disabled>月額テスト決済</button></div></div><button id="account" type="button" disabled>購入状況を確認</button><div class="account-panel" id="account-panel" hidden><strong>あなたの購入状況</strong><output id="account-result"></output></div><p class="help">決済後は購入権限を確認し、そのまま記事を表示します。</p></section>
<section id="reader-section" tabindex="-1"><p class="eyebrow">CHAPTER I · ACCESS TEST</p><h2 id="reader-heading">第一章の閲覧確認</h2><div id="reader-controls"><p class="help">ログインだけでは有料記事は読めません。購入前の閲覧拒否は正常です。</p><label>記事ID<input id="article" value="chapter-one" maxlength="64" autocomplete="off"></label><div class="actions"><button id="view" class="primary" type="button" disabled>ログイン状態で記事を確認</button><button id="anonymous" type="button">未ログインで拒否を確認</button></div></div><pre id="article-result"></pre><div id="images"></div></section>
<section aria-live="polite"><h2>操作結果</h2><output id="message"></output></section>
</main><script src="/__special-test__/app.js" defer></script></body></html>`;

export const testScript = String.raw`'use strict';
(() => {
  let accessToken = null;
  let memberEmail = '';
  let returnRun = 0;
  let checkoutBusy = false;
  const params = new URLSearchParams(location.search);
  const returnKind = params.get('checkout');
  const targetArticle = params.get('article') || 'chapter-one';
  const validId = (id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 64;
  let returnMode = returnKind === 'return' && validId(targetArticle);
  let objectUrls = [];
  const $ = (id) => document.getElementById(id);
  const message = (text) => { $('message').textContent = text; };
  function renderAuth() {
    const signedIn = Boolean(accessToken);
    $('auth-form').hidden = signedIn;
    $('signed-in').hidden = !signedIn;
    $('auth-heading').textContent = signedIn ? 'マイアカウント' : 'ログイン・会員登録';
    $('member-email').textContent = signedIn ? memberEmail : '';
    $('login-status').textContent = signedIn ? 'テスト環境にログイン中' : 'ログインしていません';
    $('purchase-help').textContent = signedIn ? '購入するプランをお選びください。テスト用カードのみ使用してください。' : '購入するにはログインしてください。';
    for (const id of ['single','monthly','account','view']) $(id).disabled = !signedIn;
    if (!signedIn) { $('account-panel').hidden = true; $('account-result').textContent = ''; }
  }
  const clearContent = () => { for (const url of objectUrls) URL.revokeObjectURL(url); objectUrls = []; $('article-result').textContent = ''; $('images').replaceChildren(); };
  const call = async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (options.auth !== false && accessToken) headers.set('Authorization', 'Bearer ' + accessToken);
    const response = await fetch(path, { method: options.method || 'GET', headers, body: options.body, credentials: options.cookies ? 'same-origin' : 'omit', cache: 'no-store', redirect: 'error' });
    return response;
  };
  const jsonPost = (path, body, auth = false, cookies = false) => call(path, {method:'POST', auth, cookies, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const setSession = (data) => { accessToken = data.access_token; memberEmail = data.email || $('email').value.trim(); renderAuth(); };
  function showReturn(title, detail, retry = false) {
    $('return-status').hidden = false;
    $('return-title').textContent = title;
    $('return-detail').textContent = detail;
    $('retry-return').hidden = !retry;
  }
  function accountMode() {
    returnMode = false; returnRun++;
    $('return-status').hidden = true; $('purchase-section').hidden = false;
    $('auth-section').hidden = false; $('reader-controls').hidden = false;
    $('reader-heading').textContent = '第一章の閲覧確認';
    history.replaceState(null, '', location.pathname);
    $('auth-section').scrollIntoView({block:'start'});
  }
  $('back-to-account').addEventListener('click', accountMode);
  $('retry-return').addEventListener('click', () => completeReturn());
  async function auth(mode) {
    clearContent(); accessToken = null; renderAuth(); $('password').setAttribute('aria-invalid','false');
    try {
      const response = await jsonPost('/api/auth/' + mode, {email:$('email').value.trim(), password:$('password').value, browser_session:true},false,true);
      $('password').value = '';
      if (!response.ok) throw new Error('認証できませんでした。テスト用アカウントと設定を確認してください。');
      const data = await response.json();
      if (data.access_token) { setSession(data); message('ログインしました。'); void refreshAccount(false); if(returnMode) void completeReturn(); }
      else { $('login-status').textContent = 'ログインしていません'; message('登録確認が必要です。テスト用メールを確認してください。'); }
    } catch (error) { $('password').value = ''; $('login-status').textContent = 'ログインしていません'; message(error.message); }
  }
  $('login').addEventListener('click', () => auth('login'));
  $('signup').addEventListener('click', () => auth('signup'));
  $('logout').addEventListener('click', async () => {
    try { if (accessToken) { const r = await call('/api/auth/logout',{method:'POST',cookies:true}); if (!r.ok) throw new Error('サーバー側のログアウトを確認できませんでした。'); } message('ログアウトしました。'); }
    catch (error) { message(error.message); }
    finally { accessToken = null; memberEmail = ''; clearContent(); renderAuth(); accountMode(); }
  });
  async function checkout(kind) {
    if (!accessToken) { message('先にログインしてください。'); return; }
    if (checkoutBusy) return;
    checkoutBusy = true; $('single').disabled = true; $('monthly').disabled = true;
    const body = kind === 'single' ? {kind, article_id:$('article').value.trim()} : {kind};
    try {
      const response = await jsonPost('/api/checkout',body,true);
      if (!response.ok) throw new Error('テスト決済を開始できませんでした。');
      const data = await response.json(); const target = new URL(data.checkout_url);
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com' || target.username || target.password || target.port) throw new Error('決済先を確認できませんでした。');
      accessToken = null; clearContent(); renderAuth(); location.assign(target.href);
    } catch (error) { message(error.message); checkoutBusy = false; renderAuth(); }
  }
  $('single').addEventListener('click', () => checkout('single'));
  $('monthly').addEventListener('click', () => checkout('subscription'));
  async function refreshAccount(showMessage = true) {
    const token = accessToken;
    if (!token) return;
    $('account-panel').hidden = false;
    $('account-result').textContent = '購入状況を確認中です。';
    try {
      const r = await call('/api/account');
      if (!r.ok) throw new Error('購入状況を確認できませんでした。');
      const d = await r.json();
      if (accessToken !== token) return;
      const until = d.membership_until ? new Date(d.membership_until) : null;
      const active = until && Number.isFinite(until.getTime()) && until.getTime() > Date.now();
      const bought = Array.isArray(d.purchased_articles) ? d.purchased_articles : [];
      $('account-result').textContent = (active ? '月額会員｜有効期限：' + until.toLocaleDateString('ja-JP', {timeZone:'Asia/Tokyo'}) : '月額会員：未加入') + '\n単品購入済み記事：' + bought.length + '件' + (bought.includes('chapter-one') ? '\n第一章：購入済み' : active ? '\n第一章：月額会員対象' : '\n第一章：未購入');
      if (showMessage) message('購入状況を確認しました。');
    } catch (e) {
      if (accessToken !== token) return;
      $('account-result').textContent = e.message;
      if (showMessage) message(e.message);
    }
  }
  $('account').addEventListener('click', () => refreshAccount());
  renderAuth();
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
      message('記事を取得しました。'); void refreshAccount(false);
    } catch { message('通信に失敗しました。'); }
  }
  async function completeReturn() {
    const run = ++returnRun;
    if (!returnMode || !accessToken) return;
    const token = accessToken;
    const current = () => returnMode && run === returnRun && token === accessToken;
    $('purchase-section').hidden = true;
    $('reader-controls').hidden = true;
    $('reader-heading').textContent = '購入した記事';
    $('article').value = targetArticle;
    clearContent();
    showReturn('購入状況を確認しています', '決済通知と閲覧権限をサーバーで照合しています。');
    $('return-status').scrollIntoView({block:'start'});
    try {
      for (let attempt = 0; attempt < 12; attempt++) {
        if (!current()) return;
        const r = await call('/api/articles/' + targetArticle);
        if (!current()) return;
        if (r.ok) {
          const body = await r.text();
          if (!current()) return;
          $('article-result').textContent = body;
          let missingImages = false;
          if (targetArticle === 'chapter-one') for (const gem of ['sapphire','ruby','emerald']) {
            const img = await call('/api/articles/' + targetArticle + '/assets/' + gem);
            if (!current()) return;
            if (!img.ok) { missingImages = true; continue; }
            const blob = await img.blob();
            if (!current()) return;
            const url = URL.createObjectURL(blob); objectUrls.push(url);
            const el = document.createElement('img'); el.src = url; el.alt = gem + '（テスト素材）'; $('images').append(el);
          }
          showReturn('記事を閲覧できます', missingImages ? '本文を取得しました。一部画像は再確認してください。' : '閲覧権限を確認しました。そのまま記事をお楽しみください。', missingImages);
          $('auth-section').hidden = true;
          $('reader-section').focus({preventScroll:true});
          $('reader-section').scrollIntoView({block:'start'});
          message('記事を取得しました。'); return;
        }
        if (r.status === 401) {
          accessToken = null; renderAuth(); $('auth-section').hidden = false;
          showReturn('ログインの有効期限が切れました', '再度ログインすると購入記事を確認できます。'); return;
        }
        if (r.status !== 403) throw new Error('記事の取得に失敗しました。');
        if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (current()) showReturn('購入権限の反映待ち', '決済をやり直さず、閲覧権限を再確認してください。', true);
    } catch {
      if (current()) showReturn('閲覧権限を確認できませんでした', '再購入せずに、もう一度確認してください。', true);
    }
  }
  async function restoreSession() {
    $('login').disabled = true; $('signup').disabled = true;
    if (returnMode) {
      $('purchase-section').hidden = true;
      $('reader-controls').hidden = true;
      showReturn('購入状況を確認しています', 'ログイン状態を復元しています。');
    }
    try {
      const r = await jsonPost('/api/auth/restore',{},false,true);
      if (r.ok) {
        const d = await r.json();
        if (d.access_token) {
          setSession(d);
          if (returnMode) { await completeReturn(); return; }
          if (returnKind === 'cancel') message('決済をキャンセルしました。');
          void refreshAccount(false); return;
        }
      }
      if (returnMode) showReturn('ログインが必要です', 'ログインすると購入済みの記事を確認できます。再購入は不要です。');
    } catch {
      if (returnMode) showReturn('ログイン状態を確認できませんでした', 'ログイン後に購入状況を確認できます。');
    } finally { $('login').disabled = false; $('signup').disabled = false; }
  }
  $('view').addEventListener('click', () => view(false));
  $('anonymous').addEventListener('click', () => view(true));
  void restoreSession();
})();`;
