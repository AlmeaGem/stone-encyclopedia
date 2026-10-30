import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { format } from 'prettier';
import { validateCatalog, categorySchema } from '../src/lib/schema';
import { matches, stoneSearchTerms } from '../src/lib/search';
const stones = validateCatalog(
  JSON.parse(await readFile('src/content/stones.json', 'utf8')),
);
const categories = JSON.parse(
  await readFile('src/content/categories.json', 'utf8'),
).map((c: unknown) => categorySchema.parse(c));
assert.equal(categories.length, 12);
assert.equal(new Set(stones.map((s) => s.name)).size, 210);
assert.equal(new Set(stones.map((s) => s.english)).size, 210);
let queries = 0,
  relatedLinks = 0,
  pairingLinks = 0;
for (const s of stones) {
  for (const q of [s.name, s.english, ...s.aliases]) {
    assert(
      matches(q, stoneSearchTerms(s, categories)),
      `${s.id} not searchable: ${q}`,
    );
    queries++;
  }
  assert(
    s.wishes.every((id) => categories.some((c: { id: string }) => c.id === id)),
  );
  for (const id of [
    ...s.related,
    ...(s.synergyStoneIds || []),
    ...(s.cautionStoneIds || []),
  ])
    assert(stones.some((t) => t.id === id) && id !== s.id);
  relatedLinks += s.related.length;
  pairingLinks += (s.synergyStoneIds || []).length;
}
const candidates = new Map<string, Set<string>>();
for (const file of await readdir('docs/research')) {
  if (!/^entries\d+-\d+-review\.json$/.test(file)) continue;
  for (const r of JSON.parse(await readFile('docs/research/' + file, 'utf8'))) {
    if (!candidates.has(r.id)) candidates.set(r.id, new Set());
    candidates.get(r.id)!.add(r.referenceUrl);
  }
}
const safety = new Set([
  's007',
  's035',
  's038',
  's056',
  's068',
  's079',
  's103',
  's128',
  's172',
]);
const register = stones.map((s) => {
  const references = [
    ...new Set(
      [...s.sources.map((x) => x.url), s.legendSourceUrl || ''].filter(Boolean),
    ),
  ];
  return {
    id: s.id,
    name: s.name,
    externalStatus: 'unverified',
    checkedAt: null,
    priority: safety.has(s.id) ? 'P1' : 'P2',
    priorityReason: safety.has(s.id)
      ? '既存の有害性/繊維/粉/水の注意について、適用条件・素材同定・安全な扱いを最優先で資料照合。危険性を新しく認定したものではない。'
      : '名称/分類/成分/硬度/処理、歴史の原典と引用箇所を照合。',
    existingReferenceUrls: references,
    legendUrlRegisteredInSources:
      !s.legendSourceUrl || s.sources.some((x) => x.url === s.legendSourceUrl),
    candidateUrls: [
      ...(candidates.get(s.id) ||
        new Set(
          references.length
            ? []
            : [
                'https://www.mindat.org/search.php?search=' +
                  encodeURIComponent(s.english),
              ],
        )),
    ],
    originalSourceDateHistory: s.sources
      .filter((x) => x.checkedAt)
      .map((x) => ({ url: x.url, checkedAt: x.checkedAt })),
    checks: [
      'P2: 正式名称・和名・別名・分類・成分・モース硬度・処理を資料で確認。',
      'P2: 歴史や伝説がある場合は原典・地域・時代・引用箇所を照合。',
      'P3: 意味・象徴・形状名の物語を鉱物学と区別し、出典なしの口コミや保証表現を追加しない。',
    ],
  };
});
const images = JSON.parse(
  await readFile('src/content/images.json', 'utf8'),
).filter(
  (p: any) =>
    p.status === 'approved' &&
    p.identityConfirmed &&
    p.rightsConfirmed &&
    p.commercial &&
    p.derivatives &&
    p.localPath &&
    p.reviewedAt &&
    p.license !== 'unknown',
);
for (const p of images) {
  const bytes = await readFile(
    'assets/approved-images/' + p.localPath.replace(/^\/images\//, ''),
  );
  assert.equal(createHash('sha256').update(bytes).digest('hex'), p.sha256);
  const m = await sharp(bytes).metadata();
  assert.equal(m.width, p.width);
  assert.equal(m.height, p.height);
}
const imageIds = new Set(images.map((p: any) => p.stoneId));
const realIds = new Set(
  images
    .filter(
      (p: any) =>
        !['ai-generated', 'illustrative-photo'].includes(p.imageKind || ''),
    )
    .map((p: any) => p.stoneId),
);
const existingUrls = [
  ...new Set(register.flatMap((r) => r.existingReferenceUrls)),
];
const summary = {
  scope: 's001-s210',
  verificationKind: 'internal consistency only; external bodies not retrieved',
  catalog: {
    records: stones.length,
    uniqueIds: new Set(stones.map((s) => s.id)).size,
    uniqueSlugs: new Set(stones.map((s) => s.slug)).size,
    uniqueNames: 210,
    uniqueEnglishNames: 210,
    nameAndAliasQueries: queries,
    categories: 12,
    relatedLinks,
    pairingLinks,
  },
  externalEvidence: {
    confirmed: 0,
    partiallyConfirmed: 0,
    unverifiedStones: register.length,
    uniqueExistingReferenceUrls: existingUrls.length,
    existingUrlSourceRecords: stones.reduce(
      (n, s) => n + s.sources.filter((x) => x.url).length,
      0,
    ),
    retainedLegacyDateRecords: stones.reduce(
      (n, s) => n + s.sources.filter((x) => x.checkedAt).length,
      0,
    ),
    priorities: {
      P1: register.filter((r) => r.priority === 'P1').length,
      P2: register.filter((r) => r.priority === 'P2').length,
    },
    caveat:
      '今回の再照合記録上の状態。過去のcheckedAtは履歴として保持するが、その日付だけで今回の本文照合を確認済みとはしない。',
  },
  photos: {
    repositoryOnly: true,
    approvedImageStones: imageIds.size,
    realPhotoStones: realIds.size,
    illustrationStones: imageIds.size - realIds.size,
    withoutApprovedImage: 210 - imageIds.size,
    withoutRealPhoto: 210 - realIds.size,
    remoteOrMacImagesAudited: false,
  },
  remaining: {
    legendLinksNotAlsoInSources: stones
      .filter(
        (s) =>
          s.legendSourceUrl &&
          !s.sources.some((x) => x.url === s.legendSourceUrl),
      )
      .map((s) => s.id),
    blankMineralFields: stones.filter((s) => !s.mineral).length,
    blankHardnessFields: stones.filter((s) => !s.hardness).length,
    missingDedicatedLegends: stones.filter((s) => !s.legend).length,
    missingDedicatedMeanings: stones.filter((s) => !s.spiritualEffects).length,
    missingDedicatedPairings: stones.filter((s) => !s.synergyStoneIds?.length)
      .length,
    genericCharacteristics: stones.filter((s) =>
      s.characteristics.includes('天然石の図鑑で使われる名称'),
    ).length,
  },
};
await writeFile(
  'docs/research/final210-external-review-register.json',
  await format(JSON.stringify(register), { parser: 'json' }),
);
await writeFile(
  'docs/research/final210-internal-summary.json',
  await format(JSON.stringify(summary), { parser: 'json' }),
);
console.log(JSON.stringify(summary, null, 2));
