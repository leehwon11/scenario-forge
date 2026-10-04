import { useState } from "react";
import { Plus,Trash2 } from "lucide-react";
import { Btn,Inp,Modal,TA } from '../components/ui.jsx'
import { uid } from '../lib/data.js'

export function CmdM({plat,up,sel,onClose}){const[ei,setEi]=useState(null);const[newColor,setNewColor]=useState('#AA0000');
  if(!plat)return<Modal title="명령어" onClose={onClose}><div style={{color:'var(--tx3)'}}>사이트 선택</div></Modal>;
  const cms=plat.commands||[];const ed=cms.find(c=>c.id===ei);const colors=plat.savedColors||[];
  const uP=fn=>up(d=>{const p=d.platforms.find(x=>x.id===sel.pid);fn(p)});
  return<Modal title={`명령어 — ${plat.name}`} onClose={onClose} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    {/* Commands */}
    <div className="rail-label">COMMANDS</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
      {cms.map(c=><button key={c.id} onClick={()=>setEi(ei===c.id?null:c.id)}
        style={{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:600,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',
          border:`1px solid ${ei===c.id?'var(--blue)':'var(--bdr)'}`,background:ei===c.id?'var(--blue)':'transparent',color:ei===c.id?'#fff':'var(--tx3)'}}>{c.l||'?'}</button>)}</div>
    {ed&&<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf2)',marginBottom:8}}>
      <Inp value={ed.l} onChange={v=>uP(p=>{p.commands.find(x=>x.id===ei).l=v})} placeholder="이름" style={{marginBottom:4}}/>
      <Inp value={ed.cat||''} onChange={v=>uP(p=>{p.commands.find(x=>x.id===ei).cat=v})} placeholder="카테고리" style={{marginBottom:4}}/>
      <TA value={ed.s} onChange={v=>uP(p=>{p.commands.find(x=>x.id===ei).s=v})} placeholder="삽입 텍스트" style={{fontFamily:'JetBrains Mono,monospace'}}/>
      <Btn danger small onClick={()=>{uP(p=>{p.commands=p.commands.filter(x=>x.id!==ei)});setEi(null)}} style={{marginTop:5}}><Trash2 size={11}/>삭제</Btn></div>}
    <Btn small onClick={()=>{const nid=uid();uP(p=>{p.commands.push({id:nid,l:'새 명령어',s:'',cat:'기본'})});setEi(nid)}} style={{width:'100%',justifyContent:'center',borderStyle:'dashed',marginBottom:14}}><Plus size={9}/>명령어 추가</Btn>
    {/* Saved Colors */}
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:6}}>SAVED COLORS — 롤꾸에서 자주 쓰는 색상</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:5,alignItems:'center',marginBottom:8}}>
      {colors.map((hex,i)=><div key={i} style={{position:'relative'}}>
        <div style={{width:26,height:26,borderRadius:'50%',background:hex,border:'2px solid var(--bdr)',cursor:'pointer'}} title={hex}
          onClick={()=>{navigator.clipboard?.writeText(hex)}}/>
        <button onClick={()=>uP(p=>{p.savedColors=p.savedColors.filter((_,j)=>j!==i)})}
          style={{position:'absolute',top:-4,right:-4,width:14,height:14,borderRadius:'50%',background:'var(--red)',color:'#fff',fontSize:10,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
      </div>)}
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <input type="color" value={newColor} onChange={e=>setNewColor(e.target.value)}
          style={{width:26,height:26,border:'1px solid var(--bdr)',borderRadius:4,padding:1,cursor:'pointer'}}/>
        <Inp value={newColor} onChange={setNewColor} mono style={{width:80,fontSize:11}}/>
        <Btn small onClick={()=>{uP(p=>{if(!p.savedColors)p.savedColors=[];if(!p.savedColors.includes(newColor))p.savedColors.push(newColor)})}}>
          <Plus size={9}/>저장</Btn>
      </div>
    </div>
  </Modal>}
