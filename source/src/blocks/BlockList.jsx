import { useRef, useState, useEffect } from "react";
import { ArrowDown,ArrowUp,ChevronDown,ChevronUp,CopyPlus,GripVertical,ListIndentDecrease,ListIndentIncrease,Plus,Trash2 } from "lucide-react";
import { useDrop } from '../components/dnd.js'
import { Btn,IB,Inp,TA,useAct } from '../components/ui.jsx'
import { BT,moveIdx,uid } from '../lib/data.js'
import { SlashMenu } from './SlashMenu.jsx'
import { FlagPicker } from '../components/flags.jsx'

// ===== BLOCK LIST =====
export function BL({entry,upE,sc,plat,onManage}){
  const{over,src,dst}=useDrop();const refs=useRef({});const root=useRef(null);const{removed}=useAct();
  const moveB=(fromId,beforeId)=>{if(fromId===beforeId)return;upE(e=>{const i=e.blocks.findIndex(x=>x.id===fromId);const j=beforeId?e.blocks.findIndex(x=>x.id===beforeId):e.blocks.length;if(i>=0)moveIdx(e.blocks,i,j)})};
  // 블록 전체가 아닌 손잡이에서만 드래그 시작 (텍스트 선택 방해 방지)
  const grip=b=>{const g=src({kind:'block',id:b.id,owner:entry.id});return<span className="grip" title="끌어서 순서 변경" {...g}
    onDragStart={e=>{g.onDragStart(e);const el=refs.current[b.id];if(el)e.dataTransfer.setDragImage(el,10,10)}}><GripVertical size={13}/></span>};
  const acc=d=>d.kind==='block'&&d.owner===entry.id;
  const upB=(bid,fn)=>upE(e=>{const b=e.blocks.find(x=>x.id===bid);if(b)fn(b)});
  const addB=(type)=>{const nb={id:uid(),type,label:BT[type].l};
    if(['text','memo','truth','session-log','clue'].includes(type))nb.content='';if(type==='clue')nb.clueId='';
    if(['branches','checks','lines'].includes(type))nb.items=[];
    if(type==='npc'){nb.name='';nb.imageUrl='';nb.role='';nb.traits='';nb.lines=''}
    if(type==='handout'){nb.title='';nb.content='';nb.gmNote='';nb.imageUrl=''}
    if(type==='bgm'){nb.title='';nb.url='';nb.note=''}
    if(type==='item'||type==='place'){nb.name='';nb.imageUrl='';nb.description='';nb.gmNote=''}
    upE(e=>{e.blocks.push(nb)});return nb.id};
  // 새 블록으로 스크롤 + 첫 입력칸에 포커스
  const added=useRef(null);
  useEffect(()=>{const id=added.current;if(!id)return;added.current=null;const el=refs.current[id];if(el){el.scrollIntoView({block:'nearest',behavior:'smooth'});el.querySelector('textarea,input:not(.ghost)')?.focus()}});
  return<div ref={root}>
    <SlashMenu rootRef={root} cmds={plat?.commands||[]} colors={plat?.savedColors||[]} onManage={onManage}/>
    {entry.blocks.map((b,i)=>{const m=BT[b.type]||BT.text;
      if(b.collapsed)return<div key={b.id} ref={el=>refs.current[b.id]=el} {...dst(b.id,acc,d=>moveB(d.id,b.id))} className={'rail'+(over===b.id?' drag-over-top':'')} style={{marginBottom:8,borderLeftColor:m.c,opacity:.6,marginLeft:b.indent?28:0}}>
        <div className="rail-dot" style={{borderColor:m.c,top:6}}/>
        <div style={{display:'flex',alignItems:'center',gap:5}}>{grip(b)}
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',flex:1}}>// {b.label} <span style={{color:'var(--tx3)',fontSize:10}}>▸ 접힘</span></span>
          <IB I={ChevronDown} s={12} title="펼치기" onClick={()=>upB(b.id,x=>{x.collapsed=false})}/><IB I={CopyPlus} s={12} title="블록 복제" onClick={()=>upE(e=>{const cp=JSON.parse(JSON.stringify(b));cp.id=uid();cp.label+=' (복사)';e.blocks.splice(i+1,0,cp)})}/><IB I={Trash2} s={12} danger title="블록 삭제" onClick={()=>removed(`블록 "${b.label}"`,()=>upE(e=>{e.blocks=e.blocks.filter(x=>x.id!==b.id)}))}/>
        </div></div>;
      return<div key={b.id} ref={el=>refs.current[b.id]=el} {...dst(b.id,acc,d=>moveB(d.id,b.id))} className={'rail'+(over===b.id?' drag-over-top':'')} style={{marginBottom:16,borderLeftColor:m.c,marginLeft:b.indent?28:0}}>
        <div className="rail-dot" style={{borderColor:m.c}}/>
        <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:5}}>{grip(b)}
          <input className="ghost" aria-label="블록 이름" value={b.label} onChange={e=>upB(b.id,x=>{x.label=e.target.value})}
            style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,color:'var(--tx3)',border:'none',background:'transparent',padding:'1px 4px',flex:1,minWidth:0,outline:'none'}}/>
          <IB I={b.indent?ListIndentDecrease:ListIndentIncrease} s={12} title={b.indent?'들여쓰기 해제':'들여쓰기 (하위 내용 표시)'} onClick={()=>upB(b.id,x=>{x.indent=!x.indent})}/>
          <IB I={ChevronUp} s={12} onClick={()=>upB(b.id,x=>{x.collapsed=true})} title="접기"/>
          <IB I={ArrowUp} s={12} title="위로" disabled={i===0} onClick={()=>upE(e=>{[e.blocks[i-1],e.blocks[i]]=[e.blocks[i],e.blocks[i-1]]})}/>
          <IB I={ArrowDown} s={12} title="아래로" disabled={i===entry.blocks.length-1} onClick={()=>upE(e=>{[e.blocks[i],e.blocks[i+1]]=[e.blocks[i+1],e.blocks[i]]})}/>
          <IB I={CopyPlus} s={12} title="블록 복제" onClick={()=>upE(e=>{const cp=JSON.parse(JSON.stringify(b));cp.id=uid();cp.label+=' (복사)';e.blocks.splice(i+1,0,cp)})}/>
          <IB I={Trash2} s={12} danger title="블록 삭제" onClick={()=>removed(`블록 "${b.label}"`,()=>upE(e=>{e.blocks=e.blocks.filter(x=>x.id!==b.id)}))}/>
        </div>
        <BB b={b} upB={upB} sc={sc} upE={upE} i={i}/>
      </div>})}
    <div {...dst('end',acc,d=>moveB(d.id,null))} style={{marginTop:8,paddingTop:12,borderTop:over==='end'?'2px solid var(--blue)':'1px dashed var(--bdr)'}}>
      <AddBlock onAdd={t=>{added.current=addB(t)}}/>
    </div></div>}

