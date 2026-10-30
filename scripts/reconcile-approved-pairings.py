"""Resolve only stone names explicitly present in approved pairing prose.
Run after the workbook importer. This does not generate recommendations or modify prose.
"""
import json,re
ss=json.load(open('src/content/stones.json')); terms={}
# Resolve only explicit display names and established search aliases. Longest match prevents partial-name collisions.
for s in ss:
 for n in [s['name'],*s['aliases']]:
  if len(n)>=3 and not re.search('[a-zA-Z]',n):terms.setdefault(n,s['id'])
terms.update({'水晶':'s187','ムーンストーン':'s063','パール':'s173','ゴールドルチルクォーツ':'s209','透明水晶':'s187'})
rx=re.compile('|'.join(re.escape(n) for n in sorted(terms,key=len,reverse=True)))
changes=[]
for s in ss:
 ids=list(dict.fromkeys(terms[x.group()] for x in rx.finditer(s['synergyNote']) if terms[x.group()]!=s['id']))
 if ids!=s.get('synergyStoneIds',[]):changes.append({'id':s['id'],'before':s.get('synergyStoneIds',[]),'after':ids})
 s['synergyStoneIds']=ids[:8]
# Link adjustments contain only public IDs; the workbook remains outside Git.
json.dump(ss,open('src/content/stones.json','w'),ensure_ascii=False,indent=2)
print(len(changes),'pairing link lists reconciled')
for s in ss:
 if len(s['synergyStoneIds'])>5:print(s['id'],s['synergyStoneIds'])
