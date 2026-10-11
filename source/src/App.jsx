import React from "react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search,Plus,Trash2,Copy,Check,ChevronRight,ChevronDown,Undo2,Redo2,Sun,Moon,CloudUpload,CloudDownload,Printer,FileDown,FileUp,FolderPlus,Settings,BookOpen,Eye,EyeOff,Pencil,X,ArrowUp,ArrowDown,CopyPlus,PanelLeftClose,PanelLeftOpen,AlertTriangle,FileText,MessageSquareQuote,GitBranch,Dice5,Music,MapPin,Package,Users,Sparkles,StickyNote,Lightbulb,ChevronUp,ExternalLink } from "lucide-react";
import { renderR20, renderCoco, r20Inline } from './r20.js'
import { isConfigured, koErr, getSession, onAuth, signIn, signUp, signOut, resetPw, updatePw, cloudMeta, cloudLoad, cloudSave } from './supabase.js'



// ===== CONSTANTS =====
const SK='scenario-forge-v4';
const BT={
  truth:{l:'진상',c:'var(--coral)',I:Sparkles},text:{l:'나레이션',c:'var(--blue)',I:FileText},
  memo:{l:'키퍼 메모',c:'var(--gold)',I:BookOpen},clue:{l:'단서',c:'var(--teal)',I:Lightbulb},
  lines:{l:'대사',c:'#c07030',I:MessageSquareQuote},branches:{l:'선택지 분기',c:'var(--blue)',I:GitBranch},
  checks:{l:'판정 결과',c:'var(--red)',I:Dice5},npc:{l:'NPC',c:'var(--purple)',I:Users},
  handout:{l:'핸드아웃',c:'var(--teal)',I:FileDown},bgm:{l:'BGM',c:'var(--coral)',I:Music},
  item:{l:'아이템',c:'var(--gold)',I:Package},place:{l:'장소',c:'var(--blue)',I:MapPin},
  'session-log':{l:'세션 메모',c:'var(--purple)',I:StickyNote},
};
const DEF_ET=[{id:'normal',l:'노멀',c:'#8b949e'},{id:'good',l:'해피',c:'#d29922'},{id:'bad',l:'배드',c:'#f85149'},{id:'true',l:'트루',c:'#39d2c0'},{id:'special',l:'특수',c:'#bc8cff'}];
const PLAT_C=['#58a6ff','#d29922','#4a6aac','#f85149','#8b949e','#bc8cff','#39d2c0','#c07030'];
const uid=()=>'id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function defData(){const r=uid(),k=uid();return{platforms:[
  {id:r,name:'Roll20',color:'#58a6ff',commands:[{id:uid(),l:'/desc',s:'/desc ',cat:'기본'},{id:uid(),l:'굵게',s:'**텍스트**',cat:'서식'},{id:uid(),l:'/emas',s:'/emas "이름" ',cat:'기본'},{id:uid(),l:'/as',s:'/as "이름" ',cat:'기본'},{id:uid(),l:'Oosh',s:'[텍스트](#" style="color:#AA0000;text-decoration:none;)',cat:'롤꾸'}]},
  {id:k,name:'코코포리아',color:'#bc8cff',commands:[{id:uid(),l:'귓속말',s:'((귓속말: ))',cat:'기본'},{id:uid(),l:'설명',s:'【설명】',cat:'기본'}]}
],scenarios:[],cloud:{token:'',gistId:''},theme:'dark'}}

function mig(d){delete d.cloud;d.theme??='dark';
for(const p of(d.platforms||[])){if(p.templates===undefined)p.templates=/roll20/i.test(p.name)?defTpl():[];p.savedColors??=[];p.commands??=[]}
for(const sc of(d.scenarios||[])){
  sc.library??={npcs:[],items:[],places:[]};for(const k of['npcs','items','places'])if(!Array.isArray(sc.library[k]))sc.library[k]=[];
  sc.endingTypes??=DEF_ET.map(e=>({...e}));sc.endings??=[];sc.clues??=[];sc.eventTimeline??=[];sc.sessionHistory??=[];sc.setting??='';sc.synopsis??='';
  for(const c of sc.clues){c.isRedHerring??=false;c.leadsTo??=''}
  for(const e of sc.endings){e.blocks??=[];e.condition??='';e.endingType??='normal'}
  for(const p of(sc.parts||[]))for(const s of(p.scenes||[])){
    if(!Array.isArray(s.blocks))s.blocks=[{id:uid(),type:'text',label:'나레이션',content:''}];
    s.location??='';s.timeOfDay??='';s.npcsPresent??='';s.sessionLog??=[];s.connections??=[];
  }
}
if(d.library){for(const sc of d.scenarios)if(!sc.library.npcs.length&&d.library.npcs)sc.library.npcs=[...d.library.npcs];delete d.library}
return d}

// ===== PERSISTENCE =====
async function loadS(){try{const r=localStorage.getItem(SK);if(r)return mig(JSON.parse(r))}catch(e){}return mig(defData())}
async function saveS(d){try{localStorage.setItem(SK,JSON.stringify(d))}catch(e){}}

// ===== UI ATOMS =====
const st=(s)=>({...s}); // shorthand
const Btn=({children,onClick,primary,danger,small,disabled,style:sx,...p})=>(
  <button onClick={onClick} disabled={disabled} style={{display:'inline-flex',alignItems:'center',gap:4,border:`1px solid ${primary?'var(--blue)':danger?'var(--redA)':'var(--bdr)'}`,
    background:primary?'var(--blue)':danger?'transparent':'transparent',color:primary?'#fff':danger?'var(--red)':'var(--tx3)',
    padding:small?'3px 8px':'5px 11px',borderRadius:6,fontSize:small?11:12,fontWeight:600,whiteSpace:'nowrap',opacity:disabled?.35:1,cursor:disabled?'default':'pointer',transition:'all .1s',...(sx||{})}} {...p}>{children}</button>);
const IB=({I,onClick,title,active,s=15,disabled,style:sx})=>(
  <button onClick={onClick} title={title} disabled={disabled} style={{border:'none',background:active?'var(--blue)':'transparent',color:active?'#fff':'var(--tx4)',
    width:s+6,height:s+6,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',opacity:disabled?.25:1,cursor:disabled?'default':'pointer',transition:'all .08s',...(sx||{})}}><I size={s-2}/></button>);
const Inp=({value,onChange,placeholder,mono,style:sx,...p})=>(
  <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{width:'100%',border:'1px solid var(--bdr)',borderRadius:6,padding:'6px 10px',fontSize:12,outline:'none',background:'var(--sf1)',color:'var(--tx1)',fontFamily:mono?'JetBrains Mono,monospace':'inherit',...(sx||{})}} {...p}/>);
const TA=({value,onChange,placeholder,bg,style:sx})=>{const ref=useRef();
  const rs=useCallback(()=>{const el=ref.current;if(!el)return;const sp=el.closest('[data-scroll]');const st=sp?sp.scrollTop:0;el.style.height='auto';el.style.height=el.scrollHeight+2+'px';if(sp&&sp.scrollTop!==st)sp.scrollTop=st},[]);
  useEffect(rs,[value]);
  return<textarea ref={ref} value={value} onChange={e=>{onChange(e.target.value);rs()}} placeholder={placeholder}
    style={{width:'100%',minHeight:38,border:'1px solid var(--bdr)',borderRadius:6,padding:'10px 12px',fontSize:13,lineHeight:1.7,background:bg||'var(--sf1)',color:'var(--tx2)',outline:'none',resize:'none',overflow:'hidden',...(sx||{})}}/>};
const SecTitle=({children,right})=>(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,fontWeight:600,color:'var(--tx4)',letterSpacing:'.06em',textTransform:'uppercase'}}>{children}</span>{right}</div>);
const Modal=({title,onClose,children,footer,width=520})=>(
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div style={{background:'var(--sf1)',borderRadius:10,border:'1px solid var(--bdr)',boxShadow:'0 8px 40px rgba(0,0,0,.3)',width:'100%',maxWidth:width,maxHeight:'84vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid var(--bdr)'}}>
        <h3 style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:700,color:'var(--tx1)',margin:0}}>{title}</h3><IB I={X} onClick={onClose}/></div>
      <div style={{padding:'14px 16px',overflowY:'auto',flex:1}}>{children}</div>
      {footer&&<div style={{display:'flex',justifyContent:'flex-end',gap:6,padding:'10px 16px',borderTop:'1px solid var(--bdr)'}}>{footer}</div>}</div></div>);

function useToast(){const[m,setM]=useState(null);const t=useRef();
  const show=useCallback((msg,dur=1600)=>{clearTimeout(t.current);setM(msg);t.current=setTimeout(()=>setM(null),dur)},[]);
  const T=m?<div style={{position:'fixed',bottom:20,left:'50%',transform:'translateX(-50%)',background:'var(--tx1)',color:'var(--bg)',padding:'8px 16px',borderRadius:20,fontSize:12,fontWeight:600,zIndex:200}}>{m}</div>:null;
  return{show,T}}

