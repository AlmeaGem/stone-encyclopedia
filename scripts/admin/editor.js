let state,
  csrf,
  revision,
  documentValue,
  hasDraft = false;
const $ = (id) => document.getElementById(id);
const showStatus = (message) => ($('status').textContent = message);
let busy = false;
async function api(path, body) {
  const response = await fetch(
    path,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  if (response.status === 401) {
    location.href = '/login';
    throw new Error('ログインが必要です');
  }
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}
async function action(fn) {
  if (busy) return;
  busy = true;
  const buttons = [...document.querySelectorAll('button')].filter(
    (b) => !b.disabled,
  );
  buttons.forEach((b) => (b.disabled = true));
  try {
    await fn();
  } catch (e) {
    showStatus(e.message + '\n入力はこの画面に残っています。');
  } finally {
    busy = false;
    buttons.forEach((b) => (b.disabled = false));
    $('publish').disabled = !hasDraft;
  }
}
const key = (e) => ($('collection').value === 'articles' ? e.slug : e.id);
function entries() {
  const collection = $('collection').value;
  $('entry').replaceChildren();
  for (const e of state[collection]) {
    const option = document.createElement('option');
    option.value = key(e);
    option.textContent = e.name || e.title;
    $('entry').append(option);
  }
}
const fields = {
  name: '石名・カテゴリ名',
  english: '英語名',
  aliases: '別名（1行1件）',
  introduction: '紹介文',
  mineral: '鉱物名（未確認は空欄）',
  hardness: '硬度（未確認は空欄）',
  colors: '色（1行1件）',
  wishes: '願いのカテゴリID（1行1件）',
  themes: '伝承のテーマ（1行1件）',
  characteristics: '鉱物学的な特徴',
  inclusions: '内包物・模様',
  quality: '品質の見方',
  symbolism: '伝承・象徴',
  selection: '選び方',
  shapes: '形状の解説',
  cleansing: '浄化の解説',
  handling: '取り扱い注意',
  treatments: '処理・模造品の注意',
  reviewNote: '未確認事項・編集注',
  title: '記事のタイトル',
  category: '記事カテゴリ',
  description: '説明',
  updatedAt: '編集日',
  subcategories: '小分類（1行1件）',
};
function showFields() {
  const wrap = $('fields');
  wrap.replaceChildren();
  for (const [name, labelText] of Object.entries(fields)) {
    if (!(name in documentValue)) continue;
    const label = document.createElement('label');
    label.textContent = labelText;
    if (name.length > 8 || String(documentValue[name]).length > 80)
      label.className = 'long';
    const input = document.createElement(
      ['name', 'english', 'title'].includes(name) ? 'input' : 'textarea',
    );
    input.dataset.field = name;
    input.value = Array.isArray(documentValue[name])
      ? documentValue[name].join('\n')
      : documentValue[name];
    input.addEventListener('input', () => {
      documentValue[name] = Array.isArray(documentValue[name])
        ? input.value
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean)
        : input.value;
      sync();
    });
    label.append(input);
    wrap.append(label);
  }
  showStructuredFields(wrap);
  sync();
}
function sync() {
  $('document').value = JSON.stringify(documentValue, null, 2);
}
async function load() {
  const entry = await api(
    `/api/entry?collection=${encodeURIComponent($('collection').value)}&id=${encodeURIComponent($('entry').value)}`,
  );
  documentValue = entry.document;
  revision = entry.revision;
  hasDraft = entry.hasDraft;
  showFields();
  $('publish').disabled = !entry.hasDraft;
  showStatus(
    entry.hasDraft
      ? '保存済みの下書きを開きました。'
      : '公開用データを開きました。変更はまず下書きに保存します。',
  );
}
function renderCandidates() {
  const id = $('image-stone').value,
    wrap = $('candidates');
  wrap.replaceChildren();
  const list = state.candidates.filter((c) => c.stoneId === id);
  if (!list.length) {
    const p = document.createElement('p');
    p.textContent =
      'この石の候補はありません。検索または手動登録を利用してください。';
    wrap.append(p);
  }
  for (const c of list) {
    const div = document.createElement('div');
    div.className = 'candidate';
    const p = document.createElement('p');
    p.textContent = `${c.stoneName} / ${c.status} / ${c.license} / 撮影者 ${c.photographer || '未確認'}`;
    const link = document.createElement('a');
    link.href = c.pageUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '原ページを確認 ↗';
    const button = document.createElement('button');
    button.textContent = '候補を開く';
    button.onclick = () => {
      $('candidate-json').value = JSON.stringify(c, null, 2);
      $('identity').checked = c.identityConfirmed;
      $('rights').checked = c.rightsConfirmed;
    };
    div.append(p, link, document.createTextNode(' '), button);
    wrap.append(div);
  }
  $('approved').replaceChildren();
  for (const i of state.images) {
    const p = document.createElement('p');
    p.textContent = `${i.stoneId} / ${i.photographer} / ${i.license} / ${i.reviewedAt}`;
    $('approved').append(p);
  }
}
async function refresh() {
  state = await api('/api/state');
  csrf = state.csrf;
  renderCandidates();
}
$('collection').onchange = () => {
  entries();
  revision = undefined;
  action(load);
};
$('load').onclick = () => action(load);
$('apply-json').onclick = () =>
  action(async () => {
    documentValue = JSON.parse($('document').value);
    showFields();
    showStatus('フォームへ反映しました。まだ保存されていません。');
  });
