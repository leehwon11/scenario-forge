import { useState } from "react";
import { Plus,Trash2 } from "lucide-react";
import { Btn,Inp,Modal,TA } from '../components/ui.jsx'
import { BT,uid } from '../lib/data.js'

export function LibM({sc,up,sel,scene,onClose,toast}){const[tab,setTab]=useState('npcs');const[ei,setEi]=useState(null);
  if(!sc)return<Modal title="자료" onClose={onClose}><div style={{color:'var(--tx3)'}}>시나리오 선택</div></Modal>;
  const lib=sc.library[tab]||[];const ed=lib.find(e=>e.id===ei);const lbs={npcs:'NPC',items:'아이템',places:'장소'};
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  return<Modal title="NPC · 아이템 · 장소" onClose={onClose} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    <div style={{display:'flex',gap:1,border:'1px solid var(--bdr)',borderRadius:6,padding:2,marginBottom:10}}>
      {['npcs','items','places'].map(t=><button key={t} onClick={()=>{setTab(t);setEi(null)}}
        style={{flex:1,padding:'4px 8px',borderRadius:4,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',
          background:tab===t?'var(--blue)':'transparent',color:tab===t?'#fff':'var(--tx4)'}}>{lbs[t]}</button>)}</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
      {lib.map(e=><button key={e.id} onClick={()=>setEi(ei===e.id?null:e.id)}
        style={{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:600,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',
          border:`1px solid ${ei===e.id?'var(--blue)':'var(--bdr)'}`,background:ei===e.id?'var(--blue)':'transparent',color:ei===e.id?'#fff':'var(--tx3)'}}>{e.name||'?'}</button>)}</div>
    {ed&&<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf2)',marginBottom:8}}>
      <Inp value={ed.name||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).name=v})} placeholder="이름" style={{marginBottom:4}}/>
      {tab==='npcs'?<><Inp value={ed.role||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).role=v})} placeholder="역할" style={{marginBottom:4}}/>
        <TA value={ed.traits||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).traits=v})} placeholder="특징"/></>
      :<TA value={ed.description||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).description=v})} placeholder="설명"/>}
      <div style={{display:'flex',gap:4,marginTop:5}}>
        <Btn primary small disabled={!scene} onClick={()=>{const bt=tab==='npcs'?'npc':tab==='items'?'item':'place';
          up(d=>{const pt2=d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===sel.ptid);const sc2=pt2?.scenes.find(x=>x.id===sel.scid);if(!sc2)return;
            sc2.blocks.push({...JSON.parse(JSON.stringify(ed)),id:uid(),type:bt,label:BT[bt].l})});toast('추가됨')}}><Plus size={9}/>씬에 추가</Btn>
        <Btn danger small onClick={()=>{uS(s=>{s.library[tab]=s.library[tab].filter(x=>x.id!==ei)});setEi(null)}} title="자료 삭제"><Trash2 size={9}/>삭제</Btn></div></div>}
    <Btn small onClick={()=>{const nid=uid();const ne=tab==='npcs'?{id:nid,name:'',imageUrl:'',role:'',traits:'',lines:''}:{id:nid,name:'',imageUrl:'',description:'',gmNote:''};
      uS(s=>{s.library[tab].push(ne)});setEi(nid)}} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>추가</Btn></Modal>}