// ===== MAIN APP =====
export default function App(){
  const[D,setD]=useState(null);const[loading,setL]=useState(true);
  const[sel,setSel]=useState({pid:null,sid:null,ptid:null,scid:null,eid:null});
  const[mode,setMode]=useState('edit');const[gm,setGm]=useState(true);
  const[theme,setThm]=useState('dark');const[op,setOp]=useState({});
  const[modal,setMdl]=useState(null);const[sbOpen,setSb]=useState(true);
  const[zoom,setZoom]=useState(1);const[r20On,setR20On]=useState(false);
  const{show:toast,T:Toast}=useToast();
  const hist=useRef([]);const hi=useRef(-1);const ht=useRef();

  useEffect(()=>{loadS().then(d=>{setD(d);setThm(d.theme||'dark');
    if(d.platforms?.length)setSel(s=>({...s,pid:s.pid||d.platforms[0].id}));
    hist.current=[JSON.stringify(d)];hi.current=0;setL(false)})},[]);

  const svt=useRef();
  useEffect(()=>{if(!D||loading)return;clearTimeout(svt.current);svt.current=setTimeout(()=>saveS(D),300);
    clearTimeout(ht.current);ht.current=setTimeout(()=>{const sn=JSON.stringify(D);
      if(hi.current>=0&&hist.current[hi.current]===sn)return;
      hist.current=hist.current.slice(0,hi.current+1);hist.current.push(sn);if(hist.current.length>50)hist.current.shift();hi.current=hist.current.length-1},500)},[D]);

  useEffect(()=>{document.documentElement.setAttribute('data-theme',theme)},[theme]);

  const up=useCallback(fn=>{setD(p=>{const n=JSON.parse(JSON.stringify(p));fn(n);return n})},[]);
  const undo=useCallback(()=>{if(hi.current<=0){toast('되돌릴 수 없음');return}hi.current--;setD(mig(JSON.parse(hist.current[hi.current])));toast('실행 취소')},[toast]);
  const redo=useCallback(()=>{if(hi.current>=hist.current.length-1){toast('다시 실행할 내용 없음');return}hi.current++;setD(mig(JSON.parse(hist.current[hi.current])));toast('다시 실행')},[toast]);

  useEffect(()=>{const h=e=>{const m=e.ctrlKey||e.metaKey;if(!m)return;
    if(e.key==='z'&&!e.shiftKey){e.preventDefault();undo()}else if((e.key==='z'&&e.shiftKey)||e.key==='y'){e.preventDefault();redo()}
    else if(e.key==='f'){e.preventDefault();setMdl('find')}};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[undo,redo]);

  const[fill,setFill]=useState(null);
  const cs=useCloudSync(D,setD,setSel,loading,toast);
  useEffect(()=>{const h=e=>{const t=e.target;if(t&&t.tagName==='TEXTAREA'&&t.closest('[data-block-list]'))_lastTA=t};document.addEventListener('focusin',h);return()=>document.removeEventListener('focusin',h)},[]);
  bus.toast=toast;bus.setMdl=setMdl;bus.fill=setFill;
  bus.useCode=(code,title)=>{if(!parseQueries(code).length){if(!insertAtLast(code)){navigator.clipboard?.writeText(code);toast('입력칸이 선택되지 않아 클립보드에 복사했어요')}return}
    setFill({code,title,mode:'insert',onApply:res=>{if(!insertAtLast(res)){navigator.clipboard?.writeText(res);toast('입력칸이 선택되지 않아 클립보드에 복사했어요')}}})};
  if(loading||!D)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--tx3)'}}>로딩 중...</div>;

  const plat=D.platforms.find(p=>p.id===sel.pid);
  const scs=D.scenarios.filter(s=>s.platformId===sel.pid);
  const sc=D.scenarios.find(s=>s.id===sel.sid);
  const pt=sc?.parts.find(p=>p.id===sel.ptid);
  const scene=pt?.scenes.find(s=>s.id===sel.scid);
  const ending=sc?.endings.find(e=>e.id===sel.eid);
  const isR20=plat?.name.toLowerCase().includes('roll20');
  const isCoco=plat&&(plat.name.includes('코코')||plat.name.toLowerCase().includes('coco'));

  const selSc=(pid,sid,ptid,scid)=>setSel({pid,sid,ptid,scid,eid:null});
  const selEnd=(pid,sid,eid)=>setSel({pid,sid,ptid:null,scid:null,eid});
  const toggleTheme=()=>{const t=theme==='dark'?'light':'dark';setThm(t);up(d=>{d.theme=t})};

  const exportAll=()=>{const b=new Blob([JSON.stringify(D,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='scenario-forge.json';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);toast('내보내기 완료')};
  const importAll=f=>{const r=new FileReader();r.onload=async()=>{try{const p=JSON.parse(r.result);if(!p.platforms)throw Error();if(!await askConfirm('덮어씌울까요?'))return;setD(mig(p));toast('완료')}catch(e){alert('오류')}};r.readAsText(f)};
  const exportSingle=()=>{if(!sc)return;const b=new Blob([JSON.stringify({v:'sf1',scenario:JSON.parse(JSON.stringify(sc))},null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=(sc.title||'scenario')+'.json';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);toast('내보내기 완료')};
  const mergeImp=f=>{const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result);let s=p.v==='sf1'?p.scenario:p.scenarios?.[0];if(!s)throw Error();s.id=uid();if(!s.platformId&&sel.pid)s.platformId=sel.pid;
    up(d=>{mig({scenarios:[s],platforms:d.platforms});d.scenarios.push(s)});setSel(v=>({...v,sid:s.id,ptid:null,scid:null,eid:null}));toast('"'+s.title+'" 병합됨')}catch(e){alert('오류')}};r.readAsText(f)};

  return(<>
    <div style={{display:'grid',gridTemplateColumns:sbOpen?'260px 1fr':'0 1fr',gridTemplateRows:'44px 1fr',height:'100vh',zoom,transition:'grid-template-columns .15s'}}>
      {/* TOPBAR */}
      <div className="no-print" style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:6,padding:'0 12px',background:'var(--sf1)',borderBottom:'1px solid var(--bdr)'}}>
        {!sbOpen&&<IB I={PanelLeftOpen} onClick={()=>setSb(true)}/>}
        <div style={{display:'flex',alignItems:'center',gap:6,marginRight:4}}>
          <div style={{width:22,height:22,borderRadius:5,background:'linear-gradient(135deg,var(--blue),var(--purple))',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'JetBrains Mono',fontWeight:700,fontSize:10,color:'#fff'}}>S.</div>
          <span style={{fontFamily:'JetBrains Mono',fontWeight:600,fontSize:12,color:'var(--tx1)',letterSpacing:'-.03em'}}>scenario-forge</span>
        </div>
        <div style={{flex:1}}/>
        <div onClick={()=>setGm(!gm)} style={{display:'flex',alignItems:'center',gap:5,fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,cursor:'pointer',
          border:`1px solid ${gm?'var(--green)':'var(--bdr)'}`,color:gm?'var(--green)':'var(--tx4)',background:gm?'var(--greenA)':'transparent'}}>● {gm?'GM':'공개'}</div>
        <div style={{display:'flex',background:'var(--sf2)',borderRadius:8,padding:2,border:'1px solid var(--bdr)'}}>
          {['edit','play','flow'].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:'4px 12px',borderRadius:6,fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,
            border:'none',cursor:'pointer',background:mode===m?'var(--sf1)':'transparent',color:mode===m?'var(--tx1)':'var(--tx4)',boxShadow:mode===m?'0 1px 3px rgba(0,0,0,.1)':'none'}}>{m}</button>)}
        </div>
        <IB I={Undo2} onClick={undo} title="Ctrl+Z"/><IB I={Redo2} onClick={redo} title="Ctrl+Shift+Z"/>
        <Btn small onClick={()=>setMdl('find')}><Search size={11}/>찾기</Btn>
        <SyncBtn cs={cs} onClick={()=>setMdl('account')}/>
        <Btn small onClick={exportAll}><FileDown size={11}/></Btn>
        <Btn small onClick={()=>document.getElementById('imp')?.click()}><FileUp size={11}/></Btn>
        <input type="file" id="imp" accept=".json" hidden onChange={e=>{if(e.target.files[0])importAll(e.target.files[0]);e.target.value=''}}/>
        <div style={{display:'flex',background:'var(--sf2)',borderRadius:6,padding:2,border:'1px solid var(--bdr)'}}>
          {[{z:.9,f:9},{z:1,f:12},{z:1.15,f:15}].map(({z,f})=><button key={z} onClick={()=>setZoom(z)}
            style={{width:22,height:22,borderRadius:4,border:'none',background:zoom===z?'var(--tx1)':'transparent',color:zoom===z?'var(--bg)':'var(--tx4)',fontWeight:700,fontSize:f,cursor:'pointer'}}>가</button>)}
        </div>
        <IB I={theme==='dark'?Sun:Moon} onClick={toggleTheme}/>
      </div>

      <Sidebar D={D} sel={sel} setSel={setSel} up={up} toast={toast} setMdl={setMdl} op={op} setOp={setOp} sbOpen={sbOpen} setSb={setSb} sc={sc} scs={scs} selSc={selSc} selEnd={selEnd}/>
      {/* MAIN */}
      <div data-scroll style={{overflowY:'auto',padding:'22px 30px 80px',background:'var(--bg2)',position:'relative'}}>
        {mode==='flow'&&sc?<FlowV sc={sc} sel={sel} setSel={setSel} setMode={setMode}/>
        :ending?<EndingP ending={ending} sc={sc} plat={plat} mode={mode} gm={gm} up={up} sel={sel} toast={toast} setMdl={setMdl}/>
        :scene?<SceneP scene={scene} pt={pt} sc={sc} plat={plat} mode={mode} gm={gm} up={up} sel={sel} toast={toast} isR20={isR20} isCoco={isCoco} r20On={r20On} setR20On={setR20On}/>
        :sc?<OverviewP sc={sc} plat={plat} up={up} sel={sel} toast={toast} exportSingle={exportSingle} mergeImp={mergeImp} setMdl={setMdl}/>
        :<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8,color:'var(--tx4)'}}>
          <BookOpen size={32} strokeWidth={1.5} style={{opacity:.4}}/><h3 style={{fontFamily:'JetBrains Mono',fontSize:14,color:'var(--tx3)'}}>씬을 선택해주세요</h3></div>}
      </div>
    </div>
    {/* MODALS */}
    {modal==='account'&&<AccountM cs={cs} onClose={()=>setMdl(null)}/>}
    {modal==='find'&&<FindM D={D} up={up} setSel={setSel} setMode={setMode} onClose={()=>setMdl(null)} toast={toast}/>}
    {modal==='platform'&&<PlatM D={D} up={up} setSel={setSel} onClose={()=>setMdl(null)}/>}
    {modal==='cmd'&&<CmdM plat={plat} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {modal==='lib'&&<LibM sc={sc} up={up} sel={sel} scene={scene} onClose={()=>setMdl(null)} toast={toast}/>}
    {modal==='endingTypes'&&<ETM sc={sc} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {modal?.type==='clueEdit'&&<ClueEditM sc={sc} clueId={modal.clueId} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {modal==='tpl'&&<TplM plat={plat} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {fill&&<FillM key={fill.code} fill={fill} onClose={()=>setFill(null)}/>}
    <AskHost/>
    {Toast}
  </>);
}
// ===== SCENE PANEL =====
function SceneP({scene,pt,sc,plat,mode,gm,up,sel,toast,isR20,isCoco,r20On,setR20On}){
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===sel.ptid).scenes.find(x=>x.id===sel.scid);fn(s)});
  if(mode==='play')return<PlayV entry={scene} sc={sc} pt={pt} plat={plat} gm={gm} isSc/>;
  const conns=scene.connections||[];
  return<div>
    <CmdBar plat={plat}/>
    <div style={{fontFamily:'JetBrains Mono',fontSize:10,color:'var(--tx4)',marginBottom:4}}>{plat?.name||''} / {sc.title} / {pt.title}</div>
    <input value={scene.title} onChange={e=>uS(s=>{s.title=e.target.value})} style={{fontFamily:'Instrument Serif,serif',fontSize:26,fontWeight:400,color:'var(--tx1)',border:'none',background:'transparent',padding:0,width:'100%',outline:'none',marginBottom:2}}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:16,padding:'8px 0',marginBottom:14,borderBottom:'1px solid var(--bdr)'}}>
      {[['Location','장소','location'],['Time','시간대','timeOfDay'],['NPCs','등장인물','npcsPresent']].map(([k,ph,f])=>
        <div key={f} style={{display:'flex',flexDirection:'column',gap:1}}>
          <span style={{fontFamily:'JetBrains Mono',fontSize:8,fontWeight:600,color:'var(--tx4)',letterSpacing:'.04em',textTransform:'uppercase'}}>{k}</span>
          <input value={scene[f]||''} onChange={e=>uS(s=>{s[f]=e.target.value})} placeholder={ph}
            style={{border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontSize:12,color:'var(--tx2)',padding:'2px 0',outline:'none',minWidth:100}}/>
        </div>)}
    </div>
    <div style={{marginBottom:12,display:'flex',flexWrap:'wrap',alignItems:'center',gap:3}}>
      <span style={{fontFamily:'JetBrains Mono',fontSize:8,fontWeight:600,color:'var(--tx4)',textTransform:'uppercase',marginRight:4}}>Connections</span>
      {conns.map((c,i)=>{let t=null;sc.parts.forEach(p=>p.scenes.forEach(s=>{if(s.id===c.targetSceneId)t=s}));
        return<span key={i} style={{display:'inline-flex',alignItems:'center',gap:3,background:'var(--blueA)',color:'var(--blue)',padding:'1px 7px',borderRadius:12,fontFamily:'JetBrains Mono',fontSize:9,fontWeight:600}}>
          → {t?.title||'(삭제된 씬)'} <button onClick={()=>uS(s=>{s.connections.splice(i,1)})} style={{background:'none',border:'none',color:'inherit',cursor:'pointer',fontSize:8}}>✕</button></span>})}
      <select value="" onChange={e=>{const id=e.target.value;if(!id||conns.some(c=>c.targetSceneId===id))return;uS(s=>{s.connections.push({targetSceneId:id})})}}
        style={{fontFamily:'JetBrains Mono',fontSize:9.5,color:'var(--blue)',background:'var(--blueA)',border:'1px dashed var(--blue)',borderRadius:12,padding:'1px 6px',cursor:'pointer',outline:'none'}}>
        <option value="">+ 연결</option>
        {sc.parts.map(p=><optgroup key={p.id} label={p.title}>{p.scenes.filter(s=>s.id!==scene.id).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>)}
      </select>
    </div>
    {isR20&&<div style={{marginBottom:16}}>
      <div onClick={()=>setR20On(!r20On)} style={{display:'inline-flex',alignItems:'center',gap:5,fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,cursor:'pointer',marginBottom:r20On?8:0,
        border:`1px solid ${r20On?'var(--red)':'var(--bdr)'}`,color:r20On?'var(--red)':'var(--tx4)',background:r20On?'var(--redA)':'transparent'}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:r20On?'var(--red)':'var(--tx4)'}}/>Roll20 미리보기 {r20On?'ON':'OFF'}</div>
      {r20On&&<R20P scene={scene}/>}
    </div>}
    {isCoco&&<CocoP scene={scene}/>}
    <div data-block-list><BL entry={scene} upE={fn=>uS(s=>{fn(s)})} sc={sc}/></div>
  </div>;
}
// ===== ENDING PANEL =====
function EndingP({ending,sc,plat,mode,gm,up,sel,toast,setMdl}){
  const uE=fn=>up(d=>{const e=d.scenarios.find(x=>x.id===sel.sid).endings.find(x=>x.id===sel.eid);fn(e)});
  if(mode==='play')return<PlayV entry={ending} sc={sc} plat={plat} gm={gm}/>;
  return<div>
    <CmdBar plat={plat}/>
    <div style={{fontFamily:'JetBrains Mono',fontSize:10,color:'var(--tx4)',marginBottom:4}}>{plat?.name||''} / {sc.title} / endings/</div>
    <input value={ending.title} onChange={e=>uE(en=>{en.title=e.target.value})} style={{fontFamily:'Instrument Serif,serif',fontSize:26,fontWeight:400,color:'var(--tx1)',border:'none',background:'transparent',padding:0,width:'100%',outline:'none'}}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,margin:'8px 0 14px'}}>
      {sc.endingTypes.map(t=><button key={t.id} onClick={()=>uE(en=>{en.endingType=t.id})}
        style={{padding:'4px 11px',borderRadius:20,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono',cursor:'pointer',
          border:`1px solid ${ending.endingType===t.id?t.c:'var(--bdr)'}`,background:ending.endingType===t.id?t.c:'transparent',color:ending.endingType===t.id?'#fff':'var(--tx3)'}}>{t.l}</button>)}
      <button onClick={()=>setMdl('endingTypes')} style={{padding:'4px 8px',borderRadius:20,fontSize:10,border:'1px dashed var(--tx4)',color:'var(--tx4)',cursor:'pointer'}}>✎</button>
    </div>
    <div style={{marginBottom:18,paddingLeft:12,borderLeft:'2px solid var(--coral)',position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:'2px solid var(--coral)',background:'var(--bg2)'}}/>
      <span style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx3)',display:'block',marginBottom:4}}>// condition</span>
      <TA value={ending.condition||''} onChange={v=>uE(en=>{en.condition=v})} placeholder="도달 조건" bg="var(--coralA)"/>
    </div>
    <div data-block-list><BL entry={ending} upE={fn=>uE(en=>{fn(en)})} sc={sc}/></div>
  </div>;
}
// ===== PLAY VIEW =====
function PlayV({entry,sc,pt,plat,gm,isSc}){
  const renderB=(b)=>{const m=BT[b.type]||BT.text;const isGm=['memo','truth','clue','session-log'].includes(b.type);
    if(isGm&&!gm)return null;
    const wrap=(color,children,copyAll)=><div key={b.id} style={{marginBottom:16,paddingLeft:12,borderLeft:`2px solid ${color}`,position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:`2px solid ${color}`,background:'var(--bg2)'}}/>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><span style={{flex:1,fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx3)'}}>// {b.label||m.l}</span>{copyAll&&<CopyBtn text={copyAll} label="전체"/>}</div>{children}</div>;
    if(['text','memo','truth','session-log'].includes(b.type))return wrap(m.c,b.content?<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:'10px 14px',fontSize:13,lineHeight:1.7}}>
      {b.content.split('\n').map((l,i)=>l.trim()?<div key={i} className="cp-line"><span style={{flex:1,minWidth:0,whiteSpace:'pre-wrap',wordBreak:'break-word'}} dangerouslySetInnerHTML={{__html:mdR(l)}}/><CopyBtn text={l}/></div>:<div key={i} style={{height:6}}/>)}</div>
      :<div style={{color:'var(--tx4)',fontSize:12}}>empty</div>,b.content);
    if(b.type==='clue'){const cl=sc?.clues.find(c=>c.id===b.clueId);return wrap('var(--teal)',<div>
      {cl&&<span style={{display:'inline-flex',alignItems:'center',gap:3,background:'var(--tealA)',color:'var(--teal)',padding:'2px 8px',borderRadius:12,fontFamily:'JetBrains Mono',fontSize:9,fontWeight:600,marginBottom:6}}>🔗 {cl.name}</span>}
      {b.content&&<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--tealA)',padding:'10px 14px',fontSize:13,lineHeight:1.7}}>{b.content}</div>}
    </div>)}
    if(b.type==='npc')return wrap('var(--purple)',<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:12}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
        {b.imageUrl&&<img src={b.imageUrl} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'1px solid var(--bdr)'}} onError={e=>{e.target.style.display='none'}}/>}
        <div><div style={{fontFamily:'Instrument Serif,serif',fontSize:16,color:'var(--tx1)'}}>{b.name||'?'}</div>{b.role&&<div style={{fontSize:11,color:'var(--tx3)'}}>{b.role}</div>}</div>
      </div>
      {b.traits&&<ul style={{paddingLeft:16,fontSize:12,lineHeight:1.7,margin:0}}>{b.traits.split('\n').filter(l=>l.trim()).map((t,i)=><li key={i}>{t}</li>)}</ul>}
    </div>);
    if(b.type==='handout')return wrap('var(--teal)',<div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden',background:'var(--sf1)'}}>
      {b.title&&<div style={{padding:'10px 14px 0',fontFamily:'Instrument Serif,serif',fontWeight:700,fontSize:15}}>{b.title}</div>}
      {b.imageUrl&&<img src={b.imageUrl} style={{maxWidth:'100%',borderRadius:4,margin:'6px 14px'}} onError={e=>{e.target.style.display='none'}}/>}
      {b.content&&<div style={{padding:'10px 14px',whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.8}}>{b.content}</div>}
      {gm&&b.gmNote&&<div style={{margin:'0 10px 10px',border:'1px solid rgba(210,153,34,.15)',background:'var(--goldA)',borderRadius:6,padding:'8px 10px',fontSize:12,whiteSpace:'pre-wrap'}}>
        <span style={{fontFamily:'JetBrains Mono',fontSize:8,fontWeight:700,color:'var(--gold)',border:'1px solid var(--gold)',borderRadius:99,padding:'0 5px',marginRight:6}}>GM</span>{b.gmNote}</div>}
    </div>);
    if((b.type==='branches'||b.type==='lines')&&b.items?.length)return wrap(m.c,<div>{b.items.map(it=><div key={it.id} style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:10,marginBottom:6,borderLeft:`3px solid ${m.c}`}}>
      <div style={{fontWeight:700,fontSize:12,marginBottom:3}}>{it.label}</div>
      {it.text&&<div className="cp-line"><div style={{flex:1,fontSize:13,whiteSpace:'pre-wrap',fontStyle:b.type==='lines'?'italic':'normal'}}>{it.text}</div>{b.type==='lines'&&<CopyBtn text={it.text}/>}</div>}
    </div>)}</div>);
    if(b.type==='checks'&&b.items?.length)return wrap('var(--red)',<div>{b.items.map(c=><div key={c.id} style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:10,marginBottom:6}}>
      <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>{c.name||'?'}</div>
      {[['대성공',c.critSuccess,'var(--gold)'],['성공',c.success,'var(--green)'],['실패',c.fail,'var(--tx4)'],['대실패',c.critFail,'var(--red)']].map(([lb,v,cl])=>
        v?<div key={lb} style={{display:'flex',gap:8,padding:'3px 0',borderTop:'1px dashed var(--bdr)',fontSize:12}}>
          <span style={{flex:'0 0 50px',fontFamily:'JetBrains Mono',fontSize:9,fontWeight:700,color:cl}}>{lb}</span><span style={{flex:1,whiteSpace:'pre-wrap'}}>{v}</span></div>:null)}
    </div>)}</div>);
    if(b.type==='bgm'){const yt=ytId(b.url);return wrap('var(--coral)',<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:10}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}><Music size={14} color="var(--coral)"/><b style={{flex:1,fontSize:13,color:'var(--tx1)'}}>{b.title||'(제목 없음)'}</b>
        {b.url&&<a href={b.url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:11,color:'var(--blue)',textDecoration:'none'}}><ExternalLink size={11}/>열기</a>}</div>
      {yt&&<div style={{position:'relative',paddingTop:'56.25%',marginTop:8,borderRadius:6,overflow:'hidden',background:'#000'}}><iframe src={'https://www.youtube.com/embed/'+yt} title={b.title||'bgm'} style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0}} allow="encrypted-media" allowFullScreen/></div>}
      {b.note&&<div style={{fontSize:12,color:'var(--tx3)',marginTop:6,whiteSpace:'pre-wrap'}}>{b.note}</div>}</div>)}
    return null;
  };
  return<div>
    <div style={{fontFamily:'JetBrains Mono',fontSize:10,color:'var(--tx4)',marginBottom:4}}>{plat?.name||''} / {sc?.title} / {pt?.title||'endings'}</div>
    <h1 style={{fontFamily:'Instrument Serif,serif',fontSize:28,fontWeight:400,color:'var(--tx1)',marginBottom:8}}>{entry.title}</h1>
    {isSc&&(entry.location||entry.timeOfDay||entry.npcsPresent)&&<div style={{display:'flex',gap:16,paddingBottom:8,marginBottom:14,borderBottom:'1px solid var(--bdr)',fontFamily:'JetBrains Mono',fontSize:11}}>
      {entry.location&&<span><b style={{color:'var(--tx4)'}}>loc</b> {entry.location}</span>}
      {entry.timeOfDay&&<span><b style={{color:'var(--tx4)'}}>time</b> {entry.timeOfDay}</span>}
      {entry.npcsPresent&&<span><b style={{color:'var(--tx4)'}}>npc</b> {entry.npcsPresent}</span>}
    </div>}
    {entry.condition&&<div style={{marginBottom:16,paddingLeft:12,borderLeft:'2px solid var(--coral)',position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:'2px solid var(--coral)',background:'var(--bg2)'}}/>
      <div style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>// condition</div>
      <div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--coralA)',padding:'10px 14px',whiteSpace:'pre-wrap'}}>{entry.condition}</div>
    </div>}
    {(entry.blocks||[]).map(renderB)}
  </div>;
}
// ===== FLOW VIEW =====
function FlowV({sc,sel,setSel,setMode}){
  const goScene=(ptid,scid)=>{setSel({pid:sel.pid,sid:sel.sid,ptid,scid,eid:null});setMode('edit')};
  const goEnding=(eid)=>{setSel({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid});setMode('edit')};
  if(!sc.parts.length&&!sc.endings.length)return<div style={{color:'var(--tx4)',textAlign:'center',padding:40,fontFamily:'JetBrains Mono',fontSize:13}}>파트와 씬을 먼저 만들어주세요</div>;
  return<div><div style={{fontFamily:'JetBrains Mono',fontSize:20,fontWeight:700,color:'var(--tx1)',marginBottom:14}}>flow</div>
    {sc.parts.map((p,pi)=><div key={p.id} style={{marginBottom:6}}>
      <div style={{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:13,marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
        {p.title}<span style={{fontSize:9,color:'var(--tx4)'}}>{p.scenes.filter(s=>s.done).length}/{p.scenes.length}</span></div>
      {p.scenes.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:2,alignItems:'stretch'}}>
        {p.scenes.map((s,si)=><React.Fragment key={s.id}>
          <div onClick={()=>goScene(p.id,s.id)}
            style={{border:'1px solid var(--bdr)',borderRadius:6,background:'var(--sf1)',padding:'8px 10px',minWidth:120,maxWidth:160,cursor:'pointer',borderLeft:s.done?'3px solid var(--green)':'1px solid var(--bdr)',transition:'box-shadow .1s'}}>
            <div style={{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:600,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{s.title}</div>
            <div style={{display:'flex',gap:2,marginTop:3}}>
              {s.done&&<span style={{fontFamily:'JetBrains Mono',fontSize:7,fontWeight:700,padding:'0 4px',borderRadius:8,background:'var(--greenA)',color:'var(--green)'}}>✓</span>}
              {s.blocks?.filter(b=>b.type==='clue').length>0&&<span style={{fontFamily:'JetBrains Mono',fontSize:7,fontWeight:700,padding:'0 4px',borderRadius:8,background:'var(--tealA)',color:'var(--teal)'}}>🔍</span>}
              {s.blocks?.filter(b=>b.type==='branches').length>0&&<span style={{fontFamily:'JetBrains Mono',fontSize:7,fontWeight:700,padding:'0 4px',borderRadius:8,background:'var(--blueA)',color:'var(--blue)'}}>⑂</span>}
              {s.blocks?.filter(b=>b.type==='checks').length>0&&<span style={{fontFamily:'JetBrains Mono',fontSize:7,fontWeight:700,padding:'0 4px',borderRadius:8,background:'var(--redA)',color:'var(--red)'}}>🎲</span>}
            </div>
            {s.connections?.length>0&&<div style={{fontFamily:'JetBrains Mono',fontSize:7,color:'var(--tx4)',marginTop:2}}>{s.connections.map((c,i)=>{let t=null;sc.parts.forEach(pp=>pp.scenes.forEach(ss=>{if(ss.id===c.targetSceneId)t=ss}));return<span key={i}>→{t?.title||'?'} </span>})}</div>}
          </div>
          {si<p.scenes.length-1&&<div style={{display:'flex',alignItems:'center',color:'var(--tx4)',padding:'0 4px',fontSize:12}}>→</div>}
        </React.Fragment>)}
      </div>}
      {pi<sc.parts.length-1&&<div style={{padding:'3px 0 3px 14px',color:'var(--tx4)',fontSize:11}}>↓</div>}
    </div>)}
    {sc.endings.length>0&&<><div style={{padding:'3px 0 3px 14px',color:'var(--tx4)',fontSize:11}}>↓</div>
      <div style={{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:13,marginBottom:6}}>endings/ <span style={{fontSize:9,color:'var(--tx4)',fontWeight:400}}>{sc.endings.length}</span></div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {sc.endings.map(e=>{const et=sc.endingTypes.find(t=>t.id===e.endingType)||{l:'?',c:'#8b949e'};
          return<div key={e.id} onClick={()=>goEnding(e.id)}
            style={{border:'1px solid var(--bdr)',borderTop:`3px solid ${et.c}`,borderRadius:6,background:'var(--sf1)',padding:'8px 10px',minWidth:120,maxWidth:170,cursor:'pointer',transition:'box-shadow .1s'}}>
            <div style={{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:600}}>{e.title||'?'}</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:9,fontWeight:700,color:et.c,marginTop:2}}>{et.l}</div></div>})}
      </div></>}
  </div>;
}
// ===== R20 / COCO PREVIEW =====
function R20P({scene}){
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
    <div style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:'#161b22',borderBottom:'1px solid #30363d',fontFamily:'JetBrains Mono',fontSize:9,color:'#484f58'}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:'#f85149'}}/>Roll20 Chat — 나레이션 · 대사만 표시</div>
    <div className="r20chat" dangerouslySetInnerHTML={{__html:html}}/></div>}
