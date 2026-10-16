import { Play } from "lucide-react";
import { allScenes,clueUsage } from '../lib/data.js'
import { conclusions,flagIssues,sessionAssets } from '../lib/check.js'
import { LV_C } from '../components/Nav.jsx'

// ===== 오른쪽 "준비 점검" 칸 (Desk) =====
export function CheckPanel({sc,plat,issues,go,sel,setMdl,onStart}){
  const flat=allScenes(sc);const base={pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:null};
  const probs=[...flat.map(s=>({kind:'scene',s,is:issues[s.id]})),...sc.endings.map(e=>({kind:'ending',s:e,is:issues[e.id]}))].filter(x=>x.is&&x.is.lv!=='ok');
  const okN=flat.filter(s=>issues[s.id]?.lv==='ok').length;
  const conc=conclusions(sc);const concOk=conc.filter(c=>c.placed>=3).length;
  const use=clueUsage(sc);const unplaced=sc.clues.filter(c=>!use[c.id]);
  const fl=flagIssues(sc);const as=sessionAssets(sc,plat);
  const open=x=>go(x.kind==='scene'?{...base,ptid:x.s.ptid,scid:x.s.id}:{...base,eid:x.s.id});
  const tone=(a,b)=>a>=b?'ok':a>0?'warn':'bad';
  return<aside className="chk" aria-label="준비 점검">
    <h3>준비 점검</h3>
    <div className="chk-sub">세션 전에 빠진 곳을 알려줘요</div>

    <section className="chk-cd"><h6>씬 완성도 <span className={'t-'+tone(okN,flat.length)}>{okN} / {flat.length}</span></h6>
      {!flat.length&&<div className="chk-nt">아직 씬이 없어요</div>}
      {probs.slice(0,8).map(x=>x.is.notes.map((n,i)=><div key={x.s.id+i} className="chk-nt">
        <i style={{background:LV_C[n.lv]}}/><span><b>{x.s.title||'(제목 없음)'}</b> — {n.t}</span><button className="chk-fix" onClick={()=>open(x)}>열기</button></div>))}
      {probs.length>8&&<div className="chk-nt muted">그 밖에 {probs.length-8}곳 더</div>}
      {flat.length>0&&!probs.length&&<div className="chk-nt"><i style={{background:LV_C.ok}}/><span>모든 씬과 엔딩이 이어져 있어요</span></div>}
    </section>

    <section className="chk-cd"><h6>3단서 법칙 <span className={'t-'+(conc.length?tone(concOk,conc.length):'muted')}>{conc.length?`${concOk} / ${conc.length} 충족`:'-'}</span></h6>
      {!conc.length&&<div className="chk-nt muted">단서에 "연결 결론"을 적으면 결론마다 단서가 3개 이상 배치됐는지 확인해요</div>}
      {conc.map(c=><div key={c.key} className="chk-row" title={`배치 ${c.placed}개 / 전체 ${c.all}개`}><span className="chk-rl">{c.key}</span>
        <span className="chk-b"><i style={{width:Math.min(100,c.placed/3*100)+'%',background:c.placed>=3?'var(--green)':'var(--gold)'}}/></span><span className="chk-v">{c.placed}</span></div>)}
      {unplaced.length>0&&<div className="chk-nt"><i style={{background:LV_C.warn}}/><span>씬에 배치 안 된 단서 {unplaced.length}개: {unplaced.slice(0,3).map(c=>c.name).join(', ')}{unplaced.length>3?' …':''}</span>
        <button className="chk-fix" onClick={()=>go(base)}>보기</button></div>}
    </section>

    <section className="chk-cd"><h6>플래그 · 분기 <span className={'t-'+(fl.missing?'bad':fl.unused.length?'warn':'ok')}>{fl.missing?'확인 필요':fl.unused.length?'안 쓰는 플래그':'문제 없음'}</span></h6>
      {!sc.flags.length&&<div className="chk-nt muted">세션 패널에서 "열쇠 획득" 같은 플래그를 만들고 분기·엔딩 조건으로 지정할 수 있어요</div>}
      {fl.missing>0&&<div className="chk-nt"><i style={{background:LV_C.bad}}/><span>지워진 플래그를 조건으로 쓰는 곳이 {fl.missing}군데 있어요</span></div>}
      {fl.unused.length>0&&<div className="chk-nt"><i style={{background:LV_C.warn}}/><span>조건으로 안 쓰인 플래그: {fl.unused.map(f=>f.name).join(', ')}</span></div>}
      {sc.flags.length>0&&!fl.missing&&!fl.unused.length&&<div className="chk-nt"><i style={{background:LV_C.ok}}/><span>플래그 {sc.flags.length}개 모두 조건으로 쓰이고 있어요</span></div>}
    </section>

    <section className="chk-cd"><h6>세션에 쓸 것</h6>
      <div className="chk-assets">
        <button onClick={()=>setMdl('tpl')}><b>{as.tpl}</b>롤꾸 템플릿</button>
        <span><b>{as.bgm}</b>BGM</span><span><b>{as.handouts}</b>핸드아웃</span><span><b>{as.npcs}</b>NPC</span></div>
    </section>

    <div className="chk-play"><span><b>세션 준비 끝?</b><small>롤20·코코포리아 옆에 띄워 두고 진행해요</small></span>
      <button onClick={onStart}><Play size={12} fill="currentColor"/>시작</button></div>
  </aside>}
