import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from "react";
import { Search,Plus,Trash2,Copy,Check,ChevronRight,ChevronDown,Undo2,Redo2,Sun,Moon,CloudUpload,CloudDownload,Printer,FileDown,FileUp,FolderPlus,Settings,BookOpen,Eye,EyeOff,Pencil,X,ArrowUp,ArrowDown,CopyPlus,PanelLeftClose,PanelLeftOpen,AlertTriangle,FileText,MessageSquareQuote,GitBranch,Dice5,Music,MapPin,Package,Users,Sparkles,StickyNote,Lightbulb,ChevronUp,ExternalLink } from "lucide-react";
import { renderR20, renderCoco, r20Inline } from './r20.js'



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
// 플레이 뷰용 간단 마크다운 (굵게/기울임)
const mdR=l=>esc(l).replace(/\*\*\*([^*]+)\*\*\*/g,'<b><i>$1</i></b>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<i>$1</i>');
// 내보내기·Gist 업로드 시 토큰이 파일에 섞여 나가지 않도록 제거
const stripSecrets=d=>({...d,cloud:{...(d.cloud||{}),token:''}});
const download=(obj,name)=>{const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)};

function defData(){const r=uid(),k=uid();return{platforms:[
  {id:r,name:'Roll20',color:'#58a6ff',commands:[{id:uid(),l:'/desc',s:'/desc ',cat:'기본'},{id:uid(),l:'굵게',s:'**텍스트**',cat:'서식'},{id:uid(),l:'/emas',s:'/emas "이름" ',cat:'기본'},{id:uid(),l:'/as',s:'/as "이름" ',cat:'기본'},{id:uid(),l:'Oosh',s:'[텍스트](#" style="color:#AA0000;text-decoration:none;)',cat:'롤꾸'}]},
  {id:k,name:'코코포리아',color:'#bc8cff',commands:[{id:uid(),l:'귓속말',s:'((귓속말: ))',cat:'기본'},{id:uid(),l:'설명',s:'【설명】',cat:'기본'}]}
],scenarios:[],cloud:{token:'',gistId:''},theme:'dark'}}