function CocoP({scene}){const ts=[];for(const b of(scene.blocks||[])){if(b.type==='text'&&b.content)ts.push(b.content);if(b.type==='lines'&&b.items)for(const l of b.items)if(l.text)ts.push((l.label?l.label+'：':'')+l.text)}
  return<div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden',marginBottom:16}}>
    <div style={{padding:'5px 10px',background:'#2a2a3a',borderBottom:'1px solid #3a3a4a',fontFamily:'JetBrains Mono',fontSize:9,color:'#888'}}>코코포리아 미리보기</div>
    <div style={{background:'#1e1e2e',minHeight:50,maxHeight:300,overflowY:'auto'}} dangerouslySetInnerHTML={{__html:ts.length?renderCoco(ts.join('\n')):'<div style="color:#666;font-size:12px;padding:10px">코코포리아 서식 입력 시 표시</div>'}}/></div>}

// ===== BLOCK LIST =====
function BL({entry,upE,sc}){
  const upB=(bid,fn)=>upE(e=>{const b=e.blocks.find(x=>x.id===bid);if(b)fn(b)});
  const addB=(type)=>upE(e=>{const nb={id:uid(),type,label:BT[type].l};
    if(['text','memo','truth','session-log','clue'].includes(type))nb.content='';if(type==='clue')nb.clueId='';
    if(['branches','checks','lines'].includes(type))nb.items=[];
    if(type==='npc'){nb.name='';nb.imageUrl='';nb.role='';nb.traits='';nb.lines=''}
    if(type==='handout'){nb.title='';nb.content='';nb.gmNote='';nb.imageUrl=''}
    if(type==='bgm'){nb.title='';nb.url='';nb.note=''}
    if(type==='item'||type==='place'){nb.name='';nb.imageUrl='';nb.description='';nb.gmNote=''}
    e.blocks.push(nb)});
  return<div>
    {entry.blocks.map((b,i)=>{const m=BT[b.type]||BT.text;
      if(b.collapsed)return<div key={b.id} style={{marginBottom:8,paddingLeft:12,borderLeft:`2px solid ${m.c}`,opacity:.5,position:'relative'}}>
        <div style={{position:'absolute',left:-5,top:6,width:8,height:8,borderRadius:'50%',border:`2px solid ${m.c}`,background:'var(--bg2)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <span style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx3)',flex:1}}>// {b.label} <span style={{color:'var(--tx4)',fontSize:9}}>▸ 접힘</span></span>
          <IB I={ChevronDown} s={12} onClick={()=>upB(b.id,x=>{x.collapsed=false})}/><IB I={CopyPlus} s={12} onClick={()=>upE(e=>{const cp=JSON.parse(JSON.stringify(b));cp.id=uid();cp.label+=' (복사)';e.blocks.splice(i+1,0,cp)})}/><IB I={Trash2} s={12} onClick={()=>upE(e=>{e.blocks=e.blocks.filter(x=>x.id!==b.id)})}/>
        </div></div>;
      return<div key={b.id} style={{marginBottom:16,paddingLeft:12,borderLeft:`2px solid ${m.c}`,position:'relative',marginLeft:b.indent?24:0}}>
        <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:`2px solid ${m.c}`,background:'var(--bg2)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:5}}>
          <input value={b.label} onChange={e=>upB(b.id,x=>{x.label=e.target.value})}
            style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx3)',border:'none',background:'transparent',padding:'1px 3px',borderRadius:3,flex:1,minWidth:0,outline:'none'}}/>
          <IB I={ChevronUp} s={11} onClick={()=>upB(b.id,x=>{x.collapsed=true})} title="접기"/>
          <IB I={ArrowUp} s={11} disabled={i===0} onClick={()=>upE(e=>{[e.blocks[i-1],e.blocks[i]]=[e.blocks[i],e.blocks[i-1]]})}/>
          <IB I={ArrowDown} s={11} disabled={i===entry.blocks.length-1} onClick={()=>upE(e=>{[e.blocks[i],e.blocks[i+1]]=[e.blocks[i+1],e.blocks[i]]})}/>
          <IB I={CopyPlus} s={11} onClick={()=>upE(e=>{const cp=JSON.parse(JSON.stringify(b));cp.id=uid();cp.label+=' (복사)';e.blocks.splice(i+1,0,cp)})}/>
          <IB I={Trash2} s={11} onClick={()=>upE(e=>{e.blocks=e.blocks.filter(x=>x.id!==b.id)})}/>
        </div>
        <BB b={b} upB={upB} sc={sc} upE={upE} i={i}/>
      </div>})}
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8,paddingTop:14,borderTop:'1px dashed var(--bdr)'}}>
      {Object.entries(BT).map(([t,{l,I}])=><button key={t} onClick={()=>addB(t)}
        style={{padding:'5px 11px',borderRadius:6,fontSize:11,fontWeight:600,color:'var(--tx3)',background:'transparent',border:'1px dashed var(--bdr)',cursor:'pointer',display:'flex',alignItems:'center',gap:4,transition:'all .1s'}}>
        <I size={10}/>{l}</button>)}
    </div></div>}

