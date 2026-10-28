export const photoShapes = [
  'sphere',
  'polished',
  'loose',
  'rough',
  'all',
] as const;
export type PhotoSearchMode = (typeof photoShapes)[number];
export const shapeLabels = {
  sphere: '丸玉・スフィア',
  polished: '研磨石・タンブル',
  loose: '宝石ルース',
  rough: '原石・鉱物標本',
  all: 'すべて',
  unknown: '形状未確認',
};
export function searchMode(value: unknown): PhotoSearchMode {
  if (value === undefined) return 'sphere';
  if (!photoShapes.includes(value as PhotoSearchMode))
    throw new Error('検索する写真の種類が不正です');
  return value as PhotoSearchMode;
}
export function photoQueries(
  stone: { english: string; name: string; aliases: string[] },
  mode: PhotoSearchMode,
) {
  const suffix = {
    sphere:
      '(sphere OR "crystal ball" OR "crystal sphere" OR "gemstone sphere" OR "polished stone sphere")',
    polished:
      '(tumbled OR tumble OR "polished gemstone" OR "gemstone beads" OR "polished stone")',
    loose: '(gemstone OR cabochon OR "gemstone cabochon" OR faceted)',
    rough: '(mineral OR specimen OR rough OR crystal)',
    all: '',
  }[mode];
  return [
    ...new Set(
      [stone.english, stone.name, ...stone.aliases]
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ]
    .slice(0, 3)
    .map((name) =>
      `"${name.replace(/"/g, '')}" ${suffix} filetype:bitmap`.trim(),
    );
}
