import { AlertTriangle,Eye,EyeOff,FileDown,FileUp,Pencil,Plus,Trash2 } from "lucide-react";
import { useState } from "react";
import { Btn,IB,SecTitle,TA,useDialog } from '../components/ui.jsx'
import { blockFilled } from '../lib/check.js'
import { SK,allScenes,clueUsage,resolveB,uid } from '../lib/data.js'

// ===== OVERVIEW =====
// 처음 쓰는 사람용 4단계 안내 (다 하거나 "숨기기"를 누르면 사라짐)
function Onboard({sc,up,sel,go,onStart}){
  const dlg=useDialog();const key=SK+'-onb-'+sc.id;
  const[hide,setHide]=useState(()=>{try{return localStorage.getItem(key)==='1'}catch(e){return false}});
  const scenes=allScenes(sc);const filled=scenes.find(s=>(s.blocks||[]).some(b=>blockFilled(resolveB(sc,b))));
  const steps=[
    {t:'파트(장) 만들기',d:'예: Ⅰ 도착',ok:sc.parts.length>0,act:'파트 만들기',fn:async()=>{const n=await dlg.prompt('새 파트','',{placeholder:'파트 이름 (예: Ⅰ 도착)'});if(n)up(d=>{d.scenarios.find(x=>x.id===sel.sid).parts.push({id:uid(),title:n,scenes:[]})})}},
    {t:'씬 만들기',d:'파트 안에 장면을 하나씩',ok:scenes.length>0,act:'씬 만들기',fn:async()=>{if(!sc.parts.length)return;const n=await dlg.prompt('새 씬','',{placeholder:'씬 이름'});if(!n)return;const id=uid();const pt=sc.parts[0];
      up(d=>{d.scenarios.find(x=>x.id===sel.sid).parts.find(p=>p.id===pt.id).scenes.push({id,title:n,location:'',timeOfDay:'',npcsPresent:'',npcIds:[],done:false,blocks:[{id:uid(),type:'text',label:'나레이션',content:''}],sessionLog:[],connections:[]})});go({pid:sel.pid,sid:sel.sid,ptid:pt.id,scid:id,eid:null})}},
    {t:'블록 채우기',d:'나레이션·대사·판정 등을 써 넣기',ok:!!filled,act:'첫 씬 열기',fn:()=>{const s=scenes[0];if(s)go({pid:sel.pid,sid:sel.sid,ptid:s.ptid,scid:s.id,eid:null})}},
    {t:'세션 시작해 보기',d:'Space로 다음 줄을 복사해 채팅창에 붙여넣기',ok:Object.keys(sc.session?.sent||{}).length>0||(sc.sessionHistory||[]).length>0,act:'세션 시작',fn:onStart}];
  const doneN=steps.filter(x=>x.ok).length;
  if(hide||doneN===steps.length)return null;
  const nextI=steps.findIndex(x=>!x.ok);
  return<div className="onb"><div className="onb-h"><b>처음이라면 이렇게 해 보세요</b><span>{doneN} / 4</span>
      <button onClick={()=>{setHide(true);try{localStorage.setItem(key,'1')}catch(e){}}}>숨기기</button></div>
    <ol>{steps.map((x,i)=><li key={i} className={x.ok?'ok':i===nextI?'now':''}><span className="onb-n">{x.ok?'✓':i+1}</span><span className="onb-t"><b>{x.t}</b><small>{x.d}</small></span>
      {!x.ok&&i===nextI&&<button className="onb-go" onClick={x.fn} disabled={(i===1&&!sc.parts.length)||(i===2&&!scenes.length)}>{x.act}</button>}</li>)}</ol></div>}