function BB({b,upB,sc,upE,i}){
  const up=fn=>upB(b.id,fn);
  if(['text','memo','truth','session-log'].includes(b.type)){
    const bgMap={memo:'var(--goldA)',truth:'var(--coralA)','session-log':'var(--purpleA)'};
    return<><TA value={b.content||''} onChange={v=>up(x=>{x.content=v})} placeholder={b.type==='memo'?'GM 전용 메모':b.type==='truth'?'사건의 진상':b.type==='session-log'?'세션 중 메모':'지문, 묘사...'} bg={bgMap[b.type]}/><QFillBtn text={b.content} onApply={v=>up(x=>{x.content=v})}/></>}
  if(b.type==='clue')return<div>
    <select value={b.clueId||''} onChange={e=>up(x=>{x.clueId=e.target.value})} style={{width:'100%',padding:'5px 8px',border:'1px solid var(--bdr)',borderRadius:6,background:'var(--sf1)',color:'var(--tx1)',fontSize:12,marginBottom:5}}>
      <option value="">-- 단서 --</option>{(sc?.clues||[]).map(c=><option key={c.id} value={c.id}>{c.name}{c.isRedHerring?' (미끼)':''}</option>)}</select>
    <TA value={b.content||''} onChange={v=>up(x=>{x.content=v})} placeholder="단서 발견 상황" bg="var(--tealA)"/></div>;
  if(b.type==='npc')return<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf1)'}}>
    <div style={{display:'flex',gap:8,marginBottom:6}}>{b.imageUrl&&<img src={b.imageUrl} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover'}} onError={e=>{e.target.style.display='none'}}/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:4}}><Inp value={b.name||''} onChange={v=>up(x=>{x.name=v})} placeholder="이름" mono/><Inp value={b.role||''} onChange={v=>up(x=>{x.role=v})} placeholder="역할"/><Inp value={b.imageUrl||''} onChange={v=>up(x=>{x.imageUrl=v})} placeholder="이미지 URL"/></div></div>
    <TA value={b.traits||''} onChange={v=>up(x=>{x.traits=v})} placeholder="특징 (한 줄씩)" style={{marginTop:4}}/><TA value={b.lines||''} onChange={v=>up(x=>{x.lines=v})} placeholder="대사 (한 줄씩)" style={{marginTop:4}}/></div>;
  if(b.type==='handout')return<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf1)'}}>
    <Inp value={b.title||''} onChange={v=>up(x=>{x.title=v})} placeholder="핸드아웃 제목" style={{marginBottom:4}}/>
    <Inp value={b.imageUrl||''} onChange={v=>up(x=>{x.imageUrl=v})} placeholder="이미지 URL" style={{marginBottom:4}}/>
    {b.imageUrl&&<img src={b.imageUrl} style={{maxWidth:160,borderRadius:6,margin:'4px 0'}} onError={e=>{e.target.style.display='none'}}/>}
    <TA value={b.content||''} onChange={v=>up(x=>{x.content=v})} placeholder="내용"/><TA value={b.gmNote||''} onChange={v=>up(x=>{x.gmNote=v})} placeholder="GM 메모" bg="var(--goldA)" style={{marginTop:4}}/></div>;
  if(b.type==='bgm')return<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf1)'}}>
    <Inp value={b.title||''} onChange={v=>up(x=>{x.title=v})} placeholder="트랙 이름" style={{marginBottom:4}}/><Inp value={b.url||''} onChange={v=>up(x=>{x.url=v})} placeholder="URL" style={{marginBottom:4}}/><TA value={b.note||''} onChange={v=>up(x=>{x.note=v})} placeholder="메모"/></div>;
  if(b.type==='item'||b.type==='place')return<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf1)'}}>
    <Inp value={b.name||''} onChange={v=>up(x=>{x.name=v})} placeholder={b.type==='item'?'아이템':'장소'} style={{marginBottom:4}}/>
    <Inp value={b.imageUrl||''} onChange={v=>up(x=>{x.imageUrl=v})} placeholder="이미지 URL" style={{marginBottom:4}}/>
    <TA value={b.description||''} onChange={v=>up(x=>{x.description=v})} placeholder="설명"/><TA value={b.gmNote||''} onChange={v=>up(x=>{x.gmNote=v})} placeholder="GM 메모" bg="var(--goldA)" style={{marginTop:4}}/></div>;
  if(b.type==='branches'||b.type==='lines'){const tp=b.type;return<div>
    {(b.items||[]).map((it,ii)=><div key={it.id} style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,marginBottom:5,borderLeft:`3px solid ${tp==='branches'?'var(--blue)':'#c07030'}`}}>
      <div style={{display:'flex',gap:5,marginBottom:4}}><input value={it.label} onChange={e=>up(x=>{x.items[ii].label=e.target.value})} placeholder={tp==='branches'?'선택지':'화자'}
        style={{flex:1,border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontWeight:700,fontSize:12,padding:'2px 0',outline:'none',color:'var(--tx1)'}}/><IB I={Trash2} s={12} onClick={()=>up(x=>{x.items.splice(ii,1)})}/></div>
      <TA value={it.text} onChange={v=>up(x=>{x.items[ii].text=v})} placeholder={tp==='branches'?'전개':'대사'}/><QFillBtn text={it.text} onApply={v=>up(x=>{x.items[ii].text=v})}/></div>)}
    <Btn small onClick={()=>up(x=>{x.items.push({id:uid(),label:'',text:''})})} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>{tp==='branches'?'분기':'대사'}</Btn></div>}
  if(b.type==='checks')return<div>
    {(b.items||[]).map((c,ci)=><div key={c.id} style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,marginBottom:5,borderLeft:'3px solid var(--red)'}}>
      <div style={{display:'flex',gap:5,marginBottom:4}}><input value={c.name} onChange={e=>up(x=>{x.items[ci].name=e.target.value})} placeholder="판정명"
        style={{flex:1,border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontWeight:700,fontSize:12,padding:'2px 0',outline:'none',color:'var(--tx1)'}}/><IB I={Trash2} s={12} onClick={()=>up(x=>{x.items.splice(ci,1)})}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
        {[['critSuccess','대성공','var(--goldA)','var(--gold)'],['success','성공','var(--greenA)','var(--green)'],['fail','실패','var(--sf2)','var(--tx4)'],['critFail','대실패','var(--redA)','var(--red)']].map(([k,lb,bg,cl])=>
          <div key={k}><span style={{fontFamily:'JetBrains Mono',fontSize:9,fontWeight:700,color:cl}}>{lb}</span><TA value={c[k]||''} onChange={v=>up(x=>{x.items[ci][k]=v})} bg={bg}/></div>)}</div>
    </div>)}
    <Btn small onClick={()=>up(x=>{x.items.push({id:uid(),name:'',critSuccess:'',success:'',fail:'',critFail:''})})} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>판정</Btn></div>;
  return null}
// ===== OVERVIEW =====
function OverviewP({sc,plat,up,sel,toast,exportSingle,mergeImp,setMdl}){
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  const conc={};for(const c of sc.clues)if(c.leadsTo&&!c.isRedHerring)conc[c.leadsTo]=(conc[c.leadsTo]||0)+1;
  return<div>
    <div style={{fontFamily:'JetBrains Mono',fontSize:10,color:'var(--tx4)',marginBottom:4}}>{plat?.name||''}</div>
    <input value={sc.title} onChange={e=>uS(s=>{s.title=e.target.value})} style={{fontFamily:'Instrument Serif,serif',fontSize:28,fontWeight:400,color:'var(--tx1)',border:'none',background:'transparent',padding:0,width:'100%',outline:'none',marginBottom:14}}/>
    <div style={{marginBottom:16,paddingLeft:12,borderLeft:'2px solid var(--gold)',position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:'2px solid var(--gold)',background:'var(--bg2)'}}/>
      <span style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx3)',display:'block',marginBottom:4}}>// setting</span>
      <TA value={sc.setting||''} onChange={v=>uS(s=>{s.setting=v})} placeholder="시대, 장소, 분위기" bg="var(--goldA)"/></div>
    <div style={{marginBottom:16,paddingLeft:12,borderLeft:'2px solid var(--blue)',position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:'2px solid var(--blue)',background:'var(--bg2)'}}/>
      <span style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx3)',display:'block',marginBottom:4}}>// synopsis</span>
      <TA value={sc.synopsis||''} onChange={v=>uS(s=>{s.synopsis=v})} placeholder="줄거리 요약"/></div>
    <div style={{display:'flex',gap:14,padding:'8px 0',fontFamily:'JetBrains Mono',fontSize:11,color:'var(--tx3)',marginBottom:14,borderBottom:'1px solid var(--bdr)'}}>
      <span>씬 {sc.parts.reduce((a,p)=>a+p.scenes.filter(s=>s.done).length,0)}/{sc.parts.reduce((a,p)=>a+p.scenes.length,0)}</span>
      <span>엔딩 {sc.endings.length}</span><span>단서 {sc.clues.length}</span></div>
    <SecTitle right={<IB I={Pencil} s={13} onClick={()=>setMdl('endingTypes')}/>}>엔딩 타입</SecTitle>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:14}}>
      {sc.endingTypes.map(t=><span key={t.id} style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono',background:t.c,color:'#fff'}}>{t.l}</span>)}</div>
    <SecTitle>3단서 법칙 검증</SecTitle>
    {Object.keys(conc).length===0?<div style={{fontSize:11,color:'var(--tx4)',marginBottom:14}}>단서 "연결 결론" 필드 입력 시 검증</div>
    :<div style={{marginBottom:14}}>{Object.entries(conc).map(([k,n])=>{
      const st=n>=3?{bg:'var(--greenA)',c:'var(--green)',i:'✓'}:n>=2?{bg:'var(--goldA)',c:'var(--gold)',i:'△'}:{bg:'var(--redA)',c:'var(--red)',i:'✕'};
      return<div key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0'}}>
        <span style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:20,background:st.bg,color:st.c}}>{st.i} {n}/3</span><span style={{fontSize:12}}>{k}</span></div>})}</div>}
    <SecTitle right={<IB I={Plus} s={13} onClick={()=>uS(s=>{s.eventTimeline.push({id:uid(),time:'',event:'',isHidden:false})})}/>}>사건 연표</SecTitle>
    {!sc.eventTimeline.length?<div style={{fontSize:11,color:'var(--tx4)',marginBottom:14}}>배경 사건을 시간순으로 기록</div>
    :<div style={{marginBottom:14}}>{sc.eventTimeline.map((ev,i)=><div key={ev.id} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid var(--bdr)',fontSize:12,alignItems:'center',opacity:ev.isHidden?.5:1}}>
      <input value={ev.time} onChange={e=>uS(s=>{s.eventTimeline[i].time=e.target.value})} placeholder="시간" style={{flex:'0 0 80px',border:'none',background:'transparent',fontFamily:'JetBrains Mono',fontSize:11,fontWeight:600,color:'var(--blue)',outline:'none'}}/>
      <input value={ev.event} onChange={e=>uS(s=>{s.eventTimeline[i].event=e.target.value})} placeholder="사건" style={{flex:1,border:'none',background:'transparent',fontSize:12,color:'var(--tx2)',outline:'none'}}/>
      <IB I={ev.isHidden?EyeOff:Eye} s={13} onClick={()=>uS(s=>{s.eventTimeline[i].isHidden=!s.eventTimeline[i].isHidden})}/><IB I={Trash2} s={13} onClick={()=>uS(s=>{s.eventTimeline.splice(i,1)})}/></div>)}</div>}
    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
      <Btn primary onClick={exportSingle}><FileDown size={11}/>이 시나리오만 내보내기</Btn>
      <Btn onClick={()=>document.getElementById('mg')?.click()}><FileUp size={11}/>시나리오 병합</Btn>
      <input type="file" id="mg" accept=".json" hidden onChange={e=>{if(e.target.files[0])mergeImp(e.target.files[0]);e.target.value=''}}/></div>
  </div>}

// ===== MODALS =====
function FindM({D,up,setSel,setMode,onClose,toast}){const[t,setT]=useState('');const[rt,setRt]=useState('');const[rm,setRm]=useState('find');
  const res=useMemo(()=>{if(!t.trim())return[];const lt=t.toLowerCase(),r=[];
    for(const sc of D.scenarios){for(const p of sc.parts)for(const s of p.scenes){let c=0;if(s.title?.toLowerCase().includes(lt))c++;
      for(const b of s.blocks){const ts=b.content?[b.content]:b.items?b.items.flatMap(i=>[i.label,i.text]):b.name?[b.name,b.description,b.gmNote]:[];
        for(const v of ts)if(v?.toLowerCase().includes(lt))c++}
      if(c)r.push({sc,p,s,c,tp:'scene'})}
    for(const e of(sc.endings||[]))if(e.title?.toLowerCase().includes(lt)||e.condition?.toLowerCase().includes(lt))r.push({sc,e,c:1,tp:'ending'})}return r},[t,D]);
  const countAll=()=>{if(!t)return 0;let n=0;for(const sc of D.scenarios){for(const p of sc.parts)for(const s of p.scenes)for(const b of s.blocks){const ts=b.content?[b.content]:b.items?b.items.flatMap(i=>[i.label,i.text]):[];
    for(const v of ts){let idx=0;while(v&&(idx=v.indexOf(t,idx))!==-1){n++;idx+=t.length}}}
    for(const e of(sc.endings||[]))for(const b of e.blocks){const ts=b.content?[b.content]:[];for(const v of ts){let idx=0;while(v&&(idx=v.indexOf(t,idx))!==-1){n++;idx+=t.length}}}}return n};
  const doReplace=async()=>{if(!t){toast('검색어 필요');return}const n=countAll();if(!n){toast('결과 없음');return}if(!await askConfirm(n+'건을 모두 바꿀까요?'))return;
    up(d=>{for(const sc of d.scenarios){for(const p of sc.parts)for(const s of p.scenes)for(const b of s.blocks){if(b.content?.includes(t))b.content=b.content.split(t).join(rt);
      if(b.items)for(const it of b.items){if(it.label?.includes(t))it.label=it.label.split(t).join(rt);if(it.text?.includes(t))it.text=it.text.split(t).join(rt)}}
    for(const e of(sc.endings||[]))for(const b of e.blocks)if(b.content?.includes(t))b.content=b.content.split(t).join(rt)}});onClose();toast('바꾸기 완료')};
  return<Modal title="찾기 · 바꾸기" onClose={onClose} width={460} footer={rm==='replace'?<Btn primary onClick={doReplace}>바꾸기</Btn>:null}>
    <div style={{display:'flex',background:'var(--sf2)',borderRadius:6,padding:2,border:'1px solid var(--bdr)',marginBottom:10}}>
      {['find','replace'].map(m=><button key={m} onClick={()=>setRm(m)} style={{flex:1,padding:'4px 10px',borderRadius:4,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono',
        border:'none',cursor:'pointer',background:rm===m?'var(--sf1)':'transparent',color:rm===m?'var(--tx1)':'var(--tx4)'}}>{m==='find'?'찾기':'바꾸기'}</button>)}</div>
    <Inp value={t} onChange={setT} placeholder="찾을 단어" mono style={{marginBottom:8}}/>
    {rm==='replace'&&<Inp value={rt} onChange={setRt} placeholder="바꿀 단어" mono style={{marginBottom:8}}/>}
    {rm==='replace'&&t&&<div style={{fontSize:12,color:'var(--tx3)',padding:'6px 8px',border:'1px solid var(--bdr)',borderRadius:6,marginBottom:8}}>전체에서 <b style={{color:'var(--tx1)'}}>{countAll()}건</b></div>}
    {rm==='find'&&<div style={{maxHeight:300,overflowY:'auto'}}>{!t.trim()?<div style={{color:'var(--tx4)',fontSize:11}}>검색어 입력</div>:!res.length?<div style={{color:'var(--tx4)',fontSize:11}}>없음</div>
      :res.map((r,i)=><div key={i} onClick={()=>{if(r.tp==='scene')setSel({pid:r.sc.platformId,sid:r.sc.id,ptid:r.p.id,scid:r.s.id,eid:null});else setSel({pid:r.sc.platformId,sid:r.sc.id,ptid:null,scid:null,eid:r.e.id});setMode('edit');onClose()}}
        style={{border:'1px solid var(--bdr)',borderRadius:6,padding:'7px 10px',marginBottom:4,cursor:'pointer'}}>
        <div style={{fontFamily:'JetBrains Mono',fontWeight:600,fontSize:12}}>{r.tp==='scene'?r.s.title:r.e.title}</div>
        <div style={{fontSize:10,color:'var(--tx4)'}}>{r.sc.title} · {r.c}건</div></div>)}</div>}
  </Modal>}

function PlatM({D,up,setSel,onClose}){const[n,setN]=useState('');const[c,setC]=useState(PLAT_C[D.platforms.length%PLAT_C.length]);
  return<Modal title="사이트 추가" onClose={onClose} width={380} footer={<Btn primary onClick={()=>{if(!n.trim()){onClose();return}const pid=uid();up(d=>{d.platforms.push({id:pid,name:n.trim(),color:c,commands:[]})});setSel(s=>({...s,pid}));onClose()}}>추가</Btn>}>
    <div style={{marginBottom:8}}><label style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>이름</label><Inp value={n} onChange={setN} placeholder="Roll20, 코코포리아..."/></div>
    <div><label style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>색상</label>
      <div style={{display:'flex',gap:4}}>{PLAT_C.map(cc=><div key={cc} onClick={()=>setC(cc)} style={{width:22,height:22,borderRadius:'50%',background:cc,cursor:'pointer',border:`2px solid ${cc===c?'var(--tx1)':'transparent'}`}}/>)}</div></div></Modal>}

