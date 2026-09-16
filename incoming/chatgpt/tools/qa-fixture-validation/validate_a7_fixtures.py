from pathlib import Path
import json, sys
root=Path(__file__).resolve().parents[2]/'tests'/'manual-fixtures'
names=['STAGE3_MANUAL_QA_CASES.json','STAGE3_EDGE_CASE_FIXTURES.json','STAGE3_ACCEPTANCE_MATRIX.json','DEFERRED_QA_CASES.json']
d={}; errors=[]
for n in names:
    try:d[n]=json.loads((root/n).read_text(encoding='utf-8'))
    except Exception as e:errors.append(f'{n}: {e}')
if not errors:
    ids=[c['id'] for c in d[names[0]]['cases']]
    if len(ids)!=len(set(ids)):errors.append('duplicate case IDs')
    known=set(ids)
    for r in d[names[2]]['requirements']:
        for cid in r['cases']:
            if cid not in known:errors.append('unknown matrix case '+cid)
    for c in d[names[3]]['cases']:
        if c.get('status')!='deferred':errors.append('deferred status missing '+c.get('id','?'))
if errors:
    print('A7 VALIDATION: FAIL');[print('-',e) for e in errors];sys.exit(1)
print('A7 VALIDATION: PASS')
print('Stage3 cases:',len(d[names[0]]['cases']))
print('Edge vectors:',len(d[names[1]]['vectors']))
print('Matrix requirements:',len(d[names[2]]['requirements']))
print('Deferred cases:',len(d[names[3]]['cases']))
