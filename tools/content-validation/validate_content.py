#!/usr/bin/env python3
"""Real Life Quest content validator.

Standard-library only. Validates canonical content and A1 vocabulary fixtures.
Exit codes:
  0 = canonical content passes and fixture expectations match
  1 = canonical content has ERROR issues
  2 = fixture expectation mismatch / validator usage issue
"""
from __future__ import annotations
import argparse, json, re, sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

@dataclass
class Issue:
    severity: str
    code: str
    file: str
    message: str

class Report:
    def __init__(self):
        self.issues:list[Issue]=[]
        self.checks:list[dict[str,Any]]=[]
    def issue(self,severity,code,file,message): self.issues.append(Issue(severity,code,file,message))
    def check(self,name,passed,detail=""):
        self.checks.append({"name":name,"passed":bool(passed),"detail":detail})
    @property
    def errors(self): return [x for x in self.issues if x.severity=="ERROR"]
    @property
    def warnings(self): return [x for x in self.issues if x.severity=="WARNING"]

def load_json(path:Path, report:Report, error_code="JSON_PARSE_ERROR"):
    try: return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        report.issue("ERROR",error_code,str(path),f"Cannot parse JSON: {e}")
        return None

def req_nonblank(obj,key,report,file,code="REQUIRED_FIELD"):
    if key not in obj or not isinstance(obj[key],str) or not obj[key].strip():
        report.issue("ERROR",code,file,f"Missing or blank required string: {key}")
        return False
    return True

def duplicate_values(items,key,normalize=lambda x:x):
    seen=set(); dup=set()
    for item in items:
        if key not in item: continue
        v=normalize(item[key])
        if v in seen: dup.add(v)
        seen.add(v)
    return sorted(dup)

def validate_core300(root:Path, report:Report):
    p=root/'02_DATA/core300_words_enriched.json'; d=load_json(p,report)
    if not isinstance(d,list):
        report.issue("ERROR","CORE300_TYPE",str(p),"Expected a JSON array."); return
    report.check("core300.count",len(d)==300,f"count={len(d)}")
    if len(d)!=300: report.issue("ERROR","CORE300_COUNT",str(p),f"Expected 300, got {len(d)}")
    required=['id','word','meaningZh','category','level','difficulty','partOfSpeech','example','exampleZh','spellingRequired','imageCueZh','reviewScheduleDays','speech']
    for i,w in enumerate(d):
        f=f"{p}#{i}"
        for k in required:
            if k not in w: report.issue("ERROR","CORE300_REQUIRED_FIELD",f,f"Missing {k}")
        for k in ['id','word','meaningZh']:
            if k in w and (not isinstance(w[k],str) or not w[k].strip()): report.issue("ERROR","CORE300_REQUIRED_FIELD",f,f"Blank {k}")
        if w.get('reviewScheduleDays') != [1,3,7,14,30]: report.issue("ERROR","CORE300_REVIEW_SCHEDULE",f,f"Unexpected review schedule: {w.get('reviewScheduleDays')}")
        sp=w.get('speech')
        if isinstance(sp,dict):
            expected={'locale':'en-US','defaultRate':0.75,'minRate':0.6,'maxRate':1.1,'step':0.05,'quickRates':[0.6,0.75,0.9,1.0,1.1]}
            for k,v in expected.items():
                if sp.get(k)!=v: report.issue("ERROR","CORE300_SPEECH_CONFIG",f,f"speech.{k}: expected {v}, got {sp.get(k)}")
        else: report.issue("ERROR","CORE300_SPEECH_CONFIG",f,"speech must be object")
    ids=duplicate_values(d,'id')
    words=duplicate_values(d,'word',lambda x:str(x).casefold())
    if ids: report.issue("ERROR","CORE300_DUPLICATE_ID",str(p),f"Duplicate IDs: {ids[:10]}")
    if words: report.issue("ERROR","CORE300_DUPLICATE_WORD",str(p),f"Duplicate words: {words[:10]}")
    spelling=sum(1 for w in d if w.get('spellingRequired') is True)
    report.check("core300.spellingTargets",spelling==180,f"count={spelling}")
    if spelling!=180: report.issue("ERROR","CORE300_SPELLING_COUNT",str(p),f"Expected 180 spelling targets, got {spelling}")
    report.check("core300.uniqueIds",not ids,f"unique={len(set(w.get('id') for w in d))}")
    report.check("core300.uniqueWords",not words,f"unique={len(set(str(w.get('word','')).casefold() for w in d))}")

