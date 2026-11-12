import { designStones } from './design-stones.mjs';
// Trial materials are abstract illustrations, never claims about real stones or sale availability.
const samples = [
  {
    id: 'sample-rose',
    name: 'ローズ色のイメージ',
    color: 'ピンク',
    colors: ['#fff5f3', '#dba9ae', '#875e67'],
  },
  {
    id: 'sample-clear',
    name: '透明色のイメージ',
    color: '透明',
    colors: ['#ffffff', '#d7dfdc', '#86999c'],
  },
  {
    id: 'sample-purple',
    name: '紫色のイメージ',
    color: '紫',
    colors: ['#faf5ff', '#b7a2c7', '#63516e'],
  },
  {
    id: 'sample-blue',
    name: '青色のイメージ',
    color: '青',
    colors: ['#f2f8fa', '#92acbb', '#485e73'],
  },
];
export const sizes = [6, 8, 10, 12, 13, 14, 15]; // Illustrative dimensions, not verified product sizes.
export const materials = [
  ...samples.map((sample) => ({ ...sample, sizes })),
  ...designStones.map((stone) => ({ ...stone, sizes, illustration: true })),
];
export const defaultBeads = Array.from({ length: 18 }, (_, i) => ({
  id: `bead-${i}`,
  material: ['s107', 's134', 's187'][i % 3],
  size: 8,
}));
export function geometry(beads) {
  if (beads.length < 3) return null;
  const radii = beads.map((b) => b.size / 2);
  const pairs = radii.map((r, i) => r + radii[(i + 1) % radii.length]);
  let lo = Math.max(...pairs) / 2,
    hi = Math.max(lo * 2, 1);
  const angles = (R) =>
    pairs.map((d) => 2 * Math.asin(Math.min(1, d / (2 * R))));
  const sum = (R) => angles(R).reduce((a, b) => a + b, 0);
  if (sum(lo) < Math.PI * 2) return null;
  while (sum(hi) > Math.PI * 2) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    if (sum(m) > Math.PI * 2) lo = m;
    else hi = m;
  }
  const radius = (lo + hi) / 2,
    gaps = angles(radius);
  let angle = -Math.PI / 2;
  const positions = beads.map((b, i) => {
    const p = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      r: b.size / 2,
    };
    angle += gaps[i];
    return p;
  });
  // Reject any collision, including non-adjacent beads in mixed-size designs.
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i],
        b = positions[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) + 1e-7 < a.r + b.r) return null;
    }
  }
  return {
    radius,
    innerCircumference: 2 * Math.PI * Math.max(0, radius - Math.max(...radii)),
    positions,
  };
}
export function validateDesign(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.beads) ||
    value.beads.length < 3 ||
    value.beads.length > 80
  )
    throw Error('データの形式または玉の数が正しくありません。');
  if (!Number.isFinite(value.wrist) || value.wrist < 80 || value.wrist > 300)
    throw Error('手首周りは80〜300mmで入力してください。');
  const ids = new Set();
  const beads = value.beads.map((b) => {
    if (
      !b ||
      typeof b.id !== 'string' ||
      !/^[\w-]{1,80}$/.test(b.id) ||
      ids.has(b.id) ||
      !materials.some((m) => m.id === b.material && m.sizes.includes(b.size))
    )
      throw Error('未対応の玉を含むデータです。');
    ids.add(b.id);
    return { id: b.id, material: b.material, size: b.size };
  });
  if (!geometry(beads))
    throw Error('この玉の組み合わせは円形に配置できません。');
  return { version: 1, wrist: value.wrist, beads };
}
