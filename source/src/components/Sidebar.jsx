import { useState } from "react";
import { AlertTriangle,ChevronRight,CopyPlus,ExternalLink,FolderPlus,Pencil,Plus,Settings,Sparkles,Trash2 } from "lucide-react";
import { DRAG,useDrop } from './dnd.js'
import { Btn,IB,ell,rowSt,useAct } from './ui.jsx'
import { DEF_ET,SK,clueUsage,collectBgm,dropConns,migSession,moveIdx,uid } from '../lib/data.js'

// ===== SIDEBAR =====
// 접을 수 있는 사이드바 섹션 — 접힘 상태는 이 기기에 기억
const FK=SK+'-fold';
const readFold=()=>{try{return JSON.parse(localStorage.getItem(FK))||{}}catch(e){return{}}};
function useFold(){const[f,setF]=useState(readFold);
  const toggle=id=>setF(v=>{const n={...v,[id]:!v[id]};try{localStorage.setItem(FK,JSON.stringify(n))}catch(e){}return n});return[f,toggle]}
export const Sec=({id,title,count,right,fold,children})=>{const closed=id&&fold?.[0][id];
  return<div className="sb-sec">
    {title&&<div className="sb-head">
      <button className="sb-toggle" onClick={()=>fold[1](id)} aria-expanded={!closed} title={closed?'펼치기':'접기'}>
        <ChevronRight size={11} style={{transition:'transform .12s',transform:closed?'none':'rotate(90deg)'}}/>
        <span>{title}</span>{count!=null&&<span className="sb-count">{count}</span>}</button>
      {right}</div>}
    {!closed&&children}</div>};

