import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { Check,Copy,X } from "lucide-react";

// ===== UI ATOMS =====
// 한 줄 말줄임, 목록 행 공통 스타일
export const ell={flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'};
export const rowSt=(on)=>({display:'flex',alignItems:'center',gap:5,padding:'4px 8px',borderRadius:6,cursor:'pointer',background:on?'var(--blueA)':undefined,color:on?'var(--blue)':'var(--tx2)',fontWeight:on?600:500});
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
    style={{width:'100%',border:'1px solid var(--bdr)',borderRadius:6,padding:'6px 10px',fontSize:12,outline:'none',background:'var(--sf1)',color:'var(--tx1)',fontFamily:mono?'var(--f-mono)':'inherit',...(sx||{})}} {...p}/>);
export const TA=({value,onChange,placeholder,bg,style:sx})=>{const ref=useRef();
  // 높이를 다시 잴 때 잠깐 height:auto가 되면서 화면이 위로 튀는 것을 막기 위해 스크롤 위치를 되돌린다
  const rs=useCallback(()=>{const el=ref.current;if(!el)return;const sp=el.closest('.main');const top=sp?sp.scrollTop:0;
    el.style.height='auto';el.style.height=el.scrollHeight+2+'px';if(sp&&sp.scrollTop!==top)sp.scrollTop=top},[]);
  useEffect(rs,[value]);
  return<textarea ref={ref} value={value} onChange={e=>{onChange(e.target.value);rs()}} placeholder={placeholder}
    style={{width:'100%',minHeight:38,border:'1px solid var(--bdr)',borderRadius:6,padding:'10px 12px',fontSize:13,lineHeight:1.7,background:bg||'var(--sf1)',color:'var(--tx2)',outline:'none',resize:'none',overflow:'hidden',...(sx||{})}}/>};
export const SecTitle=({children,right})=>(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
  <span style={{fontFamily:'var(--f-label)',fontSize:10,fontWeight:600,color:'var(--tx3)',letterSpacing:'.02em'}}>{children}</span>{right}</div>);