function mig(d){d.cloud??={token:'',gistId:''};d.theme??='dark';
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

// 삭제된 씬을 가리키는 연결 정리
const dropConns=(sc,ids)=>{for(const p of sc.parts)for(const s of p.scenes)s.connections=(s.connections||[]).filter(c=>!ids.has(c.targetSceneId))};

// ===== PERSISTENCE =====
async function loadS(){try{const r=localStorage.getItem(SK);if(r)return mig(JSON.parse(r))}catch(e){}return mig(defData())}
async function saveS(d){try{localStorage.setItem(SK,JSON.stringify(d));return true}catch(e){return false}}

// ===== UI ATOMS =====
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
  const rs=useCallback(()=>{if(ref.current){ref.current.style.height='auto';ref.current.style.height=ref.current.scrollHeight+2+'px'}},[]);
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
  const[zoom,setZoomS]=useState(()=>{try{return parseFloat(localStorage.getItem(SK+'-zoom'))||1}catch(e){return 1}});
  const setZoom=z=>{setZoomS(z);try{localStorage.setItem(SK+'-zoom',z)}catch(e){}};const[r20On,setR20On]=useState(false);
  const{show:toast,T:Toast}=useToast();
  const hist=useRef([]);const hi=useRef(-1);const ht=useRef();

  useEffect(()=>{loadS().then(d=>{setD(d);setThm(d.theme||'dark');
    if(d.platforms?.length)setSel(s=>({...s,pid:s.pid||d.platforms[0].id}));
    hist.current=[JSON.stringify(d)];hi.current=0;setL(false)})},[]);

  const svt=useRef();
  useEffect(()=>{if(!D||loading)return;clearTimeout(svt.current);svt.current=setTimeout(()=>saveS(D).then(ok=>{if(!ok)toast('⚠ 저장 실패 (저장공간 부족?) — JSON으로 내보내 백업하세요',4000)}),300);
    clearTimeout(ht.current);ht.current=setTimeout(()=>{const sn=JSON.stringify(D);
      if(hi.current>=0&&hist.current[hi.current]===sn)return;
      hist.current=hist.current.slice(0,hi.current+1);hist.current.push(sn);if(hist.current.length>50)hist.current.shift();hi.current=hist.current.length-1},500)},[D]);

  useEffect(()=>{document.documentElement.setAttribute('data-theme',theme)},[theme]);
  useEffect(()=>{if(sel.ptid)setOp(v=>v[sel.ptid]?v:{...v,[sel.ptid]:true})},[sel.ptid]);

  const up=useCallback(fn=>{setD(p=>{const n=JSON.parse(JSON.stringify(p));fn(n);return n})},[]);
  // 데이터 전체 교체 (가져오기·Gist 불러오기) — 테마·선택 상태도 함께 맞춤
  const replaceD=useCallback(nd=>{setD(nd);setThm(nd.theme||'dark');setSel({pid:nd.platforms?.[0]?.id||null,sid:null,ptid:null,scid:null,eid:null})},[]);
  const undo=useCallback(()=>{if(hi.current<=0){toast('되돌릴 수 없음');return}hi.current--;setD(mig(JSON.parse(hist.current[hi.current])));toast('실행 취소')},[toast]);
  const redo=useCallback(()=>{if(hi.current>=hist.current.length-1){toast('다시 실행할 내용 없음');return}hi.current++;setD(mig(JSON.parse(hist.current[hi.current])));toast('다시 실행')},[toast]);

  useEffect(()=>{const h=e=>{const m=e.ctrlKey||e.metaKey;if(!m)return;
    if(e.key==='z'&&!e.shiftKey){e.preventDefault();undo()}else if((e.key==='z'&&e.shiftKey)||e.key==='y'){e.preventDefault();redo()}
    else if(e.key==='f'){e.preventDefault();setMdl('find')}};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[undo,redo]);

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

  const exportAll=()=>{download(stripSecrets(D),'scenario-forge.json');toast('내보내기 완료')};
  const importAll=f=>{const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result);if(!p.platforms)throw Error();if(!confirm('덮어씌울까요?'))return;const nd=mig(p);nd.cloud={...nd.cloud,token:D.cloud?.token||nd.cloud.token||''};replaceD(nd);toast('완료')}catch(e){alert('오류')}};r.readAsText(f)};
  const exportSingle=()=>{if(!sc)return;download({v:'sf1',scenario:sc},(sc.title||'scenario')+'.json');toast('내보내기 완료')};
  const mergeImp=f=>{const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result);let s=p.v==='sf1'?p.scenario:p.scenarios?.[0];if(!s)throw Error();s.id=uid();if(!D.platforms.some(x=>x.id===s.platformId))s.platformId=sel.pid||D.platforms[0]?.id;
    up(d=>{mig({scenarios:[s],platforms:d.platforms});d.scenarios.push(s)});setSel({pid:s.platformId,sid:s.id,ptid:null,scid:null,eid:null});toast('"'+s.title+'" 병합됨')}catch(e){alert('오류')}};r.readAsText(f)};

  return(<>
    <div style={{display:'grid',gridTemplateColumns:sbOpen?'260px 1fr':'0 1fr',gridTemplateRows:'44px 1fr',height:`calc(100vh / ${zoom})`,zoom,transition:'grid-template-columns .15s'}}>
      {/* TOPBAR */}
      <div className="no-print" style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:6,padding:'0 12px',background:'var(--sf1)',borderBottom:'1px solid var(--bdr)'}}>
        {!sbOpen&&<IB I={PanelLeftOpen} onClick={()=>setSb(true)} title="사이드바 열기"/>}
        <div style={{display:'flex',alignItems:'center',gap:6,marginRight:4}}>
          <div style={{width:22,height:22,borderRadius:5,background:'linear-gradient(135deg,var(--blue),var(--purple))',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:10,color:'#fff'}}>S.</div>
          <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:600,fontSize:12,color:'var(--tx1)',letterSpacing:'-.03em'}}>scenario-forge</span>
        </div>
        <div style={{flex:1}}/>
        <div onClick={()=>setGm(!gm)} style={{display:'flex',alignItems:'center',gap:5,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,cursor:'pointer',
          border:`1px solid ${gm?'var(--green)':'var(--bdr)'}`,color:gm?'var(--green)':'var(--tx4)',background:gm?'var(--greenA)':'transparent'}}>● {gm?'GM':'공개'}</div>
        <div style={{display:'flex',background:'var(--sf2)',borderRadius:8,padding:2,border:'1px solid var(--bdr)'}}>
          {['edit','play','flow'].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:'4px 12px',borderRadius:6,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,
            border:'none',cursor:'pointer',background:mode===m?'var(--sf1)':'transparent',color:mode===m?'var(--tx1)':'var(--tx4)',boxShadow:mode===m?'0 1px 3px rgba(0,0,0,.1)':'none'}}>{m}</button>)}
        </div>
        <IB I={Undo2} onClick={undo} title="Ctrl+Z"/><IB I={Redo2} onClick={redo} title="Ctrl+Shift+Z"/>
        <Btn small onClick={()=>setMdl('find')}><Search size={11}/>찾기</Btn>
        <Btn small onClick={()=>setMdl('cloud')} title="GitHub Gist 저장/불러오기"><CloudUpload size={11}/></Btn>
        <Btn small onClick={exportAll} title="전체 JSON 내보내기"><FileDown size={11}/></Btn>
        <Btn small onClick={()=>document.getElementById('imp')?.click()} title="JSON 가져오기 (전체 덮어쓰기)"><FileUp size={11}/></Btn>
        <input type="file" id="imp" accept=".json" hidden onChange={e=>{if(e.target.files[0])importAll(e.target.files[0]);e.target.value=''}}/>
        <div style={{display:'flex',background:'var(--sf2)',borderRadius:6,padding:2,border:'1px solid var(--bdr)'}}>
          {[{z:.9,f:9},{z:1,f:12},{z:1.15,f:15}].map(({z,f})=><button key={z} onClick={()=>setZoom(z)}
            style={{width:22,height:22,borderRadius:4,border:'none',background:zoom===z?'var(--tx1)':'transparent',color:zoom===z?'var(--bg)':'var(--tx4)',fontWeight:700,fontSize:f,cursor:'pointer'}}>가</button>)}
        </div>
        <IB I={theme==='dark'?Sun:Moon} onClick={toggleTheme} title="테마 전환"/>
      </div>

      {/* SIDEBAR */}
      <div className="no-print" style={{background:'var(--sf1)',borderRight:'1px solid var(--bdr)',overflowY:'auto',display:'flex',flexDirection:'column',visibility:sbOpen?'visible':'hidden',position:'relative',fontSize:12,overflowX:'hidden'}}>
        {sbOpen&&<IB I={PanelLeftClose} onClick={()=>setSb(false)} title="사이드바 닫기" style={{position:'absolute',top:6,right:6,zIndex:5}}/>}
        {/* Platforms */}
        <div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
          <SecTitle>Platforms</SecTitle>
          {D.platforms.map(p=><div key={p.id} onClick={()=>setSel({pid:p.id,sid:null,ptid:null,scid:null,eid:null})}
            style={{display:'flex',alignItems:'center',gap:6,padding:'4px 8px',borderRadius:6,cursor:'pointer',fontWeight:sel.pid===p.id?600:500,
              background:sel.pid===p.id?'var(--blueA)':'transparent',color:sel.pid===p.id?'var(--blue)':'var(--tx2)',transition:'all .08s'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:p.color,flexShrink:0}}/>{p.name}</div>)}
          <Btn small onClick={()=>setMdl('platform')} style={{width:'100%',marginTop:4,justifyContent:'center',borderStyle:'dashed'}}><Plus size={10}/>사이트</Btn>
        </div>
        {/* Scenarios */}
        <div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
          <SecTitle right={<IB I={Plus} s={13} onClick={()=>{if(!sel.pid){toast('사이트 선택');return}const n=prompt('새 시나리오 이름');if(!n)return;const nid=uid();
            up(d=>{d.scenarios.push({id:nid,title:n,platformId:sel.pid,setting:'',synopsis:'',parts:[],endings:[],clues:[],eventTimeline:[],sessionHistory:[],endingTypes:DEF_ET.map(e=>({...e})),library:{npcs:[],items:[],places:[]}})});
            setSel(s=>({...s,sid:nid,ptid:null,scid:null,eid:null}))}}/>}>Scenarios</SecTitle>
          {!scs.length&&<div style={{color:'var(--tx4)',fontSize:11,textAlign:'center',padding:8}}>없음</div>}
          {scs.map(s=><div key={s.id} onClick={()=>setSel({pid:sel.pid,sid:s.id,ptid:null,scid:null,eid:null})}
            style={{display:'flex',alignItems:'center',gap:5,padding:'4px 8px',borderRadius:6,cursor:'pointer',
              background:sel.sid===s.id?'var(--blueA)':'transparent',color:sel.sid===s.id?'var(--blue)':'var(--tx2)',fontWeight:sel.sid===s.id?600:500}}>
            <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.title}</span>
            <IB I={Trash2} s={12} onClick={e=>{e.stopPropagation();if(!confirm(`"${s.title}" 삭제?`))return;up(d=>{d.scenarios=d.scenarios.filter(x=>x.id!==s.id)});if(sel.sid===s.id)setSel(v=>({...v,sid:null,ptid:null,scid:null,eid:null}))}}/></div>)}
        </div>
        {/* Endings */}
        {sc&&<div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
          <SecTitle right={<IB I={Plus} s={13} onClick={()=>{const n=prompt('새 엔딩 이름');if(!n)return;const nid=uid();
            up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);s.endings.push({id:nid,title:n,endingType:s.endingTypes[0]?.id||'normal',condition:'',blocks:[{id:uid(),type:'text',label:'엔딩 나레이션',content:''}]})});
            selEnd(sel.pid,sel.sid,nid)}}/>}>Endings</SecTitle>
          {sc.endings.map(e=>{const et=sc.endingTypes.find(t=>t.id===e.endingType)||{l:'?',c:'#8b949e'};
            return<div key={e.id} style={{display:'flex',alignItems:'center',gap:5,padding:'3px 8px',borderRadius:5,cursor:'pointer',
              background:sel.eid===e.id?'var(--blueA)':'transparent',color:sel.eid===e.id?'var(--blue)':'var(--tx2)',fontSize:11}}>
              <span onClick={()=>selEnd(sel.pid,sel.sid,e.id)} style={{display:'flex',alignItems:'center',gap:5,flex:1,minWidth:0}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:et.c,flexShrink:0}}/>
                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.title||'(제목 없음)'}</span>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:8,fontWeight:700,color:et.c,flexShrink:0}}>{et.l}</span>
              </span>
              <IB I={Trash2} s={11} onClick={()=>{if(!confirm('삭제?'))return;up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);s.endings=s.endings.filter(x=>x.id!==e.id)});if(sel.eid===e.id)setSel(v=>({...v,eid:null}))}}/>
            </div>})}
        </div>}
        {/* Clues */}
        {sc&&<div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
          <SecTitle right={<IB I={Plus} s={13} onClick={()=>{const n=prompt('새 단서 이름');if(!n)return;
            up(d=>{d.scenarios.find(x=>x.id===sel.sid).clues.push({id:uid(),name:n,description:'',foundInSceneId:'',leadsToSceneId:'',isRedHerring:false,leadsTo:''})})}}/>}>Clues</SecTitle>
          {sc.clues.map(c=><div key={c.id} style={{display:'flex',alignItems:'center',gap:5,padding:'3px 8px',borderRadius:5,fontSize:11,color:'var(--tx3)'}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:c.isRedHerring?'var(--red)':'var(--teal)',flexShrink:0}}/>
            <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</span>
            {c.isRedHerring&&<span style={{fontFamily:'JetBrains Mono,monospace',fontSize:7,fontWeight:700,color:'var(--red)',background:'var(--redA)',padding:'0 4px',borderRadius:8}}>미끼</span>}
            {c.leadsTo&&<span style={{fontFamily:'JetBrains Mono,monospace',fontSize:7,color:'var(--tx4)'}}>→{c.leadsTo}</span>}
            <IB I={Pencil} s={11} onClick={()=>setMdl({type:'clueEdit',clueId:c.id})}/>
            <IB I={Trash2} s={11} onClick={()=>{if(!confirm(`단서 "${c.name}" 삭제?`))return;up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);s.clues=s.clues.filter(x=>x.id!==c.id)})}}/>
          </div>)}
          {!sc.clues.length&&<div style={{color:'var(--tx4)',fontSize:11,padding:'2px 8px'}}>없음</div>}
        </div>}
        {/* Sessions */}
        {sc&&<div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
          <SecTitle right={<IB I={Plus} s={13} onClick={()=>{up(d=>{d.scenarios.find(x=>x.id===sel.sid).sessionHistory.push({id:uid(),date:new Date().toISOString().slice(0,10),summary:''})})}}/>}>Sessions</SecTitle>
          {(sc.sessionHistory||[]).map(s=><div key={s.id} onClick={()=>{const v=prompt('세션 요약',s.summary);if(v!==null)up(d=>{d.scenarios.find(x=>x.id===sel.sid).sessionHistory.find(x=>x.id===s.id).summary=v})}}
            style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',fontSize:10,color:'var(--tx3)',borderRadius:4,cursor:'pointer'}}>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,color:'var(--tx4)',flexShrink:0}}>{s.date}</span>
            <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.summary||'(클릭하여 입력)'}</span>
            <IB I={Trash2} s={11} onClick={e=>{e.stopPropagation();if(!confirm('세션 기록 삭제?'))return;up(d=>{const x=d.scenarios.find(v=>v.id===sel.sid);x.sessionHistory=x.sessionHistory.filter(v=>v.id!==s.id)})}}/></div>)}
        </div>}
        {/* Library */}
        <div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
          <Btn small onClick={()=>setMdl('lib')} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}>NPC · 아이템 · 장소</Btn>
        </div>
        {/* Scene Tree */}
        <div style={{padding:'10px 12px',flex:1,overflowY:'auto'}}>
          <SecTitle right={<IB I={Settings} s={13} onClick={()=>setMdl('cmd')} title="명령어 라이브러리"/>}>Scenes</SecTitle>
          {!sc&&<div style={{color:'var(--tx4)',fontSize:11,textAlign:'center',padding:12}}>시나리오를 선택하세요</div>}
          {sc?.parts.map((p,pi)=>{const isO=op[p.id];const dc=p.scenes.filter(s=>s.done).length;
            return<div key={p.id} style={{marginBottom:2}}>
              <div onClick={()=>setOp(v=>({...v,[p.id]:!v[p.id]}))}
                style={{display:'flex',alignItems:'center',gap:4,padding:'4px 6px',borderRadius:6,cursor:'pointer',fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,color:'var(--tx2)'}}>
                <span style={{fontSize:8,color:'var(--tx4)',width:12,textAlign:'center',transition:'transform .1s',transform:isO?'rotate(90deg)':'none'}}>▶</span>
                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</span>
                <span style={{fontSize:9,color:'var(--tx4)'}}>{dc}/{p.scenes.length}</span>
                <span onClick={e=>e.stopPropagation()} style={{display:'flex',gap:1}}>
                  <IB I={Pencil} s={11} onClick={()=>{const n=prompt('이름 변경',p.title);if(n)up(d=>{d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===p.id).title=n})}}/>
                  <IB I={Trash2} s={11} onClick={()=>{if(!confirm(`"${p.title}" 삭제?`))return;up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);s.parts=s.parts.filter(x=>x.id!==p.id);dropConns(s,new Set(p.scenes.map(x=>x.id)))});if(sel.ptid===p.id)setSel(v=>({...v,ptid:null,scid:null}))}}/>
                </span>
              </div>
              {isO&&<div style={{paddingLeft:14,marginLeft:8,borderLeft:'1px solid var(--bdr)'}}>
                {p.scenes.map(s=><div key={s.id} onClick={()=>selSc(sel.pid,sel.sid,p.id,s.id)}
                  style={{display:'flex',alignItems:'center',gap:5,padding:'3px 6px',borderRadius:5,cursor:'pointer',fontFamily:'JetBrains Mono,monospace',fontSize:10.5,
                    borderLeft:`2px solid ${s.done?'var(--green)':'transparent'}`,
                    background:sel.scid===s.id?'var(--blueA)':'transparent',color:sel.scid===s.id?'var(--blue)':s.done?'var(--tx4)':'var(--tx3)',textDecoration:s.done?'line-through':'none'}}>
                  <input type="checkbox" checked={s.done||false} onChange={e=>{e.stopPropagation();up(d=>{d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===p.id).scenes.find(x=>x.id===s.id).done=e.target.checked})}}
                    onClick={e=>e.stopPropagation()} style={{accentColor:'var(--green)',margin:0,cursor:'pointer',width:12,height:12}}/>
                  <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.title}</span>
                  <span onClick={e=>e.stopPropagation()} style={{display:'flex',gap:1}}>
                    <IB I={CopyPlus} s={11} onClick={()=>{up(d=>{const pt2=d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===p.id);const cp=JSON.parse(JSON.stringify(s));cp.id=uid();cp.title+=' (복사)';cp.done=false;const i=pt2.scenes.findIndex(x=>x.id===s.id);pt2.scenes.splice(i+1,0,cp)});toast('복제됨')}}/>
                    <IB I={Trash2} s={11} onClick={()=>{if(!confirm('삭제?'))return;up(d=>{const s2=d.scenarios.find(x=>x.id===sel.sid);const p2=s2.parts.find(x=>x.id===p.id);p2.scenes=p2.scenes.filter(x=>x.id!==s.id);dropConns(s2,new Set([s.id]))});if(sel.scid===s.id)setSel(v=>({...v,scid:null}))}}/>
                  </span></div>)}
                <Btn small onClick={()=>{const n=prompt('새 씬');if(!n)return;const nid=uid();
                  up(d=>{d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===p.id).scenes.push({id:nid,title:n,location:'',timeOfDay:'',npcsPresent:'',done:false,blocks:[{id:uid(),type:'text',label:'나레이션',content:''}],sessionLog:[],connections:[]})});
                  setOp(v=>({...v,[p.id]:true}));selSc(sel.pid,sel.sid,p.id,nid)}} style={{width:'100%',justifyContent:'center',marginTop:2,borderStyle:'dashed'}}><Plus size={9}/>씬</Btn>
              </div>}
            </div>})}
          {sc&&<Btn small onClick={()=>{const n=prompt('새 파트');if(!n)return;const nid=uid();
            up(d=>{d.scenarios.find(x=>x.id===sel.sid).parts.push({id:nid,title:n,scenes:[]})});setOp(v=>({...v,[nid]:true}))}}
            style={{width:'100%',justifyContent:'center',marginTop:4,borderStyle:'dashed'}}><FolderPlus size={11}/>파트</Btn>}
        </div>
      </div>

      {/* MAIN */}
      <div style={{overflowY:'auto',padding:'22px 30px 80px',background:'var(--bg2)'}}>
        {mode==='flow'&&sc?<FlowV sc={sc} sel={sel} setSel={setSel} setMode={setMode}/>
        :ending?<EndingP ending={ending} sc={sc} plat={plat} mode={mode} gm={gm} up={up} sel={sel} toast={toast} setMdl={setMdl}/>
        :scene?<SceneP scene={scene} pt={pt} sc={sc} plat={plat} mode={mode} gm={gm} up={up} sel={sel} toast={toast} isR20={isR20} isCoco={isCoco} r20On={r20On} setR20On={setR20On}/>
        :sc?<OverviewP sc={sc} plat={plat} up={up} sel={sel} toast={toast} exportSingle={exportSingle} mergeImp={mergeImp} setMdl={setMdl}/>
        :<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8,color:'var(--tx4)'}}>
          <BookOpen size={32} strokeWidth={1.5} style={{opacity:.4}}/><h3 style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,color:'var(--tx3)'}}>씬을 선택해주세요</h3></div>}
      </div>
    </div>
    {/* MODALS */}
    {modal==='cloud'&&<CloudM D={D} up={up} replaceD={replaceD} toast={toast} onClose={()=>setMdl(null)}/>}
    {modal==='find'&&<FindM D={D} up={up} setSel={setSel} setMode={setMode} onClose={()=>setMdl(null)} toast={toast}/>}
    {modal==='platform'&&<PlatM D={D} up={up} setSel={setSel} onClose={()=>setMdl(null)}/>}
    {modal==='cmd'&&<CmdM plat={plat} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {modal==='lib'&&<LibM sc={sc} up={up} sel={sel} scene={scene} onClose={()=>setMdl(null)} toast={toast}/>}
    {modal==='endingTypes'&&<ETM sc={sc} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {modal?.type==='clueEdit'&&<ClueEditM sc={sc} clueId={modal.clueId} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {Toast}
  </>);
}
// ===== SCENE PANEL =====
function SceneP({scene,pt,sc,plat,mode,gm,up,sel,toast,isR20,isCoco,r20On,setR20On}){
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===sel.ptid).scenes.find(x=>x.id===sel.scid);fn(s)});
  const lastFocusRef=useRef(null);
  // Insert command snippet at cursor
  const insertCmd=useCallback((snippet)=>{
    const ta=lastFocusRef.current;if(!ta||!ta.isConnected){toast('삽입할 텍스트 칸을 먼저 클릭하세요');return}
    const s=ta.selectionStart,e=ta.selectionEnd,v=ta.value;
    // React 제어 컴포넌트는 value를 직접 대입하면 onChange가 발생하지 않으므로 네이티브 setter 사용
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(ta,v.slice(0,s)+snippet+v.slice(e));
    ta.dispatchEvent(new Event('input',{bubbles:true}));
    ta.focus();ta.selectionStart=ta.selectionEnd=s+snippet.length;
  },[toast]);
  // Track last focused textarea
  useEffect(()=>{
    const h=e=>{if(e.target.tagName==='TEXTAREA'&&e.target.closest('[data-block-list]'))lastFocusRef.current=e.target};
    document.addEventListener('focusin',h);return()=>document.removeEventListener('focusin',h);
  },[]);

  if(mode==='play')return<PlayV entry={scene} sc={sc} pt={pt} plat={plat} gm={gm} isSc/>;
  const cmds=plat?.commands||[];
  return<div>
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx4)',marginBottom:4}}>{plat?.name||''} / {sc.title} / {pt.title}</div>
    <input value={scene.title} onChange={e=>uS(s=>{s.title=e.target.value})} style={{fontFamily:'Instrument Serif,serif',fontSize:26,fontWeight:400,color:'var(--tx1)',border:'none',background:'transparent',padding:0,width:'100%',outline:'none',marginBottom:2}}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:16,padding:'8px 0',marginBottom:14,borderBottom:'1px solid var(--bdr)'}}>
      {[['Location','장소','location'],['Time','시간대','timeOfDay'],['NPCs','등장인물','npcsPresent']].map(([k,ph,f])=>
        <div key={f} style={{display:'flex',flexDirection:'column',gap:1}}>
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:8,fontWeight:600,color:'var(--tx4)',letterSpacing:'.04em',textTransform:'uppercase'}}>{k}</span>
          <input value={scene[f]||''} onChange={e=>uS(s=>{s[f]=e.target.value})} placeholder={ph}
            style={{border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontSize:12,color:'var(--tx2)',padding:'2px 0',outline:'none',minWidth:100}}/>
        </div>)}
    </div>
    <div style={{marginBottom:12}}>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:8,fontWeight:600,color:'var(--tx4)',textTransform:'uppercase',marginRight:6}}>Connections</span>
      {(scene.connections||[]).map((c,i)=>{let t=null;sc.parts.forEach(p=>p.scenes.forEach(s=>{if(s.id===c.targetSceneId)t=s}));
        return<span key={i} style={{display:'inline-flex',alignItems:'center',gap:3,background:'var(--blueA)',color:'var(--blue)',padding:'1px 7px',borderRadius:12,fontFamily:'JetBrains Mono,monospace',fontSize:9,fontWeight:600,marginRight:3}}>
          → {t?.title||'?'} <button onClick={()=>uS(s=>{s.connections.splice(i,1)})} style={{background:'none',border:'none',color:'inherit',cursor:'pointer',fontSize:8}}>✕</button></span>})}
      <select value="" onChange={e=>{const id=e.target.value;if(id)uS(s=>{s.connections.push({targetSceneId:id})})}}
        style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,color:'var(--blue)',background:'var(--blueA)',border:'1px dashed var(--blue)',borderRadius:12,padding:'1px 7px',cursor:'pointer',outline:'none'}}>
        <option value="">+ 연결</option>
        {sc.parts.map(p=><optgroup key={p.id} label={p.title}>{p.scenes.filter(s=>s.id!==scene.id&&!(scene.connections||[]).some(c=>c.targetSceneId===s.id)).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>)}
      </select>
    </div>
    {/* R20/Coco preview with toggle */}
    {isR20&&<div style={{marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:r20On?8:0}}>
        <div onClick={()=>setR20On(!r20On)} style={{display:'flex',alignItems:'center',gap:5,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,cursor:'pointer',
          border:`1px solid ${r20On?'var(--red)':'var(--bdr)'}`,color:r20On?'var(--red)':'var(--tx4)',background:r20On?'var(--redA)':'transparent'}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:r20On?'var(--red)':'var(--tx4)'}}/>Roll20 미리보기 {r20On?'ON':'OFF'}
        </div>
      </div>
      {r20On&&<R20P scene={scene}/>}
    </div>}
    {isCoco&&<CocoP scene={scene}/>}
    {/* Floating command bar */}
    {cmds.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:3,padding:'6px 8px',marginBottom:12,border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)'}}>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,color:'var(--tx4)',display:'flex',alignItems:'center',marginRight:4}}>⌘</span>
      {cmds.map(c=><button key={c.id} onMouseDown={e=>e.preventDefault()} onClick={()=>insertCmd(c.s)}
        style={{padding:'2px 8px',borderRadius:16,fontSize:10,fontWeight:600,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',
          border:'1px solid var(--bdr)',background:'transparent',color:'var(--tx3)',transition:'all .08s'}}
        title={c.s}>{c.l}</button>)}
      {plat?.savedColors?.map((hex,i)=><button key={'c'+i} onMouseDown={e=>e.preventDefault()}
        onClick={()=>insertCmd(`[텍스트](#" style="color:${hex};text-decoration:none;)`)}
        style={{width:20,height:20,borderRadius:'50%',border:'2px solid var(--bdr)',background:hex,cursor:'pointer',padding:0}}
        title={hex}/>)}
    </div>}
    <div data-block-list><BL entry={scene} upE={fn=>uS(s=>{fn(s)})} sc={sc}/></div>
  </div>;
}
// ===== ENDING PANEL =====
function EndingP({ending,sc,plat,mode,gm,up,sel,toast,setMdl}){
  const uE=fn=>up(d=>{const e=d.scenarios.find(x=>x.id===sel.sid).endings.find(x=>x.id===sel.eid);fn(e)});
  if(mode==='play')return<PlayV entry={ending} sc={sc} plat={plat} gm={gm}/>;
  return<div>
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx4)',marginBottom:4}}>{plat?.name||''} / {sc.title} / endings/</div>
    <input value={ending.title} onChange={e=>uE(en=>{en.title=e.target.value})} style={{fontFamily:'Instrument Serif,serif',fontSize:26,fontWeight:400,color:'var(--tx1)',border:'none',background:'transparent',padding:0,width:'100%',outline:'none'}}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,margin:'8px 0 14px'}}>
      {sc.endingTypes.map(t=><button key={t.id} onClick={()=>uE(en=>{en.endingType=t.id})}
        style={{padding:'4px 11px',borderRadius:20,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',
          border:`1px solid ${ending.endingType===t.id?t.c:'var(--bdr)'}`,background:ending.endingType===t.id?t.c:'transparent',color:ending.endingType===t.id?'#fff':'var(--tx3)'}}>{t.l}</button>)}
      <button onClick={()=>setMdl('endingTypes')} style={{padding:'4px 8px',borderRadius:20,fontSize:10,border:'1px dashed var(--tx4)',color:'var(--tx4)',cursor:'pointer'}}>✎</button>
    </div>
    <div style={{marginBottom:18,paddingLeft:12,borderLeft:'2px solid var(--coral)',position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:'2px solid var(--coral)',background:'var(--bg2)'}}/>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',display:'block',marginBottom:4}}>// condition</span>
      <TA value={ending.condition||''} onChange={v=>uE(en=>{en.condition=v})} placeholder="도달 조건" bg="var(--coralA)"/>
    </div>
    <BL entry={ending} upE={fn=>uE(en=>{fn(en)})} sc={sc}/>
  </div>;
}
// ===== PLAY VIEW =====
// 플레이 뷰: 원문 복사 버튼 (채팅창에 바로 붙여넣기용)
function CopyBtn({text}){const[ok,setOk]=useState(false);
  return<button title="원문 복사" onClick={()=>{navigator.clipboard?.writeText(text).then(()=>{setOk(true);setTimeout(()=>setOk(false),1200)})}}
    style={{display:'inline-flex',alignItems:'center',gap:3,marginLeft:6,padding:'0 6px',borderRadius:10,border:'1px solid var(--bdr)',fontFamily:'JetBrains Mono,monospace',fontSize:9,fontWeight:600,color:ok?'var(--green)':'var(--tx4)',cursor:'pointer',verticalAlign:'middle'}}>
    {ok?<Check size={9}/>:<Copy size={9}/>}{ok?'복사됨':'복사'}</button>}
