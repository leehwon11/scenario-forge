import { BL } from '../blocks/BlockList.jsx'
import { TA } from '../components/ui.jsx'
import { PlayV } from './PlayView.jsx'
import { FlagPicker } from '../components/flags.jsx'

// ===== ENDING PANEL =====
export function EndingP({ending,sc,plat,mode,gm,up,sel,toast,setMdl,go,sess}){
  const uE=fn=>up(d=>{const e=d.scenarios.find(x=>x.id===sel.sid).endings.find(x=>x.id===sel.eid);fn(e)});
  if(mode==='play')return<PlayV entry={ending} sc={sc} plat={plat} gm={gm} sess={sess}/>;
  return<div>
    <div className="crumb">{plat?.name||''} / {sc.title} / endings/</div>
    <input className="ghost page-title" aria-label="엔딩 제목" value={ending.title} onChange={e=>uE(en=>{en.title=e.target.value})} style={{fontSize:26}}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,margin:'8px 0 14px'}}>
      {sc.endingTypes.map(t=><button key={t.id} onClick={()=>uE(en=>{en.endingType=t.id})}
        style={{padding:'4px 11px',borderRadius:20,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',
          border:`1px solid ${ending.endingType===t.id?t.c:'var(--bdr)'}`,background:ending.endingType===t.id?t.c:'transparent',color:ending.endingType===t.id?'#fff':'var(--tx3)'}}>{t.l}</button>)}
      <button onClick={()=>setMdl('endingTypes')} title="엔딩 타입 관리" style={{padding:'4px 8px',borderRadius:20,fontSize:10,border:'1px dashed var(--tx4)',color:'var(--tx3)',cursor:'pointer'}}>✎</button>
    </div>
    <div className="rail" style={{marginBottom:18,borderLeftColor:'var(--coral)'}}>
      <div className="rail-dot" style={{borderColor:'var(--coral)'}}/>
      <span className="rail-label">// condition</span>
      <TA value={ending.condition||''} onChange={v=>uE(en=>{en.condition=v})} placeholder="도달 조건" bg="var(--coralA)"/>
      <FlagPicker defs={sc.flags} value={ending.needs||[]} onChange={v=>uE(en=>{en.needs=v})}/>
    </div>
    <BL entry={ending} upE={fn=>uE(en=>{fn(en)})} sc={sc} plat={plat} onManage={()=>setMdl('cmd')}/>
  </div>;
}