def validate_stories(root:Path, report:Report):
    p=root/'02_DATA/thinking_stories_30.json'; d=load_json(p,report)
    if not isinstance(d,list): report.issue("ERROR","STORY_TYPE",str(p),"Expected array"); return
    if len(d)!=30: report.issue("ERROR","STORY_COUNT",str(p),f"Expected 30, got {len(d)}")
    dup=duplicate_values(d,'id')
    if dup: report.issue("ERROR","STORY_DUPLICATE_ID",str(p),f"Duplicate IDs: {dup}")
    for i,s in enumerate(d):
        f=f"{p}#{i}"
        for k in ['id','title','theme','body','realityTask','takeaway']:
            req_nonblank(s,k,report,f,"STORY_REQUIRED_FIELD")
        qs=s.get('questions')
        if not isinstance(qs,list) or len(qs)!=4 or any(not isinstance(q,str) or not q.strip() for q in qs):
            report.issue("ERROR","STORY_QUESTIONS",f,"Each story must contain exactly 4 nonblank questions.")
        if isinstance(s.get('charCount'),int) and isinstance(s.get('body'),str):
            actual=len(re.sub(r'\s+','',s['body']))
            if actual!=s['charCount']: report.issue("WARNING","STORY_CHARCOUNT",f,f"charCount={s['charCount']}, whitespace-stripped actual={actual}")
    report.check("stories.count",len(d)==30,f"count={len(d)}")
    report.check("stories.fourQuestions",not any(x.code=='STORY_QUESTIONS' for x in report.errors))

def validate_tasks(root:Path, report:Report):
    defs=[('reality_tasks_120.json',120,'general'),('exercise_task_cards_30.json',30,'exercise'),('chore_task_cards_30.json',30,'chore')]
    all_items=[]
    common=['id','category','name','description','completionCriteria','difficulty','exp','ability','abilityZh','abilityExp','requiresParentConfirmation','screenMode','repeatable']
    for name,expected,kind in defs:
        p=root/'02_DATA'/name; d=load_json(p,report)
        if not isinstance(d,list): report.issue("ERROR","TASK_TYPE",str(p),"Expected array"); continue
        if len(d)!=expected: report.issue("ERROR","TASK_COUNT",str(p),f"Expected {expected}, got {len(d)}")
        for i,t in enumerate(d):
            f=f"{p}#{i}"
            for k in common:
                if k not in t: report.issue("ERROR","TASK_REQUIRED_FIELD",f,f"Missing {k}")
            for k in ['id','category','name','description','completionCriteria']:
                if k in t and (not isinstance(t[k],str) or not t[k].strip()): report.issue("ERROR","TASK_REQUIRED_FIELD",f,f"Blank {k}")
            if not isinstance(t.get('exp'),int) or t.get('exp',0)<1: report.issue("ERROR","TASK_EXP",f,f"Invalid exp: {t.get('exp')}")
            if kind in ('exercise','chore'):
                if t.get('requiresParentConfirmation') is not True: report.issue("ERROR","TASK_PARENT_CONFIRM",f,"Exercise/chore must require parent confirmation.")
                if t.get('screenMode')!='offscreen': report.issue("ERROR","TASK_SCREEN_MODE",f,"Exercise/chore must be offscreen.")
                tips=t.get('movementTipsZh')
                if not isinstance(tips,list) or len(tips)<2: report.issue("ERROR","TASK_TIPS",f,"Expected at least 2 tips.")
                img=t.get('imageDisplay')
                if not isinstance(img,dict) or not img.get('visualLabelZh') or not img.get('imagePromptZh'): report.issue("ERROR","TASK_IMAGE_DISPLAY",f,"Missing usable imageDisplay.")
        all_items.extend(d)
        report.check(f"tasks.{kind}.count",len(d)==expected,f"count={len(d)}")
    dup=duplicate_values(all_items,'id')
    if dup: report.issue("ERROR","TASK_DUPLICATE_ID","02_DATA",f"Duplicate task IDs across collections: {dup}")
    report.check("tasks.all.uniqueIds",not dup,f"total={len(all_items)}")