function PlayV({entry,sc,pt,plat,gm,isSc}){
  const isR20=plat?.name.toLowerCase().includes('roll20');
  const renderB=(b)=>{const m=BT[b.type]||BT.text;const isGm=['memo','truth','clue','session-log'].includes(b.type);
    if(isGm&&!gm)return null;
    const wrap=(color,children,copy)=><div key={b.id} style={{marginBottom:16,paddingLeft:12,borderLeft:`2px solid ${color}`,position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:`2px solid ${color}`,background:'var(--bg2)'}}/>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>// {b.label||m.l}{copy&&<CopyBtn text={copy}/>}</div>{children}</div>;
    const card={border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:12};
    const gmNote=v=>gm&&v?<div style={{marginTop:8,border:'1px solid rgba(210,153,34,.15)',background:'var(--goldA)',borderRadius:6,padding:'8px 10px',fontSize:12,whiteSpace:'pre-wrap'}}>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:8,fontWeight:700,color:'var(--gold)',border:'1px solid var(--gold)',borderRadius:99,padding:'0 5px',marginRight:6}}>GM</span>{v}</div>:null;
    if(['text','memo','truth','session-log'].includes(b.type))return wrap(m.c,b.content?<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:'10px 14px',fontSize:13,lineHeight:1.7}}>
      {b.content.split('\n').map((l,i)=>l.trim()?<div key={i} dangerouslySetInnerHTML={{__html:mdR(l)}}/>:<div key={i} style={{height:6}}/>)}</div>
      :<div style={{color:'var(--tx4)',fontSize:12}}>empty</div>,b.type==='text'&&b.content?b.content:null);
    if(b.type==='clue'){const cl=sc?.clues.find(c=>c.id===b.clueId);return wrap('var(--teal)',<div>
      {cl&&<span style={{display:'inline-flex',alignItems:'center',gap:3,background:'var(--tealA)',color:'var(--teal)',padding:'2px 8px',borderRadius:12,fontFamily:'JetBrains Mono,monospace',fontSize:9,fontWeight:600,marginBottom:6}}>🔗 {cl.name}</span>}
      {b.content&&<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--tealA)',padding:'10px 14px',fontSize:13,lineHeight:1.7}}>{b.content}</div>}
    </div>)}
    if(b.type==='npc')return wrap('var(--purple)',<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:12}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
        {b.imageUrl&&<img src={b.imageUrl} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'1px solid var(--bdr)'}} onError={e=>{e.target.style.display='none'}}/>}
        <div><div style={{fontFamily:'Instrument Serif,serif',fontSize:16,color:'var(--tx1)'}}>{b.name||'?'}</div>{b.role&&<div style={{fontSize:11,color:'var(--tx3)'}}>{b.role}</div>}</div>
      </div>
      {b.traits&&<ul style={{paddingLeft:16,fontSize:12,lineHeight:1.7,margin:0}}>{b.traits.split('\n').filter(l=>l.trim()).map((t,i)=><li key={i}>{t}</li>)}</ul>}
      {b.lines?.trim()&&<div style={{marginTop:6,borderTop:'1px dashed var(--bdr)',paddingTop:6}}>{b.lines.split('\n').filter(l=>l.trim()).map((l,i)=>
        <div key={i} style={{fontSize:13,fontStyle:'italic',padding:'2px 0'}}>“{l}”<CopyBtn text={isR20&&b.name?`/as "${b.name}" ${l}`:l}/></div>)}</div>}
    </div>);
    if(b.type==='item'||b.type==='place')return wrap(m.c,<div style={card}>
      <div style={{display:'flex',gap:10}}>
        {b.imageUrl&&<img src={b.imageUrl} style={{width:64,height:64,borderRadius:6,objectFit:'cover',border:'1px solid var(--bdr)',flexShrink:0}} onError={e=>{e.target.style.display='none'}}/>}
        <div style={{minWidth:0}}><div style={{fontFamily:'Instrument Serif,serif',fontSize:16,color:'var(--tx1)'}}>{b.name||'?'}</div>
          {b.description&&<div style={{fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{b.description}</div>}</div></div>
      {gmNote(b.gmNote)}</div>);
    if(b.type==='bgm')return wrap(m.c,<div style={{...card,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
      <Music size={14} style={{color:'var(--coral)'}}/><span style={{fontWeight:600,color:'var(--tx1)'}}>{b.title||'(제목 없음)'}</span>
      {/^https?:\/\//i.test(b.url||'')&&<a href={b.url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:11,color:'var(--blue)'}}><ExternalLink size={11}/>열기</a>}
      {b.note&&<div style={{flexBasis:'100%',fontSize:12,color:'var(--tx3)',whiteSpace:'pre-wrap'}}>{b.note}</div>}</div>);
    if(b.type==='handout')return wrap('var(--teal)',<div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden',background:'var(--sf1)'}}>
      {b.title&&<div style={{padding:'10px 14px 0',fontFamily:'Instrument Serif,serif',fontWeight:700,fontSize:15}}>{b.title}</div>}
      {b.imageUrl&&<img src={b.imageUrl} style={{maxWidth:'100%',borderRadius:4,margin:'6px 14px'}} onError={e=>{e.target.style.display='none'}}/>}
      {b.content&&<div style={{padding:'10px 14px',whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.8}}>{b.content}</div>}
      {gm&&b.gmNote&&<div style={{margin:'0 10px 10px',border:'1px solid rgba(210,153,34,.15)',background:'var(--goldA)',borderRadius:6,padding:'8px 10px',fontSize:12,whiteSpace:'pre-wrap'}}>
        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:8,fontWeight:700,color:'var(--gold)',border:'1px solid var(--gold)',borderRadius:99,padding:'0 5px',marginRight:6}}>GM</span>{b.gmNote}</div>}
    </div>);
    if((b.type==='branches'||b.type==='lines')&&b.items?.length)return wrap(m.c,<div>{b.items.map(it=><div key={it.id} style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:10,marginBottom:6,borderLeft:`3px solid ${m.c}`}}>
      <div style={{fontWeight:700,fontSize:12,marginBottom:3}}>{it.label}</div>
      {it.text&&<div style={{fontSize:13,whiteSpace:'pre-wrap',fontStyle:b.type==='lines'?'italic':'normal'}}>{it.text}{b.type==='lines'&&<CopyBtn text={isR20&&it.label?`/as "${it.label}" ${it.text}`:it.text}/>}</div>}
    </div>)}</div>);
    if(b.type==='checks'&&b.items?.length)return wrap('var(--red)',<div>{b.items.map(c=><div key={c.id} style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:10,marginBottom:6}}>
      <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>{c.name||'?'}</div>
      {[['대성공',c.critSuccess,'var(--gold)'],['성공',c.success,'var(--green)'],['실패',c.fail,'var(--tx4)'],['대실패',c.critFail,'var(--red)']].map(([lb,v,cl])=>
        v?<div key={lb} style={{display:'flex',gap:8,padding:'3px 0',borderTop:'1px dashed var(--bdr)',fontSize:12}}>
          <span style={{flex:'0 0 50px',fontFamily:'JetBrains Mono,monospace',fontSize:9,fontWeight:700,color:cl}}>{lb}</span><span style={{flex:1,whiteSpace:'pre-wrap'}}>{v}</span></div>:null)}
    </div>)}</div>);
    return null;
  };
  return<div>
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx4)',marginBottom:4}}>{plat?.name||''} / {sc?.title} / {pt?.title||'endings'}</div>
    <h1 style={{fontFamily:'Instrument Serif,serif',fontSize:28,fontWeight:400,color:'var(--tx1)',marginBottom:8}}>{entry.title}</h1>
    {isSc&&(entry.location||entry.timeOfDay||entry.npcsPresent)&&<div style={{display:'flex',gap:16,paddingBottom:8,marginBottom:14,borderBottom:'1px solid var(--bdr)',fontFamily:'JetBrains Mono,monospace',fontSize:11}}>
      {entry.location&&<span><b style={{color:'var(--tx4)'}}>loc</b> {entry.location}</span>}
      {entry.timeOfDay&&<span><b style={{color:'var(--tx4)'}}>time</b> {entry.timeOfDay}</span>}
      {entry.npcsPresent&&<span><b style={{color:'var(--tx4)'}}>npc</b> {entry.npcsPresent}</span>}
    </div>}
    {entry.condition&&<div style={{marginBottom:16,paddingLeft:12,borderLeft:'2px solid var(--coral)',position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:'2px solid var(--coral)',background:'var(--bg2)'}}/>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>// condition</div>
      <div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--coralA)',padding:'10px 14px',whiteSpace:'pre-wrap'}}>{entry.condition}</div>
    </div>}
    {(entry.blocks||[]).map(renderB)}
  </div>;
}
// ===== FLOW VIEW =====
function FlowV({sc,sel,setSel,setMode}){
  const goScene=(ptid,scid)=>{setSel({pid:sel.pid,sid:sel.sid,ptid,scid,eid:null});setMode('edit')};
  const goEnding=(eid)=>{setSel({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid});setMode('edit')};
  if(!sc.parts.length&&!sc.endings.length)return<div style={{color:'var(--tx4)',textAlign:'center',padding:40,fontFamily:'JetBrains Mono,monospace',fontSize:13}}>파트와 씬을 먼저 만들어주세요</div>;
  return<div><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:700,color:'var(--tx1)',marginBottom:14}}>flow</div>
    {sc.parts.map((p,pi)=><div key={p.id} style={{marginBottom:6}}>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:13,marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
        {p.title}<span style={{fontSize:9,color:'var(--tx4)'}}>{p.scenes.filter(s=>s.done).length}/{p.scenes.length}</span></div>
      {p.scenes.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:2,alignItems:'stretch'}}>
        {p.scenes.map((s,si)=><Fragment key={s.id}>
          <div onClick={()=>goScene(p.id,s.id)}
            style={{border:'1px solid var(--bdr)',borderRadius:6,background:'var(--sf1)',padding:'8px 10px',minWidth:120,maxWidth:160,cursor:'pointer',borderLeft:s.done?'3px solid var(--green)':'1px solid var(--bdr)',transition:'box-shadow .1s'}}>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{s.title}</div>
            <div style={{display:'flex',gap:2,marginTop:3}}>
              {s.done&&<span style={{fontFamily:'JetBrains Mono,monospace',fontSize:7,fontWeight:700,padding:'0 4px',borderRadius:8,background:'var(--greenA)',color:'var(--green)'}}>✓</span>}
              {s.blocks?.filter(b=>b.type==='clue').length>0&&<span style={{fontFamily:'JetBrains Mono,monospace',fontSize:7,fontWeight:700,padding:'0 4px',borderRadius:8,background:'var(--tealA)',color:'var(--teal)'}}>🔍</span>}
              {s.blocks?.filter(b=>b.type==='branches').length>0&&<span style={{fontFamily:'JetBrains Mono,monospace',fontSize:7,fontWeight:700,padding:'0 4px',borderRadius:8,background:'var(--blueA)',color:'var(--blue)'}}>⑂</span>}
              {s.blocks?.filter(b=>b.type==='checks').length>0&&<span style={{fontFamily:'JetBrains Mono,monospace',fontSize:7,fontWeight:700,padding:'0 4px',borderRadius:8,background:'var(--redA)',color:'var(--red)'}}>🎲</span>}
            </div>
            {s.connections?.length>0&&<div style={{fontFamily:'JetBrains Mono,monospace',fontSize:7,color:'var(--tx4)',marginTop:2}}>{s.connections.map((c,i)=>{let t=null;sc.parts.forEach(pp=>pp.scenes.forEach(ss=>{if(ss.id===c.targetSceneId)t=ss}));return<span key={i}>→{t?.title||'?'} </span>})}</div>}
          </div>
          {si<p.scenes.length-1&&<div style={{display:'flex',alignItems:'center',color:'var(--tx4)',padding:'0 4px',fontSize:12}}>→</div>}
        </Fragment>)}
      </div>}
      {pi<sc.parts.length-1&&<div style={{padding:'3px 0 3px 14px',color:'var(--tx4)',fontSize:11}}>↓</div>}
    </div>)}
    {sc.endings.length>0&&<><div style={{padding:'3px 0 3px 14px',color:'var(--tx4)',fontSize:11}}>↓</div>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:13,marginBottom:6}}>endings/ <span style={{fontSize:9,color:'var(--tx4)',fontWeight:400}}>{sc.endings.length}</span></div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {sc.endings.map(e=>{const et=sc.endingTypes.find(t=>t.id===e.endingType)||{l:'?',c:'#8b949e'};
          return<div key={e.id} onClick={()=>goEnding(e.id)}
            style={{border:'1px solid var(--bdr)',borderTop:`3px solid ${et.c}`,borderRadius:6,background:'var(--sf1)',padding:'8px 10px',minWidth:120,maxWidth:170,cursor:'pointer',transition:'box-shadow .1s'}}>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600}}>{e.title||'?'}</div>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,fontWeight:700,color:et.c,marginTop:2}}>{et.l}</div></div>})}
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
    <div style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:'#161b22',borderBottom:'1px solid #30363d',fontFamily:'JetBrains Mono,monospace',fontSize:9,color:'#484f58'}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:'#f85149'}}/>Roll20 Chat — 나레이션 · 대사만 표시</div>
    <div className="r20chat" dangerouslySetInnerHTML={{__html:html}}/></div>}
