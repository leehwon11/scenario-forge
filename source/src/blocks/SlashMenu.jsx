import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Settings } from "lucide-react";

// ===== "/" 명령어 팔레트 =====
// 블록 글 입력칸에서 줄 처음이나 공백 뒤에 "/"를 치면 현재 사이트의 명령어 라이브러리가 뜬다.
// "/de"처럼 이어 치면 걸러지고, ↑↓로 고르고 Enter·Tab으로 넣는다 (Esc: 닫고 "/"는 그대로 둠).

const PROPS=['boxSizing','width','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
  'fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','lineHeight','textTransform','wordSpacing','tabSize'];
// textarea 안 글자 위치의 화면 좌표 (보이지 않는 복제 div로 계산)
function caretXY(ta,pos){
  const cs=getComputedStyle(ta);const div=document.createElement('div');
  for(const p of PROPS)div.style[p]=cs[p];
  Object.assign(div.style,{position:'absolute',visibility:'hidden',whiteSpace:'pre-wrap',wordWrap:'break-word',overflow:'hidden',top:'0',left:'-9999px',height:'auto'});
  div.textContent=ta.value.slice(0,pos);const mk=document.createElement('span');mk.textContent=ta.value.slice(pos)||'.';div.appendChild(mk);
  document.body.appendChild(div);const top=mk.offsetTop,left=mk.offsetLeft,lh=parseFloat(cs.lineHeight)||18;document.body.removeChild(div);
  const r=ta.getBoundingClientRect();const z=r.width/ta.offsetWidth||1; // 화면 확대(zoom) 보정
  return{x:r.left+(left-ta.scrollLeft)*z,y:r.top+(top-ta.scrollTop+lh)*z}}

const setVal=(ta,v)=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(ta,v);ta.dispatchEvent(new Event('input',{bubbles:true}))};

export function SlashMenu({rootRef,cmds,colors=[],onManage}){
  const[st,setSt]=useState(null); // {ta,start,end,q,x,y}
  const[idx,setIdx]=useState(0);const stRef=useRef(null);stRef.current=st;
  const dismissed=useRef(null); // Esc로 닫은 "/" 위치 — 같은 "/"에서는 다시 열지 않음
  const items=st?[...cmds.map(c=>({key:c.id,label:c.l,snip:c.s,cat:c.cat})),
      ...colors.map(h=>({key:'c'+h,label:h,snip:`[텍스트](#" style="color:${h};text-decoration:none;)`,cat:'색상',color:h}))]
    .filter(it=>{const q=st.q.toLowerCase();return!q||it.label.toLowerCase().includes(q)||it.snip.toLowerCase().includes(q)||(it.cat||'').toLowerCase().includes(q)}).slice(0,10):[];
  const itemsRef=useRef(items);itemsRef.current=items;const idxRef=useRef(0);idxRef.current=idx;

  const insert=useCallback(it=>{const s=stRef.current;if(!s||!it)return;const{ta,start,end}=s;const v=ta.value;
    setSt(null);setVal(ta,v.slice(0,start)+it.snip+v.slice(end));ta.focus();ta.selectionStart=ta.selectionEnd=start+it.snip.length},[]);

  useEffect(()=>{const root=rootRef.current;if(!root)return;
    const onInput=e=>{const ta=e.target;if(ta.tagName!=='TEXTAREA')return;const caret=ta.selectionStart;if(caret!==ta.selectionEnd){setSt(null);return}
      const m=ta.value.slice(0,caret).match(/(?:^|\s)\/([^\s/]{0,24})$/);
      if(!m){if(stRef.current)setSt(null);return}
      const start=caret-m[1].length-1;const prev=stRef.current;
      if(dismissed.current&&dismissed.current.ta===ta&&dismissed.current.start===start)return;
      const pos=prev&&prev.ta===ta&&prev.start===start?{x:prev.x,y:prev.y}:caretXY(ta,start);
      setSt({ta,start,end:caret,q:m[1],...pos});if(!prev||prev.q!==m[1])setIdx(0)};
    const onKey=e=>{const s=stRef.current;if(!s||e.target!==s.ta||e.isComposing)return;const n=itemsRef.current.length;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismissed.current={ta:s.ta,start:s.start};setSt(null)}
      else if(!n)return;
      else if(e.key==='ArrowDown'){e.preventDefault();setIdx(i=>(i+1)%n)}
      else if(e.key==='ArrowUp'){e.preventDefault();setIdx(i=>(i-1+n)%n)}
      else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();insert(itemsRef.current[idxRef.current])}};
    const close=e=>{const s=stRef.current;if(s&&e.target!==s.ta&&!e.target.closest?.('.slash-menu'))setSt(null)};
    const blur=e=>{if(stRef.current&&e.target===stRef.current.ta)setTimeout(()=>{if(document.activeElement!==stRef.current?.ta)setSt(null)},120)};
    root.addEventListener('input',onInput,true);root.addEventListener('keydown',onKey,true);root.addEventListener('focusout',blur,true);document.addEventListener('mousedown',close);
    return()=>{root.removeEventListener('input',onInput,true);root.removeEventListener('keydown',onKey,true);root.removeEventListener('focusout',blur,true);document.removeEventListener('mousedown',close)}},[rootRef,insert]);

  if(!st)return null;
  const below=st.y+260<window.innerHeight;
  return createPortal(<div className="slash-menu" role="listbox" aria-label="명령어"
    style={{left:Math.min(st.x,window.innerWidth-300),...(below?{top:st.y+4}:{bottom:window.innerHeight-st.y+24})}} onMouseDown={e=>e.preventDefault()}>
    <div className="slash-head">명령어 {st.q&&<b>/{st.q}</b>}<span>↑↓ 선택 · Enter 넣기 · Esc 닫기</span></div>
    {!items.length&&<div className="slash-empty">{cmds.length||colors.length?'일치하는 명령어가 없습니다':'이 사이트에 등록된 명령어가 없습니다'}</div>}
    {items.map((it,i)=><button key={it.key} role="option" aria-selected={i===idx} className={'slash-item'+(i===idx?' on':'')} onMouseEnter={()=>setIdx(i)} onClick={()=>insert(it)}>
      {it.color?<span className="slash-sw" style={{background:it.color}}/>:<span className="slash-l">{it.label}</span>}
      <span className="slash-s">{it.color?it.label:it.snip}</span>{it.cat&&<span className="slash-c">{it.cat}</span>}</button>)}
    {onManage&&<button className="slash-manage" onClick={()=>{setSt(null);onManage()}}><Settings size={11}/>명령어 라이브러리 편집</button>}
  </div>,document.body)}
