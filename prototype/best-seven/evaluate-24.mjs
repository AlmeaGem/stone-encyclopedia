import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recommend } from './engine.js';
const root = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(await readFile(join(root, 'review-data.json'), 'utf8'));
const wishes = JSON.parse(
  await readFile(join(root, '../diagnosis-v3/draft-data.json'), 'utf8'),
);
const quote = (value) => '"' + String(value).replaceAll('"', '""') + '"';
const rows = [
  [
    'ケース',
    '願いID',
    '試算した色の希望',
    '候補数',
    '順位・石ID（非公開試作）',
    '採点（検証用）',
    '推薦理由案',
    '根拠',
    '不足・注意',
    '決定性',
  ],
];
const top = new Map();
let empty = 0;
// Existing scenario conditions are inputs to the experiment, not stone attributes.
// The earlier scenario's unspecified "淡色" cannot be mapped to a specific colour.
const scenarioConditions = {
  'love.meet.ideal': { colors: ['ピンク'] },
  'love.person.progress': { colors: ['紫'] },
  'love.reunion.ex': { colors: ['ピンク'] },
  'love.couple.communication': { colors: ['緑'] },
  'love.attraction.charm': { colors: ['ピンク'] },
  'finance.income': { colors: ['ゴールド'] },
  'work.business_grow': { colors: ['黒'] },
  'work.recognition': { colors: ['青'] },
  'intuition.reflect': { colors: ['紫'] },
};
for (const entry of wishes.cases) {
  const input = { primary: entry.id, ...scenarioConditions[entry.id] };
  const result = recommend(input, data);
  if (JSON.stringify(result) !== JSON.stringify(recommend(input, data)))
    throw new Error('Non-deterministic result');
  if (!result.count) empty++;
  if (result.results[0])
    top.set(
      result.results[0].stoneId,
      (top.get(result.results[0].stoneId) || 0) + 1,
    );
  rows.push([
    entry.name,
    entry.id,
    input.colors?.join('・') || '未指定（淡色など未確定の条件は変換しない）',
    result.count,
    result.results
      .map((r, i) => `${i + 1}:${r.stoneId} ${r.stoneName}`)
      .join(' / '),
    result.results.map((r) => `${r.stoneId}:${r.score}`).join(' / '),
    result.results.map((r) => `${r.stoneId}:${r.reason}`).join(' / '),
    result.results.map((r) => `${r.stoneId}:${r.sources[0].text}`).join(' / '),
    result.gaps.join(' / '),
    '同一入力・版で一致',
  ]);
}
await mkdir(join(root, 'review'), { recursive: true });
await writeFile(
  join(root, 'review/24-case-evaluation.csv'),
  '\ufeff' + rows.map((row) => row.map(quote).join(',')).join('\n') + '\n',
);
const concentration =
  [...top]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => `${id}: ${count}ケース`)
    .join('、') || '該当なし';
await writeFile(
  join(root, 'review/evaluation-summary.md'),
  `# 24ケースの試作評価\n\n対象は未承認の20石・採用候補25件のみ。順位は正式推薦ではなく、石の効果や成就確率を示しません。\n\n- ${wishes.cases.length}ケース中、候補0件：${empty}。候補が7件未満の場合は補充しません。\n- 1位の出現数：${concentration}。全候補は主願いの完全一致だけで同点となり、石ID順で並びます。これは品質順ではなく、偏りと配点の検証不足を示します。正式な品質や妥当性は未評価です。\n- 色・雰囲気・用途に確認済みデータはなく、いずれも採点しません。避けたい特徴が指定された場合、確認できない候補を安全側で除外します。\n- 金運・仕事・復縁を含む未整備の詳細分類は候補不足となります。非候補を関連なしと断定するものではありません。\n- 全ケースは同一入力・同一データ版での再実行一致を機械的に確認しました。\n`,
);
console.log(
  JSON.stringify({
    cases: wishes.cases.length,
    noCandidates: empty,
    top: Object.fromEntries(top),
  }),
);