function CocoP({scene}){const ts=[];for(const b of(scene.blocks||[])){if(b.type==='text'&&b.content)ts.push(b.content);if(b.type==='lines'&&b.items)for(const l of b.items)if(l.text)ts.push((l.label?l.label+'：':'')+l.text)}
  return<div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden',marginBottom:16}}>
    <div style={{padding:'5px 10px',background:'#2a2a3a',borderBottom:'1px solid #3a3a4a',fontFamily:'JetBrains Mono,monospace',fontSize:9,color:'#888'}}>코코포리아 미리보기</div>
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
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',flex:1}}>// {b.label} <span style={{color:'var(--tx4)',fontSize:9}}>▸ 접힘</span></span>
          <IB I={ChevronDown} s={12} onClick={()=>upB(b.id,x=>{x.collapsed=false})}/><IB I={CopyPlus} s={12} onClick={()=>upE(e=>{const cp=JSON.parse(JSON.stringify(b));cp.id=uid();cp.label+=' (복사)';e.blocks.splice(i+1,0,cp)})}/><IB I={Trash2} s={12} onClick={()=>upE(e=>{e.blocks=e.blocks.filter(x=>x.id!==b.id)})}/>
        </div></div>;
      return<div key={b.id} style={{marginBottom:16,paddingLeft:12,borderLeft:`2px solid ${m.c}`,position:'relative',marginLeft:b.indent?24:0}}>
        <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:`2px solid ${m.c}`,background:'var(--bg2)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:5}}>
          <input value={b.label} onChange={e=>upB(b.id,x=>{x.label=e.target.value})}
            style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',border:'none',background:'transparent',padding:'1px 3px',borderRadius:3,flex:1,minWidth:0,outline:'none'}}/>
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
    return<TA value={b.content||''} onChange={v=>up(x=>{x.content=v})} placeholder={b.type==='memo'?'GM 전용 메모':b.type==='truth'?'사건의 진상':b.type==='session-log'?'세션 중 메모':'지문, 묘사...'} bg={bgMap[b.type]}/>}
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
      <TA value={it.text} onChange={v=>up(x=>{x.items[ii].text=v})} placeholder={tp==='branches'?'전개':'대사'}/></div>)}
    <Btn small onClick={()=>up(x=>{x.items.push({id:uid(),label:'',text:''})})} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>{tp==='branches'?'분기':'대사'}</Btn></div>}
  if(b.type==='checks')return<div>
    {(b.items||[]).map((c,ci)=><div key={c.id} style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,marginBottom:5,borderLeft:'3px solid var(--red)'}}>
      <div style={{display:'flex',gap:5,marginBottom:4}}><input value={c.name} onChange={e=>up(x=>{x.items[ci].name=e.target.value})} placeholder="판정명"
        style={{flex:1,border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontWeight:700,fontSize:12,padding:'2px 0',outline:'none',color:'var(--tx1)'}}/><IB I={Trash2} s={12} onClick={()=>up(x=>{x.items.splice(ci,1)})}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
        {[['critSuccess','대성공','var(--goldA)','var(--gold)'],['success','성공','var(--greenA)','var(--green)'],['fail','실패','var(--sf2)','var(--tx4)'],['critFail','대실패','var(--redA)','var(--red)']].map(([k,lb,bg,cl])=>
          <div key={k}><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,fontWeight:700,color:cl}}>{lb}</span><TA value={c[k]||''} onChange={v=>up(x=>{x.items[ci][k]=v})} bg={bg}/></div>)}</div>
    </div>)}
    <Btn small onClick={()=>up(x=>{x.items.push({id:uid(),name:'',critSuccess:'',success:'',fail:'',critFail:''})})} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>판정</Btn></div>;
  return null}