def validate_bosses(root:Path, report:Report):
    p=root/'03_REWARDS_BOSSES/BOSSES_6.json'; d=load_json(p,report)
    if not isinstance(d,list): report.issue("ERROR","BOSS_TYPE",str(p),"Expected array"); return
    if len(d)!=6: report.issue("ERROR","BOSS_COUNT",str(p),f"Expected 6, got {len(d)}")
    dup=duplicate_values(d,'id')
    if dup: report.issue("ERROR","BOSS_DUPLICATE_ID",str(p),f"Duplicate boss IDs: {dup}")
    for i,b in enumerate(d):
        f=f"{p}#{i}"
        for k in ['id','chapter','chapterName','name','story','challenge','hp','progress','rewards']:
            if k not in b: report.issue("ERROR","BOSS_REQUIRED_FIELD",f,f"Missing {k}")
        if not isinstance(b.get('hp'),int) or b.get('hp',0)<1: report.issue("ERROR","BOSS_HP",f,f"Invalid hp: {b.get('hp')}")
        if isinstance(b.get('progress'),list) and isinstance(b.get('hp'),int) and len(b['progress'])!=b['hp']:
            report.issue("ERROR","BOSS_PROGRESS_HP",f,f"progress steps={len(b['progress'])}, hp={b['hp']}")
        r=b.get('rewards')
        if not isinstance(r,dict) or not isinstance(r.get('exp'),int) or not (10<=r.get('exp',0)<=15):
            report.issue("ERROR","BOSS_REWARD_EXP",f,f"Boss reward EXP must be 10-15, got {r.get('exp') if isinstance(r,dict) else None}")
    report.check("bosses.count",len(d)==6,f"count={len(d)}")

def validate_rewards(root:Path, report:Report):
    p=root/'03_REWARDS_BOSSES/REWARD_SYSTEM.json'; d=load_json(p,report)
    if not isinstance(d,dict): report.issue("ERROR","REWARD_TYPE",str(p),"Expected object"); return
    for k in ['version','designPrinciples','levelThresholds','levelRewards','chestSystem','titles','badges','privilegeRewards','tickets','cosmetics','materialRewardPolicy']:
        if k not in d: report.issue("ERROR","REWARD_REQUIRED_FIELD",str(p),f"Missing {k}")
    th=d.get('levelThresholds')
    if isinstance(th,list):
        pairs=[(x.get('level'),x.get('expRequired')) for x in th if isinstance(x,dict)]
        expected=[(1,0),(2,30),(3,65),(4,105),(5,150),(6,200),(7,255),(8,315),(9,380),(10,450)]
        if pairs!=expected: report.issue("ERROR","REWARD_LEVEL_THRESHOLDS",str(p),f"Unexpected thresholds: {pairs}")
    else: report.issue("ERROR","REWARD_LEVEL_THRESHOLDS",str(p),"levelThresholds must be array")
    # Guard against accidental stat bonuses in cosmetics structure.
    banned={'attack','defense','power','statBonus','abilityBonus','expMultiplier'}
    def walk(x,path='cosmetics'):
        if isinstance(x,dict):
            for k,v in x.items():
                if k in banned: report.issue("ERROR","COSMETIC_STAT_BONUS",str(p),f"Forbidden cosmetic stat key at {path}.{k}")
                walk(v,f"{path}.{k}")
        elif isinstance(x,list):
            for i,v in enumerate(x): walk(v,f"{path}[{i}]")
    walk(d.get('cosmetics'))
    report.check("rewards.levelThresholds",not any(x.code=='REWARD_LEVEL_THRESHOLDS' for x in report.errors))
    report.check("rewards.cosmeticsNoStats",not any(x.code=='COSMETIC_STAT_BONUS' for x in report.errors))

