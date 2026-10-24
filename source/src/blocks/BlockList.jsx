import { useRef, useEffect, useState, memo } from "react";
import { ArrowDown,ArrowUp,ChevronDown,ChevronUp,CopyPlus,GripVertical,ListIndentDecrease,ListIndentIncrease,Plus,Trash2 } from "lucide-react";
import { useDrop } from '../components/dnd.js'
import { Btn,IB,Inp,TA,useAct } from '../components/ui.jsx'
import { BT,LIB_KIND,LIB_LABEL,libOf,libUses,moveIdx,newLibEntry,uid } from '../lib/data.js'
import { SlashMenu } from './SlashMenu.jsx'
import { QFillBtn } from '../modals/FillModal.jsx'
import { FlagPicker } from '../components/flags.jsx'

// ===== BLOCK LIST =====
export function BL({entry,upE,upSc,openLib,sc,plat,onManage}){
  const{over,src,dst}=useDrop();const refs=useRef({});const root=useRef(null);const{removed}=useAct();
  const moveB=(fromId,beforeId)=>{if(fromId===beforeId)return;upE(e=>{const i=e.blocks.findIndex(x=>x.id===fromId);const j=beforeId?e.blocks.findIndex(x=>x.id===beforeId):e.blocks.length;if(i>=0)moveIdx(e.blocks,i,j)})};
  // 블록 전체가 아닌 손잡이에서만 드래그 시작 (텍스트 선택 방해 방지)
  const grip=b=>{const g=src({kind:'block',id:b.id,owner:entry.id});return<span className="grip" title="끌어서 순서 변경" {...g}
    onDragStart={e=>{g.onDragStart(e);const el=refs.current[b.id];if(el)e.dataTransfer.setDragImage(el,10,10)}}><GripVertical size={13}/></span>};
  const acc=d=>d.kind==='block'&&d.owner===entry.id;
  const upB=(bid,fn)=>upE(e=>{const b=e.blocks.find(x=>x.id===bid);if(b)fn(b)});
  // at: 넣을 위치(없으면 맨 끝)
  const addB=(type,at)=>{const nb={id:uid(),type,label:BT[type].l};
    if(['text','memo','truth','session-log','clue'].includes(type))nb.content='';if(type==='clue')nb.clueId='';
    if(['branches','checks','lines'].includes(type))nb.items=[];
    if(LIB_KIND[type])nb.refId='';
    if(type==='handout'){nb.title='';nb.content='';nb.gmNote='';nb.imageUrl=''}
    if(type==='bgm'){nb.title='';nb.url='';nb.note=''}
    upE(e=>{if(at==null||at>=e.blocks.length)e.blocks.push(nb);else e.blocks.splice(at,0,nb)});return nb.id};
  const[ins,setIns]=useState(null); // 블록 사이 "+"를 눌러 연 위치
  // 새 블록으로 스크롤 + 첫 입력칸에 포커스
  const added=useRef(null);
  useEffect(()=>{const id=added.current;if(!id)return;added.current=null;const el=refs.current[id];if(el){el.scrollIntoView({block:'nearest',behavior:'smooth'});el.querySelector('.blk-b textarea,.blk-b input,.blk-b select')?.focus()}});
  const head=(b,i,m,collapsed)=><div className="blk-h">{grip(b)}
    <span className="blk-tag" style={{'--c':m.c}}><m.I size={12}/>
      <input aria-label="블록 이름" value={b.label} onChange={e=>upB(b.id,x=>{x.label=e.target.value})} size={Math.max(2,[...(b.label||'')].length*2)}/></span>
    {GMONLY.has(b.type)&&<span className="blk-gm">GM만</span>}
    {collapsed&&<span className="blk-fold">접힘</span>}
    <span style={{flex:1}}/>
    <span className="blk-acts">
      {!collapsed&&<IB I={b.indent?ListIndentDecrease:ListIndentIncrease} s={12} title={b.indent?'들여쓰기 해제':'들여쓰기 (하위 내용 표시)'} onClick={()=>upB(b.id,x=>{x.indent=!x.indent})}/>}
      <IB I={collapsed?ChevronDown:ChevronUp} s={12} onClick={()=>upB(b.id,x=>{x.collapsed=!collapsed})} title={collapsed?'펼치기':'접기'}/>
      {!collapsed&&<IB I={ArrowUp} s={12} title="위로" disabled={i===0} onClick={()=>upE(e=>{[e.blocks[i-1],e.blocks[i]]=[e.blocks[i],e.blocks[i-1]]})}/>}
      {!collapsed&&<IB I={ArrowDown} s={12} title="아래로" disabled={i===entry.blocks.length-1} onClick={()=>upE(e=>{[e.blocks[i],e.blocks[i+1]]=[e.blocks[i+1],e.blocks[i]]})}/>}
      <IB I={CopyPlus} s={12} title="블록 복제" onClick={()=>upE(e=>{const cp=JSON.parse(JSON.stringify(b));cp.id=uid();cp.label+=' (복사)';e.blocks.splice(i+1,0,cp)})}/>
      <IB I={Trash2} s={12} danger title="블록 삭제" onClick={()=>removed(`블록 "${b.label}"`,()=>upE(e=>{e.blocks=e.blocks.filter(x=>x.id!==b.id)}))}/>
    </span></div>;
  // 단축키 (블록 글 입력칸 안에서): Alt+↑/↓ 블록 옮기기 · Ctrl+Enter 아래에 같은 종류 블록 추가
  const onKey=e=>{const el=e.target.closest?.('[data-bid]');if(!el||e.nativeEvent.isComposing)return;const bid=el.getAttribute('data-bid');const i=entry.blocks.findIndex(x=>x.id===bid);if(i<0)return;
    if(e.altKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')){const j=e.key==='ArrowUp'?i-1:i+1;if(j<0||j>=entry.blocks.length)return;e.preventDefault();
      const t=e.target;upE(x=>{[x.blocks[i],x.blocks[j]]=[x.blocks[j],x.blocks[i]]});requestAnimationFrame(()=>{t.focus();t.closest('[data-bid]')?.scrollIntoView({block:'nearest'})})}
    else if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&e.target.tagName==='TEXTAREA'){e.preventDefault();added.current=addB(entry.blocks[i].type,i+1)}};
  return<div ref={root} onKeyDown={onKey}>
    <SlashMenu rootRef={root} cmds={plat?.commands||[]} colors={plat?.savedColors||[]} tpls={plat?.templates||[]} onManage={onManage}/>
    {entry.blocks.map((b,i)=>{const m=BT[b.type]||BT.text;
      return<div key={b.id} style={{display:'contents'}}>
      {i>0&&(ins===i?<div className="blk-insbox"><AddBlock onAdd={t=>{setIns(null);added.current=addB(t,i)}}/><button className="blk-inscancel" onClick={()=>setIns(null)}>닫기</button></div>
        :<div className="blk-ins"><button onClick={()=>setIns(i)} title="여기에 블록 넣기" aria-label={`${i}번째 블록 다음에 블록 넣기`}><Plus size={12}/>여기에 넣기</button></div>)}
      <div data-bid={b.id} ref={el=>refs.current[b.id]=el} {...dst(b.id,acc,d=>moveB(d.id,b.id))}
        className={'blk blk-'+b.type+(b.collapsed?' collapsed':'')+(over===b.id?' drag-over-top':'')} style={{marginLeft:b.indent?28:0}}>
        {head(b,i,m,b.collapsed)}
        {!b.collapsed&&<div className="blk-b"><BB b={b} upB={upB} sc={sc} upE={upE} upSc={upSc} openLib={openLib} i={i}/></div>}
      </div></div>})}
    <div {...dst('end',acc,d=>moveB(d.id,null))} className={'blk-end'+(over==='end'?' over':'')}>
      <AddBlock onAdd={t=>{added.current=addB(t)}}/>
    </div></div>}