// ===== OVERVIEW =====
function OverviewP({sc,plat,up,sel,toast,exportSingle,mergeImp,setMdl}){
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  const conc={};for(const c of sc.clues)if(c.leadsTo&&!c.isRedHerring)conc[c.leadsTo]=(conc[c.leadsTo]||0)+1;
  return<div>
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx4)',marginBottom:4}}>{plat?.name||''}</div>
    <input value={sc.title} onChange={e=>uS(s=>{s.title=e.target.value})} style={{fontFamily:'Instrument Serif,serif',fontSize:28,fontWeight:400,color:'var(--tx1)',border:'none',background:'transparent',padding:0,width:'100%',outline:'none',marginBottom:14}}/>
    <div style={{marginBottom:16,paddingLeft:12,borderLeft:'2px solid var(--gold)',position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:'2px solid var(--gold)',background:'var(--bg2)'}}/>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',display:'block',marginBottom:4}}>// setting</span>
      <TA value={sc.setting||''} onChange={v=>uS(s=>{s.setting=v})} placeholder="시대, 장소, 분위기" bg="var(--goldA)"/></div>
    <div style={{marginBottom:16,paddingLeft:12,borderLeft:'2px solid var(--blue)',position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:'2px solid var(--blue)',background:'var(--bg2)'}}/>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',display:'block',marginBottom:4}}>// synopsis</span>
      <TA value={sc.synopsis||''} onChange={v=>uS(s=>{s.synopsis=v})} placeholder="줄거리 요약"/></div>
    <div style={{display:'flex',gap:14,padding:'8px 0',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--tx3)',marginBottom:14,borderBottom:'1px solid var(--bdr)'}}>
      <span>씬 {sc.parts.reduce((a,p)=>a+p.scenes.filter(s=>s.done).length,0)}/{sc.parts.reduce((a,p)=>a+p.scenes.length,0)}</span>
      <span>엔딩 {sc.endings.length}</span><span>단서 {sc.clues.length}</span></div>
    <SecTitle right={<IB I={Pencil} s={13} onClick={()=>setMdl('endingTypes')}/>}>엔딩 타입</SecTitle>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:14}}>
      {sc.endingTypes.map(t=><span key={t.id} style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono,monospace',background:t.c,color:'#fff'}}>{t.l}</span>)}</div>
    <SecTitle>3단서 법칙 검증</SecTitle>
    {Object.keys(conc).length===0?<div style={{fontSize:11,color:'var(--tx4)',marginBottom:14}}>단서 "연결 결론" 필드 입력 시 검증</div>
    :<div style={{marginBottom:14}}>{Object.entries(conc).map(([k,n])=>{
      const st=n>=3?{bg:'var(--greenA)',c:'var(--green)',i:'✓'}:n>=2?{bg:'var(--goldA)',c:'var(--gold)',i:'△'}:{bg:'var(--redA)',c:'var(--red)',i:'✕'};
      return<div key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0'}}>
        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:20,background:st.bg,color:st.c}}>{st.i} {n}/3</span><span style={{fontSize:12}}>{k}</span></div>})}</div>}
    <SecTitle right={<IB I={Plus} s={13} onClick={()=>uS(s=>{s.eventTimeline.push({id:uid(),time:'',event:'',isHidden:false})})}/>}>사건 연표</SecTitle>
    {!sc.eventTimeline.length?<div style={{fontSize:11,color:'var(--tx4)',marginBottom:14}}>배경 사건을 시간순으로 기록</div>
    :<div style={{marginBottom:14}}>{sc.eventTimeline.map((ev,i)=><div key={ev.id} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid var(--bdr)',fontSize:12,alignItems:'center',opacity:ev.isHidden?.5:1}}>
      <input value={ev.time} onChange={e=>uS(s=>{s.eventTimeline[i].time=e.target.value})} placeholder="시간" style={{flex:'0 0 80px',border:'none',background:'transparent',fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,color:'var(--blue)',outline:'none'}}/>
      <input value={ev.event} onChange={e=>uS(s=>{s.eventTimeline[i].event=e.target.value})} placeholder="사건" style={{flex:1,border:'none',background:'transparent',fontSize:12,color:'var(--tx2)',outline:'none'}}/>
      <IB I={ev.isHidden?EyeOff:Eye} s={13} onClick={()=>uS(s=>{s.eventTimeline[i].isHidden=!s.eventTimeline[i].isHidden})}/><IB I={Trash2} s={13} onClick={()=>uS(s=>{s.eventTimeline.splice(i,1)})}/></div>)}</div>}
    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
      <Btn primary onClick={exportSingle}><FileDown size={11}/>이 시나리오만 내보내기</Btn>
      <Btn onClick={()=>document.getElementById('mg')?.click()}><FileUp size={11}/>시나리오 병합</Btn>
      <input type="file" id="mg" accept=".json" hidden onChange={e=>{if(e.target.files[0])mergeImp(e.target.files[0]);e.target.value=''}}/></div>
  </div>}

