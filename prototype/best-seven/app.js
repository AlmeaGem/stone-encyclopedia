import { recommend } from './engine.js';
const [reviews, wishes] = await Promise.all([
  fetch('./review-data.json').then((r) => r.json()),
  fetch('./wish-data.json').then((r) => r.json()),
]);
const form = document.querySelector('#trial-form');
const result = document.querySelector('#results');
for (const select of form.querySelectorAll(
  'select[name^="secondary"], select[name="primary"]',
)) {
  select.append(
    new Option(select.name === 'primary' ? '願いを選択' : '選択しない', ''),
  );
  for (const branch of wishes.branches) {
    const group = document.createElement('optgroup');
    group.label = `${branch.category} / ${branch.subgroup}`;
    for (const item of branch.items)
      group.append(new Option(item.label, item.id));
    select.append(group);
  }
}
function append(parent, tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  parent.append(node);
  return node;
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  result.replaceChildren();
  const values = new FormData(form);
  try {
    const input = {
      primary: values.get('primary'),
      secondary: [values.get('secondary1'), values.get('secondary2')],
      colors: values.get('color') ? [values.get('color')] : [],
      mood: values.get('mood'),
      form: values.get('form'),
      avoid: values.get('avoid') ? [values.get('avoid')] : [],
    };
    const output = recommend(input, reviews);
    const label = form.elements.primary.selectedOptions[0].textContent;
    append(result, 'h2', `入力した願い：${label}`);
    const secondaryLabels = [form.elements.secondary1, form.elements.secondary2]
      .filter((select) => select.value)
      .map((select) => select.selectedOptions[0].textContent);
    append(
      result,
      'p',
      `第2・第3の願い：${secondaryLabels.join('、') || '未選択'}`,
    );
    append(
      result,
      'p',
      `色：${input.colors.join('、') || '未選択'}／雰囲気：${input.mood || '未選択'}／用途：${input.form || '未選択'}／避けたい特徴：${input.avoid.join('、') || '未選択'}`,
    );
    append(result, 'p', `候補：${output.count}件（上限7件）`);
    for (const [index, stone] of output.results.entries()) {
      const card = append(result, 'article', '');
      append(
        card,
        'h3',
        `${index + 1}位 ${stone.stoneName}（${stone.stoneId}）`,
      );
      append(card, 'p', stone.reason);
      append(
        card,
        'p',
        `適合した願い：${stone.matchedWishes.map((id) => [...form.elements.primary.options].find((x) => x.value === id)?.textContent || id).join('、')}`,
      );
      append(
        card,
        'p',
        `内部適合度（検証用・効果や確率ではありません）：${stone.score}点`,
      );
      for (const source of stone.sources)
        append(
          card,
          'p',
          `原稿の根拠：${source.text}（${source.locator}、根拠 ${source.groupId}、加点上限 ${source.bundleId}）`,
        );
    }
    for (const gap of output.gaps) append(result, 'p', gap);
    result.scrollIntoView({ behavior: 'auto', block: 'start' });
  } catch (error) {
    append(result, 'p', `入力を確認してください：${error.message}`);
  }
});
