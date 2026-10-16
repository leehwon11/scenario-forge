import { Pencil,Plus,Trash2 } from "lucide-react";
import { IB,useAct } from '../components/ui.jsx'
import { makeScenario } from '../components/Nav.jsx'

// ===== 첫 화면: 사이트 고르기 + 시나리오 카드 =====
export function Home({D,sel,go,setSel,up,setMdl,dlg,toast}){
  const{removed}=useAct();
  const scs=D.scenarios.filter(s=>s.platformId===sel.pid);
  const newScenario=async()=>{if(!sel.pid){toast('사이트를 먼저 만드세요');return}const n=await dlg.prompt('새 시나리오','',{placeholder:'시나리오 이름'});if(!n)return;
    const s=makeScenario(sel.pid,n);up(d=>{d.scenarios.push(s)});go({pid:sel.pid,sid:s.id,ptid:null,scid:null,eid:null})};
  const count=s=>s.parts.reduce((a,p)=>a+p.scenes.length,0);
  return<div className="home">
    <div className="home-k">어느 사이트에서 진행하나요?</div>
    <div className="home-sites" role="tablist" aria-label="사이트">
      {D.platforms.map(p=><div key={p.id} className={'home-site'+(sel.pid===p.id?' on':'')}>
        <button role="tab" aria-selected={sel.pid===p.id} onClick={()=>go({pid:p.id,sid:null,ptid:null,scid:null,eid:null})}>
          <i style={{background:p.color}}/>{p.name}<span>{D.scenarios.filter(s=>s.platformId===p.id).length}</span></button>
        <IB I={Pencil} s={12} title="사이트 편집" onClick={()=>setMdl({type:'platform',id:p.id})}/></div>)}
      <button className="home-addsite" onClick={()=>setMdl('platform')}><Plus size={12}/>사이트</button>
    </div>
    <h1 className="home-h">시나리오</h1>
    <div className="home-grid">
      {scs.map(s=>{const sn=count(s);const dn=s.parts.reduce((a,p)=>a+p.scenes.filter(x=>x.done).length,0);
        return<div key={s.id} className="home-card">
          <button className="home-open" onClick={()=>go({pid:sel.pid,sid:s.id,ptid:null,scid:null,eid:null})}>
            <b>{s.title}</b>
            <p>{s.synopsis?.trim()||s.setting?.trim()||'줄거리를 아직 적지 않았어요'}</p>
            <span className="home-meta"><span>씬 {dn}/{sn}</span><span>엔딩 {s.endings.length}</span><span>단서 {s.clues.length}</span>{s.sessionHistory?.length>0&&<span>세션 {s.sessionHistory.length}회</span>}</span>
          </button>
          <span className="home-del"><IB I={Trash2} s={13} danger title="시나리오 삭제" onClick={async()=>{if(!await dlg.confirm(`"${s.title}" 시나리오와 그 안의 모든 씬·엔딩·단서가 삭제됩니다.`,{title:'시나리오 삭제',okLabel:'삭제',danger:true}))return;
            removed(`"${s.title}"`,()=>up(d=>{d.scenarios=d.scenarios.filter(x=>x.id!==s.id)}));if(sel.sid===s.id)setSel(v=>({...v,sid:null,ptid:null,scid:null,eid:null}))}}/></span>
        </div>})}
      <button className="home-new" onClick={newScenario}><Plus size={18}/>{scs.length?'새 시나리오':'첫 시나리오 만들기'}</button>
    </div>
  </div>}
