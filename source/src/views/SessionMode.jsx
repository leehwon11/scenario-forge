import { useEffect, useMemo, useRef, useState } from "react";
import { Check,ChevronLeft,ChevronRight,Copy,Dice5,ExternalLink,Eye,EyeOff,Flag,GitBranch,Lightbulb,Music,PictureInPicture2,Pin,RotateCcw,X } from "lucide-react";
import { CopyBtn,Lines,copyText,useAct } from '../components/ui.jsx'
import { allScenes,findTarget,mdR } from '../lib/data.js'
import { parseQueries } from '../lib/rollkku.js'
import { colorCode } from '../components/CmdBar.jsx'
import { FlagStatus } from '../components/flags.jsx'
import { SessionPanel } from './SessionPanel.jsx'
import { isAudio,ytId } from './PlayView.jsx'

// ===== 세션 화면 (Desk "미니 창") =====
// 롤20·코코포리아 옆에 띄워 두고 쓰는 진행 화면. 읽어 줄 줄을 번호 순서로 보여 주고,
// 누르면 복사 + "보냄" 표시, Space로 다음 줄 복사, ← → 로 씬 넘기기.
// 큰 창 안에서도, 브라우저가 지원하면 늘 위에 떠 있는 미니 창(win)에서도 같은 화면을 쓴다.

const GMONLY=['memo','truth','session-log'];
// 읽어 줄 줄: 나레이션 · 대사 · NPC 대사 (블록 순서대로)
export function readLines(entry,isR20){const out=[];
  const as=(who,l)=>isR20&&who?`/as "${who}" ${l}`:l;
  for(const b of entry.blocks||[]){
    if(b.type==='text')(b.content||'').split('\n').forEach((l,i)=>{if(l.trim())out.push({key:`${b.id}:${i}`,text:l,copy:l})});
    if(b.type==='lines')for(const it of b.items||[])(it.text||'').split('\n').forEach((l,i)=>{if(l.trim())out.push({key:`${b.id}:${it.id}:${i}`,who:it.label,text:l,copy:as(it.label,l)})});
    if(b.type==='npc')(b.lines||'').split('\n').forEach((l,i)=>{if(l.trim())out.push({key:`${b.id}:n${i}`,who:b.name,text:l,copy:as(b.name,l)})})}
  return out}

const isField=el=>el&&(el.tagName==='TEXTAREA'||el.tagName==='SELECT'||(el.tagName==='INPUT'&&!['checkbox','button'].includes(el.type))||el.isContentEditable);

