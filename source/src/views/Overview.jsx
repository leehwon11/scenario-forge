import { AlertTriangle,Eye,EyeOff,FileDown,FileUp,Pencil,Plus,Trash2 } from "lucide-react";
import { Btn,IB,SecTitle,TA } from '../components/ui.jsx'
import { clueUsage,uid } from '../lib/data.js'

// ===== OVERVIEW =====
export function OverviewP({sc,plat,up,sel,toast,exportSingle,mergeImp,setMdl,go}){
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  const use=clueUsage(sc);
  // 결론별 단서 수: 실제로 씬/엔딩에 배치된 단서만 '유효'로 센다
  const conc={};for(const c of sc.clues)if(c.leadsTo&&!c.isRedHerring){const k=c.leadsTo.trim();conc[k]??={all:0,placed:0};conc[k].all++;if(use[c.id])conc[k].placed++}
  const goW=w=>w.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:w.ptid,scid:w.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:w.id});
  const unplaced=sc.clues.filter(c=>!use[c.id]);const noConc=sc.clues.filter(c=>!c.isRedHerring&&!c.leadsTo?.trim());
  return<div>
    <div className="crumb">{plat?.name||''}</div>
    <input className="ghost page-title" aria-label="시나리오 제목" value={sc.title} onChange={e=>uS(s=>{s.title=e.target.value})} style={{fontSize:28,marginBottom:14}}/>
    <div className="rail" style={{marginBottom:16,borderLeftColor:'var(--gold)'}}>
      <div className="rail-dot" style={{borderColor:'var(--gold)'}}/>
      <span className="rail-label">// setting</span>
      <TA value={sc.setting||''} onChange={v=>uS(s=>{s.setting=v})} placeholder="시대, 장소, 분위기" bg="var(--goldA)"/></div>
    <div className="rail" style={{marginBottom:16,borderLeftColor:'var(--blue)'}}>
      <div className="rail-dot" style={{borderColor:'var(--blue)'}}/>
      <span className="rail-label">// synopsis</span>
      <TA value={sc.synopsis||''} onChange={v=>uS(s=>{s.synopsis=v})} placeholder="줄거리 요약"/></div>
    <div style={{display:'flex',gap:14,padding:'8px 0',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--tx3)',marginBottom:14,borderBottom:'1px solid var(--bdr)'}}>
      <span>씬 {sc.parts.reduce((a,p)=>a+p.scenes.filter(s=>s.done).length,0)}/{sc.parts.reduce((a,p)=>a+p.scenes.length,0)}</span>
      <span>엔딩 {sc.endings.length}</span><span>단서 {sc.clues.length}</span></div>
    <SecTitle right={<IB I={Pencil} s={13} onClick={()=>setMdl('endingTypes')}/>}>엔딩 타입</SecTitle>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:14}}>
      {sc.endingTypes.map(t=><span key={t.id} style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono,monospace',background:t.c,color:'#fff'}}>{t.l}</span>)}</div>
    <SecTitle>3단서 법칙 검증</SecTitle>
    <div style={{fontSize:11,color:'var(--tx3)',marginBottom:6}}>결론 하나에 최소 3개의 단서가 씬에 배치되어 있어야 플레이어가 놓치지 않습니다.</div>
    {Object.keys(conc).length===0?<div style={{fontSize:12,color:'var(--tx3)',marginBottom:14}}>단서 편집에서 "연결 결론"을 입력하면 여기서 검증됩니다.</div>
    :<div style={{marginBottom:14}}>{Object.entries(conc).map(([k,{all,placed}])=>{
      const st=placed>=3?{bg:'var(--greenA)',c:'var(--green)',i:'✓'}:placed>=2?{bg:'var(--goldA)',c:'var(--gold)',i:'△'}:{bg:'var(--redA)',c:'var(--red)',i:'✕'};
      return<div key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0'}}>
        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:20,background:st.bg,color:st.c,flexShrink:0}}>{st.i} {placed}/3</span><span style={{fontSize:12}}>{k}</span>
        {all>placed&&<span style={{fontSize:11,color:'var(--gold)'}}>(미배치 {all-placed}개)</span>}</div>})}</div>}
    <SecTitle>단서 배치 현황</SecTitle>
    {!sc.clues.length?<div style={{fontSize:12,color:'var(--tx3)',marginBottom:14}}>단서가 없습니다.</div>
    :<div style={{marginBottom:14,border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden'}}>
      {(unplaced.length>0||noConc.length>0)&&<div style={{padding:'6px 10px',background:'var(--goldA)',fontSize:11,color:'var(--tx2)',display:'flex',gap:6,alignItems:'center',borderBottom:'1px solid var(--bdr)'}}>
        <AlertTriangle size={12} style={{color:'var(--gold)'}}/>{[unplaced.length&&`씬에 배치되지 않은 단서 ${unplaced.length}개`,noConc.length&&`연결 결론이 없는 단서 ${noConc.length}개`].filter(Boolean).join(' · ')}</div>}
      {sc.clues.map(c=><div key={c.id} style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',padding:'6px 10px',borderBottom:'1px solid var(--bdr)',fontSize:12}}>
        <button onClick={()=>setMdl({type:'clueEdit',clueId:c.id})} style={{display:'flex',alignItems:'center',gap:5,fontWeight:600,color:'var(--tx1)',minWidth:110,fontSize:12}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:c.isRedHerring?'var(--red)':'var(--teal)'}}/>{c.name||'?'}</button>
        <span style={{fontSize:11,color:c.isRedHerring?'var(--red)':c.leadsTo?'var(--tx3)':'var(--gold)'}}>{c.isRedHerring?'미끼':c.leadsTo?'→ '+c.leadsTo:'결론 없음'}</span>
        <span style={{flex:1}}/>
        {use[c.id]?use[c.id].map((w,i)=><button key={i} onClick={()=>goW(w)} style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,padding:'1px 7px',borderRadius:12,background:'var(--tealA)',color:'var(--teal)'}}>{w.kind==='ending'?'🏁 ':''}{w.title}</button>)
          :<span style={{fontSize:11,color:'var(--gold)',display:'inline-flex',alignItems:'center',gap:3}}><AlertTriangle size={11}/>배치 안 됨</span>}
      </div>)}</div>}
    <SecTitle right={<IB I={Plus} s={13} onClick={()=>uS(s=>{s.eventTimeline.push({id:uid(),time:'',event:'',isHidden:false})})}/>}>사건 연표</SecTitle>
    {!sc.eventTimeline.length?<div style={{fontSize:11,color:'var(--tx3)',marginBottom:14}}>배경 사건을 시간순으로 기록</div>
    :<div style={{marginBottom:14}}>{sc.eventTimeline.map((ev,i)=><div key={ev.id} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid var(--bdr)',fontSize:12,alignItems:'center',opacity:ev.isHidden?.5:1}}>
      <input className="ghost" value={ev.time} onChange={e=>uS(s=>{s.eventTimeline[i].time=e.target.value})} placeholder="시간" style={{flex:'0 0 80px',border:'none',background:'transparent',fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,color:'var(--blue)',outline:'none'}}/>
      <input className="ghost" value={ev.event} onChange={e=>uS(s=>{s.eventTimeline[i].event=e.target.value})} placeholder="사건" style={{flex:1,border:'none',background:'transparent',fontSize:12,color:'var(--tx2)',outline:'none'}}/>
      <IB I={ev.isHidden?EyeOff:Eye} s={13} title={ev.isHidden?'숨김 (플레이어 비공개)':'공개'} onClick={()=>uS(s=>{s.eventTimeline[i].isHidden=!s.eventTimeline[i].isHidden})}/><IB I={Trash2} s={13} danger title="삭제" onClick={()=>uS(s=>{s.eventTimeline.splice(i,1)})}/></div>)}</div>}
    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
      <Btn primary onClick={exportSingle}><FileDown size={11}/>이 시나리오만 내보내기</Btn>
      <Btn onClick={()=>document.getElementById('mg')?.click()}><FileUp size={11}/>시나리오 병합</Btn>
      <input type="file" id="mg" accept=".json" hidden onChange={e=>{if(e.target.files[0])mergeImp(e.target.files[0]);e.target.value=''}}/></div>
  </div>}
