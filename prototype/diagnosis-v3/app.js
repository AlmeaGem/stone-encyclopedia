const response = await fetch('./draft-data.json');
if (!response.ok) throw new Error('試作データを読み込めませんでした');
const data = await response.json();
const app = document.querySelector('#app');
const announcement = document.querySelector('#announcement');
const key = 'almea-private-ux-prototype-v1';
const categories = {
  '恋愛・人との関係': ['恋愛・結婚', '人間関係', '家庭・住まい'],
  'お金・仕事': ['金運・財運', '仕事・成功'],
  '幸運・お守り・挑戦': [
    '願望成就・幸運',
    '魔除け・浄化',
    '挑戦・試験',
    '旅・新しい環境',
  ],
  '心・自分らしさ': [
    '心の安定・癒やし',
    '直感・精神性',
    '美しさ・魅力・人気',
    '学び・才能',
    '健康・生活',
  ],
};
const fields = {
  color: [
    'ピンク',
    '赤',
    'オレンジ',
    '黄色',
    'ゴールド',
    '緑',
    '水色',
    '青',
    '紫',
    '白',
    '透明',
    '黒',
    'その他',
    'こだわらない',
  ],
  mood: ['透明感', '模様', 'やわらかい', '鮮やか', '落ち着いた'],
  use: ['スフィア', 'ブレスレット', 'ペンダント', '鑑賞'],
  budget: [
    '3,000円未満',
    '3,000〜10,000円',
    '10,000〜30,000円',
    '30,000円以上',
  ],
  avoid: ['濃い色', '淡い色', '模様が多い', '透明感が少ない', '大きな形'],
};
const displayLabels = {
  situation: {
    出会い: '新しい出会いを求めている',
    気になる相手: 'すでに気になる相手がいる',
    過去の相手: '以前の相手との関係を考えている',
    交際中: 'お付き合いしている',
    '魅力・大切にしたいこと': '自分の魅力や大切にしたい関係を考えたい',
  },
  subgroup: {
    '恋の始まり・良縁': '新しい恋や理想の相手に出会いたい',
    '機会・きっかけ・結婚': '出会いの機会や結婚につながるご縁を望む',
    恋愛の魅力: '自分の魅力や自信を大切にしたい',
    大切にしたい関係: 'どんな関係を築きたいか考えたい',
  },
  detail: {
    'love.meet.new_love': '新しい恋を始めたい',
    'love.meet.good_match': '新しい良縁に出会いたい',
    'love.meet.ideal': '理想の相手に出会いたい',
    'love.meet.opportunities': '出会いの機会を増やしたい',
    'love.meet.marriage': '結婚につながる新しい出会いを望む',
    'love.person.closer': '気になる相手との距離を縮めたい',
    'love.person.contact': '気になる相手と連絡するきっかけがほしい',
    'love.person.progress': '片思いを進展させたい',
    'love.person.partnership': '気になる相手と恋人になりたい',
    'love.reunion.ex': '元恋人との復縁を考えたい',
    'love.reunion.meet': '以前好きだった相手と再会したい',
    'love.reunion.contact': '途絶えた連絡を再開したい',
    'love.reunion.repair': '過去の恋愛関係を修復したい',
    'love.couple.affection': '交際中の相手と愛情を深めたい',
    'love.couple.respect': 'お互いを大切にする関係を築きたい',
    'love.couple.marriage_progress': '交際中の相手と結婚へ進みたい',
    'love.couple.communication': '交際中のすれ違いを見直したい',
    'love.attraction.charm': '自分の魅力を高めたい',
    'love.attraction.confidence': '恋愛に向き合う自信を持ちたい',
  },
};
function displayValue(type, value) {
  return displayLabels[type]?.[value] || value;
}
const fieldNames = {
  color: '好きな色',
  mood: '石の雰囲気',
  use: '石の用途',
  budget: '石を選ぶ予算',
  avoid: '避けたい特徴',
};
const emptyWish = () => ({
  group: '',
  category: '',
  situation: '',
  subgroup: '',
  detail: '',
  label: '',
});
const initial = () => ({
  step: 1,
  primary: emptyWish(),
  secondaries: [],
  edit: null,
  preferences: {},
  confirmed: false,
});
let state;
let storageAvailable = true;
try {
  state = JSON.parse(sessionStorage.getItem(key)) || initial();
} catch {
  storageAvailable = false;
  state = initial();
}
if (
  !state ||
  !state.primary ||
  !Array.isArray(state.secondaries) ||
  !state.preferences
)
  state = initial();