// ===== MODALS =====
function CloudM({D,up,replaceD,toast,onClose}){const[tk,setTk]=useState(D.cloud?.token||'');const[gi,setGi]=useState(D.cloud?.gistId||'');
  const push=async()=>{if(!tk){toast('토큰 필요');return}up(d=>{d.cloud.token=tk});
    try{const r=await fetch(gi?'https://api.github.com/gists/'+gi:'https://api.github.com/gists',{method:gi?'PATCH':'POST',headers:{'Authorization':'token '+tk,'Content-Type':'application/json'},body:JSON.stringify({description:'scenario-forge',public:false,files:{'data.json':{content:JSON.stringify(stripSecrets(D),null,2)}}})});
      if(!r.ok)throw Error(r.status);const d=await r.json();setGi(d.id);up(dd=>{dd.cloud.gistId=d.id;dd.cloud.token=tk});toast('☁ 저장 완료')}catch(e){toast('실패: '+e.message)}};
  const pull=async()=>{if(!tk||!gi){toast('토큰+ID 필요');return}
    try{const r=await fetch('https://api.github.com/gists/'+gi,{headers:{'Authorization':'token '+tk}});if(!r.ok)throw Error(r.status);const d=await r.json();const f=d.files['data.json'];if(!f){toast('파일 없음');return}
      if(!confirm('덮어씌울까요?'))return;let txt=f.content;if(f.truncated&&f.raw_url){const rr=await fetch(f.raw_url);if(!rr.ok)throw Error(rr.status);txt=await rr.text()}
      const p=mig(JSON.parse(txt));p.cloud={token:tk,gistId:gi};replaceD(p);onClose();toast('☁ 완료')}catch(e){toast('실패: '+e.message)}};
  return<Modal title="☁ GitHub Gist" onClose={onClose} footer={<><Btn onClick={pull}><CloudDownload size={11}/>불러오기</Btn><Btn primary onClick={push}><CloudUpload size={11}/>저장</Btn></>}>
    <div style={{fontSize:12,color:'var(--tx3)',marginBottom:10}}>Personal Access Token으로 저장/불러오기</div>
    <div style={{marginBottom:8}}><label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>Token</label><Inp value={tk} onChange={setTk} placeholder="ghp_..." type="password"/></div>
    <div><label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>Gist ID</label><Inp value={gi} onChange={setGi} placeholder="비워두면 새로 생성"/></div></Modal>}

