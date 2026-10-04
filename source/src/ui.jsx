import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { X, Copy, Check } from "lucide-react";

// ===== UI ATOMS =====
export const Btn=({children,onClick,primary,danger,small,disabled,style:sx,className,...p})=>(
  <button onClick={onClick} disabled={disabled} className={['btn',danger&&'btn-danger',className].filter(Boolean).join(' ')} style={{display:'inline-flex',alignItems:'center',gap:4,border:`1px solid ${primary?'var(--blue)':danger?'var(--redA)':'var(--bdr)'}`,
    background:primary?'var(--blue)':'transparent',color:primary?'#fff':danger?'var(--red)':'var(--tx3)',
    padding:small?'3px 8px':'5px 11px',borderRadius:6,fontSize:small?11:12,fontWeight:600,whiteSpace:'nowrap',opacity:disabled?.35:1,cursor:disabled?'default':'pointer',transition:'all .1s',...(sx||{})}} {...p}>{children}</button>);
// danger: 휴지통 등 파괴적 동작 — 평소엔 회색, 마우스를 올리면 빨간색
export const IB=({I,onClick,title,active,s=15,disabled,danger,style:sx})=>(
  <button onClick={onClick} title={title} aria-label={title} disabled={disabled} className={'ib'+(danger?' ib-danger':'')+(active?' ib-active':'')}
    style={{border:'none',background:active?'var(--blue)':'transparent',color:active?'#fff':'var(--tx3)',
    width:s+6,height:s+6,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:disabled?.25:1,cursor:disabled?'default':'pointer',transition:'all .08s',...(sx||{})}}><I size={s-2}/></button>);
export const Inp=({value,onChange,placeholder,mono,style:sx,...p})=>(
  <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{width:'100%',border:'1px solid var(--bdr)',borderRadius:6,padding:'6px 10px',fontSize:12,outline:'none',background:'var(--sf1)',color:'var(--tx1)',fontFamily:mono?'JetBrains Mono,monospace':'inherit',...(sx||{})}} {...p}/>);
export const TA=({value,onChange,placeholder,bg,style:sx})=>{const ref=useRef();
  const rs=useCallback(()=>{if(ref.current){ref.current.style.height='auto';ref.current.style.height=ref.current.scrollHeight+2+'px'}},[]);
  useEffect(rs,[value]);
  return<textarea ref={ref} value={value} onChange={e=>{onChange(e.target.value);rs()}} placeholder={placeholder}
    style={{width:'100%',minHeight:38,border:'1px solid var(--bdr)',borderRadius:6,padding:'10px 12px',fontSize:13,lineHeight:1.7,background:bg||'var(--sf1)',color:'var(--tx2)',outline:'none',resize:'none',overflow:'hidden',...(sx||{})}}/>};
export const SecTitle=({children,right})=>(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',letterSpacing:'.06em',textTransform:'uppercase'}}>{children}</span>{right}</div>);
export const Label=({children})=><label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',display:'block',marginBottom:3}}>{children}</label>;
export const Modal=({title,onClose,children,footer,width=520})=>{
  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[onClose]);
  return<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div role="dialog" aria-label={typeof title==='string'?title:undefined} style={{background:'var(--sf1)',borderRadius:10,border:'1px solid var(--bdr)',boxShadow:'0 8px 40px rgba(0,0,0,.3)',width:'100%',maxWidth:width,maxHeight:'84vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid var(--bdr)'}}>
        <h3 style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:700,color:'var(--tx1)',margin:0}}>{title}</h3><IB I={X} onClick={onClose} title="닫기"/></div>
      <div style={{padding:'14px 16px',overflowY:'auto',flex:1}}>{children}</div>
      {footer&&<div style={{display:'flex',justifyContent:'flex-end',gap:6,padding:'10px 16px',borderTop:'1px solid var(--bdr)'}}>{footer}</div>}</div></div>};

export function useToast(){const[m,setM]=useState(null);const t=useRef();
  const show=useCallback((msg,dur=1600)=>{clearTimeout(t.current);setM(msg);t.current=setTimeout(()=>setM(null),dur)},[]);
  const T=m?<div role="status" style={{position:'fixed',bottom:20,left:'50%',transform:'translateX(-50%)',background:'var(--tx1)',color:'var(--bg)',padding:'8px 16px',borderRadius:20,fontSize:12,fontWeight:600,zIndex:200,maxWidth:'calc(100vw - 32px)'}}>{m}</div>:null;
  return{show,T}}

export function useMedia(q){const[m,setM]=useState(()=>typeof matchMedia!=='undefined'&&matchMedia(q).matches);
  useEffect(()=>{const mq=matchMedia(q);const h=()=>setM(mq.matches);mq.addEventListener('change',h);return()=>mq.removeEventListener('change',h)},[q]);return m}

// 원문 복사 버튼 (채팅창에 바로 붙여넣기용)
export function CopyBtn({text}){const[ok,setOk]=useState(false);
  return<button title="원문 복사" onClick={()=>{navigator.clipboard?.writeText(text).then(()=>{setOk(true);setTimeout(()=>setOk(false),1200)})}}
    style={{display:'inline-flex',alignItems:'center',gap:3,marginLeft:6,padding:'0 6px',borderRadius:10,border:'1px solid var(--bdr)',fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:ok?'var(--green)':'var(--tx3)',cursor:'pointer',verticalAlign:'middle'}}>
    {ok?<Check size={10}/>:<Copy size={10}/>}{ok?'복사됨':'복사'}</button>}

// ===== 앱 내부 대화상자 (브라우저 기본 prompt/confirm/alert 대체) =====
const DlgCtx=createContext(null);
export const useDialog=()=>useContext(DlgCtx);
export function DialogProvider({children}){
  const[req,setReq]=useState(null);const[val,setVal]=useState('');
  const open=useCallback(o=>new Promise(res=>{setVal(o.value??'');setReq({...o,res})}),[]);
  const api=useRef(null);
  if(!api.current)api.current={
    prompt:(title,value='',o={})=>open({kind:'prompt',title,value,...o}),
    confirm:(message,o={})=>open({kind:'confirm',title:o.title||'확인',message,...o}),
    alert:(message,o={})=>open({kind:'alert',title:o.title||'알림',message,...o}),
  };
  const close=r=>{req?.res(r);setReq(null)};
  const ok=()=>close(req.kind==='prompt'?(val.trim()?val.trim():null):true);
  return<DlgCtx.Provider value={api.current}>{children}
    {req&&<Modal title={req.title} width={400} onClose={()=>close(req.kind==='prompt'?null:false)}
      footer={<>{req.kind!=='alert'&&<Btn onClick={()=>close(req.kind==='prompt'?null:false)}>취소</Btn>}
        <Btn primary={!req.danger} danger={req.danger} onClick={ok} style={req.danger?{background:'var(--red)',color:'#fff',borderColor:'var(--red)'}:undefined} autoFocus={req.kind!=='prompt'}>{req.okLabel||'확인'}</Btn></>}>
      {req.message&&<div style={{fontSize:13,color:'var(--tx2)',whiteSpace:'pre-wrap',marginBottom:req.kind==='prompt'?8:0}}>{req.message}</div>}
      {req.kind==='prompt'&&<Inp value={val} onChange={setVal} placeholder={req.placeholder} autoFocus onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)ok()}}/>}
    </Modal>}
  </DlgCtx.Provider>}
