import categoryData from '../content/categories.json';
export function startQuestionnaire() {
  const form = document.querySelector<HTMLFormElement>('#questionnaire')!;
  const steps = [...form.querySelectorAll<HTMLElement>('[data-step]')];
  const error = document.querySelector<HTMLElement>('#question-error')!,
    next = document.querySelector<HTMLButtonElement>('#next')!,
    back = document.querySelector<HTMLButtonElement>('#back')!;
  let step = 1;
  const storageKey = 'almea-questionnaire-v1';
  const notice = document.querySelector<HTMLElement>(
    '#questionnaire-storage-notice',
  )!;
  function save() {
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ step, entries: [...new FormData(form).entries()] }),
      );
    } catch {
      notice.textContent =
        'このブラウザでは回答の一時保存を利用できません。ページ移動後は最初からの回答になります。';
    }
  }
  function clearSaved() {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Browsing remains available. */
    }
  }
  function show() {
    if (step === 6) showAnswers(new FormData(form));
    steps.forEach((s) => (s.hidden = Number(s.dataset.step) !== step));
    document.querySelector('#step-label')!.textContent = `STEP ${step} / 6`;
    (document.querySelector('#progress') as HTMLElement).style.width =
      `${(step / 6) * 100}%`;
    back.disabled = step === 1;
    next.hidden = step === 6;
    const introOffer = document.querySelector<HTMLElement>('#diagnosis-offer');
    if (introOffer) introOffer.hidden = step === 6;
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
  function showAnswers(f: FormData) {
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
    save();
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
    step++;
    show();
    save();
    form.scrollIntoView({ block: 'start' });
  });
  back.addEventListener('click', () => {
    step--;
    show();
    save();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('reset', () => {
    step = 1;
    clearSaved();
    notice.textContent = '回答を消去しました。';
    queueMicrotask(() => {
      mainChoices();
      show();
    });
  });
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw) {
      const saved: unknown = JSON.parse(raw);
      if (
        saved &&
        typeof saved === 'object' &&
        'entries' in saved &&
        'step' in saved &&
        Array.isArray(saved.entries)
      ) {
        const entries = saved.entries.filter(
          (entry): entry is [string, string] =>
            Array.isArray(entry) &&
            entry.length === 2 &&
            entry.every((value) => typeof value === 'string'),
        );
        const category = entries.find(([key]) => key === 'category')?.[1];
        const categoryInput = [
          ...form.querySelectorAll<HTMLInputElement>('input[name="category"]'),
        ].find((input) => input.value === category);
        if (categoryInput) categoryInput.checked = true;
        mainChoices();
        for (const [name, value] of entries) {
          for (const input of form.querySelectorAll<
            HTMLInputElement | HTMLSelectElement
          >('input, select')) {
            if (
              input.name === name &&
              input.value === value &&
              input instanceof HTMLInputElement &&
              !input.disabled
            )
              input.checked = true;
            if (
              input.name === name &&
              input instanceof HTMLSelectElement &&
              [...input.options].some((option) => option.value === value)
            )
              input.value = value;
          }
        }
        if (typeof saved.step === 'number' && Number.isInteger(saved.step))
          step = Math.min(6, Math.max(1, saved.step));
        count();
        notice.textContent = 'このタブに一時保存した回答から再開しました。';
      }
    }
  } catch {
    notice.textContent = 'このブラウザでは回答を再開できません。';
  }
  show();
}