// 블록 안의 텍스트 필드 (찾기·바꾸기 공통)
const B_KEYS=['content','name','role','traits','lines','title','description','gmNote','note'];
const I_KEYS=['label','text','name','critSuccess','success','fail','critFail'];
function eachText(b,fn){for(const k of B_KEYS)if(typeof b[k]==='string')fn(b,k);for(const it of(b.items||[]))for(const k of I_KEYS)if(typeof it[k]==='string')fn(it,k)}
function eachEntry(D,fn){for(const sc of D.scenarios){for(const p of sc.parts)for(const s of p.scenes)fn(s,sc,p);for(const e of(sc.endings||[]))fn(e,sc,null)}}
const countIn=(v,t)=>{let n=0,i=0;while((i=v.indexOf(t,i))!==-1){n++;i+=t.length}return n};

function FindM({D,up,setSel,setMode,onClose,toast}){const[t,setT]=useState('');const[rt,setRt]=useState('');const[rm,setRm]=useState('find');
  const res=useMemo(()=>{if(!t.trim())return[];const lt=t.toLowerCase(),r=[];
    eachEntry(D,(en,sc,p)=>{let c=0;const chk=v=>{if(v?.toLowerCase().includes(lt))c++};chk(en.title);chk(en.condition);
      for(const b of en.blocks||[])eachText(b,(o,k)=>chk(o[k]));
      if(c)r.push(p?{sc,p,s:en,c,tp:'scene'}:{sc,e:en,c,tp:'ending'})});return r},[t,D]);
  const countAll=()=>{if(!t)return 0;let n=0;eachEntry(D,en=>{if(en.condition)n+=countIn(en.condition,t);for(const b of en.blocks||[])eachText(b,(o,k)=>{n+=countIn(o[k],t)})});return n};
  const doReplace=()=>{if(!t){toast('검색어 필요');return}const n=countAll();if(!n){toast('결과 없음');return}if(!confirm(n+'건 바꿀까요?'))return;
    up(d=>{eachEntry(d,en=>{if(en.condition)en.condition=en.condition.split(t).join(rt);for(const b of en.blocks||[])eachText(b,(o,k)=>{o[k]=o[k].split(t).join(rt)})})});onClose();toast('바꾸기 완료')};
  return<Modal title="찾기 · 바꾸기" onClose={onClose} width={460} footer={rm==='replace'?<Btn primary onClick={doReplace}>바꾸기</Btn>:null}>
    <div style={{display:'flex',background:'var(--sf2)',borderRadius:6,padding:2,border:'1px solid var(--bdr)',marginBottom:10}}>
      {['find','replace'].map(m=><button key={m} onClick={()=>setRm(m)} style={{flex:1,padding:'4px 10px',borderRadius:4,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono,monospace',
        border:'none',cursor:'pointer',background:rm===m?'var(--sf1)':'transparent',color:rm===m?'var(--tx1)':'var(--tx4)'}}>{m==='find'?'찾기':'바꾸기'}</button>)}</div>
    <Inp value={t} onChange={setT} placeholder="찾을 단어" mono style={{marginBottom:8}}/>
    {rm==='replace'&&<Inp value={rt} onChange={setRt} placeholder="바꿀 단어" mono style={{marginBottom:8}}/>}
    {rm==='replace'&&t&&<div style={{fontSize:12,color:'var(--tx3)',padding:'6px 8px',border:'1px solid var(--bdr)',borderRadius:6,marginBottom:8}}>전체에서 <b style={{color:'var(--tx1)'}}>{countAll()}건</b></div>}
    {rm==='find'&&<div style={{maxHeight:300,overflowY:'auto'}}>{!t.trim()?<div style={{color:'var(--tx4)',fontSize:11}}>검색어 입력</div>:!res.length?<div style={{color:'var(--tx4)',fontSize:11}}>없음</div>
      :res.map((r,i)=><div key={i} onClick={()=>{if(r.tp==='scene')setSel({pid:r.sc.platformId,sid:r.sc.id,ptid:r.p.id,scid:r.s.id,eid:null});else setSel({pid:r.sc.platformId,sid:r.sc.id,ptid:null,scid:null,eid:r.e.id});setMode('edit');onClose()}}
        style={{border:'1px solid var(--bdr)',borderRadius:6,padding:'7px 10px',marginBottom:4,cursor:'pointer'}}>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:600,fontSize:12}}>{r.tp==='scene'?r.s.title:r.e.title}</div>
        <div style={{fontSize:10,color:'var(--tx4)'}}>{r.sc.title} · {r.c}건</div></div>)}</div>}
  </Modal>}

