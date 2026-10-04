import { Plus,Trash2 } from "lucide-react";
import { Btn,IB,Inp,Modal } from '../components/ui.jsx'
import { PLAT_C,uid } from '../lib/data.js'

export function ETM({sc,up,sel,onClose}){const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  return<Modal title="엔딩 타입 관리" onClose={onClose} width={400} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    {sc.endingTypes.map((et,i)=><div key={et.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',borderBottom:'1px solid var(--bdr)'}}>
      <input type="color" value={et.c} onChange={e=>uS(s=>{s.endingTypes[i].c=e.target.value})} style={{width:24,height:24,border:'1px solid var(--bdr)',borderRadius:4,padding:1,cursor:'pointer'}}/>
      <Inp value={et.l} onChange={v=>uS(s=>{s.endingTypes[i].l=v})}/>
      <IB I={Trash2} s={13} danger title="타입 삭제 (이 타입의 엔딩은 첫 타입으로 변경)" disabled={sc.endingTypes.length<=1} onClick={()=>{if(sc.endingTypes.length<=1)return;uS(s=>{s.endingTypes.splice(i,1);for(const e of s.endings)if(e.endingType===et.id)e.endingType=s.endingTypes[0].id})}}/></div>)}
    <Btn small onClick={()=>uS(s=>{s.endingTypes.push({id:uid(),l:'새 타입',c:PLAT_C[s.endingTypes.length%PLAT_C.length]})})} style={{width:'100%',justifyContent:'center',marginTop:6,borderStyle:'dashed'}}><Plus size={9}/>추가</Btn></Modal>}
