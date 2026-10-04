import { AlertTriangle } from "lucide-react";
import { Btn,Inp,Label,Modal,TA } from '../components/ui.jsx'
import { clueUsage } from '../lib/data.js'

export function ClueEditM({sc,clueId,up,sel,onClose,go}){
  const clue=sc.clues.find(c=>c.id===clueId);if(!clue)return null;
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  const uC=fn=>uS(s=>{const c=s.clues.find(x=>x.id===clueId);fn(c)});
  return<Modal title="단서 편집" onClose={onClose} width={400} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    <div style={{marginBottom:8}}><Label>이름</Label><Inp value={clue.name} onChange={v=>uC(c=>{c.name=v})}/></div>
    <div style={{marginBottom:8}}><Label>설명</Label><TA value={clue.description||''} onChange={v=>uC(c=>{c.description=v})} placeholder="단서에 대한 상세 설명"/></div>
    <div style={{marginBottom:8}}><Label>연결 결론 (3단서 법칙용)</Label><Inp value={clue.leadsTo||''} onChange={v=>uC(c=>{c.leadsTo=v})} placeholder="예: 범인의 정체, 등대의 비밀"/></div>
    <div style={{marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
      <label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
        <input type="checkbox" checked={clue.isRedHerring} onChange={e=>uC(c=>{c.isRedHerring=e.target.checked})} style={{accentColor:'var(--red)'}}/>
        레드 헤링 (미끼 단서)</label></div>
    <div style={{marginTop:12,paddingTop:10,borderTop:'1px solid var(--bdr)'}}><Label>등장 위치 (단서 블록이 연결된 곳)</Label>
      {(clueUsage(sc)[clueId]||[]).map((w,i)=><button key={i} onClick={()=>{onClose();w.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:w.ptid,scid:w.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:w.id})}}
        style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:12,background:'var(--tealA)',color:'var(--teal)',marginRight:4,marginBottom:4}}>{w.kind==='ending'?'🏁 ':''}{w.title}</button>)}
      {!clueUsage(sc)[clueId]&&<div style={{fontSize:12,color:'var(--gold)',display:'flex',alignItems:'center',gap:5}}><AlertTriangle size={12}/>아직 어느 씬에도 배치되지 않았습니다. 씬에 "단서" 블록을 추가하고 이 단서를 선택하세요.</div>}
    </div>
  </Modal>}
