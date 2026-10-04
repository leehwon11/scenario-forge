import { useEffect, useCallback, useRef } from "react";
import { BL } from '../blocks/BlockList.jsx'
import { allScenes,findTarget } from '../lib/data.js'
import { CocoP,R20P } from './ChatPreview.jsx'
import { PlayV } from './PlayView.jsx'

// ===== SCENE PANEL =====
export function SceneP({scene,pt,sc,plat,mode,gm,up,sel,toast,isR20,isCoco,r20On,setR20On,go,setMdl,session}){
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===sel.ptid).scenes.find(x=>x.id===sel.scid);fn(s)});
  const lastFocusRef=useRef(null);
  // Insert command snippet at cursor
  const insertCmd=useCallback((snippet)=>{
    const ta=lastFocusRef.current;if(!ta||!ta.isConnected){toast('삽입할 텍스트 칸을 먼저 클릭하세요');return}
    const s=ta.selectionStart,e=ta.selectionEnd,v=ta.value;
    // React 제어 컴포넌트는 value를 직접 대입하면 onChange가 발생하지 않으므로 네이티브 setter 사용
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(ta,v.slice(0,s)+snippet+v.slice(e));
    ta.dispatchEvent(new Event('input',{bubbles:true}));
    ta.focus();ta.selectionStart=ta.selectionEnd=s+snippet.length;
  },[toast]);
  // Track last focused textarea
  useEffect(()=>{
    const h=e=>{if(e.target.tagName==='TEXTAREA'&&e.target.closest('[data-block-list]'))lastFocusRef.current=e.target};
    document.addEventListener('focusin',h);return()=>document.removeEventListener('focusin',h);
  },[]);

  const goT=t=>t.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:t.ptid,scid:t.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:t.id});
  if(mode==='play'){const flat=allScenes(sc);const i=flat.findIndex(x=>x.id===scene.id);
    const asT=x=>x&&{kind:'scene',ptid:x.ptid,id:x.id,title:x.title};
    return<PlayV entry={scene} sc={sc} pt={pt} plat={plat} gm={gm} isSc nav={{prev:asT(flat[i-1]),next:asT(flat[i+1]),
      targets:(scene.connections||[]).map(c=>findTarget(sc,c.targetSceneId)).filter(Boolean),go:goT,done:!!scene.done,toggleDone:()=>uS(x=>{x.done=!x.done})}}/>}
  const cmds=plat?.commands||[];
  return<div>
    <div className="crumb">{plat?.name||''} / {sc.title} / {pt.title}</div>
    <input className="ghost page-title" aria-label="씬 제목" value={scene.title} onChange={e=>uS(s=>{s.title=e.target.value})} style={{fontSize:26,marginBottom:2}}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:16,padding:'8px 0',marginBottom:14,borderBottom:'1px solid var(--bdr)'}}>
      {[['Location','장소','location'],['Time','시간대','timeOfDay'],['NPCs','등장인물','npcsPresent']].map(([k,ph,f])=>
        <div key={f} style={{display:'flex',flexDirection:'column',gap:1}}>
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',letterSpacing:'.04em',textTransform:'uppercase'}}>{k}</span>
          <input className="ghost" value={scene[f]||''} onChange={e=>uS(s=>{s[f]=e.target.value})} placeholder={ph}
            style={{border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontSize:12,color:'var(--tx2)',padding:'2px 4px',outline:'none',minWidth:100}}/>
        </div>)}
    </div>
    <div style={{marginBottom:12}}>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',textTransform:'uppercase',marginRight:6}}>Connections</span>
      {(scene.connections||[]).map((c,i)=>{const t=findTarget(sc,c.targetSceneId);const col=t?.kind==='ending'?'var(--coral)':'var(--blue)';
        return<span key={i} style={{display:'inline-flex',alignItems:'center',gap:3,background:t?.kind==='ending'?'var(--coralA)':'var(--blueA)',color:col,padding:'1px 4px 1px 8px',borderRadius:12,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,marginRight:4,marginBottom:3}}>
          <button onClick={()=>t&&goT(t)} title="이동" style={{color:'inherit',fontWeight:600,fontSize:10}}>→ {t?.kind==='ending'?'🏁 ':''}{t?.title||'?'}</button>
          <button onClick={()=>uS(s=>{s.connections.splice(i,1)})} title="연결 삭제" aria-label="연결 삭제" style={{color:'inherit',cursor:'pointer',fontSize:10,padding:'0 3px'}}>✕</button></span>})}
      <select value="" onChange={e=>{const id=e.target.value;if(id)uS(s=>{s.connections.push({targetSceneId:id})})}}
        style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--blue)',background:'var(--blueA)',border:'1px dashed var(--blue)',borderRadius:12,padding:'1px 7px',cursor:'pointer',outline:'none'}}>
        <option value="">+ 연결</option>
        {sc.parts.map(p=><optgroup key={p.id} label={p.title}>{p.scenes.filter(s=>s.id!==scene.id&&!(scene.connections||[]).some(c=>c.targetSceneId===s.id)).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>)}
        {sc.endings.length>0&&<optgroup label="엔딩">{sc.endings.filter(e=>!(scene.connections||[]).some(c=>c.targetSceneId===e.id)).map(e=><option key={e.id} value={e.id}>🏁 {e.title}</option>)}</optgroup>}
      </select>
    </div>
    {/* R20/Coco preview with toggle */}
    {isR20&&<div style={{marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:r20On?8:0}}>
        <button onClick={()=>setR20On(!r20On)} style={{display:'flex',alignItems:'center',gap:5,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,cursor:'pointer',
          border:`1px solid ${r20On?'var(--red)':'var(--bdr)'}`,color:r20On?'var(--red)':'var(--tx4)',background:r20On?'var(--redA)':'transparent'}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:r20On?'var(--red)':'var(--tx4)'}}/>Roll20 미리보기 {r20On?'ON':'OFF'}
        </button>
      </div>
      {r20On&&<R20P scene={scene}/>}
    </div>}
    {isCoco&&<CocoP scene={scene}/>}
    {/* Floating command bar */}
    {cmds.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:3,padding:'6px 8px',marginBottom:12,border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)'}}>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx3)',display:'flex',alignItems:'center',marginRight:4}}>⌘</span>
      {cmds.map(c=><button key={c.id} onMouseDown={e=>e.preventDefault()} onClick={()=>insertCmd(c.s)}
        style={{padding:'2px 8px',borderRadius:16,fontSize:10,fontWeight:600,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',
          border:'1px solid var(--bdr)',background:'transparent',color:'var(--tx3)',transition:'all .08s'}}
        title={c.s}>{c.l}</button>)}
      {plat?.savedColors?.map((hex,i)=><button key={'c'+i} onMouseDown={e=>e.preventDefault()}
        onClick={()=>insertCmd(`[텍스트](#" style="color:${hex};text-decoration:none;)`)}
        style={{width:20,height:20,borderRadius:'50%',border:'2px solid var(--bdr)',background:hex,cursor:'pointer',padding:0}}
        title={hex}/>)}
      <span style={{marginLeft:'auto',fontSize:10,color:'var(--tx3)',alignSelf:'center'}}>글 입력 중 <kbd className="kbd">/</kbd> 로도 넣을 수 있어요</span>
    </div>}
    <div data-block-list><BL entry={scene} upE={fn=>uS(s=>{fn(s)})} sc={sc} plat={plat} onManage={()=>setMdl('cmd')}/></div>
  </div>;
}
