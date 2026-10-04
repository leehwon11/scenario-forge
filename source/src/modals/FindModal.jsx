import { useState, useMemo } from "react";
import { Btn,Inp,Modal,useDialog } from '../components/ui.jsx'
import { countIn,eachEntry,eachText } from '../lib/data.js'

export function FindM({D,up,setSel,setMode,onClose,toast}){const dlg=useDialog();const[t,setT]=useState('');const[rt,setRt]=useState('');const[rm,setRm]=useState('find');
  const res=useMemo(()=>{if(!t.trim())return[];const lt=t.toLowerCase(),r=[];
    eachEntry(D,(en,sc,p)=>{let c=0;const chk=v=>{if(v?.toLowerCase().includes(lt))c++};chk(en.title);chk(en.condition);
      for(const b of en.blocks||[])eachText(b,(o,k)=>chk(o[k]));
      if(c)r.push(p?{sc,p,s:en,c,tp:'scene'}:{sc,e:en,c,tp:'ending'})});return r},[t,D]);
  const countAll=()=>{if(!t)return 0;let n=0;eachEntry(D,en=>{if(en.condition)n+=countIn(en.condition,t);for(const b of en.blocks||[])eachText(b,(o,k)=>{n+=countIn(o[k],t)})});return n};
  const doReplace=async()=>{if(!t){toast('검색어 필요');return}const n=countAll();if(!n){toast('결과 없음');return}if(!await dlg.confirm(`"${t}" → "${rt}" 로 ${n}건을 바꿉니다.\n(실행 취소로 되돌릴 수 있습니다)`,{title:'모두 바꾸기',okLabel:'바꾸기'}))return;
    up(d=>{eachEntry(d,en=>{if(en.condition)en.condition=en.condition.split(t).join(rt);for(const b of en.blocks||[])eachText(b,(o,k)=>{o[k]=o[k].split(t).join(rt)})})});onClose();toast('바꾸기 완료')};
  return<Modal title="찾기 · 바꾸기" onClose={onClose} width={460} footer={rm==='replace'?<Btn primary onClick={doReplace}>바꾸기</Btn>:null}>
    <div style={{display:'flex',background:'var(--sf2)',borderRadius:6,padding:2,border:'1px solid var(--bdr)',marginBottom:10}}>
      {['find','replace'].map(m=><button key={m} onClick={()=>setRm(m)} style={{flex:1,padding:'4px 10px',borderRadius:4,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono,monospace',
        border:'none',cursor:'pointer',background:rm===m?'var(--sf1)':'transparent',color:rm===m?'var(--tx1)':'var(--tx4)'}}>{m==='find'?'찾기':'바꾸기'}</button>)}</div>
    <Inp value={t} onChange={setT} placeholder="찾을 단어" mono autoFocus style={{marginBottom:8}}/>
    {rm==='replace'&&<Inp value={rt} onChange={setRt} placeholder="바꿀 단어" mono style={{marginBottom:8}}/>}
    {rm==='replace'&&t&&<div style={{fontSize:12,color:'var(--tx3)',padding:'6px 8px',border:'1px solid var(--bdr)',borderRadius:6,marginBottom:8}}>전체에서 <b style={{color:'var(--tx1)'}}>{countAll()}건</b></div>}
    {rm==='find'&&<div style={{maxHeight:300,overflowY:'auto'}}>{!t.trim()?<div style={{color:'var(--tx3)',fontSize:11}}>검색어 입력</div>:!res.length?<div style={{color:'var(--tx3)',fontSize:11}}>없음</div>
      :res.map((r,i)=><div key={i} onClick={()=>{if(r.tp==='scene')setSel({pid:r.sc.platformId,sid:r.sc.id,ptid:r.p.id,scid:r.s.id,eid:null});else setSel({pid:r.sc.platformId,sid:r.sc.id,ptid:null,scid:null,eid:r.e.id});setMode('edit');onClose()}}
        style={{border:'1px solid var(--bdr)',borderRadius:6,padding:'7px 10px',marginBottom:4,cursor:'pointer'}}>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:600,fontSize:12}}>{r.tp==='scene'?r.s.title:r.e.title}</div>
        <div style={{fontSize:10,color:'var(--tx3)'}}>{r.sc.title} · {r.c}건</div></div>)}</div>}
  </Modal>}