// 블록 종류 설명 (추가 메뉴용)
const BDESC={text:'플레이어에게 읽어줄 지문',memo:'GM만 보는 메모',truth:'숨겨진 사실·배경',clue:'단서 목록과 연결',lines:'화자별 대사',branches:'플레이어 선택과 전개',
  checks:'대성공~대실패 결과',npc:'인물 카드',handout:'플레이어에게 주는 자료',bgm:'배경 음악 링크',item:'아이템 카드',place:'장소 카드','session-log':'세션 중 기록'};
const GMONLY=new Set(['memo','truth','clue','session-log']);
// "+ 블록 추가" 하나로 모은 메뉴
export function AddBlock({onAdd}){const[open,setOpen]=useState(false);const box=useRef();
  useEffect(()=>{if(!open)return;const h=e=>{if(!box.current?.contains(e.target))setOpen(false)};const k=e=>{if(e.key==='Escape')setOpen(false)};
    document.addEventListener('mousedown',h);document.addEventListener('keydown',k);return()=>{document.removeEventListener('mousedown',h);document.removeEventListener('keydown',k)}},[open]);
  return<div ref={box} style={{position:'relative',display:'inline-block'}}>
    <Btn onClick={()=>setOpen(!open)} aria-expanded={open} aria-haspopup="menu" style={{borderStyle:'dashed'}}><Plus size={12}/>블록 추가</Btn>
    {open&&<div role="menu" className="add-menu">
      {Object.entries(BT).map(([t,{l,c,I}])=><button key={t} role="menuitem" className="add-item" onClick={()=>{setOpen(false);onAdd(t)}}>
        <span className="add-ic" style={{color:c,borderColor:c}}><I size={13}/></span>
        <span style={{minWidth:0}}><b>{l}{GMONLY.has(t)&&<span className="add-gm">GM</span>}</b><small>{BDESC[t]}</small></span></button>)}
    </div>}</div>}