function CmdM({plat,up,sel,onClose}){const[ei,setEi]=useState(null);const[newColor,setNewColor]=useState('#AA0000');
  if(!plat)return<Modal title="명령어" onClose={onClose}><div style={{color:'var(--tx4)'}}>사이트 선택</div></Modal>;
  const cms=plat.commands||[];const ed=cms.find(c=>c.id===ei);const colors=plat.savedColors||[];
  const uP=fn=>up(d=>{const p=d.platforms.find(x=>x.id===sel.pid);fn(p)});
  return<Modal title={`명령어 — ${plat.name}`} onClose={onClose} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    {/* Commands */}
    <div style={{fontFamily:'JetBrains Mono',fontSize:9,fontWeight:600,color:'var(--tx4)',marginBottom:4}}>COMMANDS</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
      {cms.map(c=><button key={c.id} onClick={()=>setEi(ei===c.id?null:c.id)}
        style={{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:600,fontFamily:'JetBrains Mono',cursor:'pointer',
          border:`1px solid ${ei===c.id?'var(--blue)':'var(--bdr)'}`,background:ei===c.id?'var(--blue)':'transparent',color:ei===c.id?'#fff':'var(--tx3)'}}>{c.l||'?'}</button>)}</div>
    {ed&&<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf2)',marginBottom:8}}>
      <Inp value={ed.l} onChange={v=>uP(p=>{p.commands.find(x=>x.id===ei).l=v})} placeholder="이름" style={{marginBottom:4}}/>
      <Inp value={ed.cat||''} onChange={v=>uP(p=>{p.commands.find(x=>x.id===ei).cat=v})} placeholder="카테고리" style={{marginBottom:4}}/>
      <TA value={ed.s} onChange={v=>uP(p=>{p.commands.find(x=>x.id===ei).s=v})} placeholder="삽입 텍스트" style={{fontFamily:'JetBrains Mono'}}/>
      <Btn danger small onClick={()=>{uP(p=>{p.commands=p.commands.filter(x=>x.id!==ei)});setEi(null)}} style={{marginTop:5}}><Trash2 size={11}/>삭제</Btn></div>}
    <Btn small onClick={()=>{const nid=uid();uP(p=>{p.commands.push({id:nid,l:'새 명령어',s:'',cat:'기본'})});setEi(nid)}} style={{width:'100%',justifyContent:'center',borderStyle:'dashed',marginBottom:14}}><Plus size={9}/>명령어 추가</Btn>
    {/* Saved Colors */}
    <div style={{fontFamily:'JetBrains Mono',fontSize:9,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>SAVED COLORS — 롤꾸에서 자주 쓰는 색상</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:5,alignItems:'center',marginBottom:8}}>
      {colors.map((hex,i)=><div key={i} style={{position:'relative'}}>
        <div style={{width:26,height:26,borderRadius:'50%',background:hex,border:'2px solid var(--bdr)',cursor:'pointer'}} title={hex}
          onClick={()=>{navigator.clipboard?.writeText(hex)}}/>
        <button onClick={()=>uP(p=>{p.savedColors=p.savedColors.filter((_,j)=>j!==i)})}
          style={{position:'absolute',top:-4,right:-4,width:14,height:14,borderRadius:'50%',background:'var(--red)',color:'#fff',fontSize:8,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
      </div>)}
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <input type="color" value={newColor} onChange={e=>setNewColor(e.target.value)}
          style={{width:26,height:26,border:'1px solid var(--bdr)',borderRadius:4,padding:1,cursor:'pointer'}}/>
        <Inp value={newColor} onChange={setNewColor} mono style={{width:80,fontSize:11}}/>
        <Btn small onClick={()=>{uP(p=>{if(!p.savedColors)p.savedColors=[];if(!p.savedColors.includes(newColor))p.savedColors.push(newColor)})}}>
          <Plus size={9}/>저장</Btn>
      </div>
    </div>
  </Modal>}

function LibM({sc,up,sel,scene,onClose,toast}){const[tab,setTab]=useState('npcs');const[ei,setEi]=useState(null);
  if(!sc)return<Modal title="자료" onClose={onClose}><div style={{color:'var(--tx4)'}}>시나리오 선택</div></Modal>;
  const lib=sc.library[tab]||[];const ed=lib.find(e=>e.id===ei);const lbs={npcs:'NPC',items:'아이템',places:'장소'};
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  return<Modal title="NPC · 아이템 · 장소" onClose={onClose} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    <div style={{display:'flex',gap:1,border:'1px solid var(--bdr)',borderRadius:6,padding:2,marginBottom:10}}>
      {['npcs','items','places'].map(t=><button key={t} onClick={()=>{setTab(t);setEi(null)}}
        style={{flex:1,padding:'4px 8px',borderRadius:4,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',
          background:tab===t?'var(--blue)':'transparent',color:tab===t?'#fff':'var(--tx4)'}}>{lbs[t]}</button>)}</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
      {lib.map(e=><button key={e.id} onClick={()=>setEi(ei===e.id?null:e.id)}
        style={{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:600,fontFamily:'JetBrains Mono',cursor:'pointer',
          border:`1px solid ${ei===e.id?'var(--blue)':'var(--bdr)'}`,background:ei===e.id?'var(--blue)':'transparent',color:ei===e.id?'#fff':'var(--tx3)'}}>{e.name||'?'}</button>)}</div>
    {ed&&<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf2)',marginBottom:8}}>
      <Inp value={ed.name||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).name=v})} placeholder="이름" style={{marginBottom:4}}/>
      {tab==='npcs'?<><Inp value={ed.role||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).role=v})} placeholder="역할" style={{marginBottom:4}}/>
        <TA value={ed.traits||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).traits=v})} placeholder="특징"/></>
      :<TA value={ed.description||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).description=v})} placeholder="설명"/>}
      <div style={{display:'flex',gap:4,marginTop:5}}>
        <Btn primary small disabled={!scene} onClick={()=>{const bt=tab==='npcs'?'npc':tab==='items'?'item':'place';
          up(d=>{const pt2=d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===sel.ptid);const sc2=pt2?.scenes.find(x=>x.id===sel.scid);if(!sc2)return;
            sc2.blocks.push({id:uid(),type:bt,label:BT[bt].l,...JSON.parse(JSON.stringify(ed))})});toast('추가됨')}}><Plus size={9}/>씬에 추가</Btn>
        <Btn danger small onClick={()=>{uS(s=>{s.library[tab]=s.library[tab].filter(x=>x.id!==ei)});setEi(null)}}><Trash2 size={9}/>삭제</Btn></div></div>}
    <Btn small onClick={()=>{const nid=uid();const ne=tab==='npcs'?{id:nid,name:'',imageUrl:'',role:'',traits:'',lines:''}:{id:nid,name:'',imageUrl:'',description:'',gmNote:''};
      uS(s=>{s.library[tab].push(ne)});setEi(nid)}} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>추가</Btn></Modal>}

function ETM({sc,up,sel,onClose}){const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  return<Modal title="엔딩 타입 관리" onClose={onClose} width={400} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    {sc.endingTypes.map((et,i)=><div key={et.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',borderBottom:'1px solid var(--bdr)'}}>
      <input type="color" value={et.c} onChange={e=>uS(s=>{s.endingTypes[i].c=e.target.value})} style={{width:24,height:24,border:'1px solid var(--bdr)',borderRadius:4,padding:1,cursor:'pointer'}}/>
      <Inp value={et.l} onChange={v=>uS(s=>{s.endingTypes[i].l=v})}/>
      <IB I={Trash2} s={13} onClick={()=>{if(sc.endingTypes.length<=1)return;uS(s=>{s.endingTypes.splice(i,1)})}}/></div>)}
    <Btn small onClick={()=>uS(s=>{s.endingTypes.push({id:uid(),l:'새 타입',c:PLAT_C[s.endingTypes.length%PLAT_C.length]})})} style={{width:'100%',justifyContent:'center',marginTop:6,borderStyle:'dashed'}}><Plus size={9}/>추가</Btn></Modal>}

function ClueEditM({sc,clueId,up,sel,onClose}){
  const clue=sc.clues.find(c=>c.id===clueId);if(!clue)return null;
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  const uC=fn=>uS(s=>{const c=s.clues.find(x=>x.id===clueId);fn(c)});
  return<Modal title="단서 편집" onClose={onClose} width={400} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    <div style={{marginBottom:8}}><label style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>이름</label><Inp value={clue.name} onChange={v=>uC(c=>{c.name=v})}/></div>
    <div style={{marginBottom:8}}><label style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>설명</label><TA value={clue.description||''} onChange={v=>uC(c=>{c.description=v})} placeholder="단서에 대한 상세 설명"/></div>
    <div style={{marginBottom:8}}><label style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>연결 결론 (3단서 법칙용)</label><Inp value={clue.leadsTo||''} onChange={v=>uC(c=>{c.leadsTo=v})} placeholder="예: 범인의 정체, 등대의 비밀"/></div>
    <div style={{marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
      <label style={{fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
        <input type="checkbox" checked={clue.isRedHerring} onChange={e=>uC(c=>{c.isRedHerring=e.target.checked})} style={{accentColor:'var(--red)'}}/>
        레드 헤링 (미끼 단서)</label></div>
  </Modal>}

// =====================================================================
// ===== v5 ADDITIONS: 입력 모달 · 복사 · 명령어바 · 롤꾸 보관함 · ?{} 채우기 · BGM · 사이드바 탭
// =====================================================================
const bus={};
const mdR=t=>{let s=esc(t);s=s.replace(/\*\*\*([^*]+)\*\*\*/g,'<b><i>$1</i></b>');s=s.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');s=s.replace(/\*([^*]+)\*/g,'<i>$1</i>');return s};
let _lastTA=null;
function setNativeValue(el,val){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}))}
function insertAtLast(text){const ta=_lastTA;if(!ta||!document.body.contains(ta))return false;
  const s=ta.selectionStart??ta.value.length,e=ta.selectionEnd??s;
  setNativeValue(ta,ta.value.slice(0,s)+text+ta.value.slice(e));const pos=s+text.length;
  requestAnimationFrame(()=>{try{ta.focus({preventScroll:true});ta.setSelectionRange(pos,pos)}catch(_){}});return true}

// ?{질문|기본값} 파서 — 같은 질문은 한 번만 (Roll20과 동일)
function scanQ(code,i){let d=1,j=i+2;while(j<code.length&&d>0){if(code[j]==='{')d++;else if(code[j]==='}')d--;j++}return d===0?j:-1}
function parseQueries(code){const out=[],seen=new Set();let i=0;if(!code)return out;
  while((i=code.indexOf('?{',i))!==-1){const j=scanQ(code,i);if(j<0)break;const inner=code.slice(i+2,j-1);
    if(!seen.has(inner)){seen.add(inner);const parts=inner.split('|');
      out.push({key:inner,label:parts[0].trim()||'(질문)',def:parts[1]??'',options:parts.length>2?parts.slice(1).map(o=>{const[a,...b]=o.split(',');return{label:a,value:b.length?b.join(','):a}}):null})}
    i=j}return out}
function fillQueries(code,vals,keepEmpty,br){let res='',i=0;
  while(true){const k=code.indexOf('?{',i);if(k===-1){res+=code.slice(i);break}const j=scanQ(code,k);if(j<0){res+=code.slice(i);break}
    const inner=code.slice(k+2,j-1);const v=vals[inner];res+=code.slice(i,k);
    if(v==null||v==='')res+=keepEmpty?code.slice(k,j):(inner.split('|')[1]??'');
    else res+=br?String(v).replace(/\r?\n/g,'<br>'):String(v).replace(/\r?\n/g,' ');
    i=j}return res}

function defTpl(){return[
  {id:uid(),name:'핸드아웃',code:`/desc [·· HANDOUT ··](#" style="font-size: 18px; font-family: Fantasy, gulim !important; background: #ffffff; text-align: center; display: block; padding: 10px 15px; padding-bottom: 0; font-style: normal !important; font-weight: normal !important; border-radius: 20px 20px 0 0; margin-left: -4px; text-decoration: none; box-shadow: -4px 4px 0 #d7d7d7; letter-spacing: 2px; border-bottom: none; color: #d7d7d7; )[**?{핸드아웃 명|이름}**](#" style="font-size: 16px; font-family: gulim !important; background: #ffffff; text-align: center; display: block; padding: 10px 15px; padding-bottom: 0; font-style: normal !important; font-weight: normal !important; margin-left: -4px; text-decoration: none; box-shadow: -4px 4px 0 #d7d7d7; letter-spacing: -1px; border-top: none; border-bottom: none; color: #252525; )[━━━━━━━━━━━━━━━━━─](#" style="font-size: 12px; font-family: gulim !important; color: #d7d7d7; background: #ffffff; text-align: center; display: block; padding: 10px 15px; padding-bottom: 0; font-style: normal !important; font-weight: normal !important; margin-left: -4px; text-decoration: none; box-shadow: -4px 4px 0 #d7d7d7; letter-spacing: -1px; border-top: none; border-bottom: none; )[?{내용|내용을 입력해주세요.}](#" style="font-size: 14px; font-family: gulim !important; line-height: 180%; background: #ffffff; text-align: center; display: block; padding: 10px 15px; padding-bottom: 0; font-style: normal !important; font-weight: normal !important; margin-left: -4px; text-decoration: none; box-shadow: -4px 4px 0 #d7d7d7; letter-spacing: -1px; border-top: none; border-bottom: none; color: #252525;)[　](#" style="font-size: 3px; font-family: gulim !important; color: #252525; background: #ffffff; text-align: center; display: block; padding: 3px 5px; font-style: normal !important; font-weight: normal !important; border-radius: 0 0 20px 20px; margin-left: -4px; text-decoration: none; border-top: none; box-shadow: -4px 4px 0 #d7d7d7; letter-spacing: -1px; )`},
  {id:uid(),name:'메시지 (받음)',code:`/desc [?{받은 메시지|}](#" style="display:block; background:#ffffff; color:#252525; border-radius:12px 12px 12px 0; padding:10px 14px; margin-right:40px; text-decoration:none; font-style:normal !important; font-weight:normal !important; line-height:180%; font-size:14px; text-align:left; box-shadow: -4px 4px 0 #d7d7d7;)`},
  {id:uid(),name:'메시지 (보냄)',code:`/desc [?{보낸 메시지|}](#" style="display:block; background:#d4edff; color:#252525; border-radius:12px 12px 0 12px; padding:10px 14px; margin-left:40px; text-decoration:none; font-style:normal !important; font-weight:normal !important; line-height:180%; font-size:14px; text-align:left;)`},
  {id:uid(),name:'진동 (지이잉)',code:`/desc [?{진동 텍스트|지이잉.}](#" style="display:block; font-size:18px; color:#222222; text-align:center; padding:12px; text-decoration:none; font-style:normal !important; font-weight:normal !important; letter-spacing:6px; text-shadow: 5px 0 0 #aaaaaa, 10px 0 0 #dddddd; background:transparent;)`},
]}

const ytId=u=>{const m=(u||'').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);return m?m[1]:null};
function collectBgm(sc){const out=[];
  for(const p of sc.parts)for(const s of p.scenes)for(const b of(s.blocks||[]))if(b.type==='bgm')out.push({b,ptid:p.id,scid:s.id,where:s.title});
  for(const e of sc.endings)for(const b of(e.blocks||[]))if(b.type==='bgm')out.push({b,eid:e.id,where:'엔딩 · '+(e.title||'')});
  return out}

// ---- 입력/확인 모달 (브라우저 prompt/confirm 대체) ----
let _ask=null;
function askText(title,init='',opt={}){return _ask?_ask({kind:'text',title,init,...opt}):Promise.resolve(window.prompt(title,init))}
function askConfirm(title,opt={}){return _ask?_ask({kind:'confirm',title,...opt}):Promise.resolve(window.confirm(title))}
function askChoice(title,opt={}){return _ask?_ask({kind:'choice',title,...opt}):Promise.resolve(null)}
function AskHost(){
  const[q,setQ]=useState(null);const[v,setV]=useState('');const res=useRef();const inp=useRef();
  useEffect(()=>{_ask=o=>new Promise(r=>{res.current=r;setV(o.init||'');setQ(o)});return()=>{_ask=null}},[]);
  useEffect(()=>{if(!q)return;if(q.kind==='text')setTimeout(()=>{inp.current?.focus();inp.current?.select?.()},30);
    const h=e=>{if(e.key==='Escape')cancel();else if(e.key==='Enter'&&q.kind!=='choice'&&(q.kind==='confirm'||!q.multiline||e.ctrlKey||e.metaKey)){e.preventDefault();ok()}};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)});
  if(!q)return null;
  const done=val=>{setQ(null);res.current?.(val)};
  const ok=()=>done(q.kind==='text'?v.trim():true);
  const cancel=()=>done(q.kind==='text'?null:q.kind==='choice'?null:false);
  const fld={width:'100%',border:'1px solid var(--bdr)',borderRadius:6,padding:'8px 10px',fontSize:13,outline:'none',background:'var(--sf1)',color:'var(--tx1)',fontFamily:'inherit'};
  const footer=q.kind==='choice'?<>{(q.options||[]).map((o,i)=><Btn key={i} primary={o.primary} onClick={()=>done(o.value)} style={o.danger?{color:'var(--red)',borderColor:'var(--red)'}:undefined}>{o.label}</Btn>)}</>
    :<><Btn onClick={cancel}>취소</Btn>{q.kind==='confirm'&&q.danger?<Btn onClick={ok} style={{background:'var(--red)',borderColor:'var(--red)',color:'#fff'}}>{q.okLabel||'삭제'}</Btn>:<Btn primary onClick={ok}>{q.okLabel||'확인'}</Btn>}</>;
  return<Modal title={q.title} onClose={cancel} width={q.kind==='choice'?460:400} footer={footer}>
    {q.kind==='text'?(q.multiline?<textarea ref={inp} value={v} onChange={e=>setV(e.target.value)} rows={5} placeholder={q.placeholder||''} style={{...fld,resize:'vertical',lineHeight:1.6}}/>
      :<input ref={inp} type={q.password?'password':'text'} value={v} onChange={e=>setV(e.target.value)} placeholder={q.placeholder||'입력'} style={fld}/>)
    :<div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{q.body||(q.danger?'Ctrl+Z로 되돌릴 수 있어요.':'')}</div>}
    {q.kind==='text'&&q.multiline&&<div style={{fontSize:10,color:'var(--tx4)',marginTop:4,fontFamily:'JetBrains Mono'}}>Ctrl+Enter로 저장</div>}
  </Modal>}

// ---- 복사 버튼 ----
function CopyBtn({text,label}){const[ok,setOk]=useState(false);
  return<button className={'cp-btn'+(ok?' done':'')} title="복사" onClick={e=>{e.stopPropagation();navigator.clipboard?.writeText(text||'').then(()=>{setOk(true);setTimeout(()=>setOk(false),900)}).catch(()=>{})}}
    style={{flexShrink:0,display:'inline-flex',alignItems:'center',gap:3,border:`1px solid ${ok?'var(--green)':'var(--bdr)'}`,color:ok?'var(--green)':'var(--tx4)',background:'var(--sf1)',borderRadius:12,padding:label?'1px 8px':'2px 5px',fontSize:10,fontFamily:'JetBrains Mono',cursor:'pointer'}}>
    {ok?<Check size={10}/>:<Copy size={10}/>}{label&&(ok?'복사됨':label)}</button>}

// ---- 블록 안 ?{} 채우기 버튼 ----
function QFillBtn({text,onApply}){const n=useMemo(()=>text&&text.includes('?{')?parseQueries(text).length:0,[text]);if(!n)return null;
  return<button onClick={()=>bus.fill?.({code:text,title:'?{} 채우기',mode:'replace',onApply})}
    style={{marginTop:5,display:'inline-flex',alignItems:'center',gap:4,fontFamily:'JetBrains Mono',fontSize:10,fontWeight:600,color:'var(--teal)',background:'var(--tealA)',border:'1px dashed var(--teal)',borderRadius:12,padding:'2px 9px',cursor:'pointer'}}>
    <Sparkles size={10}/>{'?{} 채우기 · '+n+'칸'}</button>}

// ---- 상단 고정 명령어 바 ----
function CmdBar({plat}){
  const[open,setOpen]=useState(true);if(!plat)return null;
  const cmds=plat.commands||[],cols=plat.savedColors||[],tpls=plat.templates||[];
  const nd=e=>e.preventDefault();
  const chip={padding:'3px 9px',borderRadius:16,fontSize:10.5,fontWeight:600,fontFamily:'JetBrains Mono',cursor:'pointer',border:'1px solid var(--bdr)',background:'var(--sf1)',color:'var(--tx3)',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:4};
  return<div className="no-print" style={{position:'sticky',top:0,zIndex:20,margin:'-22px -30px 16px',padding:open?'8px 30px':'4px 30px',background:'var(--bg2)',borderBottom:'1px solid var(--bdr)',boxShadow:'0 4px 12px -8px rgba(0,0,0,.35)'}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,alignItems:'center'}}>
      <button onMouseDown={nd} onClick={()=>setOpen(!open)} title={open?'접기':'펼치기'} style={{...chip,border:'none',background:'transparent',padding:'3px 4px',color:'var(--tx4)'}}>
        {open?<ChevronUp size={12}/>:<ChevronDown size={12}/>}⌘{!open&&' 명령어 바'}</button>
      {open&&<>
        {cmds.map(c=>{const q=c.s?.includes('?{');return<button key={c.id} onMouseDown={nd} onClick={()=>bus.useCode(c.s||'',c.l)} title={c.s} style={chip}>
          {c.l}{q&&<span style={{width:5,height:5,borderRadius:'50%',background:'var(--teal)'}}/>}</button>})}
        {cols.length>0&&<span style={{width:1,height:16,background:'var(--bdr)',margin:'0 2px'}}/>}
        {cols.map((hex,i)=><button key={'c'+i} onMouseDown={nd} title={hex+' 글자색'}
          onClick={()=>bus.useCode(`[?{텍스트|}](#" style="color:${hex}; text-decoration:none; font-style:normal !important;)`,hex)}
          style={{width:18,height:18,borderRadius:'50%',border:'2px solid var(--bdr)',background:hex,cursor:'pointer',padding:0}}/>)}
        {tpls.length>0&&<span style={{width:1,height:16,background:'var(--bdr)',margin:'0 2px'}}/>}
        {tpls.map(t=><button key={t.id} onMouseDown={nd} onClick={()=>bus.useCode(t.code,t.name)} title="롤꾸 템플릿"
          style={{...chip,borderColor:'var(--teal)',color:'var(--teal)',background:'var(--tealA)'}}><Sparkles size={10}/>{t.name}</button>)}
        <span style={{flex:1}}/>
        <IB I={Settings} s={13} title="명령어 · 색상 관리" onClick={()=>bus.setMdl('cmd')}/>
        <Btn small onClick={()=>bus.setMdl('tpl')} style={{color:'var(--teal)',borderColor:'var(--teal)'}}><Sparkles size={10}/>보관함</Btn>
      </>}
    </div>
  </div>}

