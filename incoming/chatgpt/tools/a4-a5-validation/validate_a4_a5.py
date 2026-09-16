#!/usr/bin/env python3
from pathlib import Path
import json, re, sys

ROOT=Path(__file__).resolve().parents[2]
COPY=ROOT/'data'/'copy'/'UI_COPY_ZH_TW.json'
MAN=ROOT/'assets'/'manifest'/'ASSET_MANIFEST.json'
PROJECT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else None
checks=[]
def ck(name, ok, detail=''):
    checks.append((name,bool(ok),detail))

def walk_strings(x):
    if isinstance(x,str): yield x
    elif isinstance(x,dict):
        for v in x.values(): yield from walk_strings(v)
    elif isinstance(x,list):
        for v in x: yield from walk_strings(v)

def main():
    copy=json.load(open(COPY,encoding='utf-8'))
    man=json.load(open(MAN,encoding='utf-8'))
    ck('A4 locale zh-TW',copy.get('locale')=='zh-TW')
    nav=copy['copy']['navigation']
    ck('A4 five nav labels exact',[nav[k] for k in ['home','quests','learn','hero','parent']]==['首頁','任務','學習','角色','家長'])
    ck('A4 tagline exact',copy['copy']['common']['tagline']=='把真實生活，變成大冒險')
    text='\n'.join(walk_strings(copy))
    ck('A4 no leaderboard copy','排行榜' not in text and 'leaderboard' not in text.lower())
    ck('A4 no intelligence praise','你很聰明' not in text)
    ck('A4 no punitive EXP loss',all(x not in text for x in ['失敗扣 EXP','失敗扣EXP','會扣除 EXP','會扣除EXP','失敗會扣']))
    ck('A4 has retry-oriented copy','再試一次' in text and '換個方法' in text)
    # braces must be simple named tokens when present
    bad=[]
    for s in walk_strings(copy):
        for m in re.findall(r'\{([^{}]+)\}',s):
            if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*',m): bad.append(m)
    ck('A4 interpolation tokens valid',not bad,','.join(bad[:10]))

    ids=[a['logicalId'] for a in man['assets']]
    paths=[a['path'] for a in man['assets']]
    ck('A5 logical IDs unique',len(ids)==len(set(ids)),f'{len(ids)} ids')
    ck('A5 paths unique',len(paths)==len(set(paths)),f'{len(paths)} paths')
    ck('A5 ready asset count is 37',sum(a['status']=='ready' for a in man['assets'])==37)
    ck('A5 30 exercise slots',sum(a['kind']=='task-illustration' and str(a.get('contentId','')).startswith('EX') for a in man['assets'])==30)
    ck('A5 30 chore slots',sum(a['kind']=='task-illustration' and str(a.get('contentId','')).startswith('CH') for a in man['assets'])==30)
    ck('A5 6 boss slots',sum(a['kind']=='boss-illustration' for a in man['assets'])==6)
    ck('A5 7 backgrounds',sum(a['kind']=='background' for a in man['assets'])==7)
    ck('A5 30 story covers',sum(a['kind']=='story-cover' for a in man['assets'])==30)
    ck('A5 all pending marked nonblocking until Stage 10',all(a.get('nonBlockingUntil')=='Stage 10' for a in man['assets'] if a['status']=='pending'))
    ck('A5 no UI text embedded in image rule',man['rules'].get('doNotEmbedUITextInImages') is True)
    if PROJECT:
        ready=[a for a in man['assets'] if a['status']=='ready']
        missing=[a['path'] for a in ready if not (PROJECT/a['path']).exists()]
        ck('A5 all ready asset paths exist in project',not missing,','.join(missing[:5]))
        # source data alignment
        ex=json.load(open(PROJECT/'02_DATA'/'exercise_task_cards_30.json',encoding='utf-8'))
        ch=json.load(open(PROJECT/'02_DATA'/'chore_task_cards_30.json',encoding='utf-8'))
        bo=json.load(open(PROJECT/'03_REWARDS_BOSSES'/'BOSSES_6.json',encoding='utf-8'))
        st=json.load(open(PROJECT/'02_DATA'/'thinking_stories_30.json',encoding='utf-8'))
        mapped=set(a.get('contentId') for a in man['assets'])
        ck('A5 maps every exercise task',all(x['id'] in mapped for x in ex))
        ck('A5 maps every chore task',all(x['id'] in mapped for x in ch))
        ck('A5 maps every boss',all(x['id'] in mapped for x in bo))
        ck('A5 maps every story',all(x['id'] in mapped for x in st))
    failed=[x for x in checks if not x[1]]
    print(f'A4+A5 checks: {len(checks)-len(failed)}/{len(checks)} PASS')
    for n,ok,d in checks:
        print(('PASS' if ok else 'FAIL')+f' | {n}'+(f' | {d}' if d else ''))
    return 1 if failed else 0
if __name__=='__main__': raise SystemExit(main())