function PlatM({D,up,setSel,onClose}){const[n,setN]=useState('');const[c,setC]=useState(PLAT_C[D.platforms.length%PLAT_C.length]);
  return<Modal title="사이트 추가" onClose={onClose} width={380} footer={<Btn primary onClick={()=>{if(!n.trim()){onClose();return}const pid=uid();up(d=>{d.platforms.push({id:pid,name:n.trim(),color:c,commands:[]})});setSel(s=>({...s,pid}));onClose()}}>추가</Btn>}>
    <div style={{marginBottom:8}}><label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>이름</label><Inp value={n} onChange={setN} placeholder="Roll20, 코코포리아..."/></div>
    <div><label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>색상</label>
      <div style={{display:'flex',gap:4}}>{PLAT_C.map(cc=><div key={cc} onClick={()=>setC(cc)} style={{width:22,height:22,borderRadius:'50%',background:cc,cursor:'pointer',border:`2px solid ${cc===c?'var(--tx1)':'transparent'}`}}/>)}</div></div></Modal>}

function CmdM({plat,up,sel,onClose}){const[ei,setEi]=useState(null);const[newColor,setNewColor]=useState('#AA0000');
  if(!plat)return<Modal title="명령어" onClose={onClose}><div style={{color:'var(--tx4)'}}>사이트 선택</div></Modal>;
  const cms=plat.commands||[];const ed=cms.find(c=>c.id===ei);const colors=plat.savedColors||[];
  const uP=fn=>up(d=>{const p=d.platforms.find(x=>x.id===sel.pid);fn(p)});
  return<Modal title={`명령어 — ${plat.name}`} onClose={onClose} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    {/* Commands */}
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,fontWeight:600,color:'var(--tx4)',marginBottom:4}}>COMMANDS</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
      {cms.map(c=><button key={c.id} onClick={()=>setEi(ei===c.id?null:c.id)}
        style={{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:600,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',
          border:`1px solid ${ei===c.id?'var(--blue)':'var(--bdr)'}`,background:ei===c.id?'var(--blue)':'transparent',color:ei===c.id?'#fff':'var(--tx3)'}}>{c.l||'?'}</button>)}</div>
    {ed&&<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf2)',marginBottom:8}}>
      <Inp value={ed.l} onChange={v=>uP(p=>{p.commands.find(x=>x.id===ei).l=v})} placeholder="이름" style={{marginBottom:4}}/>
      <Inp value={ed.cat||''} onChange={v=>uP(p=>{p.commands.find(x=>x.id===ei).cat=v})} placeholder="카테고리" style={{marginBottom:4}}/>
      <TA value={ed.s} onChange={v=>uP(p=>{p.commands.find(x=>x.id===ei).s=v})} placeholder="삽입 텍스트" style={{fontFamily:'JetBrains Mono,monospace'}}/>
      <Btn danger small onClick={()=>{uP(p=>{p.commands=p.commands.filter(x=>x.id!==ei)});setEi(null)}} style={{marginTop:5}}><Trash2 size={11}/>삭제</Btn></div>}
    <Btn small onClick={()=>{const nid=uid();uP(p=>{p.commands.push({id:nid,l:'새 명령어',s:'',cat:'기본'})});setEi(nid)}} style={{width:'100%',justifyContent:'center',borderStyle:'dashed',marginBottom:14}}><Plus size={9}/>명령어 추가</Btn>
    {/* Saved Colors */}
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>SAVED COLORS — 롤꾸에서 자주 쓰는 색상</div>
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
        style={{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:600,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',
          border:`1px solid ${ei===e.id?'var(--blue)':'var(--bdr)'}`,background:ei===e.id?'var(--blue)':'transparent',color:ei===e.id?'#fff':'var(--tx3)'}}>{e.name||'?'}</button>)}</div>
    {ed&&<div style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,background:'var(--sf2)',marginBottom:8}}>
      <Inp value={ed.name||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).name=v})} placeholder="이름" style={{marginBottom:4}}/>
      {tab==='npcs'?<><Inp value={ed.role||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).role=v})} placeholder="역할" style={{marginBottom:4}}/>
        <TA value={ed.traits||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).traits=v})} placeholder="특징"/></>
      :<TA value={ed.description||''} onChange={v=>uS(s=>{s.library[tab].find(x=>x.id===ei).description=v})} placeholder="설명"/>}
      <div style={{display:'flex',gap:4,marginTop:5}}>
        <Btn primary small disabled={!scene} onClick={()=>{const bt=tab==='npcs'?'npc':tab==='items'?'item':'place';
          up(d=>{const pt2=d.scenarios.find(x=>x.id===sel.sid).parts.find(x=>x.id===sel.ptid);const sc2=pt2?.scenes.find(x=>x.id===sel.scid);if(!sc2)return;
            sc2.blocks.push({...JSON.parse(JSON.stringify(ed)),id:uid(),type:bt,label:BT[bt].l})});toast('추가됨')}}><Plus size={9}/>씬에 추가</Btn>
        <Btn danger small onClick={()=>{uS(s=>{s.library[tab]=s.library[tab].filter(x=>x.id!==ei)});setEi(null)}}><Trash2 size={9}/>삭제</Btn></div></div>}
    <Btn small onClick={()=>{const nid=uid();const ne=tab==='npcs'?{id:nid,name:'',imageUrl:'',role:'',traits:'',lines:''}:{id:nid,name:'',imageUrl:'',description:'',gmNote:''};
      uS(s=>{s.library[tab].push(ne)});setEi(nid)}} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>추가</Btn></Modal>}

function ETM({sc,up,sel,onClose}){const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  return<Modal title="엔딩 타입 관리" onClose={onClose} width={400} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    {sc.endingTypes.map((et,i)=><div key={et.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',borderBottom:'1px solid var(--bdr)'}}>
      <input type="color" value={et.c} onChange={e=>uS(s=>{s.endingTypes[i].c=e.target.value})} style={{width:24,height:24,border:'1px solid var(--bdr)',borderRadius:4,padding:1,cursor:'pointer'}}/>
      <Inp value={et.l} onChange={v=>uS(s=>{s.endingTypes[i].l=v})}/>
      <IB I={Trash2} s={13} onClick={()=>{if(sc.endingTypes.length<=1)return;uS(s=>{s.endingTypes.splice(i,1);for(const e of s.endings)if(e.endingType===et.id)e.endingType=s.endingTypes[0].id})}}/></div>)}
    <Btn small onClick={()=>uS(s=>{s.endingTypes.push({id:uid(),l:'새 타입',c:PLAT_C[s.endingTypes.length%PLAT_C.length]})})} style={{width:'100%',justifyContent:'center',marginTop:6,borderStyle:'dashed'}}><Plus size={9}/>추가</Btn></Modal>}

function ClueEditM({sc,clueId,up,sel,onClose}){
  const clue=sc.clues.find(c=>c.id===clueId);if(!clue)return null;
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  const uC=fn=>uS(s=>{const c=s.clues.find(x=>x.id===clueId);fn(c)});
  return<Modal title="단서 편집" onClose={onClose} width={400} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    <div style={{marginBottom:8}}><label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>이름</label><Inp value={clue.name} onChange={v=>uC(c=>{c.name=v})}/></div>
    <div style={{marginBottom:8}}><label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>설명</label><TA value={clue.description||''} onChange={v=>uC(c=>{c.description=v})} placeholder="단서에 대한 상세 설명"/></div>
    <div style={{marginBottom:8}}><label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'block',marginBottom:3}}>연결 결론 (3단서 법칙용)</label><Inp value={clue.leadsTo||''} onChange={v=>uC(c=>{c.leadsTo=v})} placeholder="예: 범인의 정체, 등대의 비밀"/></div>
    <div style={{marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
      <label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx4)',display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
        <input type="checkbox" checked={clue.isRedHerring} onChange={e=>uC(c=>{c.isRedHerring=e.target.checked})} style={{accentColor:'var(--red)'}}/>
        레드 헤링 (미끼 단서)</label></div>
  </Modal>}
