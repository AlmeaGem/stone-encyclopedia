import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const root = 'dist';
const read = (p) => readFileSync(join(root, p), 'utf8');
const index = read('index.html'),
  hub = read('premium/index.html'),
  catalog = read('special-stones/index.html'),
  chapter = read('special-stones/chapter-one/index.html');
assert.match(index, /premium\//);
assert.match(hub, /スペシャルストーン/);
assert.match(hub, /パーソナル診断/);
assert.match(hub, /占い\/四柱推命/);
assert.match(hub, /どこよりも詳しい四柱推命レポート/);
assert.match(hub, /人生計画や相性占いも、これ一つで♡/);
assert.match(hub, /組み合わせたら最強かも/);
assert.match(hub, /天然石7種類を厳選/);
assert.match(catalog, /chapter-one\//);
assert.match(catalog, /記事一覧/);
assert.match(catalog, /MORE STORIES TO COME/);
assert.match(catalog, /150/);
assert.match(chapter, /この先で明かされる、宝石の秘密/);
assert.doesNotMatch(chapter, /\/members\/\?view=store/);
const fifth = read('special-stones/chapter-five/index.html');
assert.match(catalog, /chapter-five\//);
assert.match(fifth, /奇跡を呼び込む/);
assert.match(fifth, /世界三大ヒーリングストーン/);
assert.match(fifth, /カイヤナイト/);
assert.match(fifth, /ハーキマーダイヤモンド/);
assert.match(fifth, /無料で内容を見る/);
assert.doesNotMatch(fifth, /\/members\/\?view=store/);
assert.ok(existsSync(join(root, 'special-stones/05_chapter_miracle.svg')));
const sixth = read('special-stones/chapter-six/index.html');
assert.match(catalog, /chapter-six\//);
assert.match(sixth, /見えない邪気を払い/);
assert.match(sixth, /ブラックダイヤモンド/);
assert.match(sixth, /protection-shield\.svg/);
assert.doesNotMatch(sixth, /破邪と守護のイメージ/);
assert.ok(existsSync(join(root, 'special-stones/protection-eye.svg')));
assert.match(sixth, /五つの守り方/);
assert.doesNotMatch(sixth, /\/members\/\?view=store/);
assert.ok(existsSync(join(root, 'special-stones/06_chapter_protection.svg')));
for (const slug of ['one', 'two', 'three', 'four', 'five', 'six', 'seven']) {
  const html = read('special-stones/chapter-' + slug + '/index.html');
  assert.equal((html.match(/本編の内容を見る/g) || []).length, 1);
}
const seventh = read('special-stones/chapter-seven/index.html');
assert.match(catalog, /chapter-seven\//);
assert.match(seventh, /水晶に封じられた/);
assert.match(seventh, /天賦の造形美/);
assert.match(seventh, /クォーツインクォーツ/);
assert.match(seventh, /スタールチルクォーツ/);
assert.match(seventh, /五つの鑑賞カテゴリー/);
assert.match(seventh, /quartz-growth\.svg/);
assert.match(seventh, /quartz-time\.svg/);
assert.doesNotMatch(seventh, /\/members\/\?view=store/);
assert.ok(existsSync(join(root, 'special-stones/07_chapter_quartz.svg')));
function walk(p) {
  for (const e of readdirSync(p, { withFileTypes: true })) {
    const v = join(p, e.name);
    if (e.isDirectory()) walk(v);
    else
      assert.doesNotMatch(
        e.name,
        /^(02_paid_article\.md|02_sapphire\.png|03_ruby\.png|04_emerald\.png)$/,
      );
  }
}
walk(root);
console.log(
  'Premium public navigation and private asset exclusion checks passed',
);
