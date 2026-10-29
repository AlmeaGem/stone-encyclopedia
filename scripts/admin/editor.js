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
    $('manual-adopt').disabled = manualAdopted;
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
const shapeNames = {
  sphere: '丸玉・スフィア',
  polished: '研磨石・タンブル',
  loose: '宝石ルース',
  rough: '原石・鉱物標本',
  unknown: '形状未確認',
  all: 'すべて',
};
function renderCandidates() {
  const id = $('image-stone').value,
    wrap = $('candidates');
  wrap.replaceChildren();
  const shapeOf = (c) => (c.shapeConfirmed ? c.shape || 'unknown' : 'unknown');
  const selectedShape = $('photo-shape-filter').value;
  const order = ['sphere', 'polished', 'loose', 'rough', 'unknown'];
  const healthOf = (c) => state.imageHealth?.[c.stoneId + ':' + c.id];
  const list = state.candidates
    .filter(
      (c) =>
        c.stoneId === id &&
        (selectedShape === 'all' || shapeOf(c) === selectedShape),
    )
    .sort(
      (a, b) =>
        order.indexOf(shapeOf(a)) - order.indexOf(shapeOf(b)) ||
        Number(healthOf(a)?.status === 'error') -
          Number(healthOf(b)?.status === 'error') ||
        (b.sourceWidth || 0) * (b.sourceHeight || 0) -
          (a.sourceWidth || 0) * (a.sourceHeight || 0),
    );
  let lastShape;
  if (!list.length) {
    const p = document.createElement('p');
    p.textContent =
      'この石の候補はありません。検索または手動登録を利用してください。';
    wrap.append(p);
  }
  for (const c of list) {
    const shape = shapeOf(c);
    if (lastShape !== shape) {
      const heading = document.createElement('h3');
      heading.className = 'candidate-group';
      heading.textContent = shapeNames[shape];
      wrap.append(heading);
      lastShape = shape;
    }
    const div = document.createElement('div');
    div.className = 'candidate';
    const p = document.createElement('p');
    p.textContent = `${c.stoneName} / ${{ pending: '未承認候補', approved: '承認済み', rejected: '不採用', review: '要確認' }[c.status]} / ${c.license} / 撮影者 ${c.photographer || '未確認'}`;
    const quality = document.createElement('p');
    quality.textContent = `${c.sourceWidth && c.sourceHeight ? c.sourceWidth + ' × ' + c.sourceHeight + 'px' : '解像度未確認'} / 検索条件：${shapeNames[c.searchMode] || '従来検索'} / ${shapeNames[shape]}`;
    const imageError = document.createElement('p');
    imageError.className = 'image-error';
    imageError.setAttribute('role', 'status');
    imageError.textContent =
      healthOf(c)?.status === 'error' ? healthOf(c).error : '';
    const retry = document.createElement('button');
    retry.textContent = '画像を再取得';
    retry.onclick = () =>
      action(async () => {
        try {
          await api('/api/refresh-photo', { id: c.id, stoneId: c.stoneId });
        } finally {
          await refresh();
        }
      });
    const link = document.createElement('a');
    link.href = c.pageUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '原ページを確認 ↗';
    const preview = document.createElement('button');
    preview.className = 'photo-preview';
    preview.setAttribute('aria-label', c.stoneName + 'の候補写真を拡大');
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = c.stoneName + 'の未確認候補';
    img.src = `/api/thumbnail?id=${encodeURIComponent(c.id)}&stoneId=${encodeURIComponent(c.stoneId)}`;
    img.onload = () => {
      button.disabled = false;
      imageError.textContent = '';
    };
    img.onerror = async () => {
      button.disabled = true;
      img.alt = '画像を取得できません';
      try {
        const health = await api('/api/image-health');
        state.imageHealth = health;
        imageError.textContent =
          health[c.stoneId + ':' + c.id]?.error ||
          '画像の読み込みに失敗しました。再取得または出典を確認してください。';
      } catch (e) {
        imageError.textContent = e.message;
      }
      div.classList.add('image-failed');
    };
    preview.append(img);
    preview.onclick = () => {
      $('photo-large').onerror = async () => {
        try {
          const health = await api('/api/image-health');
          $('photo-dialog-info').textContent +=
            ' / ' +
            (health[c.stoneId + ':' + c.id]?.error ||
              '拡大画像を読み込めません。閉じて再取得をお試しください。');
        } catch (e) {
          $('photo-dialog-info').textContent += ' / ' + e.message;
        }
      };
      $('photo-large').src = img.src + '&large=1';
      $('photo-dialog-info').textContent =
        `${c.stoneName} / ${c.photographer || '撮影者未確認'} / ${c.license} / 石種・権利の確認前`;
      $('photo-dialog-source').href = c.pageUrl;
      $('photo-dialog').showModal();
    };
    const button = document.createElement('button');
    button.textContent = 'この写真を選ぶ';
    button.disabled = true;
    button.onclick = () => {
      $('candidate-json').value = JSON.stringify(c, null, 2);
      $('photo-shape').value = c.shapeConfirmed
        ? c.shape || 'unknown'
        : 'unknown';
      $('photo-author').value = c.photographer;
      $('photo-alt').value = c.alt || c.stoneName + 'の写真';
      $('chosen-photo').textContent = `${c.stoneName} / ${c.license} / ${c.id}`;
      $('identity').checked = c.identityConfirmed;
      $('rights').checked = c.rightsConfirmed;
    };
    div.append(
      preview,
      p,
      quality,
      imageError,
      link,
      document.createTextNode(' '),
      retry,
      button,
    );
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
  renderPhotoOverview();
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
  $('photo-author').value = '';
  $('photo-alt').value = stone.name + 'の写真';
  showStatus('候補のJSONに原ページの正しい情報を入力してください。');
};
function candidate() {
  const c = JSON.parse($('candidate-json').value);
  c.shape = $('photo-shape').value;
  c.shapeConfirmed = c.shape !== 'unknown';
  c.photographer = $('photo-author').value.trim();
  c.alt = $('photo-alt').value.trim();
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
    const image = await api('/api/stage-photo', { document: c });
    $('candidate-json').value = JSON.stringify(image, null, 2);
    await refresh();
    showStatus(
      '代表画像を承認しました。まだ公開用データへ反映していません。「承認済みの代表画像をまとめて反映」を押してください。',
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
  renderPhotoOverview();
  renderManualPreview();
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

const chosenStones = new Set();
function photoStatus(stone) {
  const staged = state.candidates.find(
    (c) => c.stoneId === stone.id && c.status === 'approved',
  );
  if (
    staged &&
    !state.images.some(
      (c) => c.stoneId === stone.id && c.sha256 === staged.sha256,
    )
  )
    return '承認済み・反映待ち';
  if (state.images.some((c) => c.stoneId === stone.id)) return '登録済み';
  const list = state.candidates.filter((c) => c.stoneId === stone.id);
  if (list.some((c) => c.status === 'approved')) return '承認済み・反映待ち';
  if (list.some((c) => c.status === 'pending')) return '候補あり';
  if (list.length) return '要確認';
  return '写真なし';
}
function renderPhotoOverview() {
  const counts = {};
  const wrap = $('photo-overview');
  wrap.replaceChildren();
  for (const stone of state.stones) {
    const status = photoStatus(stone);
    counts[status] = (counts[status] || 0) + 1;
    if ($('photo-status').value !== 'all' && $('photo-status').value !== status)
      continue;
    const label = document.createElement('label');
    label.className = 'photo-row';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = chosenStones.has(stone.id);
    input.onchange = () => {
      if (input.checked) chosenStones.add(stone.id);
      else chosenStones.delete(stone.id);
      updatePlan();
    };
    const button = document.createElement('button');
    button.textContent = `${stone.id} ${stone.name}`;
    button.onclick = (event) => {
      event.preventDefault();
      $('image-stone').value = stone.id;
      renderCandidates();
      manualChanged();
      $('manual-upload').scrollIntoView({ block: 'start' });
    };
    const info = document.createElement('span');
    info.textContent = `${status} / ${state.candidates.filter((c) => c.stoneId === stone.id).length}候補`;
    label.append(input, button, info);
    wrap.append(label);
  }
  $('photo-summary').textContent = Object.entries(counts)
    .map(([name, count]) => `${name} ${count}種類`)
    .join(' / ');
  if (state.imageBudget) {
    $('photo-summary').textContent +=
      ` / 本日 ${state.imageBudget.calls}検索 / 上限 ${state.imageBudget.limit}回`;
    if (document.activeElement !== $('image-limit'))
      $('image-limit').value = state.imageBudget.limit;
  }
  const job = state.imageJob;
  $('image-job').textContent = job
    ? `${{ running: '収集中', paused: '一時停止', error: 'エラー停止', completed: '完了' }[job.status]}：${job.cursor}/${job.ids.length}種類完了（検索条件：${shapeNames[job.mode || 'sphere']}）。${job.error || ''}`
    : 'まだ収集ジョブはありません。';
  updatePlan();
}
function updatePlan() {
  $('collection-plan').textContent =
    `対象 ${chosenStones.size}種類 / 最大 ${chosenStones.size * 3}検索 / 最大 ${chosenStones.size * 10}候補。API利用料0円（無料Commons API）。設定した日次上限で停止します。`;
}
$('photo-status').onchange = renderPhotoOverview;
$('select-ten').onclick = () => {
  chosenStones.clear();
  state.stones.slice(0, 10).forEach((s) => chosenStones.add(s.id));
  renderPhotoOverview();
};
$('select-all-stones').onclick = () => {
  state.stones.forEach((s) => chosenStones.add(s.id));
  renderPhotoOverview();
};
$('clear-stones').onclick = () => {
  chosenStones.clear();
  renderPhotoOverview();
};
$('save-image-limit').onclick = () =>
  action(async () => {
    await api('/api/image-budget', { limit: Number($('image-limit').value) });
    showStatus('日次上限を保存しました。');
  });
$('batch-start').onclick = () =>
  action(async () => {
    if (!chosenStones.size) throw new Error('収集する石を選択してください');
    if (
      !confirm(
        $('collection-plan').textContent +
          ' 収集を開始しますか？採用・公開はしません。',
      )
    )
      return;
    await api('/api/image-job/start', {
      ids: [...chosenStones],
      mode: $('photo-search-mode').value,
    });
    await refresh();
  });
$('batch-pause').onclick = () =>
  action(async () => {
    await api('/api/image-job/pause', {});
    await refresh();
    showStatus('現在の石を処理後に停止します。');
  });
$('batch-resume').onclick = () =>
  action(async () => {
    await api('/api/image-job/resume', {});
    await refresh();
  });
$('apply-photos').onclick = () =>
  action(async () => {
    if (
      !confirm(
        '承認済みの代表写真だけを公開用データへまとめて反映しますか？公開には別途ビルドとデプロイが必要です。',
      )
    )
      return;
    const result = await api('/api/apply-photos', {});
    await refresh();
    showStatus(
      `${result.applied}種類を反映しました。まだWeb公開ではありません。ビルド確認とGitHubへの反映後、プレビューデプロイが必要です。`,
    );
  });
$('close-photo-dialog').onclick = () => $('photo-dialog').close();
setInterval(() => {
  if (state?.imageJob?.status === 'running' && !busy)
    refresh().catch((e) => showStatus(e.message));
}, 2500);

$('build-photos').onclick = () =>
  action(async () => {
    showStatus('承認済み画像のローカル本番ビルドを確認しています。');
    const r = await api('/api/build-photos', {});
    showStatus(r.message);
  });

$('photo-shape-filter').onchange = renderCandidates;
const uploadLicenseUrls = {
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY 2.5': 'https://creativecommons.org/licenses/by/2.5/',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 2.5': 'https://creativecommons.org/licenses/by-sa/2.5/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
};
let manualFile = null,
  manualCandidate = null,
  manualSignature = '',
  manualAdopted = false,
  previewUrl;
function manualChanged() {
  manualAdopted = false;
  $('manual-adopt').disabled = false;
  $('manual-identity').checked = false;
  $('manual-rights').checked = false;
  const isAI = $('upload-license').value === 'AI-generated';
  $('manual-identity-label').textContent = isAI
    ? 'AI生成のイメージであり、実物写真・鑑別画像ではないことを確認しました'
    : '選択した石と実物写真が一致していることを確認しました';
  $('upload-license-url').value =
    uploadLicenseUrls[$('upload-license').value] ||
    '個別の権利・許諾記録で管理（CCライセンスへ変更しません）';
  renderManualPreview();
}
function renderManualPreview() {
  const stone = state?.stones.find((s) => s.id === $('image-stone').value);
  $('manual-target').textContent = stone
    ? `登録先：${stone.name}（${stone.id}）`
    : '';
  $('manual-preview-info').textContent =
    `${stone?.name || ''} / ${$('upload-author').value || '撮影者未入力'} / ${$('upload-license').selectedOptions[0]?.textContent || ''} / ${$('upload-source').value || '出典URL未入力'}`;
}
$('photo-file').onchange = () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  const file = $('photo-file').files[0];
  $('manual-preview').hidden = !file;
  if (file) {
    previewUrl = URL.createObjectURL(file);
    $('manual-preview-image').src = previewUrl;
  }
  manualChanged();
};
window.addEventListener('beforeunload', () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
});
for (const id of [
  'upload-author',
  'upload-license',
  'upload-note',
  'upload-source',
  'upload-credit',
  'upload-original',
  'upload-alt',
])
  $(id).addEventListener('input', manualChanged);
$('image-stone').addEventListener('change', manualChanged);
async function saveManualCandidate() {
  const file = $('photo-file').files[0];
  if (!file) throw new Error('写真ファイルを選択してください');
  if (
    file.size > 10000000 ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  )
    throw new Error(
      '10MB以下のJPEG・PNG・WebPを選択してください。HEICはJPEGに変換してください。',
    );
  const input = {
    stoneId: $('image-stone').value,
    photographer: $('upload-author').value.trim(),
    license: $('upload-license').value,
    note: $('upload-note').value.trim(),
    sourceUrl: $('upload-source').value.trim(),
    originalImageUrl: $('upload-original').value.trim(),
    creditText: $('upload-credit').value.trim(),
  };
  const signature = JSON.stringify({
    ...input,
    file: { name: file.name, size: file.size, lastModified: file.lastModified },
    alt: $('upload-alt').value.trim(),
  });
  if (manualCandidate && manualSignature === signature && manualFile === file)
    return manualCandidate;
  const data = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('画像を読み込めませんでした'));
    r.readAsDataURL(file);
  });
  manualCandidate = await api('/api/upload-photo', { ...input, data });
  manualSignature = signature;
  manualFile = file;
  return manualCandidate;
}
$('upload-photo').onclick = () =>
  action(async () => {
    await saveManualCandidate();
    await refresh();
    showStatus(
      '手動写真を非公開候補へ追加しました。石種とライセンスを確認して採用してください。',
    );
  });
$('manual-adopt').onclick = () =>
  action(async () => {
    if (manualAdopted) {
      showStatus('この写真は採用済みです。一括反映へ進んでください。');
      return;
    }
    if (!$('manual-identity').checked || !$('manual-rights').checked)
      throw new Error(
        '石の種類とライセンス・利用条件の確認にチェックしてください',
      );
    const c = await saveManualCandidate();
    const image = await api('/api/stage-photo', {
      document: {
        ...c,
        identityConfirmed: true,
        rightsConfirmed: true,
        alt:
          $('upload-alt').value.trim() ||
          (c.license === 'AI-generated'
            ? c.stoneName + 'のAI生成イメージ'
            : c.stoneName + 'の写真'),
      },
    });
    manualCandidate = image;
    manualAdopted = true;
    await refresh();
    showStatus(
      '代表写真として採用しました。まだ公開されていません。「承認済みの代表画像をまとめて公開用データへ反映」で図鑑に反映できます。',
    );
  });