// 블록 종류 설명 (추가 메뉴용)
const BDESC={text:'플레이어에게 읽어줄 지문',memo:'GM만 보는 메모',truth:'숨겨진 사실·배경',clue:'단서 목록과 연결',lines:'화자별 대사',branches:'플레이어 선택과 전개',
  checks:'대성공~대실패 결과',npc:'인물 카드',handout:'플레이어에게 주는 자료',bgm:'배경 음악 링크',item:'아이템 카드',place:'장소 카드','session-log':'세션 중 기록'};
const GMONLY=new Set(['memo','truth','clue','session-log']);
// 블록 추가: 자주 쓰는 종류를 버튼으로 늘어놓는다 (Desk)
const ADD_ORDER=['text','lines','checks','clue','branches','handout','bgm','npc','item','place','memo','truth','session-log'];
export function AddBlock({onAdd}){
  return<div className="add-row" role="group" aria-label="블록 추가"><span className="add-cap">추가</span>
    {ADD_ORDER.map(t=>{const{l,c,I}=BT[t];return<button key={t} className="add-chip" style={{'--c':c}} onClick={()=>onAdd(t)} title={BDESC[t]}>
      <I size={12}/>{l}{GMONLY.has(t)&&<span className="add-gm">GM</span>}</button>})}
    <span className="add-or">또는 글 입력 중 <kbd className="kbd">/</kbd></span></div>}

