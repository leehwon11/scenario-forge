import { useState } from "react";
import { CopyPlus, Plus, Sparkles, Trash2 } from "lucide-react";
import { Btn, Inp, Modal, TA, useAct, useDialog } from '../components/ui.jsx'
import { renderR20 } from '../lib/r20.js'
import { parseQueries } from '../lib/rollkku.js'
import { uid } from '../lib/data.js'

// ===== ✦ 롤꾸 보관함 =====
// 사이트별로 자주 쓰는 롤꾸 코드를 저장. ?{질문|안내문} 자리는 쓸 때마다 채우기 창이 뜬다.
export function TplM({plat,up,sel,onClose}){
  const dlg=useDialog();const{useCode,removed}=useAct();
  const[ei,setEi]=useState(plat?.templates?.[0]?.id||null);
  if(!plat)return<Modal title="✦ 롤꾸 보관함" onClose={onClose}><div style={{color:'var(--tx3)'}}>사이트를 먼저 선택하세요</div></Modal>;
  const tpls=plat.templates||[];const ed=tpls.find(t=>t.id===ei);
  const uP=fn=>up(d=>{const p=d.platforms.find(x=>x.id===sel.pid);p.templates??=[];fn(p)});
  const uT=fn=>uP(p=>{const t=p.templates.find(x=>x.id===ei);if(t)fn(t)});
  const fields=ed?parseQueries(ed.code):[];
  return<Modal title={'✦ 롤꾸 보관함 — '+plat.name} onClose={onClose} width={740} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    <div className="fill-hint">자주 쓰는 롤꾸 코드를 저장해 두세요. 매번 바뀌는 자리는 <code className="tpl-q">{'?{질문|안내문}'}</code>으로 비워 두면, 쓸 때마다 <b>질문이 입력칸 이름</b>, <b>안내문이 회색 힌트</b>로 떠서 바로 채울 수 있습니다. 저장한 템플릿은 명령어 바와 <kbd className="kbd">/</kbd> 목록에 <span style={{color:'var(--teal)'}}>✦</span>로 나옵니다.</div>
    <div className="tpl-grid">
      <div className="tpl-list">
        {tpls.map(t=><button key={t.id} onClick={()=>setEi(t.id)} className={'tpl-item'+(t.id===ei?' on':'')}>
          {t.name||'(이름 없음)'}<small>{parseQueries(t.code).length}칸</small></button>)}
        <Btn small onClick={()=>{const nid=uid();uP(p=>{p.templates.push({id:nid,name:'새 템플릿',code:'/desc [?{내용|}](#" style="display:block; text-decoration:none;)'})});setEi(nid)}}
          style={{justifyContent:'center',borderStyle:'dashed',marginTop:4}}><Plus size={10}/>새 템플릿</Btn>
      </div>
      <div style={{minWidth:0}}>{!ed?<div style={{color:'var(--tx3)',fontSize:12,padding:20,textAlign:'center'}}>왼쪽에서 템플릿을 고르거나 새로 만드세요</div>:<>
        <Inp value={ed.name} onChange={v=>uT(t=>{t.name=v})} placeholder="템플릿 이름" aria-label="템플릿 이름" style={{marginBottom:6,fontWeight:600}}/>
        <TA value={ed.code} onChange={v=>uT(t=>{t.code=v})} placeholder="롤꾸 코드" style={{fontFamily:'JetBrains Mono,ui-monospace,monospace',fontSize:11,lineHeight:1.55,maxHeight:220,overflowY:'auto'}}/>
        <div className="tpl-fields"><span>입력칸</span>
          {fields.length?fields.map(f=><span key={f.key} className="tpl-f" title={f.def?'안내: '+f.def:''}>{f.label}{f.def&&<i> · {f.def.length>10?f.def.slice(0,10)+'…':f.def}</i>}</span>)
          :<em>없음 — 누르면 그대로 들어갑니다</em>}</div>
        <div className="r20-box" style={{marginBottom:8}}><div className="r20-head">미리보기</div><div className="r20chat" dangerouslySetInnerHTML={{__html:renderR20(ed.code)}}/></div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          <Btn primary small onClick={()=>{onClose();setTimeout(()=>useCode(ed.code,ed.name),50)}} title="마지막으로 클릭한 글 입력칸에 넣기"><Sparkles size={10}/>지금 사용</Btn>
          <Btn small onClick={()=>{const nid=uid();uP(p=>{p.templates.push({...JSON.parse(JSON.stringify(ed)),id:nid,name:ed.name+' (복사)'})});setEi(nid)}}><CopyPlus size={10}/>복제</Btn>
          <Btn danger small onClick={()=>{removed(`템플릿 "${ed.name}"`,()=>uP(p=>{p.templates=p.templates.filter(x=>x.id!==ed.id)}));setEi(null)}}><Trash2 size={10}/>삭제</Btn>
        </div></>}
      </div>
    </div>
  </Modal>}
