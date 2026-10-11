import { useState } from "react";
import { ChevronDown, ChevronUp, Settings, Sparkles } from "lucide-react";
import { Btn, IB, useAct } from './ui.jsx'
import { SK } from '../lib/data.js'

// ===== 위에 고정되는 명령어 바 =====
// 명령어 · 저장 색 · ✦ 롤꾸 템플릿 칩. 누르면 마지막으로 클릭한 글 입력칸에 들어가고,
// ?{} 자리가 있으면 채우기 창이 먼저 뜬다. 버튼을 누를 때 입력칸 포커스를 뺏지 않도록 mousedown 기본동작을 막는다.
const KEY=SK+'-cmdbar';
export const colorCode=hex=>`[?{텍스트|}](#" style="color:${hex}; text-decoration:none; font-style:normal !important;)`;

export function CmdBar({plat,onManage,onTpl}){
  const{useCode}=useAct();
  const[open,setOpenS]=useState(()=>{try{return localStorage.getItem(KEY)!=='0'}catch(e){return true}});
  const setOpen=v=>{setOpenS(v);try{localStorage.setItem(KEY,v?'1':'0')}catch(e){}};
  if(!plat)return null;
  const cmds=plat.commands||[],cols=plat.savedColors||[],tpls=plat.templates||[];
  const nd=e=>e.preventDefault();
  return<div className="cmdbar no-print">
    <div className="cmdbar-row">
      <button onMouseDown={nd} onClick={()=>setOpen(!open)} title={open?'명령어 바 접기':'명령어 바 펼치기'} className="cmd-toggle">
        {open?<ChevronUp size={12}/>:<ChevronDown size={12}/>}⌘{!open&&' 명령어 바'}</button>
      {open&&<>
        {cmds.map(c=><button key={c.id} onMouseDown={nd} onClick={()=>useCode(c.s||'',c.l)} title={c.s} className="cmd-chip">
          {c.l}{c.s?.includes('?{')&&<span className="cmd-q" title="채우기 칸 있음"/>}</button>)}
        {cols.length>0&&<span className="cmd-sep"/>}
        {cols.map((hex,i)=><button key={'c'+i} onMouseDown={nd} onClick={()=>useCode(colorCode(hex),hex)} title={hex+' 글자색'} aria-label={hex+' 글자색'} className="cmd-color" style={{background:hex}}/>)}
        {tpls.length>0&&<span className="cmd-sep"/>}
        {tpls.map(t=><button key={t.id} onMouseDown={nd} onClick={()=>useCode(t.code,t.name)} title="롤꾸 템플릿" className="cmd-chip cmd-tpl"><Sparkles size={10}/>{t.name}</button>)}
        <span style={{flex:1}}/>
        <span className="cmd-hint hide-m">글 입력 중 <kbd className="kbd">/</kbd> 로도</span>
        <IB I={Settings} s={13} title="명령어 · 색상 관리" onClick={onManage}/>
        <Btn small onClick={onTpl} className="cmd-tplbtn"><Sparkles size={10}/>보관함</Btn>
      </>}
    </div>
  </div>}
