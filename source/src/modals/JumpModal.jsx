import { useMemo, useState } from "react";
import { Flag, Search } from "lucide-react";
import { Modal } from '../components/ui.jsx'
import { allScenes, sceneNums } from '../lib/data.js'

// ===== 씬 바로 찾아가기 (Ctrl+K) =====
// 씬·엔딩 이름이나 번호(예: 3-1)를 치면 걸러지고, ↑↓로 고르고 Enter로 이동한다.
export function JumpM({sc,sel,go,onClose}){
  const[q,setQ]=useState('');const[i,setI]=useState(0);
  const nums=sceneNums(sc);
  const all=useMemo(()=>[...allScenes(sc).map(s=>({kind:'scene',id:s.id,ptid:s.ptid,title:s.title,sub:s.ptTitle,no:nums[s.id],child:!!s.parentId,done:s.done})),
    ...sc.endings.map(e=>({kind:'ending',id:e.id,title:e.title,sub:'엔딩'}))],[sc]);
  const t=q.trim().toLowerCase();
  const list=t?all.filter(x=>(x.title||'').toLowerCase().includes(t)||(x.no||'')===t||(x.no||'').startsWith(t+'-')||(x.sub||'').toLowerCase().includes(t)):all;
  const cur=Math.min(i,Math.max(0,list.length-1));
  const pick=x=>{if(!x)return;onClose();x.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:x.ptid,scid:x.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:x.id})};
  const key=e=>{if(e.nativeEvent.isComposing)return;
    if(e.key==='ArrowDown'){e.preventDefault();setI(Math.min(cur+1,list.length-1))}
    else if(e.key==='ArrowUp'){e.preventDefault();setI(Math.max(cur-1,0))}
    else if(e.key==='Enter'){e.preventDefault();pick(list[cur])}};
  return<Modal title="씬 바로 찾아가기" onClose={onClose} width={480}>
    <label className="lib-q jump-q"><Search size={14}/><input autoFocus value={q} onChange={e=>{setQ(e.target.value);setI(0)}} onKeyDown={key} placeholder="씬 이름이나 번호 (예: 서재, 3-1)" aria-label="씬 찾기"/></label>
    <div className="jump-list" role="listbox" aria-label="씬">
      {list.map((x,k)=><button key={x.id} role="option" aria-selected={k===cur} className={'jump-it'+(k===cur?' on':'')+(x.child?' sub':'')+((sel.scid||sel.eid)===x.id?' here':'')} onMouseEnter={()=>setI(k)} onClick={()=>pick(x)}>
        <span className="jump-no">{x.kind==='ending'?<Flag size={12}/>:x.no}</span><b>{x.title||'(제목 없음)'}</b>{x.done&&<span className="jump-done">완료</span>}<small>{x.sub}</small></button>)}
      {!list.length&&<div className="lib-empty">"{q}"에 맞는 씬이 없어요</div>}
    </div>
    <div className="jump-hint"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> 고르기 · <kbd className="kbd">Enter</kbd> 이동 · <kbd className="kbd">Esc</kbd> 닫기</div>
  </Modal>}