// ---- ?{} 채우기 모달 ----
function FillM({fill,onClose}){
  const{code,title,mode,onApply}=fill;
  const fields=useMemo(()=>parseQueries(code),[code]);
  const[vals,setVals]=useState({});const[keep,setKeep]=useState(true);const[br,setBr]=useState(true);
  const result=useMemo(()=>fillQueries(code,vals,keep,br),[code,vals,keep,br]);
  const apply=()=>{onApply(result);onClose()};
  useEffect(()=>{const h=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();apply()}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)});
  const box=useRef();
  useEffect(()=>{const t=setTimeout(()=>{const el=box.current?.querySelector('textarea,select');if(el)el.focus()},40);return()=>clearTimeout(t)},[]);
  const lab={fontFamily:'JetBrains Mono',fontSize:10.5,fontWeight:700,color:'var(--tx1)'};
  const ck={display:'flex',alignItems:'center',gap:6,fontSize:11.5,color:'var(--tx3)',cursor:'pointer'};
  return<Modal title={'✦ '+(title||'채우기')} onClose={onClose} width={560} footer={<>
      <Btn onClick={()=>{navigator.clipboard?.writeText(result);bus.toast?.('복사됨')}}><Copy size={11}/>복사</Btn>
      <Btn primary onClick={apply}>{mode==='replace'?'적용':'삽입'}</Btn></>}>
    <div ref={box}><div style={{fontSize:11.5,color:'var(--tx3)',marginBottom:12,lineHeight:1.6}}>이번 시나리오에 맞게 채워주세요. 비워둔 칸은 아래 설정대로 처리돼요.</div>
    {fields.map((f,idx)=><div key={f.key} style={{marginBottom:10}}>
      <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:4}}>
        <span style={lab}>{f.label}</span>
        {f.def&&!f.options&&<span style={{fontSize:10,color:'var(--tx4)'}}>기본값: {f.def}</span>}</div>
      {f.options?<select value={vals[f.key]||''} onChange={e=>setVals(v=>({...v,[f.key]:e.target.value}))}
          style={{width:'100%',padding:'7px 9px',border:'1px solid var(--bdr)',borderRadius:6,background:'var(--sf1)',color:'var(--tx1)',fontSize:12}}>
          <option value="">(비워두기)</option>{f.options.map((o,i)=><option key={i} value={o.value}>{o.label}</option>)}</select>
        :<TA value={vals[f.key]||''} onChange={x=>setVals(v=>({...v,[f.key]:x}))} placeholder={f.def||'내용 입력'} autoFocus={idx===0}/>}
    </div>)}
    <div style={{display:'flex',flexDirection:'column',gap:5,padding:'8px 10px',border:'1px solid var(--bdr)',borderRadius:6,background:'var(--sf2)',marginBottom:12}}>
      <label style={ck}><input type="checkbox" checked={keep} onChange={e=>setKeep(e.target.checked)} style={{accentColor:'var(--teal)'}}/>
        빈칸은 <code style={{fontFamily:'JetBrains Mono',fontSize:10.5}}>?{'{}'}</code> 그대로 두기 <span style={{color:'var(--tx4)'}}>(끄면 기본값으로 채움)</span></label>
      <label style={ck}><input type="checkbox" checked={br} onChange={e=>setBr(e.target.checked)} style={{accentColor:'var(--teal)'}}/>
        줄바꿈을 <code style={{fontFamily:'JetBrains Mono',fontSize:10.5}}>{'<br>'}</code>로 변환 <span style={{color:'var(--tx4)'}}>(Roll20 한 줄 유지)</span></label>
    </div>
    <div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden'}}>
      <div style={{padding:'5px 10px',background:'#161b22',borderBottom:'1px solid #30363d',fontFamily:'JetBrains Mono',fontSize:9,color:'#8b949e'}}>미리보기</div>
      <div className="r20chat" dangerouslySetInnerHTML={{__html:renderR20(result)}}/></div>
    </div>
  </Modal>}

