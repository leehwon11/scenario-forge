import { useState } from "react";
import { AlertTriangle,Check,ChevronRight,CopyPlus,ExternalLink,FolderPlus,LayoutList,Palette,Pencil,Plus,Sparkles,Trash2,Users } from "lucide-react";
import { DRAG,useDrop } from './dnd.js'
import { IB,useAct } from './ui.jsx'
import { DEF_ET,SK,clueUsage,collectBgm,dropConns,migSession,moveIdx,uid } from '../lib/data.js'

// ===== 왼쪽 씬 목록 (Desk) =====
// 파트별 씬 목록(번호 · 제목 · 준비 상태 점) + 아래쪽에 엔딩·단서·BGM·세션 기록·자료 바로가기.
// 씬·파트는 끌어서 순서를 바꾼다. 펼침 상태는 이 기기에 기억.
const FK=SK+'-nav';
const readFold=()=>{try{return JSON.parse(localStorage.getItem(FK))||{}}catch(e){return{}}};
export const LV_C={ok:'var(--green)',warn:'var(--gold)',bad:'var(--red)'};

// 새 시나리오 (홈 화면·위쪽 바에서도 씀)
export function makeScenario(pid,title){return migSession({id:uid(),title,platformId:pid,setting:'',synopsis:'',parts:[],endings:[],clues:[],eventTimeline:[],sessionHistory:[],endingTypes:DEF_ET.map(e=>({...e})),library:{npcs:[],items:[],places:[]}})}

function More({id,label,count,open,toggle,onAdd,addTitle,children}){
  return<div className="nm">
    <div className="nm-h">
      <button className="nm-t" onClick={()=>toggle(id)} aria-expanded={!!open}>
        <ChevronRight size={12} style={{transition:'transform .12s',transform:open?'rotate(90deg)':'none'}}/>{label}<span className="nm-c">{count}</span></button>
      {onAdd&&<IB I={Plus} s={14} title={addTitle} onClick={onAdd}/>}</div>
    {open&&<div className="nm-list">{children}</div>}</div>}

