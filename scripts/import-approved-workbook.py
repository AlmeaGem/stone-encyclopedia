"""Extract only approved public columns. Never copy the workbook or private tabs into Git.
Usage: python scripts/import-approved-workbook.py /path/to/master.xlsx [--write]
Requires openpyxl. Default verifies without changing content.
"""
import argparse
import hashlib
import json
from pathlib import Path
import openpyxl

TABS = ["公開候補原稿210石・内部情報除外", "全210石・品質監査", "全出典・公開前再検証", "最終QA・総括と修正記録", "P0安全・鉱物分類 再審査原稿", "P0再照合・外部根拠"]
FIELDS = dict(zip(["石ID", "石名", "石の分類", "素材・鉱物", "組成・硬度", "導入文", "特徴", "品質・選び方", "歴史・伝承", "象徴的な意味", "組み合わせの提案", "扱い方・安全上の注意"], ["id", "name", "classification", "mineral", "compositionHardness", "introduction", "characteristics", "quality", "legend", "spiritualEffects", "synergyNote", "handling"]))
P0_FIELDS = dict(zip(["石ID", "石名", "区分", "鉱物・素材", "組成・硬度", "導入文", "特徴（改訂）", "品質（改訂）", "来歴・伝説", "象徴的な意味", "組み合わせ", "扱い方・安全情報（改訂）"], FIELDS.values()))
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("workbook", type=Path)
parser.add_argument("--write", action="store_true")
args = parser.parse_args()
wb = openpyxl.load_workbook(args.workbook, data_only=True)
rows = {}
for tab in TABS:
    values = list(wb[tab].values)
    rows[tab] = [dict(zip(values[0], row)) for row in values[1:] if row[0]]
public = [{v: r[k] or "" for k, v in FIELDS.items()} for r in rows[TABS[0]]]
expected_ids = [f"s{i:03}" for i in range(1, 211)]
assert [r['id'] for r in public] == expected_ids
by_id = {r['id']: r for r in public}
for r in rows[TABS[4]]:
    assert by_id[r['石ID']]['name'] == r['石名']
    by_id[r['石ID']].update({v: r[k] or "" for k, v in P0_FIELDS.items()})
assert [r['石ID'] for r in rows[TABS[1]]] == expected_ids
stones = json.loads(Path('src/content/stones.json').read_text())
actual = {s['id']: s for s in stones}
assert list(actual) == expected_ids
# Review/testimonial and unidentified book entries are retained in the workbook, not auto-published.
restricted_urls = set()
for sheet in wb:
    if '口コミ記録' in sheet.title or '体験談' in sheet.title:
        for row in sheet.values:
            for value in row:
                if isinstance(value, str) and value.startswith('https://'):
                    restricted_urls.add(value)
restricted_urls.update(r['URL'] for r in rows[TABS[2]] if r['公開前の照合区分'] == '本人投稿・引用条件確認' and r['URL'])
references = [{'id': r['石ID'], 'label': r['資料名'], 'url': r['URL']} for r in rows[TABS[2]] if r['URL'] and r['URL'] not in restricted_urls and r['公開前の照合区分'] != '本人投稿・引用条件確認']
references += [{'id': r['石ID'], 'label': r['資料名'], 'url': r['URL']} for r in rows[TABS[5]] if r['URL']]
if args.write:
    for r in public:
        actual[r['id']].update(r)
        actual[r['id']]['hardness'] = ''  # combined composition prose is not a numeric Mohs value
    for r in references:
        target = actual[r['id']]['sources']
        if not any(x['url'] == r['url'] for x in target):
            target.append({'label': r['label'], 'url': r['url'], 'checkedAt': None, 'note': ''})
    for stone in stones:
        for source in stone['sources']:
            if source['url'] in restricted_urls:
                source['publication'] = 'internal'
    for path, data in [('src/content/stones.json', stones), ('tests/fixtures/approved-public-master.json', public), ('tests/fixtures/approved-reference-urls.json', references)]:
        Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
differences = [{'id': r['id'], 'field': k} for r in public for k, v in r.items() if actual[r['id']].get(k) != v]
missing_refs = [r for r in references if not any(s['url'] == r['url'] for s in actual[r['id']]['sources'])]
report = {'workbookSha256': hashlib.sha256(args.workbook.read_bytes()).hexdigest(), 'tabs': {t: len(rows[t]) for t in TABS}, 'matchingStones': sum(all(actual[r['id']].get(k) == v for k, v in r.items()) for r in public), 'fieldMatches': {k: sum(actual[r['id']].get(k) == r[k] for r in public) for k in FIELDS.values()}, 'differences': differences, 'p0Ids': [r['石ID'] for r in rows[TABS[4]]], 'bibliographicRows': len(references), 'missingBibliographicRows': len(missing_refs), 'excludedTestimonialRows': sum(r['公開前の照合区分'] == '本人投稿・引用条件確認' for r in rows[TABS[2]]), 'restrictedSourceRecords': sum(s.get('publication') == 'internal' for stone in stones for s in stone['sources']), 'sourceBodiesIndependentlyVerifiedHere': False}
print(json.dumps(report, ensure_ascii=False, indent=2))
if differences or missing_refs:
    raise SystemExit(1)