export const Label=({children})=><label style={{fontFamily:'var(--f-label)',fontSize:10,fontWeight:600,color:'var(--tx3)',display:'block',marginBottom:3}}>{children}</label>;
export const Modal=({title,onClose,children,footer,width=520})=>{
  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[onClose]);
  return<div style={{position:'fixed',inset:0,background:'#141B2D73',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div role="dialog" aria-label={typeof title==='string'?title:undefined} style={{background:'var(--sf1)',borderRadius:14,border:'1px solid var(--bdr)',boxShadow:'0 8px 40px rgba(0,0,0,.3)',width:'100%',maxWidth:width,maxHeight:'84vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid var(--bdr)'}}>
        <h3 style={{fontFamily:'var(--f-title)',fontSize:16,fontWeight:700,color:'var(--tx1)',margin:0}}>{title}</h3><IB I={X} onClick={onClose} title="닫기"/></div>
      <div style={{padding:'14px 16px',overflowY:'auto',flex:1}}>{children}</div>
      {footer&&<div style={{display:'flex',justifyContent:'flex-end',gap:6,padding:'10px 16px',borderTop:'1px solid var(--bdr)'}}>{footer}</div>}</div></div>};

// 토스트: action={label,fn}을 주면 버튼이 붙는다 (예: 삭제 후 "되돌리기")
export function useToast(){const[m,setM]=useState(null);const t=useRef();
  const show=useCallback((msg,dur=1600,action=null)=>{clearTimeout(t.current);setM({msg,action});t.current=setTimeout(()=>setM(null),dur)},[]);
  const T=m?<div role="status" aria-live="polite" className="toast">{m.msg}
    {m.action&&<button onClick={()=>{clearTimeout(t.current);setM(null);m.action.fn()}} className="toast-act">{m.action.label}</button>}</div>:null;
  return{show,T}}

// 앱 전역 동작 (토스트, 되돌릴 수 있는 삭제) — 깊은 컴포넌트에서 props 없이 사용
export const ActCtx=createContext({toast:()=>{},removed:()=>{}});
export const useAct=()=>useContext(ActCtx);

export function useMedia(q){const[m,setM]=useState(()=>typeof matchMedia!=='undefined'&&matchMedia(q).matches);
  useEffect(()=>{const mq=matchMedia(q);const h=()=>setM(mq.matches);mq.addEventListener('change',h);return()=>mq.removeEventListener('change',h)},[q]);return m}

// 클립보드 복사 (http 환경 등 Clipboard API가 없을 때는 예전 방식으로)
// 세션 미니 창(Document Picture-in-Picture)이 열려 있고 그 창에 포커스가 있으면 그 창의 클립보드를 쓴다
let copyWin=null;export const setCopyWin=w=>{copyWin=w};
export async function copyText(text){
  const W=copyWin&&!copyWin.closed&&copyWin.document.hasFocus()?copyWin:window;
  try{if(W.navigator.clipboard?.writeText){await W.navigator.clipboard.writeText(text);return true}}catch(e){}
  const doc=W.document;const ta=doc.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0;top:0;left:0';doc.body.appendChild(ta);ta.select();
  let ok=false;try{ok=doc.execCommand('copy')}catch(e){}doc.body.removeChild(ta);return ok}
// 원문 복사 버튼. icon: 아이콘만 (줄별 복사용)
export function CopyBtn({text,label='복사',icon,className,title='원문 복사'}){const[ok,setOk]=useState(false);
  return<button title={title} aria-label={title} className={'copybtn'+(className?' '+className:'')+(ok?' copied':'')} onClick={async e=>{e.stopPropagation();if(await copyText(text)){setOk(true);setTimeout(()=>setOk(false),1200)}}}
    style={icon?{display:'inline-flex',alignItems:'center',justifyContent:'center',width:22,height:20,borderRadius:6,border:'1px solid var(--bdr)',color:ok?'var(--green)':'var(--tx3)',flexShrink:0,cursor:'pointer'}
      :{display:'inline-flex',alignItems:'center',gap:3,marginLeft:6,padding:'0 7px',borderRadius:10,border:'1px solid var(--bdr)',fontFamily:'var(--f-label)',fontSize:10,fontWeight:600,color:ok?'var(--green)':'var(--tx3)',cursor:'pointer',verticalAlign:'middle',flexShrink:0}}>
    {ok?<Check size={11}/>:<Copy size={11}/>}{!icon&&(ok?'복사됨':label)}</button>}
// 여러 줄 텍스트를 줄 단위로 보여주고, 줄마다 복사 버튼 (마우스를 올리면 진하게)
// render: 줄 표시 방식(기본: 그대로), wrap: 복사할 문자열 가공 (예: Roll20 /as 접두어)
export function Lines({text,render,wrap=l=>l,style}){
  if(!text)return null;
  return<div style={style}>{text.split('\n').map((l,i)=>l.trim()
    ?<div key={i} className="tline">{render?<span className="tline-t" dangerouslySetInnerHTML={{__html:render(l)}}/>:<span className="tline-t">{l}</span>}<CopyBtn text={wrap(l)} icon className="line-copy" title="이 줄 복사"/></div>
    :<div key={i} style={{height:8}}/>)}</div>}

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
  const ok=()=>close(req.kind==='prompt'?(req.multiline?val.replace(/\s+$/,''):val.trim()?val.trim():null):true);
  return<DlgCtx.Provider value={api.current}>{children}
    {req&&<Modal title={req.title} width={req.multiline?520:400} onClose={()=>close(req.kind==='prompt'?null:false)}
      footer={<>{req.kind!=='alert'&&<Btn onClick={()=>close(req.kind==='prompt'?null:false)}>취소</Btn>}
        <Btn primary={!req.danger} danger={req.danger} onClick={ok} style={req.danger?{background:'var(--red)',color:'#fff',borderColor:'var(--red)'}:undefined} autoFocus={req.kind!=='prompt'}>{req.okLabel||'확인'}</Btn></>}>
      {req.message&&<div style={{fontSize:13,color:'var(--tx2)',whiteSpace:'pre-wrap',marginBottom:req.kind==='prompt'?8:0}}>{req.message}</div>}
      {req.kind==='prompt'&&(req.multiline
        ?<><textarea value={val} onChange={e=>setVal(e.target.value)} placeholder={req.placeholder} autoFocus rows={6} className="dlg-ta"
            onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();ok()}}}/>
          <div style={{fontSize:10.5,color:'var(--tx3)',marginTop:4}}>Ctrl+Enter로 저장</div></>
        :<Inp value={val} onChange={setVal} placeholder={req.placeholder} autoFocus onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)ok()}}/>)}
    </Modal>}
  </DlgCtx.Provider>}
