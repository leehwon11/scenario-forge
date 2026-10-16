import { AlertTriangle,Trash2 } from "lucide-react";
import { Btn,Inp,Label,Modal,TA,useAct } from '../components/ui.jsx'
import { clueUsage,concKey } from '../lib/data.js'

// ===== 단서 편집 =====
// 연결 결론은 이미 쓴 결론을 눌러 고를 수 있다 (띄어쓰기만 다른 결론이 따로 세지지 않도록)
export function ClueEditM({sc,clueId,up,sel,onClose,go}){
  const{removed}=useAct();
  const clue=sc.clues.find(c=>c.id===clueId);if(!clue)return null;
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  const uC=fn=>uS(s=>{const c=s.clues.find(x=>x.id===clueId);fn(c)});
  const concs=[];for(const c of sc.clues)if(c.leadsTo?.trim()&&!c.isRedHerring&&!concs.some(x=>concKey(x.t)===concKey(c.leadsTo)))concs.push({t:c.leadsTo.trim(),n:sc.clues.filter(y=>!y.isRedHerring&&concKey(y.leadsTo)===concKey(c.leadsTo)).length});
  const where=clueUsage(sc)[clueId]||[];const found=!!sc.session?.found?.[clueId];
  const near=clue.leadsTo?.trim()&&concs.find(x=>concKey(x.t)===concKey(clue.leadsTo)&&x.t!==clue.leadsTo.trim());
  return<Modal title="단서 편집" onClose={onClose} width={520} footer={<>
      <Btn danger onClick={()=>{onClose();removed(`단서 "${clue.name}"`,()=>uS(s=>{s.clues=s.clues.filter(x=>x.id!==clueId)}))}}><Trash2 size={12}/>삭제</Btn><span style={{flex:1}}/>
      <Btn primary onClick={onClose}>완료</Btn></>}>
    <div className="clue-m">
      <div><Label>이름</Label><Inp value={clue.name} onChange={v=>uC(c=>{c.name=v})} placeholder="예: 젖은 발자국"/></div>
      <div><Label>설명 (세션 화면의 단서 카드에 함께 나와요)</Label><TA value={clue.description||''} onChange={v=>uC(c=>{c.description=v})} placeholder="이 단서가 무엇을 뜻하는지, 어떻게 보이는지"/></div>
      <div className="clue-row">
        <button role="switch" aria-checked={clue.isRedHerring} className={'sw'+(clue.isRedHerring?' on red':'')} onClick={()=>uC(c=>{c.isRedHerring=!c.isRedHerring})}><span/></button>
        <span><b>미끼 단서 (레드 헤링)</b><small>진짜 결론으로 이어지지 않는 단서. 3단서 법칙 계산에서 빠져요.</small></span></div>
      {!clue.isRedHerring&&<div><Label>연결 결론 (3단서 법칙)</Label>
        <Inp value={clue.leadsTo||''} onChange={v=>uC(c=>{c.leadsTo=v})} placeholder="이 단서가 가리키는 결론 — 예: 등대지기는 살아 있다"/>
        {concs.length>0&&<div className="clue-concs"><span>이미 쓴 결론:</span>{concs.map(x=><button key={x.t} className={'conn'+(concKey(x.t)===concKey(clue.leadsTo)?' on':'')} onClick={()=>uC(c=>{c.leadsTo=x.t})}><span>{x.t} · {x.n}개</span></button>)}</div>}
        {near&&<div className="clue-warn"><AlertTriangle size={12}/>띄어쓰기만 다른 결론 "{near.t}"과 같은 것으로 셉니다. <button onClick={()=>uC(c=>{c.leadsTo=near.t})}>그 이름으로 맞추기</button></div>}
      </div>}
      <div className="clue-row">
        <button role="switch" aria-checked={found} className={'sw'+(found?' on':'')} onClick={()=>uS(s=>{s.session.found[clueId]=!s.session.found[clueId]})}><span/></button>
        <span><b>이번 세션에 획득함</b><small>세션 화면의 "획득 표시"와 같은 값이에요.</small></span></div>
      <div><Label>등장 위치 (이 단서를 고른 단서 블록)</Label>
        <div className="clue-concs">{where.map((w,i)=><button key={i} className="conn" onClick={()=>{onClose();w.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:w.ptid,scid:w.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:w.id})}}>
          <span>{w.kind==='ending'?'🏁 ':''}{w.title}</span></button>)}</div>
        {!where.length&&<div className="clue-warn"><AlertTriangle size={12}/>아직 어느 씬에도 배치되지 않았어요. 씬에 "단서" 블록을 추가하고 이 단서를 고르세요.</div>}</div>
    </div>
  </Modal>}
