export function initPhotoTrash({ api, getState, refresh, action, showStatus }) {
  const $ = (id) => document.getElementById(id);
  let plan,
    selected = new Map(),
    page = 0;
  const key = (c) => JSON.stringify([c.stoneId, c.id]);
  function element(tag, text) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    return e;
  }
  function permission(c) {
    return getState()?.photoTrash?.permissions.find(
      (p) => p.id === c.id && p.stoneId === c.stoneId,
    );
  }
  function sync() {
    const count = [...selected.values()].filter(Boolean).length;
    $('photo-trash-selection-count').textContent =
      '確認対象 ' +
      (plan?.items.length || 0) +
      '枚 / 削除にチェック ' +
      count +
      '枚';
    $('photo-trash-confirm').disabled = !plan || !count;
  }
  function createDeleteButton(c) {
    const b = element('button', '削除');
    b.type = 'button';
    b.className = 'candidate-delete';
    b.setAttribute('aria-label', c.stoneName + 'の候補を削除');
    const p = permission(c);
    b.disabled = !p?.deletable;
    b.title = p?.reason || 'この未承認候補をゴミ箱へ';
    b.onclick = () => action(() => confirmCandidates([c]));
    return b;
  }
  async function confirmCandidates(candidates) {
    if (!candidates.length)
      throw Error('削除する仮保存・確認待ち候補を選択してください');
    if (candidates.length > 210)
      throw Error('一度に210候補まで削除できます。石名で絞り込んでください');
    const items = candidates.map((c) => {
      const p = permission(c);
      if (!p) throw Error('候補を再読込してください');
      return { id: c.id, stoneId: c.stoneId, revision: p.revision };
    });
    plan = await api('/api/photo-trash-preview', { items });
    selected = new Map();
    $('photo-trash-confirm-list').replaceChildren();
    $('photo-trash-error').textContent = '';
    for (const item of plan.items) {
      const c = item.candidate,
        card = element('article');
      card.className = 'trash-card';
      const label = element('label'),
        check = element('input');
      check.type = 'checkbox';
      check.checked = item.allowed;
      check.disabled = !item.allowed;
      check.setAttribute(
        'aria-label',
        (c?.stoneName || item.selection.stoneId) + 'の削除を確認',
      );
      selected.set(key(item.selection), item.allowed);
      check.onchange = () => {
        selected.set(key(item.selection), check.checked);
        sync();
      };
      label.append(
        check,
        document.createTextNode(
          (c?.stoneName || '候補不明') + '（' + item.selection.stoneId + '）',
        ),
      );
      card.append(label);
      if (c) {
        const img = element('img');
        img.loading = 'lazy';
        img.alt = c.stoneName + 'の削除確認用サムネイル';
        img.src =
          '/api/thumbnail?id=' +
          encodeURIComponent(c.id) +
          '&stoneId=' +
          encodeURIComponent(c.stoneId);
        card.append(
          img,
          element('p', c.status === 'review' ? '確認待ち' : '仮保存'),
        );
      }
      card.append(
        element('p', item.allowed ? 'ゴミ箱へ移動可能' : item.reason),
      );
      $('photo-trash-confirm-list').append(card);
    }
    sync();
    $('photo-trash-dialog').showModal();
  }
  $('photo-trash-cancel').onclick = () => {
    $('photo-trash-dialog').close();
    plan = undefined;
    selected.clear();
    sync();
  };
  $('photo-trash-dialog').addEventListener('cancel', () => {
    plan = undefined;
    selected.clear();
    sync();
  });
  $('photo-trash-confirm').onclick = () =>
    action(async () => {
      if (!plan) throw Error('削除確認を開き直してください');
      const items = plan.items
        .filter((item) => selected.get(key(item.selection)))
        .map((item) => item.selection);
      try {
        const r = await api('/api/photo-trash-delete', {
          token: plan.token,
          items,
        });
        $('photo-trash-dialog').close();
        plan = undefined;
        selected.clear();
        await refresh();
        showStatus(
          r.deleted +
            '枚の未承認候補をゴミ箱へ移動しました。30日以内ならゴミ箱から復元できます。公開用データは変更していません。',
        );
      } catch (e) {
        $('photo-trash-error').textContent =
          e.message + '。削除対象を再読込して確認し直してください。';
        throw e;
      }
    });
  $('photo-trash-prev').onclick = () => {
    page--;
    render();
  };
  $('photo-trash-next').onclick = () => {
    page++;
    render();
  };
  function render() {
    const s = getState();
    if (!s?.photoTrash) return;
    const entries = s.photoTrash.entries;
    page = Math.min(page, Math.max(0, Math.ceil(entries.length / 30) - 1));
    $('photo-trash-count').textContent =
      'ゴミ箱 ' +
      entries.length +
      '枚 / 復元可能 ' +
      entries.filter((e) => e.canRestore).length +
      '枚';
    $('photo-trash-list').replaceChildren();
    for (const e of entries.slice(page * 30, page * 30 + 30)) {
      const c = e.candidate,
        card = element('article');
      card.className = 'trash-card';
      card.append(element('h4', c.stoneName + '（' + c.stoneId + '）'));
      const img = element('img');
      img.loading = 'lazy';
      img.alt = c.stoneName + 'のゴミ箱内プレビュー';
      img.src = '/api/trash-thumbnail?trashId=' + encodeURIComponent(e.trashId);
      card.append(
        img,
        element(
          'p',
          '削除日時：' +
            new Date(e.deletedAt).toLocaleString('ja-JP', {
              timeZone: 'Asia/Tokyo',
            }),
        ),
        element(
          'p',
          '復元期限：' +
            new Date(e.restoreUntil).toLocaleString('ja-JP', {
              timeZone: 'Asia/Tokyo',
            }),
        ),
      );
      const restore = element('button', e.canRestore ? '復元' : '復元期限切れ');
      restore.type = 'button';
      restore.disabled = !e.canRestore;
      restore.setAttribute('aria-label', c.stoneName + 'の候補を復元');
      restore.onclick = () =>
        action(async () => {
          if (
            !confirm(
              c.stoneName +
                '（' +
                c.stoneId +
                '）を元の未承認候補へ復元しますか？採用・公開はしません。',
            )
          )
            return;
          const r = await api('/api/photo-trash-restore', {
            trashId: e.trashId,
          });
          await refresh();
          showStatus(
            r.restored +
              '枚を元の未承認候補へ復元しました。採用・公開用データは変更していません。',
          );
        });
      card.append(restore);
      $('photo-trash-list').append(card);
    }
    $('photo-trash-page').textContent = entries.length
      ? page * 30 +
        1 +
        '〜' +
        Math.min((page + 1) * 30, entries.length) +
        ' / ' +
        entries.length
      : 'ゴミ箱は空です';
    $('photo-trash-prev').disabled = page === 0;
    $('photo-trash-next').disabled = (page + 1) * 30 >= entries.length;
    sync();
  }
  return { render, createDeleteButton, confirmCandidates };
}