// 블록 내용: 이 블록과 단서·자료실·플래그가 그대로면 다시 그리지 않는다 (다른 블록에 타자 칠 때 빨라짐)
export const BB=memo(BB_,(a,b)=>a.b.refId===undefined&&a.b===b.b&&a.i===b.i&&a.sc?.clues===b.sc?.clues&&a.sc?.library===b.sc?.library&&a.sc?.flags===b.sc?.flags);
function BB_({b,upB,sc,upE,upSc,openLib,i}){
  const up=fn=>upB(b.id,fn);
  if(['text','memo','truth','session-log'].includes(b.type)){
    const bgMap={memo:'var(--goldA)',truth:'var(--coralA)','session-log':'var(--purpleA)'};
    return<><TA value={b.content||''} onChange={v=>up(x=>{x.content=v})} placeholder={b.type==='memo'?'GM 전용 메모':b.type==='truth'?'사건의 진상':b.type==='session-log'?'세션 중 메모':'지문, 묘사...'} bg={bgMap[b.type]}/><QFillBtn text={b.content} onApply={v=>up(x=>{x.content=v})}/></>}
  if(b.type==='clue')return<div>
    <select value={b.clueId||''} onChange={e=>up(x=>{x.clueId=e.target.value})} style={{width:'100%',padding:'5px 8px',border:'1px solid var(--bdr)',borderRadius:6,background:'var(--sf1)',color:'var(--tx1)',fontSize:12,marginBottom:5}}>
      <option value="">-- 단서 --</option>{(sc?.clues||[]).map(c=><option key={c.id} value={c.id}>{c.name}{c.isRedHerring?' (미끼)':''}</option>)}</select>
    <TA value={b.content||''} onChange={v=>up(x=>{x.content=v})} placeholder="단서 발견 상황" bg="var(--tealA)"/></div>;
  if(LIB_KIND[b.type])return<LibBlock b={b} up={up} sc={sc} upSc={upSc} openLib={openLib}/>;
  if(b.type==='handout')return<div className="blk-sub">
    <Inp value={b.title||''} onChange={v=>up(x=>{x.title=v})} placeholder="핸드아웃 제목" style={{marginBottom:4}}/>
    <Inp value={b.imageUrl||''} onChange={v=>up(x=>{x.imageUrl=v})} placeholder="이미지 URL" style={{marginBottom:4}}/>
    {b.imageUrl&&<img loading="lazy" decoding="async" src={b.imageUrl} style={{maxWidth:160,borderRadius:6,margin:'4px 0'}} onError={e=>{e.target.style.display='none'}}/>}
    <TA value={b.content||''} onChange={v=>up(x=>{x.content=v})} placeholder="내용"/><TA value={b.gmNote||''} onChange={v=>up(x=>{x.gmNote=v})} placeholder="GM 메모" bg="var(--goldA)" style={{marginTop:4}}/></div>;
  if(b.type==='bgm')return<div className="blk-sub">
    <Inp value={b.title||''} onChange={v=>up(x=>{x.title=v})} placeholder="트랙 이름" style={{marginBottom:4}}/><Inp value={b.url||''} onChange={v=>up(x=>{x.url=v})} placeholder="URL" style={{marginBottom:4}}/><TA value={b.note||''} onChange={v=>up(x=>{x.note=v})} placeholder="메모"/></div>;
  if(b.type==='branches'||b.type==='lines'){const tp=b.type;return<div>
    {(b.items||[]).map((it,ii)=><div key={it.id} className="blk-item">
      <div style={{display:'flex',gap:5,marginBottom:4}}><input className="ghost" value={it.label} onChange={e=>up(x=>{x.items[ii].label=e.target.value})} placeholder={tp==='branches'?'선택지':'화자'}
        style={{flex:1,border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontWeight:700,fontSize:12,padding:'2px 0',outline:'none',color:'var(--tx1)'}}/><IB I={Trash2} s={12} danger title="삭제" onClick={()=>up(x=>{x.items.splice(ii,1)})}/></div>
      <TA value={it.text} onChange={v=>up(x=>{x.items[ii].text=v})} placeholder={tp==='branches'?'전개':'대사'}/><QFillBtn text={it.text} onApply={v=>up(x=>{x.items[ii].text=v})}/>
      {tp==='branches'&&<FlagPicker defs={sc?.flags} value={it.needs||[]} onChange={v=>up(x=>{x.items[ii].needs=v})}/>}</div>)}
    <Btn small onClick={()=>up(x=>{x.items.push({id:uid(),label:'',text:'',...(tp==='branches'?{needs:[]}:{})})})} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>{tp==='branches'?'분기':'대사'}</Btn></div>}
  if(b.type==='checks')return<div>
    {(b.items||[]).map((c,ci)=><div key={c.id} className="blk-item">
      <div style={{display:'flex',gap:5,marginBottom:4}}><input className="ghost" value={c.name} onChange={e=>up(x=>{x.items[ci].name=e.target.value})} placeholder="판정명"
        style={{flex:1,border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontWeight:700,fontSize:12,padding:'2px 0',outline:'none',color:'var(--tx1)'}}/><IB I={Trash2} s={12} danger title="삭제" onClick={()=>up(x=>{x.items.splice(ci,1)})}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
        {[['critSuccess','대성공','var(--goldA)','var(--gold)'],['success','성공','var(--greenA)','var(--green)'],['fail','실패','var(--sf2)','var(--tx4)'],['critFail','대실패','var(--redA)','var(--red)']].map(([k,lb,bg,cl])=>
          <div key={k}><span style={{fontFamily:'var(--f-label)',fontSize:10,fontWeight:700,color:cl}}>{lb}</span><TA value={c[k]||''} onChange={v=>up(x=>{x.items[ci][k]=v})} bg={bg}/></div>)}</div>
    </div>)}
    <Btn small onClick={()=>up(x=>{x.items.push({id:uid(),name:'',critSuccess:'',success:'',fail:'',critFail:''})})} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>판정</Btn></div>;
  return null}

