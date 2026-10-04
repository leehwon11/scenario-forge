import { useState, useEffect, useRef, useMemo } from "react";
import { renderCoco,renderR20 } from '../lib/r20.js'

// ===== R20 / COCO PREVIEW =====
export function R20P({scene}){
  // Only narration (text) and lines — not memo, truth, clue, etc.
  const raw=useMemo(()=>{const ts=[];
    for(const b of(scene.blocks||[])){
      if(b.type==='text'&&b.content)ts.push(b.content);
      if(b.type==='lines'&&b.items)for(const l of b.items)if(l.text)ts.push((l.label?'/as "'+l.label+'" ':'')+l.text);
    }return ts.join('\n')},[scene.blocks]);
  // Debounce rendering to prevent scroll jumps
  const[html,setHtml]=useState('');
  const timer=useRef();
  useEffect(()=>{clearTimeout(timer.current);timer.current=setTimeout(()=>{
    setHtml(raw?renderR20(raw):'<div style="color:#999;font-size:12px;padding:10px">나레이션·대사 블록에 Roll20 명령어를 입력하면 미리보기가 표시됩니다</div>')
  },300);return()=>clearTimeout(timer.current)},[raw]);
  return<div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden'}}>
    <div style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:'#161b22',borderBottom:'1px solid #30363d',fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'#484f58'}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:'#f85149'}}/>Roll20 Chat — 나레이션 · 대사만 표시</div>
    <div className="r20chat" dangerouslySetInnerHTML={{__html:html}}/></div>}
export function CocoP({scene}){const ts=[];for(const b of(scene.blocks||[])){if(b.type==='text'&&b.content)ts.push(b.content);if(b.type==='lines'&&b.items)for(const l of b.items)if(l.text)ts.push((l.label?l.label+'：':'')+l.text)}
  return<div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden',marginBottom:16}}>
    <div style={{padding:'5px 10px',background:'#2a2a3a',borderBottom:'1px solid #3a3a4a',fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'#888'}}>코코포리아 미리보기</div>
    <div style={{background:'#1e1e2e',minHeight:50,maxHeight:300,overflowY:'auto'}} dangerouslySetInnerHTML={{__html:ts.length?renderCoco(ts.join('\n')):'<div style="color:#666;font-size:12px;padding:10px">코코포리아 서식 입력 시 표시</div>'}}/></div>}
