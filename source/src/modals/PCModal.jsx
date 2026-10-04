import { Plus, Trash2 } from "lucide-react";
import { Btn, IB, Inp, Label, Modal, TA } from '../components/ui.jsx'
import { uid } from '../lib/data.js'

// PC 편집: 이름·플레이어·행동 순서 값·메모, 수치(HP·SAN 등)를 자유롭게 추가
export function PCModal({sc,pcId,up,sel,onClose,toast}){
  const pc=sc.pcs.find(p=>p.id===pcId);if(!pc)return null;
  const uP=fn=>up(d=>{const p=d.scenarios.find(x=>x.id===sel.sid).pcs.find(x=>x.id===pcId);if(p)fn(p)});
  const num=v=>v===''?'':+v;
  return<Modal title="PC 편집" onClose={onClose} width={460} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
      <div><Label>캐릭터 이름</Label><Inp value={pc.name} onChange={v=>uP(p=>{p.name=v})} autoFocus/></div>
      <div><Label>플레이어</Label><Inp value={pc.player||''} onChange={v=>uP(p=>{p.player=v})} placeholder="선택"/></div>
    </div>
    <div style={{marginBottom:12}}><Label>행동 순서 값 (DEX 등)</Label><Inp type="number" value={pc.init} onChange={v=>uP(p=>{p.init=num(v)})} style={{width:120}}/></div>
    <Label>수치</Label>
    <div style={{display:'grid',gridTemplateColumns:'1fr 72px 72px 24px',gap:6,alignItems:'center',fontSize:10,color:'var(--tx3)',marginBottom:4}}><span>이름</span><span>현재</span><span>최대</span><span/></div>
    {pc.stats.map((st,i)=><div key={st.id} style={{display:'grid',gridTemplateColumns:'1fr 72px 72px 24px',gap:6,alignItems:'center',marginBottom:4}}>
      <Inp value={st.label} onChange={v=>uP(p=>{p.stats[i].label=v})} aria-label="수치 이름"/>
      <Inp type="number" value={st.cur} onChange={v=>uP(p=>{p.stats[i].cur=num(v)})} aria-label={st.label+' 현재'}/>
      <Inp type="number" value={st.max} onChange={v=>uP(p=>{p.stats[i].max=num(v)})} aria-label={st.label+' 최대'}/>
      <IB I={Trash2} s={12} danger title="수치 삭제" onClick={()=>uP(p=>{p.stats.splice(i,1)})}/></div>)}
    <div style={{display:'flex',gap:6,margin:'6px 0 12px'}}>
      <Btn small onClick={()=>uP(p=>{p.stats.push({id:uid(),label:'새 수치',cur:10,max:10})})} style={{borderStyle:'dashed'}}><Plus size={10}/>수치 추가</Btn>
      <Btn small onClick={()=>{up(d=>{d.scenarios.find(x=>x.id===sel.sid).statTemplate=pc.stats.map(s=>({label:s.label,max:+s.max||0}))});toast('새 PC의 기본 수치로 저장했습니다')}}
        title="이 수치 구성을 새 PC를 만들 때 기본값으로 사용">이 구성을 기본값으로</Btn>
      <Btn small onClick={()=>uP(p=>{for(const s of p.stats)s.cur=s.max})} title="모든 수치를 최대값으로">전부 최대로</Btn>
    </div>
    <Label>메모 (기능치·소지품 등)</Label><TA value={pc.notes||''} onChange={v=>uP(p=>{p.notes=v})} placeholder="예: 관찰력 60, 도서관 50 / 손전등"/>
  </Modal>}