export function SessionMode({sc,plat,sel,go,up,gm,setGm,setMdl,onEnd,win,pip,onPip,canPip}){
  const{useCode}=useAct();
  const W=win||window;
  const[tab,setTab]=useState('run');const[flash,setFlash]=useState(null);const ft=useRef();
  const isR20=/roll20/i.test(plat?.name||'');
  const flat=useMemo(()=>allScenes(sc),[sc]);
  const scene=sel.scid?flat.find(s=>s.id===sel.scid):null;
  const ending=sel.eid?sc.endings.find(e=>e.id===sel.eid):null;
  const entry=scene||ending||flat[0]||sc.endings[0]||null;
  const idx=scene?flat.findIndex(s=>s.id===scene.id):-1;
  const ss=sc.session;const sent=ss.sent||{};
  const uSc=fn=>up(d=>{fn(d.scenarios.find(x=>x.id===sel.sid))});
  const setS=fn=>uSc(s=>fn(s.session));
  const goScene=s=>go({pid:sel.pid,sid:sel.sid,ptid:s.ptid,scid:s.id,eid:null});
  const goT=t=>t.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:t.ptid,scid:t.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:t.id});
  // 처음 열었을 때 씬이 안 골라져 있으면 첫 씬으로
  useEffect(()=>{if(!scene&&!ending&&entry){if(flat[0])goScene(flat[0]);else goT({kind:'ending',id:entry.id})}},[]);

  const lines=entry?readLines(entry,isR20):[];
  const next=lines.find(l=>!sent[l.key]);
  const say=t=>{setFlash(t);clearTimeout(ft.current);ft.current=setTimeout(()=>setFlash(null),1400)};
  const copyLine=async l=>{if(await copyText(l.copy)){setS(x=>{x.sent={...(x.sent||{}),[l.key]:true}});say('복사했어요 — 채팅창에 붙여넣으세요')}else say('복사하지 못했어요')};
  const prev=idx>0?flat[idx-1]:null;const nextSc=idx>=0&&idx<flat.length-1?flat[idx+1]:null;
  const goNext=()=>{if(!nextSc)return;if(scene&&!scene.done)uSc(s=>{s.parts.find(p=>p.id===scene.ptid).scenes.find(x=>x.id===scene.id).done=true});goScene(nextSc)};
  const big=()=>{if(next)copyLine(next);else if(nextSc)goNext()};

  // 키보드: Space 다음 줄 · ← → 씬 이동 (글 입력 중·대화상자가 열려 있을 때는 무시)
  useEffect(()=>{const h=e=>{if(isField(e.target)||e.ctrlKey||e.metaKey||e.altKey||W.document.querySelector('[role=dialog]')||document.querySelector('[role=dialog]'))return;
    if(e.key===' '&&tab==='run'){e.preventDefault();big()}
    else if(e.key==='ArrowRight'&&nextSc){e.preventDefault();goNext()}
    else if(e.key==='ArrowLeft'&&prev){e.preventDefault();goScene(prev)}};
    W.addEventListener('keydown',h);return()=>W.removeEventListener('keydown',h)});

  if(!entry)return<section className="ss"><div className="ss-empty">진행할 씬이 없어요. 먼저 집필 화면에서 씬을 만들어 주세요.
    <button className="ss-end" onClick={onEnd}>집필로 돌아가기</button></div></section>;

  const blocks=(entry.blocks||[]).filter(b=>gm||!GMONLY.includes(b.type)&&b.type!=='clue');
  const of=t=>blocks.filter(b=>t.includes(b.type));
  const checks=of(['checks']).flatMap(b=>b.items||[]);
  const clues=of(['clue']);const mats=of(['handout','item','place','npc','bgm']);const gms=gm?of(GMONLY):[];
  const branches=of(['branches']).flatMap(b=>b.items||[]);
  const targets=(entry.connections||[]).map(c=>findTarget(sc,c.targetSceneId)).filter(Boolean);
  const order=[...ss.order].sort((a,b)=>(+b.init||0)-(+a.init||0));const cur=order[ss.turn];
  const foundN=sc.clues.filter(c=>ss.found[c.id]).length;const flagN=sc.flags.filter(f=>ss.flags[f.id]).length;
  const nd=e=>e.preventDefault();
  const chip=(code,label)=>{if(win&&parseQueries(code).length){say('채우기 칸이 있는 템플릿은 큰 창에서 써 주세요');return}
    if(!parseQueries(code).length){copyText(code).then(ok=>say(ok?`"${label}" 복사했어요`:'복사하지 못했어요'));return}useCode(code,label)};
  const sentN=lines.filter(l=>sent[l.key]).length;

  return<section className={'ss'+(pip?' ss-pip':'')} aria-label="세션 진행">
    <div className="ss-top">
      <span className="ss-live"><i/>세션 중</span><span className="ss-name">{sc.title}</span><span style={{flex:1}}/>
      <button className={'ss-gm'+(gm?' on':'')} onClick={()=>setGm(!gm)} aria-pressed={gm} title={gm?'GM 정보 보이는 중 — 누르면 숨김':'GM 정보 숨김 — 누르면 보임'}>{gm?<Eye size={12}/>:<EyeOff size={12}/>}GM</button>
      {canPip&&!pip&&<button className="ss-ib" onClick={onPip} title="롤20 위에 늘 떠 있는 미니 창으로 띄우기"><PictureInPicture2 size={14}/><span className="hide-m">미니 창</span></button>}
      {pip&&<span className="ss-pin"><Pin size={11}/>항상 위</span>}
      <button className="ss-ib" onClick={onEnd} title={pip?'미니 창 닫기':'세션 화면 닫고 집필로'} aria-label="세션 화면 닫기"><X size={14}/></button>
    </div>

    <div className="ss-sc">
      <div className="ss-sc-r">
        <button className="ss-arr" disabled={!prev} onClick={()=>prev&&goScene(prev)} aria-label="이전 씬" title={prev?'← '+prev.title:''}><ChevronLeft size={15}/></button>
        <div className="ss-sc-t">
          <small>{scene?`SCENE ${String(idx+1).padStart(2,'0')}${scene.timeOfDay?' · '+scene.timeOfDay:''}`:'ENDING'}</small>
          <h1>{entry.title||'(제목 없음)'}</h1>
          {scene&&(scene.location||scene.npcsPresent)&&<div className="ss-sc-m">{[scene.location,scene.npcsPresent].filter(Boolean).join(' · ')}</div>}
        </div>
        <button className="ss-arr" disabled={!nextSc} onClick={goNext} aria-label="다음 씬" title={nextSc?nextSc.title+' → (이 씬은 완료로 표시)':''}><ChevronRight size={15}/></button>
      </div>
      <div className="ss-tabs" role="tablist">
        {[['run','진행'],['init','행동 순서'],['clue',`단서 ${foundN}/${sc.clues.length}`],['flag',`플래그 ${flagN}/${sc.flags.length}`]].map(([k,l])=>
          <button key={k} role="tab" aria-selected={tab===k} onClick={()=>setTab(k)}>{l}</button>)}
      </div>
    </div>

    <div className="ss-list">
      {tab!=='run'?<SessionPanel sc={sc} up={up} sel={sel} setMdl={setMdl} only={tab}/>:<>
        {ending&&(ending.condition||ending.needs?.length>0)&&<div className="ss-cond"><b>도달 조건</b>{ending.condition&&<div>{ending.condition}</div>}
          <FlagStatus defs={sc.flags} needs={ending.needs} state={ss.flags} onToggle={id=>setS(x=>{x.flags[id]=!x.flags[id]})}/></div>}

        {lines.length>0&&<div className="ss-lb">읽어 줄 것<span>{sentN}/{lines.length} 보냄</span>
          <CopyBtn text={lines.map(l=>l.copy).join('\n')} label="전체 복사" title="읽어 줄 줄 전체 복사"/>
          {sentN>0&&<button onClick={()=>setS(x=>{const n={...(x.sent||{})};for(const l of lines)delete n[l.key];x.sent=n})} title="이 씬의 보냄 표시 지우기"><RotateCcw size={11}/></button>}</div>}
        {lines.map((l,i)=>{const st=sent[l.key]?' sent':l===next?' next':'';
          return<button key={l.key} className={'ss-ln'+st} onClick={()=>copyLine(l)}>
            <span className="ss-n">{i+1}</span>
            <span className="ss-t">{l.who&&<span className="ss-w">{l.who}</span>}<span dangerouslySetInnerHTML={{__html:mdR(l.text)}}/></span>
            <span className="ss-c">{sent[l.key]?<><Check size={11}/>보냄</>:l===next?'다음':'복사'}</span></button>})}

        {checks.length>0&&<div className="ss-lb">판정</div>}
        {checks.map(c=><details key={c.id} className="ss-rl">
          <summary><span className="ss-d"><Dice5 size={15}/></span><span className="ss-rl-t"><b>{c.name||'(판정)'}</b><small>{[c.success&&'성공',c.fail&&'실패'].filter(Boolean).join(' · ')||'결과를 눌러서 보기'}</small></span><span className="ss-cp">결과 보기</span></summary>
          {[['대성공',c.critSuccess,'var(--gold)'],['성공',c.success,'var(--green)'],['실패',c.fail,'var(--tx3)'],['대실패',c.critFail,'var(--red)']].map(([lb,v,cl])=>v?<div key={lb} className="ss-res"><span style={{color:cl}}>{lb}</span><Lines text={v}/></div>:null)}
        </details>)}

        {clues.length>0&&<div className="ss-lb">단서</div>}
        {clues.map(b=>{const cl=sc.clues.find(c=>c.id===b.clueId);return<div key={b.id} className="ss-card">
          <div className="ss-card-h"><Lightbulb size={13} style={{color:'var(--teal)'}}/><b>{cl?.name||'(단서 미지정)'}</b>{cl?.isRedHerring&&<span className="ss-tag red">미끼</span>}{cl?.leadsTo&&!cl.isRedHerring&&<small>→ {cl.leadsTo}</small>}
            <span style={{flex:1}}/>{cl&&<button className={'found-btn'+(ss.found[cl.id]?' on':'')} onClick={()=>setS(x=>{x.found[cl.id]=!x.found[cl.id]})} aria-pressed={!!ss.found[cl.id]}>{ss.found[cl.id]?'✓ 획득함':'획득 표시'}</button>}</div>
          {b.content&&<Lines text={b.content}/>}</div>})}

        {mats.length>0&&<div className="ss-lb">자료</div>}
        {mats.map(b=>{
          if(b.type==='npc')return<div key={b.id} className="ss-card"><div className="ss-card-h"><b>{b.name||'NPC'}</b>{b.role&&<small>{b.role}</small>}<span style={{flex:1}}/>{b.name&&<CopyBtn text={b.name} label="이름"/>}</div>
            {b.traits&&<ul className="ss-ul">{b.traits.split('\n').filter(l=>l.trim()).map((t,i)=><li key={i}>{t}</li>)}</ul>}</div>;
          if(b.type==='bgm')return<div key={b.id} className="ss-card"><div className="ss-card-h"><Music size={13} style={{color:'var(--coral)'}}/><b>{b.title||'BGM'}</b><span style={{flex:1}}/>
            {b.url&&<CopyBtn text={b.url} label="링크"/>}{/^https?:\/\//i.test(b.url||'')&&<a className="ss-a" href={b.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={11}/>열기</a>}</div>
            {ytId(b.url)&&<details className="ss-yt"><summary>▶ 여기서 재생</summary><div className="ss-ytbox"><iframe src={`https://www.youtube-nocookie.com/embed/${ytId(b.url)}`} title={b.title||'BGM'} allow="autoplay; encrypted-media" allowFullScreen loading="lazy"/></div></details>}
            {!ytId(b.url)&&isAudio(b.url)&&<audio controls src={b.url} style={{width:'100%',marginTop:6}}/>}{b.note&&<div className="ss-note">{b.note}</div>}</div>;
          const title=b.type==='handout'?(b.title||'핸드아웃'):(b.name||(b.type==='item'?'아이템':'장소'));const body=b.type==='handout'?b.content:b.description;
          return<div key={b.id} className="ss-card"><div className="ss-card-h"><b>{title}</b><small>{b.type==='handout'?'핸드아웃':b.type==='item'?'아이템':'장소'}</small><span style={{flex:1}}/>{body&&<CopyBtn text={body} label="전체"/>}</div>
            {b.imageUrl&&<img src={b.imageUrl} alt="" className="ss-img" onError={e=>{e.target.style.display='none'}}/>}
            {body&&<Lines text={body}/>}{gm&&b.gmNote&&<div className="ss-sec"><b>GM만</b>{b.gmNote}</div>}</div>})}

        {gms.map(b=><div key={b.id} className="ss-sec"><b>GM만 · {b.label||'메모'}</b><Lines text={b.content}/></div>)}

        {(branches.length>0||targets.length>0)&&<div className="ss-lb">탐사자가 고르면</div>}
        {branches.length>0&&<div className="ss-chs">{branches.map(it=><div key={it.id} className="ss-ch"><b><GitBranch size={12}/>{it.label||'(선택지)'}</b>{it.text&&<div className="ss-chx"><Lines text={it.text}/></div>}
          <FlagStatus defs={sc.flags} needs={it.needs} state={ss.flags} onToggle={id=>setS(x=>{x.flags[id]=!x.flags[id]})}/></div>)}</div>}
        {targets.length>0&&<div className="ss-go">{targets.map(t=><button key={t.id} onClick={()=>{if(scene&&!scene.done)uSc(s=>{s.parts.find(p=>p.id===scene.ptid).scenes.find(x=>x.id===scene.id).done=true});goT(t)}} className={t.kind==='ending'?'end':''}>
          {t.kind==='ending'?<Flag size={12}/>:<ChevronRight size={12}/>}{t.title}</button>)}</div>}

        {!lines.length&&!checks.length&&!clues.length&&!mats.length&&!gms.length&&!branches.length&&<div className="ss-empty">이 {scene?'씬':'엔딩'}에는 아직 내용이 없어요.</div>}
      </>}
    </div>

    <div className="ss-ft">
      {plat&&<div className="ss-chips">
        {(plat.commands||[]).map(c=><button key={c.id} className="ss-chip" onMouseDown={nd} onClick={()=>chip(c.s||'',c.l)} title={c.s}>{c.l}</button>)}
        {(plat.savedColors||[]).map(h=><button key={h} className="ss-chip" onMouseDown={nd} onClick={()=>chip(colorCode(h),h)} title={h+' 글자색'}><i style={{background:h}}/>{h}</button>)}
        {(plat.templates||[]).map(t=><button key={t.id} className="ss-chip" onMouseDown={nd} onClick={()=>chip(t.code,t.name)}>✦ {t.name}</button>)}
      </div>}
      <div className="ss-st">
        <button onClick={()=>setTab('init')}><b>{cur?cur.name+' ▶':'—'}</b>{order.length?`${ss.round}라운드`:'행동 순서'}</button>
        <button onClick={()=>setTab('clue')}><b>{foundN} / {sc.clues.length}</b>단서</button>
        <button onClick={()=>setTab('flag')}><b>{flagN} / {sc.flags.length}</b>플래그</button>
      </div>
      {flash&&<div className="ss-flash" role="status">{flash}</div>}
      <button className="ss-big" onClick={big} disabled={!next&&!nextSc}>
        {next?<>다음 줄 복사 <kbd>Space</kbd></>:nextSc?<>다음 씬으로 — {nextSc.title} <ChevronRight size={14}/></>:<><Copy size={13}/>읽어 줄 줄을 모두 보냈어요</>}</button>
    </div>
  </section>}