// 드래그 정렬용 속성 생성: kind가 같은 대상 위로만 드롭 허용
export function Sidebar({D,sel,go,setSel,up,sc,plat,op,setOp,setMdl,toast,dlg,isMobile}){
  const{removed}=useAct();const fold=useFold();
  const bgms=sc?collectBgm(sc):[];
  const addSession=async()=>{const date=new Date().toISOString().slice(0,10);const v=await dlg.prompt('세션 기록 — '+date,'',{multiline:true,placeholder:'진행한 씬, 주요 사건, 다음 세션 떡밥…'});if(v===null)return;
    uSc(s=>{s.sessionHistory.unshift({id:uid(),date,summary:v})})};
  const scs=D.scenarios.filter(s=>s.platformId===sel.pid);
  const uSc=fn=>up(d=>{fn(d.scenarios.find(x=>x.id===sel.sid))});
  const{over,src,dst}=useDrop();
  const newScenario=async()=>{if(!sel.pid){toast('사이트를 먼저 선택하세요');return}const n=await dlg.prompt('새 시나리오','',{placeholder:'시나리오 이름'});if(!n)return;const nid=uid();
    up(d=>{d.scenarios.push(migSession({id:nid,title:n,platformId:sel.pid,setting:'',synopsis:'',parts:[],endings:[],clues:[],eventTimeline:[],sessionHistory:[],endingTypes:DEF_ET.map(e=>({...e})),library:{npcs:[],items:[],places:[]}}))});
    go({pid:sel.pid,sid:nid,ptid:null,scid:null,eid:null})};
  const newEnding=async()=>{const n=await dlg.prompt('새 엔딩','',{placeholder:'엔딩 이름'});if(!n)return;const nid=uid();
    uSc(s=>{s.endings.push({id:nid,title:n,endingType:s.endingTypes[0]?.id||'normal',condition:'',blocks:[{id:uid(),type:'text',label:'엔딩 나레이션',content:''}]})});
    go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:nid})};
  const newClue=async()=>{const n=await dlg.prompt('새 단서','',{placeholder:'단서 이름'});if(!n)return;const id=uid();
    uSc(s=>{s.clues.push({id,name:n,description:'',foundInSceneId:'',leadsToSceneId:'',isRedHerring:false,leadsTo:''})});setMdl({type:'clueEdit',clueId:id})};
  const newPart=async()=>{const n=await dlg.prompt('새 파트','',{placeholder:'파트 이름 (예: 1장 — 도착)'});if(!n)return;const nid=uid();
    uSc(s=>{s.parts.push({id:nid,title:n,scenes:[]})});setOp(v=>({...v,[nid]:true}))};
  const newScene=async(p)=>{const n=await dlg.prompt('새 씬','',{placeholder:'씬 이름',message:`파트: ${p.title}`});if(!n)return;const nid=uid();
    uSc(s=>{s.parts.find(x=>x.id===p.id).scenes.push({id:nid,title:n,location:'',timeOfDay:'',npcsPresent:'',done:false,blocks:[{id:uid(),type:'text',label:'나레이션',content:''}],sessionLog:[],connections:[]})});
    setOp(v=>({...v,[p.id]:true}));go({pid:sel.pid,sid:sel.sid,ptid:p.id,scid:nid,eid:null})};
  // 씬 이동: 대상 파트의 beforeId 앞(없으면 끝)으로
  const moveScene=(from,toPt,beforeId)=>{if(from.id===beforeId)return;uSc(s=>{const fp=s.parts.find(x=>x.id===from.ptid);const i=fp.scenes.findIndex(x=>x.id===from.id);const[x]=fp.scenes.splice(i,1);
    const tp=s.parts.find(p=>p.id===toPt);const j=beforeId?tp.scenes.findIndex(y=>y.id===beforeId):-1;tp.scenes.splice(j<0?tp.scenes.length:j,0,x)});
    if(sel.scid===from.id)setSel(v=>({...v,ptid:toPt}));setOp(v=>({...v,[toPt]:true}))};
  const movePart=(fromId,beforeId)=>{if(fromId===beforeId)return;uSc(s=>{const i=s.parts.findIndex(p=>p.id===fromId);const j=s.parts.findIndex(p=>p.id===beforeId);moveIdx(s.parts,i,j)})};

  return<>
    {/* Platforms */}
    <Sec id="plat" title="사이트" count={D.platforms.length} fold={fold}>
      {D.platforms.map(p=><div key={p.id} className={'row'+(sel.pid===p.id?' sel':'')} onClick={()=>go({pid:p.id,sid:null,ptid:null,scid:null,eid:null})} style={rowSt(sel.pid===p.id)}>
        <span style={{width:7,height:7,borderRadius:'50%',background:p.color,flexShrink:0}}/><span style={ell}>{p.name}</span>
        <span style={{fontSize:10,color:'var(--tx3)',fontWeight:500}}>{D.scenarios.filter(s=>s.platformId===p.id).length}</span>
        <span className="acts" onClick={e=>e.stopPropagation()}><IB I={Pencil} s={12} title="사이트 편집" onClick={()=>setMdl({type:'platform',id:p.id})}/></span></div>)}
      <Btn small onClick={()=>setMdl('platform')} style={{width:'100%',marginTop:4,justifyContent:'center',borderStyle:'dashed'}}><Plus size={10}/>사이트</Btn>
    </Sec>
    {/* Scenarios */}
    <Sec id="scn" title="시나리오" count={scs.length} fold={fold} right={<IB I={Plus} s={13} title="새 시나리오" onClick={newScenario}/>}>
      {!scs.length&&<button onClick={newScenario} style={{width:'100%',color:'var(--tx3)',fontSize:11,textAlign:'center',padding:8,border:'1px dashed var(--bdr)',borderRadius:6}}>+ 첫 시나리오 만들기</button>}
      {scs.map(s=><div key={s.id} className={'row'+(sel.sid===s.id?' sel':'')} onClick={()=>go({pid:sel.pid,sid:s.id,ptid:null,scid:null,eid:null})} style={rowSt(sel.sid===s.id)}>
        <span style={ell}>{s.title}</span>
        <span className="acts" onClick={e=>e.stopPropagation()}><IB I={Trash2} s={12} danger title="시나리오 삭제" onClick={async()=>{if(!await dlg.confirm(`"${s.title}" 시나리오와 그 안의 모든 씬·엔딩·단서가 삭제됩니다.`,{title:'시나리오 삭제',okLabel:'삭제',danger:true}))return;
          removed(`"${s.title}"`,()=>up(d=>{d.scenarios=d.scenarios.filter(x=>x.id!==s.id)}));if(sel.sid===s.id)setSel(v=>({...v,sid:null,ptid:null,scid:null,eid:null}))}}/></span></div>)}
    </Sec>
    {sc&&<>
    {/* Scene Tree */}
    <Sec id="scenes" title="씬" count={sc.parts.reduce((a,p)=>a+p.scenes.length,0)} fold={fold} right={<IB I={Settings} s={13} onClick={()=>setMdl('cmd')} title="명령어 라이브러리"/>}>
      {sc.parts.map(p=>{const isO=op[p.id];const dc=p.scenes.filter(s=>s.done).length;const pk='p'+p.id;
        return<div key={p.id} style={{marginBottom:2}}>
          <div className={'row'+(over===pk?(DRAG?.kind==='part'?' drag-over-top':' drag-over-in'):'')} {...src({kind:'part',id:p.id})}
            {...dst(pk,d=>d.kind==='part'||d.kind==='scene',d=>d.kind==='part'?movePart(d.id,p.id):moveScene(d,p.id,null))}
            onClick={()=>setOp(v=>({...v,[p.id]:!v[p.id]}))}
            style={{display:'flex',alignItems:'center',gap:4,padding:'4px 6px',borderRadius:6,cursor:'pointer',fontFamily:'var(--f-label)',fontSize:11,fontWeight:600,color:'var(--tx2)'}}>
            <span style={{fontSize:10,color:'var(--tx3)',width:12,textAlign:'center',transition:'transform .1s',transform:isO?'rotate(90deg)':'none'}}>▶</span>
            <span style={ell}>{p.title}</span>
            <span style={{fontSize:10,color:'var(--tx3)'}}>{dc}/{p.scenes.length}</span>
            <span className="acts" onClick={e=>e.stopPropagation()} style={{display:'flex',gap:1}}>
              <IB I={Pencil} s={11} title="파트 이름 변경" onClick={async()=>{const n=await dlg.prompt('파트 이름 변경',p.title);if(n)uSc(s=>{s.parts.find(x=>x.id===p.id).title=n})}}/>
              <IB I={Trash2} s={11} danger title="파트 삭제" onClick={async()=>{if(!await dlg.confirm(`"${p.title}" 파트와 씬 ${p.scenes.length}개가 삭제됩니다.`,{title:'파트 삭제',okLabel:'삭제',danger:true}))return;
                removed(`파트 "${p.title}"`,()=>uSc(s=>{s.parts=s.parts.filter(x=>x.id!==p.id);dropConns(s,new Set(p.scenes.map(x=>x.id)))}));if(sel.ptid===p.id)setSel(v=>({...v,ptid:null,scid:null}))}}/>
            </span>
          </div>
          {isO&&<div style={{paddingLeft:14,marginLeft:8,borderLeft:'1px solid var(--bdr)'}}>
            {p.scenes.map(s=>{const k='s'+s.id;const on=sel.scid===s.id;return<div key={s.id} className={'row'+(on?' sel':'')+(over===k?' drag-over-top':'')} {...src({kind:'scene',id:s.id,ptid:p.id})}
              {...dst(k,d=>d.kind==='scene',d=>moveScene(d,p.id,s.id))}
              onClick={()=>go({pid:sel.pid,sid:sel.sid,ptid:p.id,scid:s.id,eid:null})}
              style={{display:'flex',alignItems:'center',gap:5,padding:'3px 6px',borderRadius:5,cursor:'pointer',fontFamily:'var(--f-label)',fontSize:11,
                boxShadow:over===k?'0 -2px 0 0 var(--blue)':undefined,borderLeft:`2px solid ${s.done?'var(--green)':'transparent'}`,
                background:on?'var(--blueA)':undefined,color:on?'var(--blue)':s.done?'var(--tx3)':'var(--tx2)',textDecoration:s.done?'line-through':'none'}}>
              <input type="checkbox" checked={s.done||false} title="진행 완료" onChange={e=>{const v=e.target.checked;uSc(x=>{x.parts.find(y=>y.id===p.id).scenes.find(y=>y.id===s.id).done=v})}}
                onClick={e=>e.stopPropagation()} style={{accentColor:'var(--green)',margin:0,cursor:'pointer',width:12,height:12,flexShrink:0}}/>
              <span style={ell}>{s.title}</span>
              <span className="acts" onClick={e=>e.stopPropagation()} style={{display:'flex',gap:1}}>
                <IB I={CopyPlus} s={11} title="씬 복제" onClick={()=>{uSc(x=>{const pt2=x.parts.find(y=>y.id===p.id);const cp=JSON.parse(JSON.stringify(s));cp.id=uid();cp.title+=' (복사)';cp.done=false;for(const b of cp.blocks)b.id=uid();const i=pt2.scenes.findIndex(y=>y.id===s.id);pt2.scenes.splice(i+1,0,cp)});toast('복제됨')}}/>
                <IB I={Trash2} s={11} danger title="씬 삭제" onClick={()=>{
                  removed(`씬 "${s.title}"`,()=>uSc(x=>{const p2=x.parts.find(y=>y.id===p.id);p2.scenes=p2.scenes.filter(y=>y.id!==s.id);dropConns(x,new Set([s.id]))}));if(sel.scid===s.id)setSel(v=>({...v,scid:null}))}}/>
              </span></div>})}
            <Btn small onClick={()=>newScene(p)} style={{width:'100%',justifyContent:'center',marginTop:2,borderStyle:'dashed'}}><Plus size={10}/>씬</Btn>
          </div>}
        </div>})}
      <Btn small onClick={newPart} style={{width:'100%',justifyContent:'center',marginTop:4,borderStyle:'dashed'}}><FolderPlus size={11}/>파트</Btn>
      {sc.parts.some(p=>p.scenes.length>1)&&!isMobile&&<div style={{fontSize:10,color:'var(--tx3)',marginTop:6,textAlign:'center'}}>씬·파트는 끌어서 순서를 바꿀 수 있습니다</div>}
    </Sec>
    {/* Endings */}
    <Sec id="end" title="엔딩" count={sc.endings.length} fold={fold} right={<IB I={Plus} s={13} title="새 엔딩" onClick={newEnding}/>}>
      {!sc.endings.length&&<div style={{color:'var(--tx3)',fontSize:11,padding:'2px 8px'}}>없음</div>}
      {sc.endings.map(e=>{const et=sc.endingTypes.find(t=>t.id===e.endingType)||{l:'?',c:'#8b949e'};const on=sel.eid===e.id;
        return<div key={e.id} className={'row'+(on?' sel':'')} onClick={()=>go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:e.id})} style={{...rowSt(on),fontSize:12,padding:'3px 8px'}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:et.c,flexShrink:0}}/>
          <span style={ell}>{e.title||'(제목 없음)'}</span>
          <span style={{fontFamily:'var(--f-label)',fontSize:10,fontWeight:700,color:et.c,flexShrink:0}}>{et.l}</span>
          <span className="acts" onClick={ev=>ev.stopPropagation()}><IB I={Trash2} s={11} danger title="엔딩 삭제" onClick={()=>{
            removed(`엔딩 "${e.title}"`,()=>uSc(s=>{s.endings=s.endings.filter(x=>x.id!==e.id);dropConns(s,new Set([e.id]))}));if(sel.eid===e.id)setSel(v=>({...v,eid:null}))}}/></span>
        </div>})}
    </Sec>
    {/* Clues */}
    <Sec id="clue" title="단서" count={sc.clues.length} fold={fold} right={<IB I={Plus} s={13} title="새 단서" onClick={newClue}/>}>
      {(()=>{const use=clueUsage(sc);return sc.clues.map(c=><div key={c.id} className="row" onClick={()=>setMdl({type:'clueEdit',clueId:c.id})} style={{...rowSt(false),fontSize:12,padding:'3px 8px',color:'var(--tx2)'}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:c.isRedHerring?'var(--red)':'var(--teal)',flexShrink:0}}/>
        <span style={ell}>{c.name}</span>
        {!use[c.id]&&<span title="어느 씬에도 배치되지 않음"><AlertTriangle size={11} style={{color:'var(--gold)'}}/></span>}
        {c.isRedHerring&&<span style={{fontFamily:'var(--f-label)',fontSize:10,fontWeight:700,color:'var(--red)',background:'var(--redA)',padding:'0 5px',borderRadius:8}}>미끼</span>}
        <span className="acts" onClick={e=>e.stopPropagation()}><IB I={Trash2} s={11} danger title="단서 삭제" onClick={()=>removed(`단서 "${c.name}"`,()=>uSc(s=>{s.clues=s.clues.filter(x=>x.id!==c.id)}))}/></span>
      </div>)})()}
      {!sc.clues.length&&<div style={{color:'var(--tx3)',fontSize:11,padding:'2px 8px'}}>없음</div>}
    </Sec>
    {/* BGM — 시나리오 안의 BGM 블록을 순서대로 모아 보기 */}
    <Sec id="bgm" title="BGM" count={bgms.length} fold={fold}>
      {!bgms.length&&<div className="sb-empty">씬에 BGM 블록을 넣으면 여기에 순서대로 모입니다</div>}
      {bgms.map((g,i)=>{const on=g.scid?sel.scid===g.scid:sel.eid===g.eid;
        return<div key={g.b.id} className={'row'+(on?' sel':'')} onClick={()=>go(g.scid?{pid:sel.pid,sid:sel.sid,ptid:g.ptid,scid:g.scid,eid:null}:{pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:g.eid})}
          style={{...rowSt(on),alignItems:'flex-start',fontSize:12,padding:'4px 8px'}}>
          <span className="sb-idx">{String(i+1).padStart(2,'0')}</span>
          <span style={{flex:1,minWidth:0}}><span style={{...ell,display:'block',fontWeight:600}}>♪ {g.b.title||'(제목 없음)'}</span>
            <span style={{...ell,display:'block',fontSize:10.5,color:'var(--tx3)'}}>{g.where}</span></span>
          {/^https?:\/\//i.test(g.b.url||'')&&<a href={g.b.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="새 탭에서 열기" className="sb-link"><ExternalLink size={12}/></a>}
        </div>})}
    </Sec>
    {/* Sessions — 세션 기록 (여러 줄, 최신이 위) */}
    <Sec id="sess" title="세션 기록" count={sc.sessionHistory?.length||0} fold={fold} right={<IB I={Plus} s={13} title="오늘 세션 기록 추가" onClick={addSession}/>}>
      {(sc.sessionHistory||[]).map(s=><div key={s.id} className="row sb-sess" onClick={async()=>{const v=await dlg.prompt(`세션 기록 — ${s.date}`,s.summary,{multiline:true});if(v!==null)uSc(x=>{x.sessionHistory.find(y=>y.id===s.id).summary=v})}}>
        <div style={{display:'flex',alignItems:'center',gap:5}}><span className="sb-date">{s.date}</span><span style={{flex:1}}/>
          <span className="acts" onClick={e=>e.stopPropagation()}><IB I={Trash2} s={11} danger title="세션 기록 삭제" onClick={()=>removed(`${s.date} 세션 기록`,()=>uSc(x=>{x.sessionHistory=x.sessionHistory.filter(y=>y.id!==s.id)}))}/></span></div>
        <div className="sb-sum">{s.summary||'(클릭해서 입력)'}</div></div>)}
      {!sc.sessionHistory?.length&&<button className="sb-empty sb-empty-btn" onClick={addSession}>+ 오늘 세션 기록 남기기</button>}
    </Sec>
    <Sec><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
      <Btn small onClick={()=>setMdl('lib')} style={{justifyContent:'center',borderStyle:'dashed'}}>NPC · 아이템 · 장소</Btn>
      <Btn small onClick={()=>setMdl('tpl')} style={{justifyContent:'center',borderStyle:'dashed',color:'var(--teal)'}}><Sparkles size={10}/>롤꾸 보관함</Btn></div></Sec>
    </>}
    {!sc&&<div style={{color:'var(--tx3)',fontSize:11,textAlign:'center',padding:16}}>시나리오를 선택하면 씬·엔딩·단서가 표시됩니다</div>}
  </>;
}
