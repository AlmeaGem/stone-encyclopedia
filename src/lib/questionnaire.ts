import categoryData from '../content/categories.json';
export function startQuestionnaire() {
  const form = document.querySelector<HTMLFormElement>('#questionnaire')!;
  const steps = [...form.querySelectorAll<HTMLElement>('[data-step]')];
  const error = document.querySelector<HTMLElement>('#question-error')!,
    next = document.querySelector<HTMLButtonElement>('#next')!,
    back = document.querySelector<HTMLButtonElement>('#back')!;
  let step = 1;
  function show() {
    steps.forEach((s) => (s.hidden = Number(s.dataset.step) !== step));
    document.querySelector('#step-label')!.textContent = `STEP ${step} / 6`;
    (document.querySelector('#progress') as HTMLElement).style.width =
      `${(step / 6) * 100}%`;
    back.disabled = step === 1;
    next.hidden = step === 6;
    error.textContent = '';
  }
  function count() {
    document.querySelector('#sub-count')!.textContent =
      `${new FormData(form).getAll('sub').length} / 2 選択`;
  }
  function mainChoices() {
    const id = new FormData(form).get('category'),
      cat = categoryData.find((c) => c.id === id),
      wrap = document.querySelector('#main-choices')!;
    wrap.replaceChildren();
    for (const value of cat?.subcategories || []) {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'main';
      input.value = value;
      const span = document.createElement('span');
      span.textContent = value;
      label.append(input, span);
      wrap.append(label);
    }
    for (const input of form.querySelectorAll<HTMLInputElement>('[name=sub]')) {
      input.disabled = input.value === id;
      if (input.disabled) input.checked = false;
    }
    count();
  }
  form.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.name === 'category') mainChoices();
    if (target.name === 'sub') {
      if (new FormData(form).getAll('sub').length > 2) {
        target.checked = false;
        error.textContent = 'サブの願いは2つまで選べます。';
      } else error.textContent = '';
      count();
    }
  });
  next.addEventListener('click', () => {
    const f = new FormData(form);
    const required: Record<number, string[]> = {
      1: ['category'],
      2: ['main'],
      3: [],
      4: ['situation'],
      5: ['priority', 'color', 'budget'],
    };
    if ((required[step] || []).some((k) => !f.get(k))) {
      error.textContent = 'このステップの項目を選択してください。';
      return;
    }
    if (step === 5) {
      const labels = {
          category: 'メインのテーマ',
          main: 'メインの願い',
          sub: 'サブのテーマ',
          situation: '今の状況',
          priority: '大切にしたいこと',
          color: '色・雰囲気',
          budget: '石選びの予算帯',
        },
        dl = document.querySelector('#answers')!;
      dl.replaceChildren();
      for (const [key, label] of Object.entries(labels)) {
        const div = document.createElement('div'),
          dt = document.createElement('dt'),
          dd = document.createElement('dd');
        dt.textContent = label;
        const values = f
          .getAll(key)
          .map((v) => categoryData.find((c) => c.id === v)?.name || String(v));
        dd.textContent = values.join('、') || '選択なし';
        div.append(dt, dd);
        dl.append(div);
      }
    }
    step++;
    show();
    form.scrollIntoView({ block: 'start' });
  });
  back.addEventListener('click', () => {
    step--;
    show();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('reset', () => {
    step = 1;
    queueMicrotask(() => {
      mainChoices();
      show();
    });
  });
  show();
}