// NPC · 아이템 · 장소 블록: 자료실 항목을 골라 연결하고, 여기서 고치면 자료실 항목이 바뀐다
function LibBlock({b,up,sc,upSc,openLib}){
  const kind=LIB_KIND[b.type];const e=libOf(sc,b);const list=sc?.library?.[kind]||[];const L=LIB_LABEL[kind];
  const pick=<select value="" aria-label={L+' 고르기'} onChange={ev=>{const v=ev.target.value;if(!v)return;
      if(v==='__new'){const ne=newLibEntry(kind);upSc(s=>{s.library[kind].push(ne)});up(x=>{x.refId=ne.id})}else up(x=>{x.refId=v})}}>
    <option value="">{e?'다른 항목으로 바꾸기…':`자료실에서 ${L} 고르기…`}</option>
    {list.filter(x=>x.id!==e?.id).map(x=><option key={x.id} value={x.id}>{x.name||'(이름 없음)'}</option>)}
    <option value="__new">+ 새 {L} 만들기</option></select>;
  if(!e)return<div className="lib-pick">{pick}<span>자료실의 {L}를 고르면 여기와 자료실이 같은 내용을 함께 씁니다.</span></div>;
  const ue=fn=>upSc(s=>{const x=s.library[kind].find(y=>y.id===e.id);if(x)fn(x)});
  const uses=libUses(sc)[e.id]||[];
  return<div className="lib-blk">
    <div className="lib-row">{e.imageUrl&&<img loading="lazy" decoding="async" src={e.imageUrl} alt="" className="lib-img" onError={ev=>{ev.target.style.display='none'}}/>}
      <div className="lib-f"><Inp value={e.name||''} onChange={v=>ue(x=>{x.name=v})} placeholder={L+' 이름'} aria-label={L+' 이름'}/>
        {kind==='npcs'&&<Inp value={e.role||''} onChange={v=>ue(x=>{x.role=v})} placeholder="역할 (예: 등대지기의 아들)"/>}
        <Inp value={e.imageUrl||''} onChange={v=>ue(x=>{x.imageUrl=v})} placeholder="이미지 URL (선택)"/></div></div>
    {kind==='npcs'?<><TA value={e.traits||''} onChange={v=>ue(x=>{x.traits=v})} placeholder="특징 (한 줄씩)"/><TA value={e.lines||''} onChange={v=>ue(x=>{x.lines=v})} placeholder="대사 (한 줄씩 — 세션 화면에서 줄마다 복사)"/></>
      :<TA value={e.description||''} onChange={v=>ue(x=>{x.description=v})} placeholder="설명 (플레이어에게 보여줄 내용)"/>}
    <TA value={e.gmNote||''} onChange={v=>ue(x=>{x.gmNote=v})} placeholder="GM 메모 (플레이어에게 숨김)" bg="var(--goldA)"/>
    <div className="lib-foot"><span>자료실 항목 · {uses.length}곳에서 사용{uses.length>1?' — 여기서 고치면 모두 바뀌어요':''}</span>
      <button onClick={()=>openLib?.(kind,e.id)}>자료실에서 보기</button>{pick}</div>
  </div>}
