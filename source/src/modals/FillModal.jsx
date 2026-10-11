import { useState, useMemo, useEffect, useRef } from "react";
import { Copy } from "lucide-react";
import { Btn, Modal, TA, copyText, useAct } from '../components/ui.jsx'
import { renderR20 } from '../lib/r20.js'
import { parseQueries, fillQueries } from '../lib/rollkku.js'

// ===== ?{질문|안내문} 채우기 =====
// fill = {code, title, mode:'insert'|'replace', onApply(result)}
export function FillM({fill,onClose}){
  const{code,title,mode,onApply}=fill;const{toast}=useAct();
  const fields=useMemo(()=>parseQueries(code),[code]);
  const[vals,setVals]=useState({});const[keep,setKeep]=useState(true);const[br,setBr]=useState(true);
  const result=useMemo(()=>fillQueries(code,vals,keep,br),[code,vals,keep,br]);
  const apply=()=>{onApply(result);onClose()};
  useEffect(()=>{const h=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();apply()}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)});
  const box=useRef();
  useEffect(()=>{const t=setTimeout(()=>{box.current?.querySelector('textarea,select')?.focus()},40);return()=>clearTimeout(t)},[]);
  return<Modal title={'✦ '+(title||'채우기')} onClose={onClose} width={560} footer={<>
      <Btn onClick={async()=>{if(await copyText(result))toast('복사했습니다')}}><Copy size={11}/>복사</Btn>
      <Btn primary onClick={apply} title="Ctrl+Enter">{mode==='replace'?'적용':'삽입'}</Btn></>}>
    <div ref={box}>
      <div className="fill-hint">이번 장면에 맞게 채워주세요. 비워 둔 칸은 아래 설정대로 처리됩니다. <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Enter</kbd>로 바로 {mode==='replace'?'적용':'삽입'}.</div>
      {fields.map(f=><div key={f.key} style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:4}}>
          <span className="fill-lab">{f.label}</span>{f.def&&!f.options&&<span className="fill-def">안내: {f.def}</span>}</div>
        {f.options?<select value={vals[f.key]||''} onChange={e=>setVals(v=>({...v,[f.key]:e.target.value}))} className="fill-sel">
            <option value="">(비워두기)</option>{f.options.map((o,i)=><option key={i} value={o.value}>{o.label}</option>)}</select>
          :<TA value={vals[f.key]||''} onChange={x=>setVals(v=>({...v,[f.key]:x}))} placeholder={f.def||'내용 입력'}/>}
      </div>)}
      <div className="fill-opts">
        <label><input type="checkbox" checked={keep} onChange={e=>setKeep(e.target.checked)}/>빈칸은 <code>?{'{}'}</code> 그대로 두기 <span>(끄면 안내문으로 채움)</span></label>
        <label><input type="checkbox" checked={br} onChange={e=>setBr(e.target.checked)}/>줄바꿈을 <code>{'<br>'}</code>로 바꾸기 <span>(Roll20에서 한 메시지로 유지)</span></label>
      </div>
      <div className="r20-box"><div className="r20-head">미리보기</div><div className="r20chat" dangerouslySetInnerHTML={{__html:renderR20(result)}}/></div>
    </div>
  </Modal>}

// 블록 아래 "✦ ?{} 채우기 · N칸" 버튼 — 글 안의 ?{}를 채운 값으로 바꾼다
export function QFillBtn({text,onApply}){const{openFill}=useAct();
  const n=useMemo(()=>text&&text.includes('?{')?parseQueries(text).length:0,[text]);if(!n)return null;
  return<button className="qfill" onClick={()=>openFill({code:text,title:'?{} 채우기',mode:'replace',onApply})}>✦ ?{'{}'} 채우기 · {n}칸</button>}