def validate_vocab_pack_data(d:Any,file:str,reserved_pack_ids:set[str]|None=None)->list[Issue]:
    issues=[]
    def add(code,msg): issues.append(Issue('ERROR',code,file,msg))
    if not isinstance(d,dict): add('VOCAB_PACK_TYPE','Pack must be object.'); return issues
    if d.get('schemaVersion')!=1: add('VOCAB_SCHEMA_VERSION',f"schemaVersion must be 1, got {d.get('schemaVersion')}")
    for k in ['packId','packVersion','title','locale']:
        if not isinstance(d.get(k),str) or not d.get(k).strip(): add('VOCAB_REQUIRED_FIELD',f"Missing/blank pack field: {k}")
    pack=d.get('packId')
    if reserved_pack_ids and pack in reserved_pack_ids: add('VOCAB_PACK_ID_CONFLICT',f"packId conflicts with installed/reserved pack: {pack}")
    st=d.get('sourceType')
    if st is not None and st not in {'builtin','imported','future'}: add('VOCAB_SOURCE_TYPE',f"Invalid sourceType: {st}")
    words=d.get('words')
    if not isinstance(words,list): add('VOCAB_WORDS_TYPE','words must be array.'); return issues
    seen=set()
    for i,w in enumerate(words):
        loc=f"word[{i}]"
        if not isinstance(w,dict): add('VOCAB_WORD_TYPE',f"{loc} must be object."); continue
        for k in ['wordId','packId','word','meaningZh']:
            if not isinstance(w.get(k),str) or not w.get(k).strip(): add('VOCAB_REQUIRED_FIELD',f"{loc}: missing/blank {k}")
        wid=w.get('wordId')
        if wid in seen: add('VOCAB_DUPLICATE_WORD_ID',f"Duplicate wordId: {wid}")
        if wid: seen.add(wid)
        if pack and w.get('packId')!=pack: add('VOCAB_PACK_ID_MISMATCH',f"{loc}: word.packId={w.get('packId')} != packId={pack}")
        ex=w.get('example'); exz=w.get('exampleZh')
        has_ex=isinstance(ex,str) and bool(ex.strip()); has_exz=isinstance(exz,str) and bool(exz.strip())
        if has_ex != has_exz: add('VOCAB_EXAMPLE_PAIR',f"{loc}: example/exampleZh must be supplied as a pair.")
        diff=w.get('difficulty')
        if diff is not None and (not isinstance(diff,int) or not (1<=diff<=5)): add('VOCAB_DIFFICULTY',f"{loc}: difficulty must be 1-5 or null.")
        sr=w.get('spellingRequired')
        if sr is not None and not isinstance(sr,bool): add('VOCAB_SPELLING_TYPE',f"{loc}: spellingRequired must be boolean.")
        sched=w.get('reviewScheduleDays')
        if sched is not None:
            if not isinstance(sched,list) or any(not isinstance(x,int) or x<0 for x in sched): add('VOCAB_REVIEW_SCHEDULE',f"{loc}: reviewScheduleDays must be nonnegative integers.")
        tags=w.get('tags')
        if tags is not None and (not isinstance(tags,list) or any(not isinstance(x,str) for x in tags)): add('VOCAB_TAGS_TYPE',f"{loc}: tags must be string array.")
    return issues