$('save-draft').onclick = () =>
  action(async () => {
    documentValue = JSON.parse($('document').value);
    const r = await api('/api/draft', {
      collection: $('collection').value,
      id: $('entry').value,
      revision,
      document: documentValue,
    });
    revision = r.revision;
    hasDraft = true;
    $('publish').disabled = false;
    showStatus('下書きを保存しました。公開サイトには反映していません。');
  });
$('publish').onclick = () =>
  action(async () => {
    if (
      !confirm(
        '保存した下書きを公開用データに反映しますか？ 未保存の入力は反映しません。反映後もGitHubで差分確認・テスト・PR承認が必要です。',
      )
    )
      return;
    await api('/api/publish', {
      collection: $('collection').value,
      id: $('entry').value,
      revision,
    });
    showStatus(
      '公開用データへ反映しました。ターミナルでnpm run build・npm testを実行し、GitHubのPRで差分を確認してください。',
    );
    revision = undefined;
    hasDraft = false;
  });
$('new-article').onclick = () =>
  action(async () => {
    const slug = prompt('新しい記事のURL名（英小文字・数字・ハイフン）');
    if (!slug) return;
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('URL名が不正です');
    $('collection').value = 'articles';
    entries();
    const option = document.createElement('option');
    option.value = slug;
    option.textContent = '新しい記事';
    $('entry').append(option);
    $('entry').value = slug;
    revision = 'new';
    hasDraft = false;
    documentValue = {
      slug,
      title: '新しい記事',
      category: '基礎知識',
      description: '',
      sections: [{ heading: '見出し', body: '' }],
      stoneIds: [],
      updatedAt: new Date().toISOString().slice(0, 10),
      status: 'draft',
    };
    showFields();
  });
$('logout').onclick = () =>
  action(async () => {
    await api('/api/logout', {});
    location.href = '/login';
  });
document.querySelectorAll('[data-tab]').forEach(
  (b) =>
    (b.onclick = () => {
      for (const id of ['content', 'images'])
        $(id).hidden = id !== b.dataset.tab;
    }),
);
$('image-stone').onchange = renderCandidates;
$('collect').onclick = () =>
  action(async () => {
    showStatus('候補を収集しています。自動公開はしません。');
    const results = await api('/api/collect', {
      stoneId: $('image-stone').value,
    });
    await refresh();
    showStatus(
      `${results.length}件の候補を取得しました。原ページで石の一致とライセンスを確認してください。`,
    );
  });