const clone = (value) => JSON.parse(JSON.stringify(value));
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
function save() {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    storageAvailable = false;
  }
}
function commit(message = '') {
  const previousScroll = window.scrollY;
  const previousStep = history.state?.privatePrototype?.step;
  history.pushState({ privatePrototype: clone(state) }, '', location.pathname);
  save();
  render();
  const nextHeading = app
    .querySelector('.choices')
    ?.closest('section')
    ?.querySelector('h2');
  announcement.textContent = nextHeading ? nextHeading.textContent : message;
  (nextHeading || document.querySelector('#screen-title'))?.focus({
    preventScroll: true,
  });
  window.scrollTo({
    top: previousStep === state.step ? previousScroll : 0,
    behavior: 'instant',
  });
}
history.replaceState({ privatePrototype: clone(state) }, '', location.pathname);
addEventListener('popstate', (event) => {
  if (!event.state?.privatePrototype) return;
  state = clone(event.state.privatePrototype);
  save();
  render();
  announcement.textContent = '前後の回答を表示しました。';
  document.querySelector('#screen-title')?.focus({ preventScroll: true });
});
function button(text, action, value = '', extra = '') {
  const editLabels = {
    'edit-group': 'テーマを変更',
    'edit-category': '大分類を変更',
    'edit-situation': '状況を変更',
    'edit-subgroup': '詳細グループを変更',
    'edit-detail': '選んだ願いを変更',
    'edit-primary': '主願いを変更',
    'edit-secondary-step': 'ほかの願いを変更',
    'edit-preferences': '色や使い方を変更',
    'edit-secondary': '追加した願いを変更',
  };
  const editLabel =
    action === 'edit-preferences' && fieldNames[value]
      ? `${fieldNames[value]}を変更`
      : action === 'edit-primary' && value === 'detail'
        ? '願いの詳細を変更'
        : ['edit-secondary-item', 'edit-secondary-step'].includes(action) &&
            value !== ''
          ? `第${Number(value) + 2}の願いを変更`
          : editLabels[action];
  const accessible = editLabel ? ` aria-label="${escapeHtml(editLabel)}"` : '';
  return `<button type="button" class="${extra}" data-action="${action}" data-value="${escapeHtml(value)}"${accessible}>${escapeHtml(text)}</button>`;
}
function choices(title, action, values, escapeLabel = 'わからない・その他') {
  return `<section class="panel"><h2 tabindex="-1">${escapeHtml(title)}</h2><div class="choices">${values.map((x) => button(x.label || x, action, x.value || x.id || x, 'choice')).join('')}${button(escapeLabel, 'unknown', '', 'choice wide')}</div></section>`;
}
function matching(wish) {
  return data.branches.filter((x) => x.category === wish.category);
}
function unique(values) {
  return [...new Set(values)];
}
function wishPanel(wish) {
  let out = state.changeBackup
    ? `<div class="panel"><p>変更を選ぶと関連する回答が消えます。</p>${button('変更をやめる', 'cancel-change')}</div>`
    : '';
  for (const [label, value, action] of [
    ['テーマ', wish.group, 'edit-group'],
    ['大分類', wish.category, 'edit-category'],
    ['状況', wish.situation, 'edit-situation'],
    ['詳細グループ', wish.subgroup, 'edit-subgroup'],
  ]) {
    if (value)
      out += `<div class="summary"><span>${escapeHtml(label)}：${escapeHtml(displayValue(action.slice(5), value))}</span>${button('変更', action)}</div>`;
  }
  if (wish.detail)
    return (
      out +
      `<div class="summary"><span>選んだ願い：${escapeHtml(wish.label)}</span>${button('変更', 'edit-detail')}</div>`
    );
  if (!wish.group)
    return (
      out + choices('いちばん近いテーマは？', 'group', Object.keys(categories))
    );
  if (!wish.category)
    return (
      out +
      choices('どのテーマに近いですか？', 'category', categories[wish.group])
    );
  const branches = matching(wish);
  if (!wish.situation) {
    const values =
      wish.category === '恋愛・結婚'
        ? unique(branches.map((x) => x.situation))
        : [
            '新たに始めたい',
            '変化の途中',
            '今を育てたい',
            '気持ちを整理したい',
            'まだ決めていない',
          ];
    return (
      out +
      choices(
        '今の状況に近いものは？',
        'situation',
        values.map((value) => ({
          value,
          label: displayValue('situation', value),
        })),
      )
    );
  }
  const applicable =
    wish.category === '恋愛・結婚'
      ? branches.filter((x) => x.situation === wish.situation)
      : branches;
  const subgroups = unique(applicable.map((x) => x.subgroup));
  if (!wish.subgroup && subgroups.length > 1)
    return (
      out +
      choices(
        'どんなことを望んでいますか？',
        'subgroup',
        subgroups.map((value) => ({
          value,
          label: displayValue('subgroup', value),
        })),
      )
    );
  const current = wish.subgroup || subgroups[0];
  const branch = applicable.find((x) => x.subgroup === current);
  if (!branch)
    return (
      out +
      '<p class="error" role="alert">選択肢を確認できませんでした。状況を選び直してください。</p>'
    );
  return (
    out +
    choices(
      'いちばん近い願いは？',
      'detail',
      branch.items.map((item) => ({
        ...item,
        label:
          displayValue('detail', item.id) === item.id
            ? item.label
            : displayValue('detail', item.id),
      })),
    )
  );
}
function head(title, intro) {
  return `<p class="eyebrow">PERSONAL DISCOVERY / ${state.step} OF 4</p><h1 id="screen-title" tabindex="-1">${escapeHtml(title)}</h1><p class="intro">${escapeHtml(intro)}</p><progress class="progress" aria-label="回答の進み具合" max="4" value="${state.step}"></progress>`;
}
function screen() {
  if (state.step === 1)
    return (
      head(
        'あなたが大切にしたいこと',
        '近いものを選んでください。あとから変更できます。',
      ) +
      wishPanel(state.primary) +
      (state.primary.detail
        ? `<div class="nav">${button('次へ', 'next', '', 'primary')}</div>`
        : '')
    );
  if (state.step === 2) {
    let out = head(
      'ほかにも大切にしたいこと',
      '第2・第3の願いは、選ばずに進むこともできます。',
    );
    out += state.secondaries
      .map(
        (w, i) =>
          `<div class="summary"><span>${escapeHtml(w.label)}</span><span>${button('変更', 'edit-secondary', i)} ${button('解除', 'remove-secondary', i)}</span></div>`,
      )
      .join('');
    if (state.edit)
      out +=
        wishPanel(state.edit.wish) +
        (state.edit.wish.detail
          ? `<div class="nav">${button(state.edit.index === null ? '願いの追加を取り消す' : '願いの変更を取り消す', 'cancel-secondary')}${button('この願いを保存', 'save-secondary', '', 'primary')}</div>`
          : `<div class="nav">${button(state.edit.index === null ? '願いの追加を取り消す' : '願いの変更を取り消す', 'cancel-secondary')}</div>`);
    else if (state.secondaries.length < 2)
      out += `<div class="panel">${button('願いを追加する', 'add-secondary')}</div>`;
    if (!state.edit)
      out += `<div class="nav">${button('戻る', 'back')}${button(state.secondaries.length ? '次へ' : '今は選ばない', 'next', '', 'primary')}</div>`;
    return out;
  }
  if (state.step === 3) {
    let out = head(
      '色や石の使い方について',
      'すべて任意です。決まっていない項目はそのまま進めます。',
    );
    const selectedColors = Array.isArray(state.preferences.color)
      ? state.preferences.color
      : [];
    const oldColor =
      typeof state.preferences.color === 'string'
        ? state.preferences.color
        : '';
    out += `<fieldset class="panel" id="preference-color" tabindex="-1"><legend>好きな色 <span class="hint">複数選択可</span></legend>${oldColor ? `<p class="hint">以前の選択：${escapeHtml(oldColor)}。色を選び直せます。</p>` : ''}<div class="color-grid">${fields.color.map((v, i) => `<label class="option-card"><input type="checkbox" data-preference="color" value="${escapeHtml(v)}" ${selectedColors.includes(v) ? 'checked' : ''}><span><i class="swatch swatch-${i}" aria-hidden="true"></i>${escapeHtml(v)}</span></label>`).join('')}</div></fieldset>`;
    for (const name of ['mood', 'use']) {
      out += `<fieldset class="panel" id="preference-${name}" tabindex="-1"><legend>${escapeHtml(fieldNames[name])}</legend><div class="option-grid single">${['', ...fields[name]].map((v) => `<label class="option-card"><input type="radio" name="${name}" data-preference="${name}" value="${escapeHtml(v)}" ${(state.preferences[name] || '') === v ? 'checked' : ''}><span>${escapeHtml(v || 'まだ決めていない')}</span></label>`).join('')}</div></fieldset>`;
    }
    out += `<label class="field panel" id="preference-budget" tabindex="-1">石を選ぶ予算<select data-preference="budget"><option value="">まだ決めていない</option>${fields.budget.map((v) => `<option value="${escapeHtml(v)}" ${state.preferences.budget === v ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}</select><span class="hint">天然石を選ぶ際の参考であり、月額料金やレポート料金ではありません。</span></label>`;
    const avoided = Array.isArray(state.preferences.avoid)
      ? state.preferences.avoid
      : state.preferences.avoid
        ? [state.preferences.avoid]
        : [];
    out += `<fieldset class="panel" id="preference-avoid" tabindex="-1"><legend>避けたい特徴 <span class="hint">複数選択可</span></legend><div class="option-grid">${fields.avoid.map((v) => `<label class="option-card"><input type="checkbox" data-preference="avoid" value="${escapeHtml(v)}" ${avoided.includes(v) ? 'checked' : ''}><span>${escapeHtml(v)}</span></label>`).join('')}</div></fieldset>`;
    return (
      out +
      `<div class="nav">${button('戻る', 'back')}${button('次へ', 'next', '', 'primary')}</div>`
    );
  }
  let out = head(
    state.confirmed ? '診断内容を確認しました' : '回答内容をご確認ください',
    '試作品です。石の推薦・採点・購入は行いません。',
  );
  const preferenceText = (name) => {
    const v = state.preferences[name];
    return Array.isArray(v) ? v.join('、') || '未選択' : v || '未選択';
  };
  const row = (label, value, action, key = '') =>
    `<div class="summary"><span>${escapeHtml(label)}<br><strong>${escapeHtml(value)}</strong></span>${button('変更', action, key)}</div>`;
  out += `<div class="panel">${row('最も大切な願い', state.primary.category || state.primary.group || '未選択', 'edit-primary')}${row('願いの詳細', state.primary.label || '未選択', 'edit-primary', 'detail')}${[0, 1].map((i) => row(`第${i + 2}の願い`, state.secondaries[i]?.label || '未選択', state.secondaries[i] ? 'edit-secondary-item' : 'edit-secondary-step', i)).join('')}${Object.keys(
    fieldNames,
  )
    .map((name) =>
      row(fieldNames[name], preferenceText(name), 'edit-preferences', name),
    )
    .join('')}</div>`;
  const conflict = state.secondaries.some(
    (x) => x.detail === state.primary.detail && x.detail !== 'unknown',
  );
  if (conflict)
    out +=
      '<p class="error" role="alert">主願いとほかの願いが重複しています。変更または解除してください。</p>';
  return (
    out +
    `<div class="nav review-nav">${button('戻る', 'back')}${conflict ? '' : button('診断内容を確認しました', 'finish', '', 'primary')}</div>`
  );
}
function render() {
  app.innerHTML =
    (storageAvailable
      ? ''
      : '<p class="error" role="status">このブラウザでは回答を保存できません。再読み込みすると消えます。</p>') +
    screen();
  app.setAttribute('aria-busy', 'false');
}
function activeWish() {
  return state.step === 1 ? state.primary : state.edit?.wish;
}
function resetFrom(wish, level) {
  const keys = [
    'group',
    'category',
    'situation',
    'subgroup',
    'detail',
    'label',
  ];
  for (const k of keys.slice(keys.indexOf(level))) wish[k] = '';
}
app.addEventListener('click', (event) => {
  const target = event.target.closest('button[data-action]');
  if (!target) return;
  const action = target.dataset.action,
    value = target.dataset.value,
    wish = activeWish();
  if (['group', 'category', 'situation', 'subgroup'].includes(action)) {
    if (
      state.changeBackup?.level === action &&
      state.changeBackup.wish[action] === value
    ) {
      Object.assign(wish, state.changeBackup.wish);
    } else if (wish[action] !== value) {
      resetFrom(wish, action);
      wish[action] = value;
    }
    state.changeBackup = null;
  } else if (action === 'detail') {
    const item = data.branches
      .flatMap((b) => b.items)
      .find((x) => x.id === value);
    if (!item) return;
    wish.detail = item.id;
    wish.label =
      displayValue('detail', item.id) === item.id
        ? item.label
        : displayValue('detail', item.id);
    state.changeBackup = null;
  } else if (action === 'unknown') {
    if (state.step === 2) {
      state.edit = null;
    } else {
      wish.detail = 'unknown';
      wish.label = 'まだ決めていない';
    }
    state.changeBackup = null;
  } else if (
    action.startsWith('edit-') &&
    [
      'edit-group',
      'edit-category',
      'edit-situation',
      'edit-subgroup',
      'edit-detail',
    ].includes(action)
  ) {
    state.changeBackup = { level: action.slice(5), wish: clone(wish) };
    resetFrom(wish, action.slice(5));
  } else if (action === 'cancel-change') {
    if (state.changeBackup) Object.assign(wish, state.changeBackup.wish);
    state.changeBackup = null;
  } else if (action === 'next') {
    if (state.step === 1 && !state.primary.detail) return;
    state.step = Math.min(4, state.step + 1);
  } else if (action === 'back') {
    state.step = Math.max(1, state.step - 1);
  } else if (action === 'add-secondary') {
    state.changeBackup = null;
    state.edit = { index: null, wish: emptyWish() };
  } else if (action === 'cancel-secondary') {
    state.changeBackup = null;
    state.edit = null;
  } else if (action === 'edit-secondary') {
    state.changeBackup = null;
    const index = Number(value);
    state.edit = { index, wish: clone(state.secondaries[index]) };
  } else if (action === 'remove-secondary') {
    state.secondaries.splice(Number(value), 1);
  } else if (action === 'save-secondary') {
    const w = state.edit.wish,
      duplicate =
        w.detail !== 'unknown' &&
        (w.detail === state.primary.detail ||
          state.secondaries.some(
            (x, i) => i !== state.edit.index && x.detail === w.detail,
          ));
    if (duplicate) {
      announcement.textContent =
        '同じ願いがすでに選ばれています。別の願いを選んでください。';
      const alert = document.createElement('p');
      alert.className = 'error';
      alert.setAttribute('role', 'alert');
      alert.textContent =
        '同じ願いがすでに選ばれています。別の願いを選んでください。';
      app.append(alert);
      return;
    }
    if (state.edit.index === null) state.secondaries.push(clone(w));
    else state.secondaries[state.edit.index] = clone(w);
    state.edit = null;
  } else if (action === 'edit-primary') {
    state.step = 1;
    state.confirmed = false;
  } else if (action === 'edit-secondary-item') {
    state.step = 2;
    const index = Number(value);
    state.edit = { index, wish: clone(state.secondaries[index]) };
    state.confirmed = false;
  } else if (action === 'edit-secondary-step') {
    state.step = 2;
    state.edit = null;
    state.confirmed = false;
  } else if (action === 'edit-preferences') {
    state.step = 3;
    state.focusPreference = value;
    state.confirmed = false;
  } else if (action === 'finish') {
    if (
      state.secondaries.some(
        (x) => x.detail === state.primary.detail && x.detail !== 'unknown',
      )
    )
      return;
    state.confirmed = true;
  } else if (action === 'review') {
    state.confirmed = false;
    state.step = 4;
  } else return;
  const focusPreference = state.focusPreference;
  state.focusPreference = '';
  commit('回答を更新しました。');
  if (focusPreference)
    document.getElementById('preference-' + focusPreference)?.focus();
});
app.addEventListener('change', (event) => {
  const name = event.target.dataset.preference;
  if (!name || !(name in fields)) return;
  if (name === 'color' || name === 'avoid') {
    const selected = [
      ...app.querySelectorAll(`input[data-preference="${name}"]:checked`),
    ].map((input) => input.value);
    if (name === 'color') {
      if (event.target.value === 'こだわらない' && event.target.checked) {
        for (const input of app.querySelectorAll(
          'input[data-preference="color"]',
        ))
          input.checked = input.value === 'こだわらない';
      } else if (event.target.checked) {
        const none = app.querySelector(
          'input[data-preference="color"][value="こだわらない"]',
        );
        if (none) none.checked = false;
      }
      state.preferences[name] = [
        ...app.querySelectorAll('input[data-preference="color"]:checked'),
      ].map((input) => input.value);
    } else state.preferences[name] = selected;
  } else state.preferences[name] = event.target.value;
  save();
  history.replaceState(
    { privatePrototype: clone(state) },
    '',
    location.pathname,
  );
});
render();
