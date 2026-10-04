import { useState, useEffect } from "react";
import { ChevronRight, Flag, Pause, Pencil, Play, Plus, RotateCcw, SkipForward, Swords, Timer, Trash2, UserPlus, Users, X, Lightbulb } from "lucide-react";
import { Btn, IB, useAct, useDialog } from '../components/ui.jsx'
import { SK, clueProgress, elapsed, fmtTime, makePC, newSession, sortOrder, uid } from '../lib/data.js'

// ===== 세션 패널 =====
// 세션 진행 중 GM이 옆에 띄워 두는 도구: 타이머 · PC 상태 · 행동 순서 · 단서 획득 · 상태 플래그
// 상태는 시나리오의 sc.session / sc.pcs / sc.flags 에 저장되어 클라우드로도 동기화된다.

const FK=SK+'-sfold';
function useFold(){const[f,setF]=useState(()=>{try{return JSON.parse(localStorage.getItem(FK))||{}}catch(e){return{}}});
  return[f,id=>setF(v=>{const n={...v,[id]:!v[id]};try{localStorage.setItem(FK,JSON.stringify(n))}catch(e){}return n})]}
function Part({id,icon,title,extra,right,fold,children}){const closed=fold[0][id];
  return<section className="sp-sec">
    <div className="sp-head"><button className="sb-toggle" onClick={()=>fold[1](id)} aria-expanded={!closed}>
      <ChevronRight size={11} style={{transition:'transform .12s',transform:closed?'none':'rotate(90deg)'}}/>{icon}<span>{title}</span>{extra!=null&&<span className="sb-count">{extra}</span>}</button>{right}</div>
    {!closed&&children}</section>}

// 숫자 칸: 클릭해서 바로 고치기, 휠·화살표 없이 단순하게
const Num=({value,onChange,w=42,label})=><input className="sp-num" type="number" inputMode="numeric" aria-label={label} value={value} style={{width:w}}
  onChange={e=>onChange(e.target.value===''?'':+e.target.value)} onFocus={e=>e.target.select()}/>;

function TimerBox({t,set}){const[,tick]=useState(0);const run=!!t.startedAt;
  useEffect(()=>{if(!run)return;const i=setInterval(()=>tick(x=>x+1),1000);return()=>clearInterval(i)},[run]);
  return<div className="sp-timer">
    <Timer size={14} style={{color:run?'var(--green)':'var(--tx3)'}}/><span className="sp-clock" aria-live="off">{fmtTime(elapsed(t))}</span>
    <IB I={run?Pause:Play} s={14} title={run?'일시정지':'시작'} onClick={()=>set(x=>{x.timer=run?{acc:elapsed(x.timer),startedAt:null}:{acc:x.timer.acc||0,startedAt:Date.now()}})}/>
    <IB I={RotateCcw} s={13} title="타이머 초기화" onClick={()=>set(x=>{x.timer={acc:0,startedAt:null}})}/></div>}

function StatRow({st,onSet}){const pct=st.max?Math.max(0,Math.min(100,st.cur/st.max*100)):0;
  const col=pct<=25?'var(--red)':pct<=50?'var(--gold)':'var(--green)';
  return<div className="sp-stat">
    <span className="sp-stat-l" title={st.label}>{st.label}</span>
    <div className="sp-bar"><div style={{width:pct+'%',background:col}}/></div>
    <button className="sp-pm" onClick={()=>onSet(Math.max(0,(+st.cur||0)-1))} aria-label={st.label+' 1 감소'}>−</button>
    <Num value={st.cur} onChange={onSet} w={38} label={st.label+' 현재값'}/>
    <button className="sp-pm" onClick={()=>onSet((+st.cur||0)+1)} aria-label={st.label+' 1 증가'}>+</button>
    <span className="sp-max">/{st.max}</span></div>}

