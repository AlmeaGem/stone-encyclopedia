import { geometry, validateDesign } from './model.mjs';
export const STYLE_OPTIONS = {
  simple: '天然石だけのシンプルなデザイン',
  y2k: 'Y2K・平成ギャル',
  cool: 'クール・かっこいい',
  elegant: '上品・高級感',
  girly: '可愛い・ガーリー',
  korean: '韓国風・ミニマル',
  mode: '個性的・モード',
  any: 'おまかせ',
};
export const PART_OPTIONS = {
  stone: '天然石のみ',
  metal: 'チャーム・メタルパーツなども使いたい',
  discuss: '相談して決めたい',
};
export function normalizePreferences(input = {}) {
  const styles = Array.isArray(input.styles)
    ? [...new Set(input.styles.filter((x) => Object.hasOwn(STYLE_OPTIONS, x)))]
    : [];
  const parts = Object.hasOwn(PART_OPTIONS, input.parts) ? input.parts : '';
  return {
    styles: styles.includes('any') ? ['any'] : styles,
    parts,
    partsDetail:
      parts === 'metal' ? String(input.partsDetail || '').slice(0, 1000) : '',
    other: String(input.other || '').slice(0, 2000),
  };
}
export function createConsultation(
  design,
  materials,
  budget = '',
  message = '',
  preferences = {},
) {
  const clean = validateDesign(design);
  const entries = clean.beads.map((b) => {
    const stone = materials.find((m) => m.id === b.material);
    if (!stone) throw Error('未対応の玉が含まれています。');
    return { id: stone.stoneId || stone.id, name: stone.name, sizeMm: b.size };
  });
  const counts = new Map();
  for (const item of entries) {
    const key = JSON.stringify([item.id, item.sizeMm]);
    const existing = counts.get(key);
    if (existing) existing.quantity++;
    else counts.set(key, { ...item, quantity: 1 });
  }
  return {
    version: 1,
    design: clean,
    counts: [...counts.values()],
    order: entries,
    wristMm: clean.wrist,
    estimatedInnerMm:
      Math.round(geometry(clean.beads).innerCircumference * 10) / 10,
    budget: String(budget).slice(0, 300),
    message: String(message).slice(0, 4000),
    preferences: normalizePreferences(preferences),
  };
}
export function consultationText(data) {
  const counts = data.counts
    .map((x) => `・${x.name} ${x.sizeMm}mm × ${x.quantity}`)
    .join('\n');
  const order = data.order
    .map((x, i) => `${i + 1}. ${x.name} ${x.sizeMm}mm`)
    .join('\n');
  const p = normalizePreferences(data.preferences);
  const preferenceText = `雰囲気：${p.styles.map((x) => STYLE_OPTIONS[x]).join('、') || '未選択'}\n装飾パーツ：${PART_OPTIONS[p.parts] || '未選択'}\nパーツの希望：${p.partsDetail || '未入力'}\nその他の希望：${p.other || '未入力'}`;
  return `【デザインについてのご相談】\n\n使用した玉（色のイメージを含む）\n${counts}\n\n配置順\n${order}\n\n手首周り：${data.wristMm}mm\n推定内周：${data.estimatedInnerMm}mm（理論値）\n希望予算：${data.budget || '未入力'}\n${preferenceText}\nご希望・ご要望：${data.message || '未入力'}\n\n※画像は別途保存するか、画像入り相談データをご利用ください。`;
}
