import { Pencil } from "lucide-react";
import { BL } from '../blocks/BlockList.jsx'
import { TA } from '../components/ui.jsx'
import { FlagPicker } from '../components/flags.jsx'
import { CmdBar } from '../components/CmdBar.jsx'

// ===== 엔딩 편집 (Desk 가운데 칸) =====
export function EndingP({ending,sc,plat,up,sel,setMdl}){
  const uE=fn=>up(d=>{const e=d.scenarios.find(x=>x.id===sel.sid).endings.find(x=>x.id===sel.eid);fn(e)});
  return<div className="ed">
    <CmdBar plat={plat} onManage={()=>setMdl('cmd')} onTpl={()=>setMdl('tpl')}/>
    <div className="ed-pg">
      <div className="ed-k">ENDING <span>· {sc.title}</span></div>
      <input className="ghost page-title ed-title" aria-label="엔딩 제목" value={ending.title} onChange={e=>uE(en=>{en.title=e.target.value})}/>
      <div className="props">
        {sc.endingTypes.map(t=><button key={t.id} className={'et-chip'+(ending.endingType===t.id?' on':'')} style={{'--c':t.c}} onClick={()=>uE(en=>{en.endingType=t.id})} aria-pressed={ending.endingType===t.id}>{t.l}</button>)}
        <button className="et-chip edit" onClick={()=>setMdl('endingTypes')} title="엔딩 타입 관리"><Pencil size={11}/>종류 편집</button>
      </div>
      <div className="blk blk-cond">
        <div className="blk-h"><span className="blk-tag" style={{'--c':'var(--coral)'}}>도달 조건</span></div>
        <div className="blk-b"><TA value={ending.condition||''} onChange={v=>uE(en=>{en.condition=v})} placeholder="어떻게 하면 이 엔딩에 도달하나요?"/>
          <FlagPicker defs={sc.flags} value={ending.needs||[]} onChange={v=>uE(en=>{en.needs=v})}/></div>
      </div>
      <div data-block-list><BL entry={ending} upE={fn=>uE(en=>{fn(en)})} sc={sc} plat={plat} onManage={()=>setMdl('cmd')}/></div>
    </div>
  </div>}