$('manual-candidate').onclick = () => {
  const stone = state.stones.find((s) => s.id === $('image-stone').value);
  const c = {
    id: 'manual-' + crypto.randomUUID(),
    stoneId: stone.id,
    stoneName: stone.name,
    searchName: stone.english,
    imageUrl: 'https://upload.wikimedia.org/',
    pageUrl: 'https://commons.wikimedia.org/',
    photographer: '',
    provider: 'Wikimedia Commons',
    license: 'unknown',
    licenseUrl: '',
    commercial: false,
    derivatives: false,
    attribution: true,
    modified: false,
    status: 'review',
    misidentificationNote: '対象・名称・処理を確認',
    identityConfirmed: false,
    rightsConfirmed: false,
    reviewedAt: null,
    alt: '',
    localPath: null,
    width: null,
    height: null,
    sha256: null,
  };
  $('candidate-json').value = JSON.stringify(c, null, 2);
  $('identity').checked = false;
  $('rights').checked = false;
  showStatus('候補のJSONに原ページの正しい情報を入力してください。');
};
function candidate() {
  const c = JSON.parse($('candidate-json').value);
  c.identityConfirmed = $('identity').checked;
  c.rightsConfirmed = $('rights').checked;
  return c;
}
$('save-candidate').onclick = () =>
  action(async () => {
    await api('/api/candidate', { document: candidate() });
    await refresh();
    showStatus('候補を保存しました。まだ公開されていません。');
  });
$('approve').onclick = () =>
  action(async () => {
    const c = candidate();
    if (
      !confirm(
        `${c.stoneName}の写真を採用しますか？ 石の一致・商用利用・改変・帰属・継承の条件を確認してください。`,
      )
    )
      return;
    const image = await api('/api/approve', { document: c });
    $('candidate-json').value = JSON.stringify(image, null, 2);
    await refresh();
    showStatus(
      '画像を最適化し、承認済みの公開用データへ登録しました。ビルドとPR確認後にデプロイしてください。',
    );
  });
$('remove-photo').onclick = () =>
  action(async () => {
    if (
      !confirm(
        'この石の写真を公開用の表示から外しますか？ 元ファイルは削除しません。',
      )
    )
      return;
    await api('/api/remove-photo', { stoneId: $('image-stone').value });
    await refresh();
    showStatus('公開用の写真表示を外しました。');
  });
(async () => {
  state = await api('/api/state');
  csrf = state.csrf;
  entries();
  for (const s of state.stones) {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = `${s.id} ${s.name}`;
    $('image-stone').append(o);
  }
  renderCandidates();
  await load();
})().catch((e) => showStatus(e.message));

function showStructuredFields(wrap) {
  const groups = [
    ['sections', '本文の段落', { heading: '段落の見出し', body: '段落の本文' }],
    [
      'sources',
      '出典と確認日',
      {
        label: '資料名',
        url: '出典URL（HTTPS・未確認は空欄）',
        checkedAt: '実際に資料を確認した日',
        note: '確認状況・注記',
      },
    ],
  ];
  for (const [key, title, names] of groups) {
    if (!Array.isArray(documentValue[key])) continue;
    const section = document.createElement('section');
    section.className = 'long';
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.append(heading);
    documentValue[key].forEach((record, index) => {
      const group = document.createElement('div');
      group.className = 'candidate';
      for (const [field, labelText] of Object.entries(names)) {
        const label = document.createElement('label');
        label.textContent = labelText;
        const input = document.createElement(
          field === 'body' || field === 'note' ? 'textarea' : 'input',
        );
        if (field === 'checkedAt') input.type = 'date';
        input.value = record[field] || '';
        input.oninput = () => {
          record[field] =
            field === 'checkedAt' ? input.value || null : input.value;
          sync();
        };
        label.append(input);
        group.append(label);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'この項目を外す';
      remove.onclick = () => {
        documentValue[key].splice(index, 1);
        showFields();
      };
      group.append(remove);
      section.append(group);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = title + 'を追加';
    add.onclick = () => {
      documentValue[key].push(
        key === 'sections'
          ? { heading: '新しい見出し', body: '' }
          : { label: '新しい資料', url: '', checkedAt: null, note: '' },
      );
      showFields();
    };
    section.append(add);
    wrap.append(section);
  }
  if ('status' in documentValue) {
    const label = document.createElement('label');
    label.textContent = '公開状態（石は初期210件を維持）';
    const select = document.createElement('select');
    for (const [value, text] of [
      ['published', '公開'],
      ['draft', '下書き'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    }
    select.value = documentValue.status;
    select.onchange = () => {
      documentValue.status = select.value;
      sync();
    };
    label.append(select);
    wrap.append(label);
  }
}