// ---- 롤꾸 보관함 ----
function TplM({plat,up,sel,onClose}){
  const[ei,setEi]=useState(plat?.templates?.[0]?.id||null);
  if(!plat)return<Modal title="롤꾸 보관함" onClose={onClose}><div style={{color:'var(--tx4)'}}>사이트를 먼저 선택하세요</div></Modal>;
  const tpls=plat.templates||[];const ed=tpls.find(t=>t.id===ei);
  const uP=fn=>up(d=>{const p=d.platforms.find(x=>x.id===sel.pid);p.templates??=[];fn(p)});
  const uT=fn=>uP(p=>{const t=p.templates.find(x=>x.id===ei);if(t)fn(t)});
  const fields=ed?parseQueries(ed.code):[];
  return<Modal title={'✦ 롤꾸 보관함 — '+plat.name} onClose={onClose} width={720} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    <div style={{fontSize:11.5,color:'var(--tx3)',marginBottom:12,lineHeight:1.65}}>
      자주 쓰는 롤꾸 코드를 저장해두세요. 그때그때 바뀌는 자리는 <code style={{fontFamily:'JetBrains Mono',color:'var(--teal)'}}>{'?{질문|안내문}'}</code>으로 비워두면,
      쓸 때마다 <b>질문이 입력칸 이름</b>, <b>안내문이 회색 힌트</b>로 떠서 바로 채울 수 있어요. 저장한 템플릿은 명령어 바에 <span style={{color:'var(--teal)'}}>✦ 칩</span>으로 나와요.</div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(130px,180px) 1fr',gap:12}}>
      <div style={{display:'flex',flexDirection:'column',gap:3}}>
        {tpls.map(t=><button key={t.id} onClick={()=>setEi(t.id)} style={{textAlign:'left',padding:'6px 9px',borderRadius:6,fontSize:12,fontWeight:t.id===ei?700:500,cursor:'pointer',
          border:`1px solid ${t.id===ei?'var(--teal)':'transparent'}`,background:t.id===ei?'var(--tealA)':'transparent',color:t.id===ei?'var(--teal)':'var(--tx2)'}}>
          {t.name||'(이름 없음)'}<div style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--tx4)',fontWeight:500}}>{parseQueries(t.code).length}칸</div></button>)}
        <Btn small onClick={()=>{const nid=uid();uP(p=>{p.templates.push({id:nid,name:'새 템플릿',code:'/desc [?{내용|}](#" style="display:block; text-decoration:none;)'})});setEi(nid)}}
          style={{justifyContent:'center',borderStyle:'dashed',marginTop:4}}><Plus size={10}/>새 템플릿</Btn>
      </div>
      <div style={{minWidth:0}}>{!ed?<div style={{color:'var(--tx4)',fontSize:12,padding:20,textAlign:'center'}}>왼쪽에서 템플릿을 고르거나 새로 만드세요</div>:<>
        <Inp value={ed.name} onChange={v=>uT(t=>{t.name=v})} placeholder="템플릿 이름" style={{marginBottom:6,fontWeight:600}}/>
        <TA value={ed.code} onChange={v=>uT(t=>{t.code=v})} placeholder="롤꾸 코드" style={{fontFamily:'JetBrains Mono,ui-monospace,monospace',fontSize:11,lineHeight:1.55,maxHeight:220,overflowY:'auto'}}/>
        <div style={{display:'flex',flexWrap:'wrap',gap:4,margin:'8px 0',alignItems:'center'}}>
          <span style={{fontFamily:'JetBrains Mono',fontSize:9,fontWeight:600,color:'var(--tx4)',marginRight:2}}>입력칸</span>
          {fields.length?fields.map(f=><span key={f.key} title={f.def?'안내: '+f.def:''} style={{fontFamily:'JetBrains Mono',fontSize:10,padding:'1px 8px',borderRadius:12,background:'var(--tealA)',color:'var(--teal)'}}>
            {f.label}{f.def&&<span style={{opacity:.6}}> · {f.def.length>10?f.def.slice(0,10)+'…':f.def}</span>}</span>)
          :<span style={{fontSize:10.5,color:'var(--tx4)'}}>없음 — 누르면 그대로 삽입돼요</span>}
        </div>
        <div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden',marginBottom:8}}>
          <div style={{padding:'5px 10px',background:'#161b22',borderBottom:'1px solid #30363d',fontFamily:'JetBrains Mono',fontSize:9,color:'#8b949e'}}>미리보기</div>
          <div className="r20chat" dangerouslySetInnerHTML={{__html:renderR20(ed.code)}}/></div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          <Btn primary small onClick={()=>{onClose();setTimeout(()=>bus.useCode(ed.code,ed.name),50)}}><Sparkles size={10}/>지금 사용</Btn>
          <Btn small onClick={()=>{const nid=uid();uP(p=>{p.templates.push({...JSON.parse(JSON.stringify(ed)),id:nid,name:ed.name+' (복사)'})});setEi(nid)}}><CopyPlus size={10}/>복제</Btn>
          <Btn danger small onClick={async()=>{if(!await askConfirm(`"${ed.name}" 템플릿을 삭제할까요?`,{danger:true}))return;uP(p=>{p.templates=p.templates.filter(x=>x.id!==ed.id)});setEi(null)}}><Trash2 size={10}/>삭제</Btn>
        </div></>}
      </div>
    </div>
  </Modal>}

// ---- 사이드바 (탭 구조) ----
function Sidebar({D,sel,setSel,up,toast,setMdl,op,setOp,sbOpen,setSb,sc,scs,selSc,selEnd}){
  const[tab,setTab]=useState('scenes');const S=sel;
  const usc=fn=>up(d=>fn(d.scenarios.find(x=>x.id===S.sid)));
  const row=on=>({display:'flex',alignItems:'center',gap:6,padding:'4px 8px',borderRadius:6,cursor:'pointer',background:on?'var(--blueA)':'transparent',color:on?'var(--blue)':'var(--tx2)',fontWeight:on?600:500,minWidth:0});
  const txt={flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'};
  const empty=t=><div style={{color:'var(--tx4)',fontSize:11,padding:'14px 8px',textAlign:'center',lineHeight:1.6}}>{t}</div>;
  const addBtn=(label,fn,Icon=Plus)=><Btn small onClick={fn} style={{width:'100%',justifyContent:'center',borderStyle:'dashed',marginBottom:6}}><Icon size={10}/>{label}</Btn>;
  const bgms=sc?collectBgm(sc):[];
  const addScenario=async()=>{if(!S.pid){toast('사이트를 먼저 선택하세요');return}const n=await askText('새 시나리오 이름');if(!n)return;const nid=uid();
    up(d=>{d.scenarios.push({id:nid,title:n,platformId:S.pid,setting:'',synopsis:'',parts:[],endings:[],clues:[],eventTimeline:[],sessionHistory:[],endingTypes:DEF_ET.map(e=>({...e})),library:{npcs:[],items:[],places:[]}})});
    setSel({pid:S.pid,sid:nid,ptid:null,scid:null,eid:null})};
  const tabs=sc?[['scenes','씬',sc.parts.reduce((a,p)=>a+p.scenes.length,0)],['clues','단서',sc.clues.length],['endings','엔딩',sc.endings.length],['bgm','BGM',bgms.length],['sessions','기록',(sc.sessionHistory||[]).length]]:[];
  return<div className="no-print" style={{background:'var(--sf1)',borderRight:'1px solid var(--bdr)',display:'flex',flexDirection:'column',overflow:'hidden',fontSize:12,minWidth:0,visibility:sbOpen?'visible':'hidden'}}>
    {/* 사이트 */}
    <div style={{padding:'10px 12px 8px',borderBottom:'1px solid var(--bdr)'}}>
      <SecTitle right={<IB I={PanelLeftClose} s={13} onClick={()=>setSb(false)} title="사이드바 접기"/>}>Platforms</SecTitle>
      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
        {D.platforms.map(p=>{const on=S.pid===p.id;return<button key={p.id} onClick={()=>setSel({pid:p.id,sid:null,ptid:null,scid:null,eid:null})}
          style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:14,fontSize:11,fontWeight:600,cursor:'pointer',
            border:`1px solid ${on?p.color:'var(--bdr)'}`,background:on?'var(--blueA)':'transparent',color:on?'var(--tx1)':'var(--tx3)'}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:p.color}}/>{p.name}</button>})}
        <button onClick={()=>setMdl('platform')} title="사이트 추가" style={{padding:'3px 8px',borderRadius:14,fontSize:11,border:'1px dashed var(--bdr)',color:'var(--tx4)',cursor:'pointer'}}>+</button>
      </div>
    </div>
    {/* 시나리오 */}
    <div style={{padding:'10px 12px 8px',borderBottom:'1px solid var(--bdr)'}}>
      <SecTitle right={<IB I={Plus} s={13} onClick={addScenario} title="새 시나리오"/>}>Scenarios</SecTitle>
      <div style={{maxHeight:150,overflowY:'auto'}}>
        {!scs.length&&empty('시나리오가 없어요')}
        {scs.map(s=><div key={s.id} className="sb-row" onClick={()=>setSel({pid:S.pid,sid:s.id,ptid:null,scid:null,eid:null})} style={row(S.sid===s.id)}>
          <span style={txt}>{s.title}</span>
          <span className="sb-act"><IB I={Trash2} s={12} onClick={async e=>{e.stopPropagation();if(!await askConfirm(`"${s.title}" 시나리오를 삭제할까요?`,{danger:true}))return;
            up(d=>{d.scenarios=d.scenarios.filter(x=>x.id!==s.id)});if(S.sid===s.id)setSel(v=>({...v,sid:null,ptid:null,scid:null,eid:null}))}}/></span></div>)}
      </div>
    </div>
    {!sc?<div style={{flex:1}}>{empty('시나리오를 선택하면 씬 · 단서 · 엔딩이 여기 나와요')}</div>:<>
      {/* 탭 */}
      <div style={{display:'flex',borderBottom:'1px solid var(--bdr)',padding:'0 6px',overflowX:'auto'}}>
        {tabs.map(([k,l,n])=><button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'8px 2px 7px',fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',
          color:tab===k?'var(--tx1)':'var(--tx4)',borderBottom:`2px solid ${tab===k?'var(--blue)':'transparent'}`,marginBottom:-1}}>
          {l}{n>0&&<span style={{fontFamily:'JetBrains Mono',fontSize:9,marginLeft:3,color:tab===k?'var(--blue)':'var(--tx4)'}}>{n}</span>}</button>)}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px 10px'}}>
        {tab==='scenes'&&<>
          {sc.parts.map(p=>{const isO=op[p.id];const dc=p.scenes.filter(s=>s.done).length;
            return<div key={p.id} style={{marginBottom:2}}>
              <div className="sb-row" onClick={()=>setOp(v=>({...v,[p.id]:!v[p.id]}))} style={{...row(false),fontFamily:'JetBrains Mono',fontSize:11,fontWeight:600,padding:'4px 6px'}}>
                <span style={{fontSize:8,color:'var(--tx4)',width:12,textAlign:'center',transition:'transform .1s',transform:isO?'rotate(90deg)':'none'}}>▶</span>
                <span style={txt}>{p.title}</span><span style={{fontSize:9,color:'var(--tx4)'}}>{dc}/{p.scenes.length}</span>
                <span className="sb-act" onClick={e=>e.stopPropagation()}>
                  <IB I={Pencil} s={11} title="이름 변경" onClick={async()=>{const n=await askText('파트 이름 변경',p.title);if(n)usc(s=>{s.parts.find(x=>x.id===p.id).title=n})}}/>
                  <IB I={Trash2} s={11} title="삭제" onClick={async()=>{if(!await askConfirm(`"${p.title}" 파트를 삭제할까요?`,{danger:true,body:'안에 있는 씬도 함께 삭제돼요. Ctrl+Z로 되돌릴 수 있어요.'}))return;
                    usc(s=>{s.parts=s.parts.filter(x=>x.id!==p.id)});if(S.ptid===p.id)setSel(v=>({...v,ptid:null,scid:null}))}}/></span>
              </div>
              {isO&&<div style={{paddingLeft:12,marginLeft:9,borderLeft:'1px solid var(--bdr)'}}>
                {p.scenes.map(s=>{const on=S.scid===s.id;return<div key={s.id} className="sb-row" onClick={()=>selSc(S.pid,S.sid,p.id,s.id)}
                  style={{...row(on),fontFamily:'JetBrains Mono',fontSize:10.5,padding:'3px 6px',borderLeft:`2px solid ${s.done?'var(--green)':'transparent'}`,
                    color:on?'var(--blue)':s.done?'var(--tx4)':'var(--tx3)',textDecoration:s.done?'line-through':'none'}}>
                  <input type="checkbox" checked={!!s.done} onClick={e=>e.stopPropagation()} onChange={e=>{const v=e.target.checked;usc(x=>{x.parts.find(y=>y.id===p.id).scenes.find(y=>y.id===s.id).done=v})}}
                    style={{accentColor:'var(--green)',margin:0,cursor:'pointer',width:12,height:12}}/>
                  <span style={txt}>{s.title}</span>
                  <span className="sb-act" onClick={e=>e.stopPropagation()}>
                    <IB I={CopyPlus} s={11} title="복제" onClick={()=>{usc(x=>{const pp=x.parts.find(y=>y.id===p.id);const cp=JSON.parse(JSON.stringify(s));cp.id=uid();cp.title+=' (복사)';cp.done=false;
                      for(const b of cp.blocks)b.id=uid();pp.scenes.splice(pp.scenes.findIndex(y=>y.id===s.id)+1,0,cp)});toast('복제됨')}}/>
                    <IB I={Trash2} s={11} title="삭제" onClick={async()=>{if(!await askConfirm(`"${s.title}" 씬을 삭제할까요?`,{danger:true}))return;
                      usc(x=>{const pp=x.parts.find(y=>y.id===p.id);pp.scenes=pp.scenes.filter(y=>y.id!==s.id)});if(S.scid===s.id)setSel(v=>({...v,scid:null}))}}/></span>
                </div>})}
                <Btn small onClick={async()=>{const n=await askText('새 씬 이름');if(!n)return;const nid=uid();
                  usc(x=>{x.parts.find(y=>y.id===p.id).scenes.push({id:nid,title:n,location:'',timeOfDay:'',npcsPresent:'',done:false,blocks:[{id:uid(),type:'text',label:'나레이션',content:''}],sessionLog:[],connections:[]})});
                  setOp(v=>({...v,[p.id]:true}));selSc(S.pid,S.sid,p.id,nid)}} style={{width:'100%',justifyContent:'center',margin:'2px 0 6px',borderStyle:'dashed'}}><Plus size={9}/>씬</Btn>
              </div>}
            </div>})}
          {!sc.parts.length&&empty('파트를 먼저 만들어주세요')}
          {addBtn('파트',async()=>{const n=await askText('새 파트 이름');if(!n)return;const nid=uid();usc(x=>{x.parts.push({id:nid,title:n,scenes:[]})});setOp(v=>({...v,[nid]:true}))},FolderPlus)}
        </>}
        {tab==='clues'&&<>
          {addBtn('단서',async()=>{const n=await askText('새 단서 이름');if(!n)return;usc(x=>{x.clues.push({id:uid(),name:n,description:'',foundInSceneId:'',leadsToSceneId:'',isRedHerring:false,leadsTo:''})})})}
          {!sc.clues.length&&empty('단서가 없어요')}
          {sc.clues.map(c=><div key={c.id} className="sb-row" onClick={()=>setMdl({type:'clueEdit',clueId:c.id})} style={{...row(false),fontSize:11.5}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:c.isRedHerring?'var(--red)':'var(--teal)',flexShrink:0}}/>
            <span style={txt}>{c.name}</span>
            {c.isRedHerring&&<span style={{fontFamily:'JetBrains Mono',fontSize:8,fontWeight:700,color:'var(--red)',background:'var(--redA)',padding:'0 5px',borderRadius:8}}>미끼</span>}
            {c.leadsTo&&<span style={{fontFamily:'JetBrains Mono',fontSize:8,color:'var(--tx4)',maxWidth:70,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>→{c.leadsTo}</span>}
            <span className="sb-act" onClick={e=>e.stopPropagation()}><IB I={Trash2} s={11} onClick={async()=>{if(!await askConfirm(`"${c.name}" 단서를 삭제할까요?`,{danger:true}))return;usc(x=>{x.clues=x.clues.filter(y=>y.id!==c.id)})}}/></span>
          </div>)}
        </>}
        {tab==='endings'&&<>
          {addBtn('엔딩',async()=>{const n=await askText('새 엔딩 이름');if(!n)return;const nid=uid();
            usc(x=>{x.endings.push({id:nid,title:n,endingType:x.endingTypes[0]?.id||'normal',condition:'',blocks:[{id:uid(),type:'text',label:'엔딩 나레이션',content:''}]})});selEnd(S.pid,S.sid,nid)})}
          {!sc.endings.length&&empty('엔딩이 없어요')}
          {sc.endings.map(e=>{const et=sc.endingTypes.find(t=>t.id===e.endingType)||{l:'?',c:'#8b949e'};const on=S.eid===e.id;
            return<div key={e.id} className="sb-row" onClick={()=>selEnd(S.pid,S.sid,e.id)} style={{...row(on),fontSize:11.5}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:et.c,flexShrink:0}}/><span style={txt}>{e.title||'(제목 없음)'}</span>
              <span style={{fontFamily:'JetBrains Mono',fontSize:8.5,fontWeight:700,color:et.c}}>{et.l}</span>
              <span className="sb-act" onClick={ev=>ev.stopPropagation()}><IB I={Trash2} s={11} onClick={async()=>{if(!await askConfirm(`"${e.title}" 엔딩을 삭제할까요?`,{danger:true}))return;
                usc(x=>{x.endings=x.endings.filter(y=>y.id!==e.id)});if(S.eid===e.id)setSel(v=>({...v,eid:null}))}}/></span>
            </div>})}
        </>}
        {tab==='bgm'&&<>
          {!bgms.length&&empty('BGM 블록이 없어요.\n씬에 BGM 블록을 추가하면 여기에 순서대로 모여요.')}
          {bgms.map((g,i)=>{const on=g.scid?S.scid===g.scid:S.eid===g.eid;
            return<div key={g.b.id} className="sb-row" onClick={()=>g.scid?selSc(S.pid,S.sid,g.ptid,g.scid):selEnd(S.pid,S.sid,g.eid)}
              style={{...row(on),alignItems:'flex-start',padding:'6px 8px',borderLeft:`2px solid ${on?'var(--coral)':'transparent'}`,borderRadius:'0 6px 6px 0'}}>
              <span style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--tx4)',paddingTop:2,width:16}}>{String(i+1).padStart(2,'0')}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{...txt,fontSize:11.5,fontWeight:600,color:on?'var(--coral)':'var(--tx2)'}}>♪ {g.b.title||'(제목 없음)'}</div>
                <div style={{...txt,fontSize:9.5,color:'var(--tx4)',fontFamily:'JetBrains Mono'}}>{g.where}</div></div>
              {g.b.url&&<a href={g.b.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="새 탭에서 열기"
                style={{color:'var(--tx3)',display:'flex',padding:3}}><ExternalLink size={12}/></a>}
            </div>})}
        </>}
        {tab==='sessions'&&<>
          {addBtn('오늘 세션 기록',async()=>{const v=await askText('세션 기록 — '+new Date().toISOString().slice(0,10),'',{multiline:true,placeholder:'진행한 씬, 주요 사건, 다음 세션 떡밥...'});if(v===null)return;
            usc(x=>{x.sessionHistory.unshift({id:uid(),date:new Date().toISOString().slice(0,10),summary:v})})})}
          {!(sc.sessionHistory||[]).length&&empty('기록이 없어요')}
          {(sc.sessionHistory||[]).map(s=><div key={s.id} className="sb-row" onClick={async()=>{const v=await askText('세션 기록 — '+s.date,s.summary,{multiline:true});if(v===null)return;usc(x=>{x.sessionHistory.find(y=>y.id===s.id).summary=v})}}
            style={{...row(false),display:'block',padding:'7px 9px',marginBottom:4,border:'1px solid var(--bdr)'}}>
            <div style={{display:'flex',alignItems:'center'}}><span style={{fontFamily:'JetBrains Mono',fontSize:9.5,color:'var(--blue)',flex:1}}>{s.date}</span>
              <span className="sb-act" onClick={e=>e.stopPropagation()}><IB I={Trash2} s={11} onClick={async()=>{if(!await askConfirm('이 기록을 삭제할까요?',{danger:true}))return;usc(x=>{x.sessionHistory=x.sessionHistory.filter(y=>y.id!==s.id)})}}/></span></div>
            <div style={{fontSize:11.5,color:'var(--tx2)',whiteSpace:'pre-wrap',lineHeight:1.5,marginTop:2}}>{s.summary||'(클릭해서 입력)'}</div>
          </div>)}
        </>}
      </div>
    </>}
    {/* 하단 도구 */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,padding:'8px 10px',borderTop:'1px solid var(--bdr)'}}>
      <Btn small onClick={()=>setMdl('lib')} style={{justifyContent:'center'}}><Users size={10}/>자료</Btn>
      <Btn small onClick={()=>setMdl('cmd')} style={{justifyContent:'center'}}><Settings size={10}/>명령어</Btn>
      <Btn small onClick={()=>setMdl('tpl')} style={{justifyContent:'center',color:'var(--teal)'}}><Sparkles size={10}/>롤꾸</Btn>
    </div>
  </div>}