export function SessionPanel({sc,up,sel,setMdl,onClose}){
  const dlg=useDialog();const{removed,toast}=useAct();const fold=useFold();
  const uSc=fn=>up(d=>{fn(d.scenarios.find(x=>x.id===sel.sid))});
  const setS=fn=>uSc(s=>fn(s.session));
  const ss=sc.session;const order=sortOrder(ss.order);const cur=order[ss.turn]||null;
  const prog=clueProgress(sc);const foundN=Object.values(ss.found).filter(Boolean).length;

  const addPC=async()=>{const n=await dlg.prompt('PC 추가','',{placeholder:'캐릭터 이름'});if(!n)return;const pc=makePC(sc.statTemplate,n);uSc(s=>{s.pcs.push(pc)});setMdl({type:'pc',pcId:pc.id})};
  const setStat=(pcId,stId,v)=>uSc(s=>{const st=s.pcs.find(p=>p.id===pcId)?.stats.find(x=>x.id===stId);if(st)st.cur=v});
  const nextTurn=()=>setS(x=>{const n=x.order.length;if(!n)return;if(x.turn+1>=n){x.turn=0;x.round=(x.round||1)+1}else x.turn++});
  const addPCsToOrder=()=>setS(x=>{for(const pc of sc.pcs)if(!x.order.some(o=>o.pcId===pc.id))x.order.push({id:uid(),pcId:pc.id,name:pc.name,init:+pc.init||0});x.order=sortOrder(x.order)});
  const addEntry=async()=>{const n=await dlg.prompt('행동 순서에 추가','',{placeholder:'NPC·적 이름'});if(!n)return;setS(x=>{x.order.push({id:uid(),name:n,init:0});x.order=sortOrder(x.order)})};
  const addFlag=async()=>{const n=await dlg.prompt('새 플래그','',{placeholder:'예: 열쇠 획득, 경찰에 신고함'});if(!n)return;uSc(s=>{s.flags.push({id:uid(),name:n})})};
  const resetSession=async()=>{if(!await dlg.confirm('타이머 · 행동 순서 · 획득 단서 · 플래그 상태를 처음으로 되돌립니다.\nPC 수치는 그대로 둡니다.',{title:'새 세션 시작',okLabel:'초기화'}))return;
    removed('세션 진행 상태',()=>uSc(s=>{s.session=newSession()}))};
  const pcName=o=>o.pcId?(sc.pcs.find(p=>p.id===o.pcId)?.name||o.name):o.name;

  return<aside className="sp" aria-label="세션 패널">
    <div className="sp-top">
      <Swords size={14} style={{color:'var(--purple)'}}/><b>세션</b>
      <TimerBox t={ss.timer} set={setS}/>
      <IB I={RotateCcw} s={13} title="새 세션 시작 (진행 상태 초기화)" onClick={resetSession}/>
      {onClose&&<IB I={X} s={14} title="세션 패널 닫기" onClick={onClose}/>}
    </div>
    <div className="sp-body">
      {/* PC */}
      <Part id="pc" icon={<Users size={12}/>} title="PC" extra={sc.pcs.length} fold={fold} right={<IB I={UserPlus} s={13} title="PC 추가" onClick={addPC}/>}>
        {!sc.pcs.length&&<button className="sp-empty" onClick={addPC}>+ PC 추가 (HP·SAN 등 수치 관리)</button>}
        {sc.pcs.map(pc=><div key={pc.id} className="sp-pc">
          <div className="sp-pc-h"><span className="sp-pc-n">{pc.name||'(이름 없음)'}</span>{pc.player&&<span className="sp-pc-p">{pc.player}</span>}
            <span style={{flex:1}}/><IB I={Pencil} s={12} title="PC 편집" onClick={()=>setMdl({type:'pc',pcId:pc.id})}/>
            <IB I={Trash2} s={12} danger title="PC 삭제" onClick={()=>removed(`PC "${pc.name}"`,()=>uSc(s=>{s.pcs=s.pcs.filter(x=>x.id!==pc.id);s.session.order=s.session.order.filter(o=>o.pcId!==pc.id)}))}/></div>
          {pc.stats.map(st=><StatRow key={st.id} st={st} onSet={v=>setStat(pc.id,st.id,v)}/>)}
          {pc.notes&&<div className="sp-note">{pc.notes}</div>}
        </div>)}
      </Part>

      {/* 행동 순서 */}
      <Part id="init" icon={<SkipForward size={12}/>} title="행동 순서" extra={order.length?`${ss.round}라운드`:null} fold={fold}
        right={<span style={{display:'flex'}}><IB I={Users} s={13} title="PC 모두 넣기" onClick={addPCsToOrder}/><IB I={Plus} s={13} title="NPC·적 추가" onClick={addEntry}/></span>}>
        {!order.length?<div className="sp-hint">전투 등 차례가 필요할 때 <b>PC 모두 넣기</b>나 <b>+</b>로 추가하세요. 값이 높은 순서로 정렬됩니다.</div>:<>
          {order.map((o,i)=><div key={o.id} className={'sp-ord'+(i===ss.turn?' on':'')}>
            <span className="sp-ord-i">{i===ss.turn?'▶':i+1}</span><span className="sp-ord-n">{pcName(o)}{o.pcId&&<span className="sp-tag">PC</span>}</span>
            <Num value={o.init} w={44} label={pcName(o)+' 행동 순서 값'} onChange={v=>setS(x=>{const curId=sortOrder(x.order)[x.turn]?.id;const t=x.order.find(y=>y.id===o.id);t.init=v;x.order=sortOrder(x.order);const j=x.order.findIndex(y=>y.id===curId);if(j>=0)x.turn=j})}/>
            <IB I={X} s={12} danger title="빼기" onClick={()=>setS(x=>{const idx=sortOrder(x.order).findIndex(y=>y.id===o.id);x.order=x.order.filter(y=>y.id!==o.id);if(idx<x.turn)x.turn--;if(x.turn>=x.order.length)x.turn=0})}/></div>)}
          <div style={{display:'flex',gap:6,marginTop:6}}>
            <Btn small primary onClick={nextTurn} style={{flex:1,justifyContent:'center'}}><SkipForward size={11}/>다음 차례{cur?` (${pcName(order[(ss.turn+1)%order.length])})`:''}</Btn>
            <Btn small onClick={()=>setS(x=>{x.turn=0;x.round=1})} title="1라운드 처음으로">처음으로</Btn>
            <Btn small onClick={()=>setS(x=>{x.order=[];x.turn=0;x.round=1})} title="행동 순서 비우기">비우기</Btn></div></>}
      </Part>

      {/* 단서 획득 */}
      <Part id="clue" icon={<Lightbulb size={12}/>} title="단서 획득" extra={sc.clues.length?`${foundN}/${sc.clues.length}`:null} fold={fold}>
        {!sc.clues.length?<div className="sp-hint">사이드바 Clues에서 단서를 만들면 여기서 획득 여부를 체크할 수 있습니다.</div>
        :prog.map(g=>{const red=g.key==='__red',none=g.key==='__none';const need=3;
          return<div key={g.key} className="sp-cg">
            <div className="sp-cg-h"><span>{red?'미끼 단서':none?'결론 미지정':g.key}</span>
              {!red&&!none&&<span className={'sp-badge '+(g.found>=need?'ok':g.found>0?'mid':'no')} title={`획득 ${g.found} · 씬에 배치 ${g.placed} · 전체 ${g.clues.length}`}>{g.found}/{Math.max(need,g.clues.length)}</span>}</div>
            {!red&&!none&&<div className="sp-bar sp-cbar"><div style={{width:Math.min(100,g.found/need*100)+'%',background:g.found>=need?'var(--green)':'var(--gold)'}}/></div>}
            {g.clues.map(c=><label key={c.id} className="sp-chk"><input type="checkbox" checked={!!ss.found[c.id]} onChange={e=>{const v=e.target.checked;setS(x=>{x.found[c.id]=v})}}/>
              <span style={{textDecoration:ss.found[c.id]?'line-through':'none',opacity:ss.found[c.id]?.6:1}}>{c.name}</span></label>)}
          </div>})}
      </Part>

      {/* 플래그 */}
      <Part id="flag" icon={<Flag size={12}/>} title="상태 플래그" extra={sc.flags.length?`${sc.flags.filter(f=>ss.flags[f.id]).length}/${sc.flags.length}`:null} fold={fold} right={<IB I={Plus} s={13} title="플래그 추가" onClick={addFlag}/>}>
        {!sc.flags.length?<div className="sp-hint">"열쇠 획득", "경찰에 신고함" 같은 진행 상태를 만들어 두세요. 선택지 분기·엔딩에 필요한 플래그를 지정하면 충족 여부가 표시됩니다.</div>
        :sc.flags.map(f=><div key={f.id} className="sp-flag">
          <button role="switch" aria-checked={!!ss.flags[f.id]} className={'sw'+(ss.flags[f.id]?' on':'')} onClick={()=>setS(x=>{x.flags[f.id]=!x.flags[f.id]})}><span/></button>
          <span style={{flex:1,minWidth:0}}>{f.name}</span>
          <IB I={Pencil} s={11} title="이름 변경" onClick={async()=>{const n=await dlg.prompt('플래그 이름',f.name);if(n)uSc(s=>{s.flags.find(x=>x.id===f.id).name=n})}}/>
          <IB I={Trash2} s={11} danger title="플래그 삭제" onClick={()=>removed(`플래그 "${f.name}"`,()=>uSc(s=>{s.flags=s.flags.filter(x=>x.id!==f.id);delete s.session.flags[f.id]}))}/></div>)}
      </Part>
    </div>
  </aside>}