def validate_fixtures(fixtures:Path, report:Report):
    mp=fixtures/'fixture_manifest.json'; manifest=load_json(mp,report)
    if not isinstance(manifest,dict): return False
    reserved=set(manifest.get('reservedInstalledPackIds',[]))
    ok=True
    for entry in manifest.get('validFixtures',[]):
        p=fixtures/entry['file']; temp=Report(); d=load_json(p,temp)
        issues=temp.issues if d is None else validate_vocab_pack_data(d,str(p),reserved_pack_ids=reserved)
        # valid fixture should not conflict; only core pack is reserved and valid fixtures use other IDs
        if issues:
            ok=False; report.issue('ERROR','FIXTURE_VALID_REJECTED',str(p),f"Expected valid, got {[x.code for x in issues]}")
        elif isinstance(d,dict) and len(d.get('words',[]))!=entry['expectedWordCount']:
            ok=False; report.issue('ERROR','FIXTURE_COUNT_MISMATCH',str(p),f"Expected {entry['expectedWordCount']}, got {len(d.get('words',[]))}")
        report.check(f"fixture.valid.{entry['file']}",not issues)
    for entry in manifest.get('invalidFixtures',[]):
        p=fixtures/entry['file']; temp=Report(); d=load_json(p,temp)
        issues=temp.issues if d is None else validate_vocab_pack_data(d,str(p),reserved_pack_ids=reserved)
        codes={x.code for x in issues}; expected=entry['expectedErrorCode']; matched=expected in codes
        if not matched:
            ok=False; report.issue('ERROR','FIXTURE_INVALID_NOT_REJECTED',str(p),f"Expected {expected}, got {sorted(codes)}")
        report.check(f"fixture.invalid.{entry['file']}",matched,f"expected={expected}; got={sorted(codes)}")
    return ok

def render_report(report:Report,root:Path,fixtures:Path|None):
    status='PASS' if not report.errors else 'FAIL'
    payload={
      'validatorVersion':'1.0.0','status':status,'projectRoot':str(root),'fixturesRoot':str(fixtures) if fixtures else None,
      'summary':{'checks':len(report.checks),'checksPassed':sum(1 for x in report.checks if x['passed']),'errors':len(report.errors),'warnings':len(report.warnings)},
      'checks':report.checks,'issues':[asdict(x) for x in report.issues]
    }
    lines=[f"# Real Life Quest Content Validation Report",'',f"**Status: {status}**",'',f"- Checks: {payload['summary']['checks']}",f"- Passed: {payload['summary']['checksPassed']}",f"- Errors: {payload['summary']['errors']}",f"- Warnings: {payload['summary']['warnings']}",'', '## Checks']
    for c in report.checks: lines.append(f"- {'PASS' if c['passed'] else 'FAIL'} — `{c['name']}` {c['detail']}")
    lines += ['', '## Issues']
    if not report.issues: lines.append('- None')
    else:
        for x in report.issues: lines.append(f"- **{x.severity} {x.code}** — `{x.file}` — {x.message}")
    return payload,'\n'.join(lines)+'\n'

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--project-root',default='.',help='Real Life Quest repo root')
    ap.add_argument('--fixtures-root',default=None,help='A1 vocabulary fixtures directory')
    ap.add_argument('--report-dir',default=None,help='Write JSON/MD reports here')
    args=ap.parse_args()
    root=Path(args.project_root).resolve(); report=Report()
    required=[root/'02_DATA/core300_words_enriched.json',root/'02_DATA/thinking_stories_30.json',root/'02_DATA/reality_tasks_120.json',root/'02_DATA/exercise_task_cards_30.json',root/'02_DATA/chore_task_cards_30.json',root/'03_REWARDS_BOSSES/BOSSES_6.json',root/'03_REWARDS_BOSSES/REWARD_SYSTEM.json']
    missing=[str(p) for p in required if not p.exists()]
    if missing:
        for p in missing: report.issue('ERROR','PROJECT_FILE_MISSING',p,'Canonical file not found.')
    else:
        validate_core300(root,report); validate_stories(root,report); validate_tasks(root,report); validate_bosses(root,report); validate_rewards(root,report)
    fixtures=Path(args.fixtures_root).resolve() if args.fixtures_root else None
    fixture_ok=True
    if fixtures:
        if not fixtures.exists(): report.issue('ERROR','FIXTURE_DIR_MISSING',str(fixtures),'Fixture directory not found.'); fixture_ok=False
        else: fixture_ok=validate_fixtures(fixtures,report)
    payload,md=render_report(report,root,fixtures)
    print(md)
    if args.report_dir:
        rd=Path(args.report_dir); rd.mkdir(parents=True,exist_ok=True)
        (rd/'A1_A2_VALIDATION_REPORT.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (rd/'A1_A2_VALIDATION_REPORT.md').write_text(md,encoding='utf-8')
    if report.errors: return 1
    if not fixture_ok: return 2
    return 0

if __name__=='__main__': sys.exit(main())
