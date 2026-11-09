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
  color: ['赤・ピンク', '青・紫', '緑', '黄・金', '白・黒・透明'],
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
  history.pushState({ privatePrototype: clone(state) }, '', location.pathname);
  save();
  render();
  const nextHeading = app
    .querySelector('.choices')
    ?.closest('section')
    ?.querySelector('h2');
  announcement.textContent = nextHeading ? nextHeading.textContent : message;
  (nextHeading || document.querySelector('#screen-title'))?.focus();
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
  const accessible = editLabels[action]
    ? ` aria-label="${editLabels[action]}"`
    : '';
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
      out += `<div class="summary"><span>${escapeHtml(label)}：${escapeHtml(value)}</span>${button('変更', action)}</div>`;
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
    return out + choices('今の状況に近いものは？', 'situation', values);
  }
  const applicable =
    wish.category === '恋愛・結婚'
      ? branches.filter((x) => x.situation === wish.situation)
      : branches;
  const subgroups = unique(applicable.map((x) => x.subgroup));
  if (!wish.subgroup && subgroups.length > 1)
    return out + choices('どの方向の願いに近いですか？', 'subgroup', subgroups);
  const current = wish.subgroup || subgroups[0];
  const branch = applicable.find((x) => x.subgroup === current);
  if (!branch)
    return (
      out +
      '<p class="error" role="alert">選択肢を確認できませんでした。状況を選び直してください。</p>'
    );
  return out + choices('いちばん近い願いは？', 'detail', branch.items);
}
function head(title, intro) {
  return `<p class="eyebrow">PERSONAL DISCOVERY / ${state.step} OF 4</p><h1 id="screen-title" tabindex="-1">${escapeHtml(title)}</h1><p class="intro">${escapeHtml(intro)}</p><progress class="progress" aria-label="回答の進み具合" max="4" value="${state.step}"></progress>`;
}
function screen() {
  if (state.confirmed)
    return `${head('診断内容を確認しました', '回答の確認はここまでです。')}<div class="panel"><p>ご協力ありがとうございました。</p><p class="hint">この試作は質問体験の確認用です。石の推薦・採点・購入は行いません。</p>${button('回答を見直す', 'review')}</div>`;
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
          ? `<div class="nav">${button('追加をやめる', 'cancel-secondary')}${button('この願いを保存', 'save-secondary', '', 'primary')}</div>`
          : `<div class="nav">${button('追加をやめる', 'cancel-secondary')}</div>`);
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
    out +=
      '<div class="panel">' +
      Object.entries(fields)
        .map(
          ([name, values]) =>
            `<label class="field">${escapeHtml(fieldNames[name])}<select data-preference="${name}"><option value="">まだ決めていない</option>${values.map((v) => `<option value="${escapeHtml(v)}" ${state.preferences[name] === v ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}</select></label>`,
        )
        .join('') +
      '<p class="hint">予算は石を選ぶ際の目安です。</p></div>';
    return (
      out +
      `<div class="nav">${button('戻る', 'back')}${button('次へ', 'next', '', 'primary')}</div>`
    );
  }
  let out = head(
    '回答内容をご確認ください',
    '変更したい項目があれば、それぞれの「変更」から戻れます。',
  );
  out += `<div class="panel"><div class="summary"><span>いちばん大切な願い<br><strong>${escapeHtml(state.primary.label)}</strong></span>${button('変更', 'edit-primary')}</div><div class="summary"><span>ほかの願い<br>${escapeHtml(state.secondaries.map((x) => x.label).join('、') || '未選択')}</span>${button('変更', 'edit-secondary-step')}</div><div class="summary"><span>色・使い方など<br>${escapeHtml(
    Object.entries(state.preferences)
      .filter(([, v]) => v)
      .map(([k, v]) => fieldNames[k] + '：' + v)
      .join('、') || '未選択',
  )}</span>${button('変更', 'edit-preferences')}</div></div>`;
  const conflict = state.secondaries.some(
    (x) => x.detail === state.primary.detail && x.detail !== 'unknown',
  );
  if (conflict)
    out +=
      '<p class="error" role="alert">主願いとほかの願いが重複しています。変更または解除してください。</p>';
  return (
    out +
    `<div class="nav">${button('戻る', 'back')}${conflict ? '' : button('診断内容を確認しました', 'finish', '', 'primary')}</div>`
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
    wish.label = item.label;
    state.changeBackup = null;
  } else if (action === 'unknown') {
    wish.detail = 'unknown';
    wish.label = 'まだ決めていない';
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
    state.edit = { index: null, wish: emptyWish() };
  } else if (action === 'cancel-secondary') {
    state.edit = null;
  } else if (action === 'edit-secondary') {
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
  } else if (action === 'edit-primary') state.step = 1;
  else if (action === 'edit-secondary-step') {
    state.step = 2;
    state.edit = null;
  } else if (action === 'edit-preferences') state.step = 3;
  else if (action === 'finish') {
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
  commit('回答を更新しました。');
});
app.addEventListener('change', (event) => {
  const name = event.target.dataset.preference;
  if (!name || !(name in fields)) return;
  state.preferences[name] = event.target.value;
  save();
  history.replaceState(
    { privatePrototype: clone(state) },
    '',
    location.pathname,
  );
});
render();