export function BB({b,upB,sc,upE,i}){
  const up=fn=>upB(b.id,fn);
  if(['text','memo','truth','session-log'].includes(b.type)){
    const bgMap={memo:'var(--goldA)',truth:'var(--coralA)','session-log':'var(--purpleA)'};
    return<TA value={b.content||''} onChange={v=>up(x=>{x.content=v})} placeholder={b.type==='memo'?'GM 전용 메모':b.type==='truth'?'사건의 진상':b.type==='session-log'?'세션 중 메모':'지문, 묘사...'} bg={bgMap[b.type]}/>}
  if(b.type==='clue')return<div>
    <select value={b.clueId||''} onChange={e=>up(x=>{x.clueId=e.target.value})} style={{width:'100%',padding:'5px 8px',border:'1px solid var(--bdr)',borderRadius:6,background:'var(--sf1)',color:'var(--tx1)',fontSize:12,marginBottom:5}}>
      <option value="">-- 단서 --</option>{(sc?.clues||[]).map(c=><option key={c.id} value={c.id}>{c.name}{c.isRedHerring?' (미끼)':''}</option>)}</select>
    <TA value={b.content||''} onChange={v=>up(x=>{x.content=v})} placeholder="단서 발견 상황" bg="var(--tealA)"/></div>;
  if(b.type==='npc')return<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf1)'}}>
    <div style={{display:'flex',gap:8,marginBottom:6}}>{b.imageUrl&&<img src={b.imageUrl} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover'}} onError={e=>{e.target.style.display='none'}}/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:4}}><Inp value={b.name||''} onChange={v=>up(x=>{x.name=v})} placeholder="이름" mono/><Inp value={b.role||''} onChange={v=>up(x=>{x.role=v})} placeholder="역할"/><Inp value={b.imageUrl||''} onChange={v=>up(x=>{x.imageUrl=v})} placeholder="이미지 URL"/></div></div>
    <TA value={b.traits||''} onChange={v=>up(x=>{x.traits=v})} placeholder="특징 (한 줄씩)" style={{marginTop:4}}/><TA value={b.lines||''} onChange={v=>up(x=>{x.lines=v})} placeholder="대사 (한 줄씩)" style={{marginTop:4}}/></div>;
  if(b.type==='handout')return<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf1)'}}>
    <Inp value={b.title||''} onChange={v=>up(x=>{x.title=v})} placeholder="핸드아웃 제목" style={{marginBottom:4}}/>
    <Inp value={b.imageUrl||''} onChange={v=>up(x=>{x.imageUrl=v})} placeholder="이미지 URL" style={{marginBottom:4}}/>
    {b.imageUrl&&<img src={b.imageUrl} style={{maxWidth:160,borderRadius:6,margin:'4px 0'}} onError={e=>{e.target.style.display='none'}}/>}
    <TA value={b.content||''} onChange={v=>up(x=>{x.content=v})} placeholder="내용"/><TA value={b.gmNote||''} onChange={v=>up(x=>{x.gmNote=v})} placeholder="GM 메모" bg="var(--goldA)" style={{marginTop:4}}/></div>;
  if(b.type==='bgm')return<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf1)'}}>
    <Inp value={b.title||''} onChange={v=>up(x=>{x.title=v})} placeholder="트랙 이름" style={{marginBottom:4}}/><Inp value={b.url||''} onChange={v=>up(x=>{x.url=v})} placeholder="URL" style={{marginBottom:4}}/><TA value={b.note||''} onChange={v=>up(x=>{x.note=v})} placeholder="메모"/></div>;
  if(b.type==='item'||b.type==='place')return<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf1)'}}>
    <Inp value={b.name||''} onChange={v=>up(x=>{x.name=v})} placeholder={b.type==='item'?'아이템':'장소'} style={{marginBottom:4}}/>
    <Inp value={b.imageUrl||''} onChange={v=>up(x=>{x.imageUrl=v})} placeholder="이미지 URL" style={{marginBottom:4}}/>
    <TA value={b.description||''} onChange={v=>up(x=>{x.description=v})} placeholder="설명"/><TA value={b.gmNote||''} onChange={v=>up(x=>{x.gmNote=v})} placeholder="GM 메모" bg="var(--goldA)" style={{marginTop:4}}/></div>;
  if(b.type==='branches'||b.type==='lines'){const tp=b.type;return<div>
    {(b.items||[]).map((it,ii)=><div key={it.id} style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,marginBottom:5,borderLeft:`3px solid ${tp==='branches'?'var(--blue)':'#c07030'}`}}>
      <div style={{display:'flex',gap:5,marginBottom:4}}><input className="ghost" value={it.label} onChange={e=>up(x=>{x.items[ii].label=e.target.value})} placeholder={tp==='branches'?'선택지':'화자'}
        style={{flex:1,border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontWeight:700,fontSize:12,padding:'2px 0',outline:'none',color:'var(--tx1)'}}/><IB I={Trash2} s={12} danger title="삭제" onClick={()=>up(x=>{x.items.splice(ii,1)})}/></div>
      <TA value={it.text} onChange={v=>up(x=>{x.items[ii].text=v})} placeholder={tp==='branches'?'전개':'대사'}/>
      {tp==='branches'&&<FlagPicker defs={sc?.flags} value={it.needs||[]} onChange={v=>up(x=>{x.items[ii].needs=v})}/>}</div>)}
    <Btn small onClick={()=>up(x=>{x.items.push({id:uid(),label:'',text:'',...(tp==='branches'?{needs:[]}:{})})})} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>{tp==='branches'?'분기':'대사'}</Btn></div>}
  if(b.type==='checks')return<div>
    {(b.items||[]).map((c,ci)=><div key={c.id} style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,marginBottom:5,borderLeft:'3px solid var(--red)'}}>
      <div style={{display:'flex',gap:5,marginBottom:4}}><input className="ghost" value={c.name} onChange={e=>up(x=>{x.items[ci].name=e.target.value})} placeholder="판정명"
        style={{flex:1,border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontWeight:700,fontSize:12,padding:'2px 0',outline:'none',color:'var(--tx1)'}}/><IB I={Trash2} s={12} danger title="삭제" onClick={()=>up(x=>{x.items.splice(ci,1)})}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
        {[['critSuccess','대성공','var(--goldA)','var(--gold)'],['success','성공','var(--greenA)','var(--green)'],['fail','실패','var(--sf2)','var(--tx4)'],['critFail','대실패','var(--redA)','var(--red)']].map(([k,lb,bg,cl])=>
          <div key={k}><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,color:cl}}>{lb}</span><TA value={c[k]||''} onChange={v=>up(x=>{x.items[ci][k]=v})} bg={bg}/></div>)}</div>
    </div>)}
    <Btn small onClick={()=>up(x=>{x.items.push({id:uid(),name:'',critSuccess:'',success:'',fail:'',critFail:''})})} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>판정</Btn></div>;
  return null}
