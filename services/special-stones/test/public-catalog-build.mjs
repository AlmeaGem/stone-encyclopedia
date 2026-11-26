import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root='dist';
const read=p=>readFileSync(join(root,p),'utf8');
const index=read('index.html'),hub=read('premium/index.html'),catalog=read('special-stones/index.html'),chapter=read('special-stones/chapter-one/index.html');
assert.match(index,/premium\//);assert.match(hub,/スペシャルストーン/);assert.match(hub,/パーソナル診断/);assert.match(hub,/占いコンテンツ/);
assert.match(catalog,/chapter-one\//);assert.match(chapter,/この先で明かされる、宝石の秘密/);
assert.doesNotMatch(chapter,/\/members\/\?view=store/);
function walk(p){for(const e of readdirSync(p,{withFileTypes:true})){const v=join(p,e.name);if(e.isDirectory())walk(v);else assert.doesNotMatch(e.name,/^(02_paid_article\.md|02_sapphire\.png|03_ruby\.png|04_emerald\.png)$/);}}
walk(root);
console.log('Premium public navigation and private asset exclusion checks passed');