export function OverviewP({sc,plat,up,sel,toast,exportSingle,mergeImp,setMdl,go,onStart}){
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  const use=clueUsage(sc);
  // 결론별 단서 수: 실제로 씬/엔딩에 배치된 단서만 '유효'로 센다
  const goW=w=>w.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:w.ptid,scid:w.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:w.id});
  const unplaced=sc.clues.filter(c=>!use[c.id]);const noConc=sc.clues.filter(c=>!c.isRedHerring&&!c.leadsTo?.trim());
  return<div className="ed"><div className="ed-pg">
    <div className="ed-k">SCENARIO <span>· {plat?.name||''}</span></div>
    <input className="ghost page-title ed-title" aria-label="시나리오 제목" value={sc.title} onChange={e=>uS(s=>{s.title=e.target.value})}/>
    <Onboard sc={sc} up={up} sel={sel} go={go} onStart={onStart}/>
    <div className="props">
      <span className="prop ro"><span>씬</span>{sc.parts.reduce((a,p)=>a+p.scenes.filter(s=>s.done).length,0)} / {sc.parts.reduce((a,p)=>a+p.scenes.length,0)} 진행</span>
      <span className="prop ro"><span>엔딩</span>{sc.endings.length}</span><span className="prop ro"><span>단서</span>{sc.clues.length}</span>
      <span className="prop ro"><span>세션</span>{sc.sessionHistory?.length||0}회</span>
    </div>
    <div className="blk"><div className="blk-h"><span className="blk-tag" style={{'--c':'var(--gold)'}}>배경 설정</span></div>
      <div className="blk-b"><TA value={sc.setting||''} onChange={v=>uS(s=>{s.setting=v})} placeholder="시대, 장소, 분위기"/></div></div>
    <div className="blk"><div className="blk-h"><span className="blk-tag" style={{'--c':'var(--blue)'}}>줄거리</span></div>
      <div className="blk-b"><TA value={sc.synopsis||''} onChange={v=>uS(s=>{s.synopsis=v})} placeholder="줄거리 요약"/></div></div>
    <SecTitle right={<IB I={Pencil} s={13} title="엔딩 타입 관리" onClick={()=>setMdl('endingTypes')}/>}>엔딩 종류</SecTitle>
    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:20}}>
      {sc.endingTypes.map(t=><span key={t.id} className="et-chip on" style={{'--c':t.c}}>{t.l}</span>)}</div>
    <SecTitle>단서 배치 현황 <span style={{fontWeight:500,color:'var(--tx4)'}}>· 3단서 법칙은 오른쪽 준비 점검에서</span></SecTitle>
    {!sc.clues.length?<div style={{fontSize:12,color:'var(--tx3)',marginBottom:14}}>단서가 없습니다.</div>
    :<div className="ov-tbl">
      {(unplaced.length>0||noConc.length>0)&&<div style={{padding:'6px 10px',background:'var(--goldA)',fontSize:11,color:'var(--tx2)',display:'flex',gap:6,alignItems:'center',borderBottom:'1px solid var(--bdr)'}}>
        <AlertTriangle size={12} style={{color:'var(--gold)'}}/>{[unplaced.length&&`씬에 배치되지 않은 단서 ${unplaced.length}개`,noConc.length&&`연결 결론이 없는 단서 ${noConc.length}개`].filter(Boolean).join(' · ')}</div>}
      {sc.clues.map(c=><div key={c.id} style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',padding:'6px 10px',borderBottom:'1px solid var(--bdr)',fontSize:12}}>
        <button onClick={()=>setMdl({type:'clueEdit',clueId:c.id})} style={{display:'flex',alignItems:'center',gap:5,fontWeight:600,color:'var(--tx1)',minWidth:110,fontSize:12}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:c.isRedHerring?'var(--red)':'var(--teal)'}}/>{c.name||'?'}</button>
        <span style={{fontSize:11,color:c.isRedHerring?'var(--red)':c.leadsTo?'var(--tx3)':'var(--gold)'}}>{c.isRedHerring?'미끼':c.leadsTo?'→ '+c.leadsTo:'결론 없음'}</span>
        <span style={{flex:1}}/>
        {use[c.id]?use[c.id].map((w,i)=><button key={i} onClick={()=>goW(w)} style={{fontFamily:'var(--f-label)',fontSize:10,fontWeight:600,padding:'1px 7px',borderRadius:12,background:'var(--tealA)',color:'var(--teal)'}}>{w.kind==='ending'?'🏁 ':''}{w.title}</button>)
          :<span style={{fontSize:11,color:'var(--gold)',display:'inline-flex',alignItems:'center',gap:3}}><AlertTriangle size={11}/>배치 안 됨</span>}
      </div>)}</div>}
    <SecTitle right={<IB I={Plus} s={13} onClick={()=>uS(s=>{s.eventTimeline.push({id:uid(),time:'',event:'',isHidden:false})})}/>}>사건 연표</SecTitle>
    {!sc.eventTimeline.length?<div style={{fontSize:11,color:'var(--tx3)',marginBottom:14}}>배경 사건을 시간순으로 기록</div>
    :<div style={{marginBottom:14}}>{sc.eventTimeline.map((ev,i)=><div key={ev.id} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid var(--bdr)',fontSize:12,alignItems:'center',opacity:ev.isHidden?.5:1}}>
      <input className="ghost" value={ev.time} onChange={e=>uS(s=>{s.eventTimeline[i].time=e.target.value})} placeholder="시간" style={{flex:'0 0 80px',border:'none',background:'transparent',fontFamily:'var(--f-label)',fontSize:11,fontWeight:600,color:'var(--blue)',outline:'none'}}/>
      <input className="ghost" value={ev.event} onChange={e=>uS(s=>{s.eventTimeline[i].event=e.target.value})} placeholder="사건" style={{flex:1,border:'none',background:'transparent',fontSize:12,color:'var(--tx2)',outline:'none'}}/>
      <IB I={ev.isHidden?EyeOff:Eye} s={13} title={ev.isHidden?'숨김 (플레이어 비공개)':'공개'} onClick={()=>uS(s=>{s.eventTimeline[i].isHidden=!s.eventTimeline[i].isHidden})}/><IB I={Trash2} s={13} danger title="삭제" onClick={()=>uS(s=>{s.eventTimeline.splice(i,1)})}/></div>)}</div>}
    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
      <Btn primary onClick={exportSingle}><FileDown size={11}/>이 시나리오만 내보내기</Btn>
      <Btn onClick={()=>document.getElementById('mg')?.click()}><FileUp size={11}/>시나리오 병합</Btn>
      <input type="file" id="mg" accept=".json" hidden onChange={e=>{if(e.target.files[0])mergeImp(e.target.files[0]);e.target.value=''}}/></div>
  </div></div>}