export function Nav({sel,go,setSel,up,sc,plat,op,setOp,setMdl,toast,dlg,isMobile,issues}){
  const{removed}=useAct();
  const[fold,setFold]=useState(readFold);
  const toggle=id=>setFold(v=>{const n={...v,[id]:!v[id]};try{localStorage.setItem(FK,JSON.stringify(n))}catch(e){}return n});
  const uSc=fn=>up(d=>{fn(d.scenarios.find(x=>x.id===sel.sid))});
  const{over,src,dst}=useDrop();
  const bgms=collectBgm(sc);const use=clueUsage(sc);
  const base={pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:null};

  const addSession=async()=>{const date=new Date().toISOString().slice(0,10);const v=await dlg.prompt('세션 기록 — '+date,'',{multiline:true,placeholder:'진행한 씬, 주요 사건, 다음 세션 떡밥…'});if(v===null)return;
    uSc(s=>{s.sessionHistory.unshift({id:uid(),date,summary:v})});setFold(f=>({...f,sess:true}))};
  const newEnding=async()=>{const n=await dlg.prompt('새 엔딩','',{placeholder:'엔딩 이름'});if(!n)return;const nid=uid();
    uSc(s=>{s.endings.push({id:nid,title:n,endingType:s.endingTypes[0]?.id||'normal',condition:'',needs:[],blocks:[{id:uid(),type:'text',label:'엔딩 나레이션',content:''}]})});
    setFold(f=>({...f,end:true}));go({...base,eid:nid})};
  const newClue=async()=>{const n=await dlg.prompt('새 단서','',{placeholder:'단서 이름'});if(!n)return;const id=uid();
    uSc(s=>{s.clues.push({id,name:n,description:'',isRedHerring:false,leadsTo:''})});setFold(f=>({...f,clue:true}));setMdl({type:'clueEdit',clueId:id})};
  const newPart=async()=>{const n=await dlg.prompt('새 파트','',{placeholder:'파트 이름 (예: Ⅰ 도착)'});if(!n)return;const nid=uid();
    uSc(s=>{s.parts.push({id:nid,title:n,scenes:[]})});setOp(v=>({...v,[nid]:true}))};
  const newScene=async(p)=>{const n=await dlg.prompt('새 씬','',{placeholder:'씬 이름',message:`파트: ${p.title}`});if(!n)return;const nid=uid();
    uSc(s=>{s.parts.find(x=>x.id===p.id).scenes.push({id:nid,title:n,location:'',timeOfDay:'',npcsPresent:'',npcIds:[],done:false,blocks:[{id:uid(),type:'text',label:'나레이션',content:''}],sessionLog:[],connections:[]})});
    setOp(v=>({...v,[p.id]:true}));go({...base,ptid:p.id,scid:nid})};
  const moveScene=(from,toPt,beforeId)=>{if(from.id===beforeId)return;uSc(s=>{const fp=s.parts.find(x=>x.id===from.ptid);const i=fp.scenes.findIndex(x=>x.id===from.id);const[x]=fp.scenes.splice(i,1);
    const tp=s.parts.find(p=>p.id===toPt);const j=beforeId?tp.scenes.findIndex(y=>y.id===beforeId):-1;tp.scenes.splice(j<0?tp.scenes.length:j,0,x)});
    if(sel.scid===from.id)setSel(v=>({...v,ptid:toPt}));setOp(v=>({...v,[toPt]:true}))};
  const movePart=(fromId,beforeId)=>{if(fromId===beforeId)return;uSc(s=>{const i=s.parts.findIndex(p=>p.id===fromId);const j=s.parts.findIndex(p=>p.id===beforeId);moveIdx(s.parts,i,j)})};

  let n=0;
  return<nav className="nav" aria-label="씬 목록">
    <button className={'nav-ov'+(!sel.scid&&!sel.eid?' on':'')} onClick={()=>go(base)}><LayoutList size={14}/>시나리오 개요</button>

    {!sc.parts.length&&<div className="nav-empty">파트(장)를 만들고 그 안에 씬을 추가하세요.</div>}
    {sc.parts.map(p=>{const isO=op[p.id]!==false;const pk='p'+p.id;const dc=p.scenes.filter(s=>s.done).length;
      return<div key={p.id} className="nav-part">
        <div className={'nav-pt row'+(over===pk?(DRAG?.kind==='part'?' drag-over-top':' drag-over-in'):'')} {...src({kind:'part',id:p.id})}
          {...dst(pk,d=>d.kind==='part'||d.kind==='scene',d=>d.kind==='part'?movePart(d.id,p.id):moveScene(d,p.id,null))}
          onClick={()=>setOp(v=>({...v,[p.id]:!isO}))} aria-expanded={isO}>
          <ChevronRight size={11} className="nav-chev" style={{transform:isO?'rotate(90deg)':'none'}}/>
          <span className="nav-pt-t">{p.title}</span><span className="nav-pt-c">{dc}/{p.scenes.length}</span>
          <span className="acts" onClick={e=>e.stopPropagation()}>
            <IB I={Plus} s={12} title="이 파트에 씬 추가" onClick={()=>newScene(p)}/>
            <IB I={Pencil} s={11} title="파트 이름 변경" onClick={async()=>{const v=await dlg.prompt('파트 이름 변경',p.title);if(v)uSc(s=>{s.parts.find(x=>x.id===p.id).title=v})}}/>
            <IB I={Trash2} s={11} danger title="파트 삭제" onClick={async()=>{if(!await dlg.confirm(`"${p.title}" 파트와 씬 ${p.scenes.length}개가 삭제됩니다.`,{title:'파트 삭제',okLabel:'삭제',danger:true}))return;
              removed(`파트 "${p.title}"`,()=>uSc(s=>{s.parts=s.parts.filter(x=>x.id!==p.id);dropConns(s,new Set(p.scenes.map(x=>x.id)))}));if(sel.ptid===p.id)setSel(v=>({...v,ptid:null,scid:null}))}}/></span>
        </div>
        {isO&&<>
          {p.scenes.map(s=>{n++;const k='s'+s.id;const on=sel.scid===s.id;const is=issues[s.id]||{lv:'ok',notes:[]};
            return<div key={s.id} className={'nav-it row'+(on?' on':'')+(s.done?' done':'')+(over===k?' drag-over-top':'')} {...src({kind:'scene',id:s.id,ptid:p.id})}
              {...dst(k,d=>d.kind==='scene',d=>moveScene(d,p.id,s.id))} onClick={()=>go({...base,ptid:p.id,scid:s.id})}
              title={is.notes.length?is.notes.map(x=>x.t).join('\n'):'준비 완료'} aria-current={on?'page':undefined}>
              <span className="nav-n">{s.done?<Check size={12}/>:n}</span><span className="nav-t">{s.title}</span>
              <span className="acts" onClick={e=>e.stopPropagation()}>
                <IB I={Check} s={11} title={s.done?'진행 완료 해제':'진행 완료로 표시'} active={s.done} onClick={()=>uSc(x=>{const y=x.parts.find(q=>q.id===p.id).scenes.find(q=>q.id===s.id);y.done=!y.done})}/>
                <IB I={CopyPlus} s={11} title="씬 복제" onClick={()=>{uSc(x=>{const pt2=x.parts.find(y=>y.id===p.id);const cp=JSON.parse(JSON.stringify(s));cp.id=uid();cp.title+=' (복사)';cp.done=false;for(const b of cp.blocks)b.id=uid();const i=pt2.scenes.findIndex(y=>y.id===s.id);pt2.scenes.splice(i+1,0,cp)});toast('복제됨')}}/>
                <IB I={Trash2} s={11} danger title="씬 삭제" onClick={()=>{removed(`씬 "${s.title}"`,()=>uSc(x=>{const p2=x.parts.find(y=>y.id===p.id);p2.scenes=p2.scenes.filter(y=>y.id!==s.id);dropConns(x,new Set([s.id]))}));if(sel.scid===s.id)setSel(v=>({...v,scid:null}))}}/></span>
              <span className="nav-dot" style={{background:LV_C[is.lv]}} aria-label={{ok:'준비 완료',warn:'확인 필요',bad:'문제 있음'}[is.lv]}/>
            </div>})}
          {!p.scenes.length&&<button className="nav-add" onClick={()=>newScene(p)}><Plus size={12}/>씬 추가</button>}
        </>}
      </div>})}
    <button className="nav-add" onClick={newPart}><FolderPlus size={13}/>파트 추가</button>
    {sc.parts.some(p=>p.scenes.length>1)&&!isMobile&&<div className="nav-tip">씬·파트는 끌어서 순서를 바꿀 수 있어요</div>}

    <div className="nav-more">
      <More id="end" label="엔딩" count={sc.endings.length} open={fold.end} toggle={toggle} onAdd={newEnding} addTitle="새 엔딩">
        {sc.endings.map(e=>{const et=sc.endingTypes.find(t=>t.id===e.endingType)||{l:'?',c:'#8A90A6'};const on=sel.eid===e.id;const is=issues[e.id]||{lv:'ok',notes:[]};
          return<div key={e.id} className={'nav-it row'+(on?' on':'')} onClick={()=>go({...base,eid:e.id})} title={is.notes.map(x=>x.t).join('\n')||undefined}>
            <span className="nav-et" style={{background:et.c}}>{et.l}</span><span className="nav-t">{e.title||'(제목 없음)'}</span>
            <span className="acts" onClick={ev=>ev.stopPropagation()}><IB I={Trash2} s={11} danger title="엔딩 삭제" onClick={()=>{
              removed(`엔딩 "${e.title}"`,()=>uSc(s=>{s.endings=s.endings.filter(x=>x.id!==e.id);dropConns(s,new Set([e.id]))}));if(sel.eid===e.id)setSel(v=>({...v,eid:null}))}}/></span>
            <span className="nav-dot" style={{background:LV_C[is.lv]}}/></div>})}
        {!sc.endings.length&&<div className="nav-empty">아직 엔딩이 없어요</div>}
      </More>
      <More id="clue" label="단서" count={sc.clues.length} open={fold.clue} toggle={toggle} onAdd={newClue} addTitle="새 단서">
        {sc.clues.map(c=><div key={c.id} className="nav-it row" onClick={()=>setMdl({type:'clueEdit',clueId:c.id})}>
          <span className="nav-cd" style={{background:c.isRedHerring?'var(--red)':'var(--teal)'}}/><span className="nav-t">{c.name}</span>
          {!use[c.id]&&<span title="어느 씬에도 배치되지 않음" style={{display:'flex'}}><AlertTriangle size={12} style={{color:'var(--gold)'}}/></span>}
          {c.isRedHerring&&<span className="nav-tag">미끼</span>}
          <span className="acts" onClick={e=>e.stopPropagation()}><IB I={Trash2} s={11} danger title="단서 삭제" onClick={()=>removed(`단서 "${c.name}"`,()=>uSc(s=>{s.clues=s.clues.filter(x=>x.id!==c.id)}))}/></span></div>)}
        {!sc.clues.length&&<div className="nav-empty">아직 단서가 없어요</div>}
      </More>
      <More id="bgm" label="BGM" count={bgms.length} open={fold.bgm} toggle={toggle}>
        {!bgms.length&&<div className="nav-empty">씬에 BGM 블록을 넣으면 여기에 순서대로 모여요</div>}
        {bgms.map((g,i)=><div key={g.b.id} className="nav-it row" onClick={()=>go(g.scid?{...base,ptid:g.ptid,scid:g.scid}:{...base,eid:g.eid})}>
          <span className="nav-n">{i+1}</span><span className="nav-t">{g.b.title||'(제목 없음)'}<small>{g.where}</small></span>
          {/^https?:\/\//i.test(g.b.url||'')&&<a href={g.b.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="새 탭에서 열기" className="sb-link"><ExternalLink size={12}/></a>}</div>)}
      </More>
      <More id="sess" label="세션 기록" count={sc.sessionHistory?.length||0} open={fold.sess} toggle={toggle} onAdd={addSession} addTitle="오늘 세션 기록 추가">
        {(sc.sessionHistory||[]).map(s=><div key={s.id} className="nav-log row" onClick={async()=>{const v=await dlg.prompt(`세션 기록 — ${s.date}`,s.summary,{multiline:true});if(v!==null)uSc(x=>{x.sessionHistory.find(y=>y.id===s.id).summary=v})}}>
          <div className="nav-log-h"><span>{s.date}</span><span className="acts" onClick={e=>e.stopPropagation()}><IB I={Trash2} s={11} danger title="세션 기록 삭제" onClick={()=>removed(`${s.date} 세션 기록`,()=>uSc(x=>{x.sessionHistory=x.sessionHistory.filter(y=>y.id!==s.id)}))}/></span></div>
          <div className="nav-log-b">{s.summary||'(눌러서 입력)'}</div></div>)}
        {!sc.sessionHistory?.length&&<button className="nav-add" onClick={addSession}><Plus size={12}/>오늘 세션 기록 남기기</button>}
      </More>
      <button className="nav-link" onClick={()=>setMdl({type:'lib'})}><Users size={14}/>NPC · 아이템 · 장소<span className="nm-c">{Object.values(sc.library||{}).reduce((a,v)=>a+(v?.length||0),0)}</span></button>
      <button className="nav-link" onClick={()=>setMdl('tpl')}><Sparkles size={14}/>롤꾸 보관함<span className="nm-c">{plat?.templates?.length||0}</span></button>
      <button className="nav-link" onClick={()=>setMdl('cmd')}><Palette size={14}/>명령어 · 색<span className="nm-c">{plat?.commands?.length||0}</span></button>
    </div>
  </nav>}