// ---- 클라우드 동기화 (Supabase) ----
const fmtT=t=>{try{const d=new Date(t);const p=n=>String(n).padStart(2,'0');return`${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`}catch(e){return''}};
const BK='scenario-forge-v4-backup';
const stripCloud=d=>{const c=JSON.parse(JSON.stringify(d));delete c.cloud;return c};
const newer=(a,b)=>a&&b&&Date.parse(a)>Date.parse(b)+500;

function useCloudSync(D,setD,setSel,loading,toast){
  const[user,setUser]=useState(null);
  const[sync,setSync]=useState({st:isConfigured()?'off':'none'});
  const lastSync=useRef(null),lastJson=useRef(null),ready=useRef(false),busy=useRef(false),timer=useRef(),Dref=useRef(D);
  Dref.current=D;

  const applyCloud=useCallback((row)=>{
    try{localStorage.setItem(BK,JSON.stringify({at:new Date().toISOString(),data:Dref.current}))}catch(e){}
    const d=mig(JSON.parse(JSON.stringify(row.data)));
    lastSync.current=row.updated_at;lastJson.current=JSON.stringify(stripCloud(d));
    setD(d);setSel({pid:d.platforms[0]?.id||null,sid:null,ptid:null,scid:null,eid:null});
    ready.current=true;setSync({st:'saved',at:row.updated_at});
  },[setD,setSel]);

  const upload=useCallback(async(uid)=>{const p=stripCloud(Dref.current);const ts=await cloudSave(uid,p);
    lastSync.current=ts;lastJson.current=JSON.stringify(p);ready.current=true;setSync({st:'saved',at:ts});return ts},[]);

  // 로그인 직후: 클라우드와 이 기기 비교
  const reconcile=useCallback(async(u)=>{if(busy.current)return;busy.current=true;ready.current=false;setSync({st:'saving'});
    try{const row=await cloudLoad(u.id);const local=Dref.current;
      if(!row||!row.data||!row.data.platforms){await upload(u.id);toast('☁ 이 기기 데이터를 클라우드에 올렸어요');return}
      const same=JSON.stringify(stripCloud(local))===JSON.stringify(row.data);
      if(same){lastSync.current=row.updated_at;lastJson.current=JSON.stringify(row.data);ready.current=true;setSync({st:'saved',at:row.updated_at});return}
      if(!(local.scenarios||[]).length){applyCloud(row);toast('☁ 클라우드 데이터를 불러왔어요');return}
      const c=await askChoice('클라우드에 저장된 데이터가 있어요',{body:`☁ 클라우드 : 시나리오 ${row.data.scenarios?.length||0}개 · 마지막 저장 ${fmtT(row.updated_at)}\n💻 이 기기 : 시나리오 ${local.scenarios.length}개\n\n어느 쪽을 쓸까요? 고르지 않은 쪽은 덮어써져요.\n(이 기기 데이터는 브라우저에 백업해두니까 계정 창에서 되살릴 수 있어요)`,
        options:[{label:'이 기기 데이터 올리기',value:'local'},{label:'클라우드 불러오기',value:'cloud',primary:true}]});
      if(c==='cloud'){applyCloud(row);toast('☁ 클라우드 데이터를 불러왔어요')}
      else if(c==='local'){await upload(u.id);toast('☁ 이 기기 데이터로 클라우드를 덮어썼어요')}
      else setSync({st:'paused'});
    }catch(e){setSync({st:'error',msg:koErr(e)})}finally{busy.current=false}},[applyCloud,upload,toast]);

  // 인증 상태
  useEffect(()=>{if(!isConfigured())return;let alive=true;
    getSession().then(s=>{if(alive&&s?.user)setUser(s.user)}).catch(()=>{});
    const off=onAuth((ev,u)=>{
      if(ev==='PASSWORD_RECOVERY'){(async()=>{const pw=await askText('새 비밀번호를 입력하세요 (6자 이상)','',{password:true});if(!pw)return;try{await updatePw(pw);toast('비밀번호를 바꿨어요')}catch(e){toast(koErr(e))}})()}
      if(ev==='SIGNED_OUT')setUser(null);else if(u)setUser(p=>p?.id===u.id?p:u)});
    return()=>{alive=false;off()}},[]);
  useEffect(()=>{if(!user){ready.current=false;lastSync.current=null;lastJson.current=null;setSync({st:isConfigured()?'off':'none'});return}
    if(!loading)reconcile(user)},[user?.id,loading]);

  // 수정할 때마다 자동 저장 (1.5초 디바운스)
  useEffect(()=>{if(!user||!ready.current||!D)return;clearTimeout(timer.current);
    timer.current=setTimeout(async()=>{if(busy.current||!ready.current)return;const p=stripCloud(Dref.current);const js=JSON.stringify(p);if(js===lastJson.current)return;
      busy.current=true;setSync(s=>({...s,st:'saving'}));
      try{const remote=await cloudMeta(user.id);
        if(newer(remote,lastSync.current)){ready.current=false;setSync({st:'paused'});
          const c=await askChoice('다른 기기에서 저장된 내용이 있어요',{body:`클라우드가 ${fmtT(remote)}에 다른 기기에서 업데이트됐어요.\n지금 이 기기에서 고친 내용과 겹쳐요.`,
            options:[{label:'이 기기 내용으로 덮어쓰기',value:'local',danger:true},{label:'클라우드 불러오기',value:'cloud',primary:true}]});
          if(c==='cloud'){applyCloud(await cloudLoad(user.id));return}
          if(c!=='local')return;}
        const ts=await cloudSave(user.id,p);lastSync.current=ts;lastJson.current=js;ready.current=true;setSync({st:'saved',at:ts});
      }catch(e){setSync({st:'error',msg:koErr(e)})}finally{busy.current=false}},1500);
    return()=>clearTimeout(timer.current)},[D,user]);

  // 다른 탭/기기에서 돌아왔을 때 확인
  useEffect(()=>{if(!user)return;const h=async()=>{if(document.visibilityState!=='visible'||!ready.current||busy.current)return;
      try{const r=await cloudMeta(user.id);if(!newer(r,lastSync.current))return;busy.current=true;
        const c=await askChoice('다른 기기에서 수정된 내용이 있어요',{body:`클라우드가 ${fmtT(r)}에 업데이트됐어요. 최신 내용을 불러올까요?`,options:[{label:'나중에',value:null},{label:'불러오기',value:'cloud',primary:true}]});
        if(c==='cloud')applyCloud(await cloudLoad(user.id));else{ready.current=false;setSync({st:'paused'})}
      }catch(e){}finally{busy.current=false}};
    document.addEventListener('visibilitychange',h);return()=>document.removeEventListener('visibilitychange',h)},[user,applyCloud]);

  return{user,sync,
    syncNow:()=>user&&reconcile(user),
    loadCloud:async()=>{if(!user)return;try{const row=await cloudLoad(user.id);if(!row){toast('클라우드에 저장된 데이터가 없어요');return}applyCloud(row);toast('☁ 불러왔어요')}catch(e){toast(koErr(e))}},
    logout:async()=>{await signOut();setUser(null);toast('로그아웃했어요')},
    restoreBackup:()=>{try{const b=JSON.parse(localStorage.getItem(BK));if(!b?.data)return false;setD(mig(b.data));toast(`백업(${fmtT(b.at)})을 되살렸어요`);return true}catch(e){return false}},
    backupAt:()=>{try{return JSON.parse(localStorage.getItem(BK))?.at||null}catch(e){return null}},
  };
}

function SyncBtn({cs,onClick}){
  const st=cs.sync.st;
  const map={none:['클라우드','var(--tx4)'],off:['로그인','var(--tx3)'],saving:['저장 중…','var(--tx3)'],saved:['저장됨','var(--green)'],error:['오류','var(--red)'],paused:['동기화 멈춤','var(--gold)']};
  const[l,c]=map[st]||map.off;
  return<Btn small onClick={onClick} title={st==='saved'?'마지막 저장 '+fmtT(cs.sync.at):st==='error'?cs.sync.msg:'클라우드 계정'} style={{color:c,borderColor:st==='saved'?'var(--green)':st==='error'?'var(--red)':st==='paused'?'var(--gold)':'var(--bdr)'}}>
    {st==='saving'?<CloudUpload size={11}/>:<CloudDownload size={11} style={{transform:'rotate(180deg)'}}/>}{l}</Btn>}

function AccountM({cs,onClose}){
  const[tab,setTab]=useState('in');const[email,setEmail]=useState('');const[pw,setPw]=useState('');const[busy,setBusy]=useState(false);const[msg,setMsg]=useState(null);
  const fld={width:'100%',border:'1px solid var(--bdr)',borderRadius:6,padding:'9px 11px',fontSize:13,outline:'none',background:'var(--sf1)',color:'var(--tx1)',marginBottom:8};
  const note=(m)=>m&&<div style={{fontSize:12,lineHeight:1.6,padding:'8px 10px',borderRadius:6,marginBottom:10,whiteSpace:'pre-wrap',
    background:m.ok?'var(--greenA)':'var(--redA)',color:m.ok?'var(--green)':'var(--red)',border:`1px solid ${m.ok?'var(--green)':'var(--red)'}`}}>{m.t}</div>;
  if(!isConfigured())return<Modal title="☁ 클라우드 동기화" onClose={onClose} width={460} footer={<Btn primary onClick={onClose}>닫기</Btn>}>
    <div style={{fontSize:12.5,color:'var(--tx2)',lineHeight:1.75}}>아직 Supabase가 연결되지 않았어요. 지금은 이 브라우저에만 저장되고 있어요.<br/><br/>
      <b>연결 방법</b><br/>1. Supabase SQL Editor에서 <code>supabase-setup.sql</code> 내용을 실행<br/>2. GitHub 레포의 <code>supabase-config.js</code>를 열어 <code>url</code>과 <code>anonKey</code>를 채우고 저장<br/>3. 1~2분 뒤 페이지 새로고침</div></Modal>;
  if(cs.user){const bk=cs.backupAt();const st=cs.sync.st;
    return<Modal title="☁ 계정" onClose={onClose} width={420} footer={<Btn primary onClick={onClose}>닫기</Btn>}>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--tx1)',marginBottom:4}}>{cs.user.email}</div>
      <div style={{fontSize:12,color:st==='error'?'var(--red)':st==='paused'?'var(--gold)':'var(--tx3)',marginBottom:14,lineHeight:1.6}}>
        {st==='saved'?`자동 저장 중 · 마지막 저장 ${fmtT(cs.sync.at)}`:st==='saving'?'저장하는 중…':st==='paused'?'동기화가 멈춰 있어요. 아래 "지금 동기화"를 눌러주세요.':st==='error'?'오류: '+cs.sync.msg:''}</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <Btn onClick={()=>cs.syncNow()} style={{justifyContent:'center'}}>지금 동기화</Btn>
        <Btn onClick={async()=>{if(await askConfirm('클라우드 데이터를 불러올까요?',{body:'이 기기의 현재 데이터는 브라우저에 백업해둬요.',okLabel:'불러오기'})){await cs.loadCloud();onClose()}}} style={{justifyContent:'center'}}>클라우드에서 다시 불러오기</Btn>
        {bk&&<Btn onClick={async()=>{if(await askConfirm('덮어쓰기 전 데이터를 되살릴까요?',{body:`${fmtT(bk)}에 백업된 이 기기 데이터로 돌아가요.\n되살린 내용은 클라우드에도 자동 저장돼요.`,okLabel:'되살리기'})){cs.restoreBackup();onClose()}}} style={{justifyContent:'center'}}>백업 되살리기 ({fmtT(bk)})</Btn>}
        <Btn danger onClick={async()=>{await cs.logout();onClose()}} style={{justifyContent:'center',marginTop:6}}>로그아웃</Btn>
      </div>
      <div style={{fontSize:10.5,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>로그아웃해도 이 기기의 데이터는 그대로 남아요.</div>
    </Modal>}
  const go=async()=>{if(!email.trim()||!pw){setMsg({t:'이메일과 비밀번호를 입력해주세요'});return}setBusy(true);setMsg(null);
    try{if(tab==='in'){await signIn(email.trim(),pw);onClose()}
      else{const r=await signUp(email.trim(),pw);if(r.session)onClose();else setMsg({ok:true,t:'인증 메일을 보냈어요 📮\n메일함(스팸함도)의 링크를 누른 다음, 여기서 로그인해주세요.'});setTab('in')}}
    catch(e){setMsg({t:koErr(e)})}finally{setBusy(false)}};
  return<Modal title="☁ 클라우드 로그인" onClose={onClose} width={400}>
    <div style={{display:'flex',background:'var(--sf2)',borderRadius:8,padding:2,border:'1px solid var(--bdr)',marginBottom:14}}>
      {[['in','로그인'],['up','회원가입']].map(([k,l])=><button key={k} onClick={()=>{setTab(k);setMsg(null)}} style={{flex:1,padding:'6px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',
        background:tab===k?'var(--sf1)':'transparent',color:tab===k?'var(--tx1)':'var(--tx4)',boxShadow:tab===k?'0 1px 3px rgba(0,0,0,.15)':'none'}}>{l}</button>)}</div>
    {note(msg)}
    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일" autoComplete="email" style={fld} autoFocus/>
    <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')go()}} placeholder={tab==='up'?'비밀번호 (6자 이상)':'비밀번호'} autoComplete={tab==='up'?'new-password':'current-password'} style={fld}/>
    <Btn primary onClick={go} disabled={busy} style={{width:'100%',justifyContent:'center',padding:'8px',fontSize:13}}>{busy?'잠시만요…':tab==='in'?'로그인':'가입하기'}</Btn>
    {tab==='in'&&<button onClick={async()=>{if(!email.trim()){setMsg({t:'비밀번호를 찾을 이메일을 먼저 입력해주세요'});return}try{await resetPw(email.trim());setMsg({ok:true,t:'비밀번호 재설정 메일을 보냈어요.\n메일의 링크를 누르면 새 비밀번호를 입력하는 창이 떠요.'})}catch(e){setMsg({t:koErr(e)})}}}
      style={{display:'block',margin:'10px auto 0',fontSize:11.5,color:'var(--tx3)',textDecoration:'underline',cursor:'pointer'}}>비밀번호를 잊었어요</button>}
    <div style={{fontSize:10.5,color:'var(--tx4)',marginTop:14,lineHeight:1.6,textAlign:'center'}}>로그인하면 수정할 때마다 자동으로 클라우드에 저장돼요.<br/>다른 기기에서도 같은 계정으로 이어서 쓸 수 있어요.</div>
  </Modal>}
