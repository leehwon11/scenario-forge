import { Check,X } from "lucide-react";
import { useDialog } from '../components/ui.jsx'
import { BL } from '../blocks/BlockList.jsx'
import { findTarget,newLibEntry } from '../lib/data.js'
import { CocoP,R20P } from './ChatPreview.jsx'
import { CmdBar } from '../components/CmdBar.jsx'

// ===== 씬 편집 (Desk 가운데 칸) =====
// 위: SCENE 번호 · 제목 · 속성 칩(장소·시간·NPC·다음), 아래: 블록 카드
export function Prop({label,value,onChange,placeholder}){
  return<label className="prop"><span>{label}</span><input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}

export function SceneP({scene,pt,sc,plat,up,sel,isR20,isCoco,r20On,setR20On,go,setMdl,no}){
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===sel.ptid).scenes.find(x=>x.id===sel.scid);fn(s)});
  const goT=t=>t.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:t.ptid,scid:t.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:t.id});
  const conns=scene.connections||[];
  const parent=scene.parentId?pt.scenes.find(x=>x.id===scene.parentId):null;
  const dlg=useDialog();
  const upSc=fn=>up(d=>fn(d.scenarios.find(x=>x.id===sel.sid)));
  const openLib=(kind,id)=>setMdl({type:'lib',kind,id});
  const ids=scene.npcIds||[];const npcs=sc.library.npcs;
  const addNpc=async v=>{if(!v)return;let id=v;
    if(v==='__new'){const n=await dlg.prompt('새 NPC','',{placeholder:'NPC 이름'});if(!n)return;const ne=newLibEntry('npcs',n);id=ne.id;upSc(s=>{s.library.npcs.push(ne)})}
    uS(s=>{s.npcIds=[...(s.npcIds||[]),id]})};
  return<div className="ed">
    <CmdBar plat={plat} onManage={()=>setMdl('cmd')} onTpl={()=>setMdl('tpl')}/>
    <div className="ed-pg">
      <div className="ed-k">SCENE {String(no).replace(/^\d+/,d=>d.padStart(2,'0'))} <span>· {pt.title}</span>
        {parent&&<span> · 상위 씬 <button className="ed-parent" onClick={()=>go({pid:sel.pid,sid:sel.sid,ptid:pt.id,scid:parent.id,eid:null})}>{parent.title}</button></span>}
        <button className={'ed-done'+(scene.done?' on':'')} onClick={()=>uS(s=>{s.done=!s.done})} aria-pressed={!!scene.done} title="세션에서 진행을 마친 씬으로 표시">{scene.done?<><Check size={11}/>완료</>:'완료로 표시'}</button></div>
      <input className="ghost page-title ed-title" aria-label="씬 제목" value={scene.title} onChange={e=>uS(s=>{s.title=e.target.value})}/>
      <div className="props">
        <Prop label="장소" value={scene.location} onChange={v=>uS(s=>{s.location=v})} placeholder="어디서"/>
        <Prop label="시간" value={scene.timeOfDay} onChange={v=>uS(s=>{s.timeOfDay=v})} placeholder="언제"/>
        <div className="prop prop-next prop-npc"><span>NPC</span>
          {ids.map(id=>{const n=npcs.find(x=>x.id===id);return<span key={id} className="conn npc">
            <button onClick={()=>openLib('npcs',id)} title="자료실에서 보기">{n?.name||'(이름 없음)'}</button>
            <button onClick={()=>uS(s=>{s.npcIds=(s.npcIds||[]).filter(x=>x!==id)})} title="이 씬에서 빼기" aria-label="이 씬에서 빼기"><X size={10}/></button></span>})}
          <input value={scene.npcsPresent||''} onChange={e=>uS(s=>{s.npcsPresent=e.target.value})} placeholder={ids.length?'그 밖에':'직접 입력'} aria-label="등장인물 직접 입력"/>
          <select value="" aria-label="자료실 NPC 추가" onChange={e=>addNpc(e.target.value)}>
            <option value="">+ NPC</option>{npcs.filter(n=>!ids.includes(n.id)).map(n=><option key={n.id} value={n.id}>{n.name||'(이름 없음)'}</option>)}
            <option value="__new">+ 새 NPC 만들기…</option></select></div>
        <div className="prop prop-next"><span>다음</span>
          {conns.map((c,i)=>{const t=findTarget(sc,c.targetSceneId);return<span key={i} className={'conn'+(t?.kind==='ending'?' end':'')}>
            <button onClick={()=>t&&goT(t)} title="이동">{t?.kind==='ending'?'🏁 ':''}{t?.title||'?'}</button>
            <button onClick={()=>uS(s=>{s.connections.splice(i,1)})} title="연결 삭제" aria-label="연결 삭제"><X size={10}/></button></span>})}
          <select value="" aria-label="연결 추가" onChange={e=>{const id=e.target.value;if(id)uS(s=>{s.connections.push({targetSceneId:id})})}}>
            <option value="">+ 연결</option>
            {sc.parts.map(p=><optgroup key={p.id} label={p.title}>{p.scenes.filter(s=>s.id!==scene.id&&!conns.some(c=>c.targetSceneId===s.id)).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>)}
            {sc.endings.length>0&&<optgroup label="엔딩">{sc.endings.filter(e=>!conns.some(c=>c.targetSceneId===e.id)).map(e=><option key={e.id} value={e.id}>🏁 {e.title}</option>)}</optgroup>}
          </select></div>
      </div>
      {isR20&&<div className="ed-prev">
        <button className={'prev-tog'+(r20On?' on':'')} onClick={()=>setR20On(!r20On)} aria-pressed={r20On}><i/>Roll20 채팅 미리보기 {r20On?'켜짐':'꺼짐'}</button>
        {r20On&&<R20P scene={scene}/>}</div>}
      {isCoco&&<CocoP scene={scene}/>}
      <div data-block-list><BL entry={scene} upE={fn=>uS(s=>{fn(s)})} upSc={upSc} openLib={openLib} sc={sc} plat={plat} onManage={()=>setMdl('cmd')}/></div>
    </div>
  </div>}
