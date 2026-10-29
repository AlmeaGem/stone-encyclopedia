export function initBulkPhotos({ api, getState, refresh, action, showStatus }) {
  const $ = (id) => document.getElementById(id);
  const choices = new Map(),
    uploads = [];
  let page = 0,
    plan,
    active = false;
  const key = (c) => c.stoneId + ':' + c.id;
  const labels = {
    'real-photo': '実物写真',
    'illustrative-photo': 'イメージ写真',
    'ai-generated': 'AI生成画像（イメージ写真）',
  };
  function element(tag, text) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    return e;
  }
  function field(label, el, root) {
    const l = element('label', label);
    if (el.type === 'checkbox')
      l.replaceChildren(el, document.createTextNode(label));
    else l.append(el);
    root.append(l);
    return el;
  }
  function options(values, selected = '') {
    const s = element('select');
    for (const [value, text] of values) {
      const o = element('option', text);
      o.value = value;
      s.append(o);
    }
    s.value = selected;
    return s;
  }
  function revision(c) {
    return getState().photoBulk.candidates.find(
      (x) => x.id === c.id && x.stoneId === c.stoneId,
    );
  }
  function choice(c) {
    let v = choices.get(key(c));
    if (!v || v.revision !== revision(c)?.revision) {
      v = {
        selected: false,
        imageKind: c.imageKind || '',
        alt: c.alt || c.stoneName + 'の写真',
        revision: revision(c)?.revision,
      };
      choices.set(key(c), v);
    }
    return v;
  }
  function filtered() {
    const s = getState();
    if (!s) return [];
    const term = $('bulk-search').value.trim().toLowerCase();
    return s.candidates.filter(
      (c) =>
        (!term ||
          (c.stoneId + ' ' + c.stoneName).toLowerCase().includes(term)) &&
        ($('bulk-filter').value === 'all' ||
          ($('bulk-filter').value === 'approved'
            ? c.status === 'approved'
            : ['pending', 'review'].includes(c.status))),
    );
  }
  function eligible(c) {
    return ['pending', 'review'].includes(c.status) && !revision(c)?.protected;
  }
  function enlarge(c) {
    $('photo-large').src =
      '/api/thumbnail?id=' +
      encodeURIComponent(c.id) +
      '&stoneId=' +
      encodeURIComponent(c.stoneId) +
      '&large=1';
    $('photo-dialog-info').textContent =
      c.stoneName +
      ' / ' +
      c.stoneId +
      ' / ' +
      (labels[c.imageKind] || '写真区分未設定') +
      ' / ' +
      c.photographer +
      ' / ' +
      c.license;
    $('photo-dialog-source').href = c.pageUrl;
    $('photo-dialog').showModal();
  }
  function result(job) {
    if (!job) return '';
    const adopted = job.results.filter((r) => r.status === 'adopted').length,
      failed = job.results.filter((r) => r.status === 'failed').length,
      excluded = job.results.filter((r) => r.status === 'excluded').length;
    return (
      '採用済み ' +
      adopted +
      '件 / 失敗 ' +
      failed +
      '件 / 未採用（全候補） ' +
      getState().candidates.filter((c) =>
        ['pending', 'review'].includes(c.status),
      ).length +
      '件 / 選択内除外 ' +
      excluded +
      '件 / ' +
      ({ completed: '完了', running: '実行中', interrupted: '中断' }[
        job.status
      ] || job.status) +
      '\n' +
      job.results
        .filter((r) => r.status !== 'adopted')
        .map((r) => r.name + '（' + r.stoneId + '）：' + r.reason)
        .join('\n') +
      '\n' +
      (job.status === 'interrupted'
        ? job.message
        : '採用処理の記録です。次の操作は各候補の状態表示を確認してください。')
    );
  }
  function render() {
    const s = getState();
    if (!s?.photoBulk) return;
    const list = filtered();
    page = Math.min(page, Math.max(0, Math.ceil(list.length / 30) - 1));
    $('bulk-candidates').replaceChildren();
    for (const c of list.slice(page * 30, page * 30 + 30)) {
      const v = choice(c),
        status = revision(c),
        card = element('article');
      card.className = 'bulk-card';
      const check = element('input');
      check.type = 'checkbox';
      check.checked = v.selected;
      check.disabled = !eligible(c);
      check.setAttribute('aria-label', c.stoneName + 'を一括採用に選択');
      check.onchange = () => {
        v.selected = check.checked;
        resetConfirm();
        counts();
      };
      field(c.stoneId + ' ' + c.stoneName, check, card);
      const preview = element('button');
      preview.type = 'button';
      preview.className = 'photo-preview';
      preview.setAttribute('aria-label', c.stoneName + 'を拡大確認');
      const img = element('img');
      img.loading = 'lazy';
      img.alt = c.stoneName + 'の保存済み候補';
      img.src =
        '/api/thumbnail?id=' +
        encodeURIComponent(c.id) +
        '&stoneId=' +
        encodeURIComponent(c.stoneId);
      img.onerror = () => {
        const msg = element(
          'p',
          '画像を読み込めません。採用時にも形式・ファイルを再確認します',
        );
        card.append(msg);
      };
      preview.append(img);
      preview.onclick = () => enlarge(c);
      card.append(preview);
      card.append(
        element(
          'p',
          status.state + (status.protected ? ' / 既存代表写真を保護中' : ''),
        ),
        element('small', status.next),
      );
      const kind = options(
        [['', '写真区分を選択'], ...Object.entries(labels)],
        v.imageKind,
      );
      kind.disabled = c.status === 'approved';
      kind.onchange = () => {
        v.imageKind = kind.value;
        resetConfirm();
      };
      field('写真区分', kind, card);
      const alt = element('input');
      alt.value = v.alt;
      alt.maxLength = 300;
      alt.oninput = () => {
        v.alt = alt.value;
      };
      field('写真説明', alt, card);
      card.append(
        element(
          'p',
          '撮影者：' + (c.photographer || '未設定') + ' / ' + c.license,
        ),
      );
      const source = element('a', '出典・ライセンスを確認 ↗');
      source.href = c.pageUrl;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      card.append(source);
      if (c.creditText) card.append(element('p', c.creditText));
      $('bulk-candidates').append(card);
    }
    $('bulk-confirm-adopt').disabled = !plan?.results.some(
      (r) => r.status === 'ready',
    );
    counts();
    $('bulk-page').textContent = list.length
      ? page * 30 +
        1 +
        '〜' +
        Math.min((page + 1) * 30, list.length) +
        ' / ' +
        list.length +
        '候補'
      : '候補がありません';
    $('bulk-prev').disabled = page === 0;
    $('bulk-next').disabled = (page + 1) * 30 >= list.length;
    $('bulk-job').textContent = result(s.photoBulk.job);
  }
  function counts() {
    const s = getState(),
      stats = s.photoBulk.candidates;
    const selected = s.candidates.filter(
      (c) => choice(c).selected && eligible(c),
    ).length;
    $('bulk-counts').textContent =
      '仮保存 ' +
      stats.filter((x) => x.state === '仮保存').length +
      ' / 確認待ち ' +
      stats.filter((x) => x.state === '確認待ち').length +
      ' / 承認済み・反映待ち ' +
      stats.filter((x) => x.state === '承認済み・反映待ち').length +
      ' / 図鑑データへ反映済み ' +
      stats.filter((x) => x.state === '図鑑データへ反映済み').length +
      ' / 選択 ' +
      selected +
      '件';
  }
  function resetConfirm() {
    $('bulk-identity').checked = false;
    $('bulk-rights').checked = false;
    plan = undefined;
  }
  $('bulk-search').oninput = () => {
    page = 0;
    render();
  };
  $('bulk-filter').onchange = () => {
    page = 0;
    render();
  };
  $('bulk-prev').onclick = () => {
    page--;
    render();
  };
  $('bulk-next').onclick = () => {
    page++;
    render();
  };
  $('bulk-select-all').onclick = () => {
    filtered()
      .filter(eligible)
      .forEach((c) => (choice(c).selected = true));
    resetConfirm();
    render();
  };
  $('bulk-clear').onclick = () => {
    choices.forEach((v) => (v.selected = false));
    resetConfirm();
    render();
  };
  $('bulk-reload').onclick = () => action(refresh);
  $('bulk-preview').onclick = () =>
    action(async () => {
      const items = getState()
        .candidates.filter((c) => choice(c).selected && eligible(c))
        .map((c) => ({
          id: c.id,
          stoneId: c.stoneId,
          revision: choice(c).revision,
          ...(choice(c).imageKind ? { imageKind: choice(c).imageKind } : {}),
          alt: choice(c).alt,
          identityConfirmed: $('bulk-identity').checked,
          rightsConfirmed: $('bulk-rights').checked,
        }));
      if (!items.length) throw Error('採用する仮保存候補を選択してください');
      plan = await api('/api/bulk-photo-preview', { items });
      $('bulk-confirm-results').replaceChildren();
      for (const r of plan.results)
        $('bulk-confirm-results').append(
          element(
            'p',
            r.name +
              '（' +
              r.stoneId +
              '）：' +
              (r.status === 'ready' ? '採用可能' : r.reason),
          ),
        );
      $('bulk-confirm-adopt').disabled = !plan.results.some(
        (r) => r.status === 'ready',
      );
      $('bulk-confirm-dialog').showModal();
    });
  $('bulk-cancel-adopt').onclick = () => $('bulk-confirm-dialog').close();
  $('bulk-confirm-adopt').onclick = () =>
    action(async () => {
      if (!plan) throw Error('確認画面を開き直してください');
      active = true;
      $('bulk-confirm-dialog').close();
      $('bulk-job').textContent =
        '採用処理中です。保存済み候補は保持されます。画面を閉じても管理サーバーの処理は続きます。';
      try {
        await api('/api/bulk-photo-adopt', { token: plan.token });
        await refresh();
        resetConfirm();
        showStatus(
          '一括採用が完了しました。採用件数と除外理由を確認し、一括反映へ進んでください。',
        );
      } finally {
        active = false;
      }
    });
  $('bulk-apply').onclick = () =>
    action(async () => {
      if (
        !confirm(
          '承認済みの代表写真をまとめて公開用データへ反映しますか？既存の別の代表写真は上書きしません。Web公開にはGitHub Desktop・Actionsが必要です。',
        )
      )
        return;
      const r = await api('/api/apply-photos', { protectExisting: true });
      await refresh();
      showStatus(
        r.applied +
          '件を図鑑データへ反映しました。次にCommit・PushとActionsで公開してください。',
      );
    });
  function uploadRows() {
    const state = getState();
    $('bulk-upload-rows').replaceChildren();
    for (const row of uploads) {
      const card = element('article');
      card.className = 'bulk-card';
      const enabled = element('input');
      enabled.type = 'checkbox';
      enabled.checked = row.selected;
      enabled.disabled = !!row.saved;
      enabled.onchange = () => {
        row.selected = enabled.checked;
      };
      field(row.file.name, enabled, card);
      const img = element('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = row.url;
      img.alt = '未保存画像のプレビュー';
      card.append(img);
      const file = element('input');
      file.type = 'file';
      file.accept = 'image/jpeg,image/png,image/webp';
      file.disabled = !!row.saved;
      file.onchange = () => {
        if (!file.files[0]) return;
        URL.revokeObjectURL(row.url);
        row.file = file.files[0];
        row.url = URL.createObjectURL(row.file);
        row.requestId = crypto.randomUUID();
        row.message = '未保存';
        uploadRows();
      };
      field('写真を差し替え', file, card);
      const stone = options(
        [
          ['', '登録先の石を選択（必須）'],
          ...state.stones.map((s) => [s.id, s.id + ' ' + s.name]),
        ],
        row.stoneId,
      );
      stone.onchange = () => {
        row.stoneId = stone.value;
      };
      field('登録先の石', stone, card);
      const kind = options(
        [['', '写真区分を選択（必須）'], ...Object.entries(labels)],
        row.imageKind,
      );
      kind.onchange = () => {
        row.imageKind = kind.value;
        if (kind.value === 'ai-generated') {
          row.license = 'AI-generated';
          uploadRows();
        }
      };
      field('写真区分', kind, card);
      const license = options(
        [
          ['', '権利の種類を選択'],
          ...Object.keys({
            'Own photo': 1,
            'Commercial permission': 1,
            'AI-generated': 1,
            CC0: 1,
            'CC BY 2.0': 1,
            'CC BY 2.5': 1,
            'CC BY 3.0': 1,
            'CC BY 4.0': 1,
            'CC BY-SA 2.0': 1,
            'CC BY-SA 2.5': 1,
            'CC BY-SA 3.0': 1,
            'CC BY-SA 4.0': 1,
          }).map((v) => [v, v]),
        ],
        row.license,
      );
      license.onchange = () => {
        row.license = license.value;
      };
      field('権利の種類', license, card);
      for (const [name, label] of Object.entries({
        photographer: '撮影者・権利者（必須）',
        sourceUrl: '出典ページURL',
        originalImageUrl: '元画像URL（任意）',
        creditText: 'クレジット・加工内容',
        note: '権利・許諾記録（非公開）',
      })) {
        const input = element(name === 'note' ? 'textarea' : 'input');
        input.value = row[name] || '';
        input.maxLength =
          name === 'note' ? 3000 : name === 'creditText' ? 1000 : 500;
        input.oninput = () => {
          row[name] = input.value;
        };
        field(label, input, card);
      }
      card.append(element('p', row.message));
      if (row.saved)
        card
          .querySelectorAll('input,select,textarea')
          .forEach((e) => (e.disabled = true));
      $('bulk-upload-rows').append(card);
    }
  }
  $('bulk-files').onchange = () => {
    const files = [...$('bulk-files').files];
    if (files.length > 30) {
      $('bulk-upload-result').textContent =
        '一度に30枚まで選択してください。保存済み候補は保持されています。';
      return;
    }
    if (
      uploads.some((r) => !r.saved) &&
      !confirm('未保存の選択を置き換えますか？仮保存済みの画像は失われません。')
    )
      return;
    uploads.forEach((r) => URL.revokeObjectURL(r.url));
    uploads.length = 0;
    for (const file of files)
      uploads.push({
        file,
        url: URL.createObjectURL(file),
        requestId: crypto.randomUUID(),
        selected: true,
        stoneId: '',
        imageKind: '',
        license: '',
        photographer: '',
        sourceUrl: '',
        originalImageUrl: '',
        creditText: '',
        note: '',
        message: '未保存',
      });
    uploadRows();
  };
  $('bulk-save-uploads').onclick = () =>
    action(async () => {
      active = true;
      let success = 0,
        failed = 0;
      try {
        const selected = uploads.filter((r) => r.selected && !r.saved);
        if (!selected.length) throw Error('仮保存する画像を選んでください');
        for (const row of selected) {
          try {
            if (!row.stoneId || !row.imageKind)
              throw Error('登録先の石・写真区分を指定してください');
            if (
              !['image/jpeg', 'image/png', 'image/webp'].includes(
                row.file.type,
              ) ||
              row.file.size > 10000000
            )
              throw Error(
                '10MB以下のJPEG・PNG・WebPのみ対応（HEICは変換してください）',
              );
            const data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(Error('ファイル読込失敗'));
              reader.readAsDataURL(row.file);
            });
            await api('/api/upload-photo', {
              stoneId: row.stoneId,
              requestId: row.requestId,
              imageKind: row.imageKind,
              license: row.license,
              photographer: row.photographer,
              note: row.note,
              sourceUrl: row.sourceUrl,
              originalImageUrl: row.originalImageUrl,
              creditText: row.creditText,
              data,
            });
            row.saved = true;
            row.message = '仮保存済み。上の候補一覧から確認・採用してください';
            success++;
          } catch (e) {
            row.message = '保存失敗：' + e.message;
            failed++;
          }
        }
        await refresh();
        uploadRows();
        $('bulk-upload-result').textContent =
          '仮保存 ' +
          success +
          '件 / 失敗 ' +
          failed +
          '件。保存済みは再読込後も候補一覧に残ります。';
      } finally {
        active = false;
      }
    });
  window.addEventListener('beforeunload', (e) => {
    if (active || uploads.some((r) => r.selected && !r.saved)) {
      e.preventDefault();
    }
  });
  return render;
}
