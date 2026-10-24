import { useState } from "react";
import { MapPin,Package,Plus,Search,Trash2,Users } from "lucide-react";
import { Btn,Inp,Label,Modal,TA,useAct,useDialog } from '../components/ui.jsx'
import { BT,LIB_BT,LIB_LABEL,libUses,newLibEntry,uid } from '../lib/data.js'

// ===== 자료실 (NPC · 아이템 · 장소) =====
// 왼쪽: 종류 탭 + 검색 + 목록, 오른쪽: 고른 항목 편집 · 쓰이는 곳 · 지금 씬에 넣기 · 삭제
// 씬의 NPC/아이템/장소 블록은 이 항목을 가리키므로 여기서 고치면 모든 씬에 반영된다.
const KINDS=[['npcs',Users],['items',Package],['places',MapPin]];

export function LibM({sc,up,sel,scene,ending,onClose,toast,go,initKind='npcs',initId=null}){
  const dlg=useDialog();const{removed}=useAct();
  const[kind,setKind]=useState(initKind);const[ei,setEi]=useState(initId);const[q,setQ]=useState('');
  if(!sc)return null;
  const uS=fn=>up(d=>{fn(d.scenarios.find(x=>x.id===sel.sid))});
  const list=sc.library[kind]||[];const uses=libUses(sc);
  const shown=list.filter(e=>!q.trim()||[e.name,e.role,e.traits,e.description].some(v=>(v||'').toLowerCase().includes(q.trim().toLowerCase())));
  const ed=list.find(e=>e.id===ei);const L=LIB_LABEL[kind];
  const ue=fn=>uS(s=>{const x=s.library[kind].find(y=>y.id===ei);if(x)fn(x)});
  const add=()=>{const ne=newLibEntry(kind);uS(s=>{s.library[kind].push(ne)});setEi(ne.id);setQ('')};
  const target=scene||ending;
  const putIn=()=>{const bt=LIB_BT[kind];
    up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);const en=sel.eid?s.endings.find(x=>x.id===sel.eid):s.parts.find(x=>x.id===sel.ptid)?.scenes.find(x=>x.id===sel.scid);if(!en)return;
      en.blocks.push({id:uid(),type:bt,label:BT[bt].l,refId:ei});
      if(kind==='npcs'&&!sel.eid&&!(en.npcIds||[]).includes(ei))en.npcIds=[...(en.npcIds||[]),ei]});
    toast(`"${target.title}"에 넣었습니다`)};
  const del=async()=>{const u=uses[ei]||[];
    if(u.length&&!await dlg.confirm(`"${ed.name||'(이름 없음)'}"을(를) ${u.length}곳(${u.map(w=>w.title).join(', ')})에서 쓰고 있습니다.\n지우면 그 씬들의 ${L} 블록도 함께 지워집니다.`,{title:L+' 삭제',okLabel:'삭제',danger:true}))return;
    const id=ei;setEi(null);
    removed(`${L} "${ed.name||'(이름 없음)'}"`,()=>uS(s=>{s.library[kind]=s.library[kind].filter(x=>x.id!==id);
      const strip=en=>{en.blocks=(en.blocks||[]).filter(b=>b.refId!==id);if(en.npcIds)en.npcIds=en.npcIds.filter(x=>x!==id)};
      for(const p of s.parts)p.scenes.forEach(strip);s.endings.forEach(strip)}))};
  const goW=w=>{onClose();w.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:w.ptid,scid:w.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:w.id})};

  return<Modal title="자료실 · NPC · 아이템 · 장소" onClose={onClose} width={860} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    <div className="lib">
      <div className="lib-side">
        <div className="seg lib-seg" role="tablist">{KINDS.map(([k,I])=><button key={k} role="tab" aria-selected={kind===k} onClick={()=>{setKind(k);setEi(null);setQ('')}}><I size={13}/>{LIB_LABEL[k]}<span>{sc.library[k].length}</span></button>)}</div>
        <label className="lib-q"><Search size={13}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={L+' 찾기'} aria-label={L+' 찾기'}/></label>
        <div className="lib-list">
          {shown.map(e=><button key={e.id} className={'lib-it'+(ei===e.id?' on':'')} onClick={()=>setEi(e.id)}>
            <b>{e.name||'(이름 없음)'}</b><small>{(kind==='npcs'?e.role:e.description)?.split('\n')[0]||'설명 없음'}</small>
            <span className={'lib-use'+((uses[e.id]||[]).length?'':' none')}>{(uses[e.id]||[]).length?`${uses[e.id].length}곳`:'안 씀'}</span></button>)}
          {!shown.length&&<div className="lib-empty">{q?'찾는 항목이 없어요':`아직 ${L}가 없어요`}</div>}
        </div>
        <button className="nav-add" onClick={add}><Plus size={13}/>새 {L}</button>
      </div>
      <div className="lib-main">
        {!ed?<div className="lib-empty big">왼쪽에서 {L}를 고르거나 <b>새 {L}</b>를 만드세요.<br/>여기서 고친 내용은 이 {L}를 쓰는 모든 씬에 반영됩니다.</div>:<>
          <div className="lib-row">{ed.imageUrl&&<img loading="lazy" decoding="async" src={ed.imageUrl} alt="" className="lib-img big" onError={e=>{e.target.style.display='none'}}/>}
            <div className="lib-f">
              <div><Label>이름</Label><Inp value={ed.name||''} onChange={v=>ue(x=>{x.name=v})} placeholder={L+' 이름'} autoFocus={!ed.name}/></div>
              {kind==='npcs'&&<div><Label>역할</Label><Inp value={ed.role||''} onChange={v=>ue(x=>{x.role=v})} placeholder="예: 등대지기의 아들"/></div>}
              <div><Label>이미지 URL</Label><Inp value={ed.imageUrl||''} onChange={v=>ue(x=>{x.imageUrl=v})} placeholder="https://… (선택)"/></div></div></div>
          {kind==='npcs'?<>
            <div><Label>특징 (한 줄씩)</Label><TA value={ed.traits||''} onChange={v=>ue(x=>{x.traits=v})} placeholder="말수가 적다"/></div>
            <div><Label>대사 (한 줄씩 — 세션 화면에서 줄마다 복사)</Label><TA value={ed.lines||''} onChange={v=>ue(x=>{x.lines=v})} placeholder={'"등대엔 가지 마시오."'}/></div></>
          :<div><Label>설명 (플레이어에게 보여줄 내용)</Label><TA value={ed.description||''} onChange={v=>ue(x=>{x.description=v})}/></div>}
          <div><Label>GM 메모 (플레이어에게 숨김)</Label><TA value={ed.gmNote||''} onChange={v=>ue(x=>{x.gmNote=v})} bg="var(--goldA)" placeholder="정체, 숨긴 사실, 진행 팁"/></div>
          <div className="lib-uses"><Label>쓰이는 곳</Label>
            {(uses[ei]||[]).map(w=><button key={w.id} className="conn" onClick={()=>goW(w)}><span>{w.kind==='ending'?'🏁 ':''}{w.title}</span></button>)}
            {!(uses[ei]||[]).length&&<span className="lib-none">아직 어느 씬에도 넣지 않았어요</span>}</div>
          <div className="lib-acts">
            {target&&<Btn primary onClick={putIn} title="지금 열려 있는 씬·엔딩에 이 항목의 블록을 넣습니다"><Plus size={12}/>"{target.title}"에 넣기</Btn>}
            <span style={{flex:1}}/>
            <Btn danger onClick={del}><Trash2 size={12}/>삭제</Btn></div>
        </>}
      </div>
    </div>
  </Modal>}
