import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Btn,Inp,Label,Modal,useDialog } from '../components/ui.jsx'
import { PLAT_C,uid } from '../lib/data.js'

export function PlatM({D,up,setSel,sel,editId,onClose,toast}){const dlg=useDialog();const ed=D.platforms.find(p=>p.id===editId);
  const[n,setN]=useState(ed?.name||'');const[c,setC]=useState(ed?.color||PLAT_C[D.platforms.length%PLAT_C.length]);
  const cnt=ed?D.scenarios.filter(s=>s.platformId===ed.id).length:0;const others=D.platforms.filter(p=>p.id!==editId);
  const[moveTo,setMoveTo]=useState(others[0]?.id||'');
  const save=()=>{if(!n.trim()){toast('이름을 입력하세요');return}
    if(ed)up(d=>{const p=d.platforms.find(x=>x.id===ed.id);p.name=n.trim();p.color=c});
    else{const pid=uid();up(d=>{d.platforms.push({id:pid,name:n.trim(),color:c,commands:[]})});setSel({pid,sid:null,ptid:null,scid:null,eid:null})}onClose()};
  const del=async()=>{if(!others.length){toast('마지막 사이트는 삭제할 수 없습니다');return}
    const tgt=others.find(p=>p.id===moveTo);
    if(!await dlg.confirm(cnt?`"${ed.name}"을(를) 삭제하고, 시나리오 ${cnt}개는 "${tgt.name}"(으)로 옮깁니다.`:`"${ed.name}"을(를) 삭제합니다. (명령어 라이브러리도 함께 삭제)`,{title:'사이트 삭제',okLabel:'삭제',danger:true}))return;
    up(d=>{for(const s of d.scenarios)if(s.platformId===ed.id)s.platformId=moveTo;d.platforms=d.platforms.filter(p=>p.id!==ed.id)});
    if(sel.pid===ed.id)setSel({pid:moveTo,sid:null,ptid:null,scid:null,eid:null});onClose();toast('삭제됨')};
  return<Modal title={ed?'사이트 편집':'사이트 추가'} onClose={onClose} width={400} footer={<>{ed&&<Btn danger onClick={del} style={{marginRight:'auto'}}><Trash2 size={11}/>삭제</Btn>}<Btn onClick={onClose}>취소</Btn><Btn primary onClick={save}>{ed?'저장':'추가'}</Btn></>}>
    <div style={{marginBottom:10}}><Label>이름</Label><Inp value={n} onChange={setN} placeholder="Roll20, 코코포리아..." autoFocus onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)save()}}/>
      <div style={{fontSize:11,color:'var(--tx3)',marginTop:4}}>이름에 "Roll20" 또는 "코코"가 들어가면 채팅 미리보기가 켜집니다.</div></div>
    <div><Label>색상</Label>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{PLAT_C.map(cc=><button key={cc} onClick={()=>setC(cc)} title={cc} aria-label={'색상 '+cc} style={{width:24,height:24,borderRadius:'50%',background:cc,cursor:'pointer',border:`2px solid ${cc===c?'var(--tx1)':'transparent'}`}}/>)}</div></div>
    {ed&&cnt>0&&others.length>0&&<div style={{marginTop:14,paddingTop:10,borderTop:'1px solid var(--bdr)'}}><Label>삭제 시 시나리오 {cnt}개를 옮길 사이트</Label>
      <select value={moveTo} onChange={e=>setMoveTo(e.target.value)} style={{width:'100%',padding:'5px 8px',border:'1px solid var(--bdr)',borderRadius:6,background:'var(--sf1)',color:'var(--tx1)',fontSize:12}}>
        {others.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
  </Modal>}
