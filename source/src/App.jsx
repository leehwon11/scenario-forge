import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search,Plus,Trash2,Check,ChevronDown,ChevronUp,ChevronLeft,ChevronRight,Undo2,Redo2,Sun,Moon,CloudUpload,CloudDownload,FileDown,FileUp,FolderPlus,Settings,BookOpen,Eye,EyeOff,Pencil,ArrowUp,ArrowDown,CopyPlus,PanelLeftClose,PanelLeftOpen,MoreHorizontal,Cloud,LogIn,LogOut,RefreshCw,GitBranch,MessageSquareQuote,Dice5,AlertTriangle,ExternalLink,Music,GripVertical,Menu,CircleCheck,Circle } from "lucide-react";
import { renderR20, renderCoco } from './r20.js'
import { SK,BT,DEF_ET,PLAT_C,uid,mdR,forExport,download,mig,defData,dropConns,eachText,eachEntry,countIn,allScenes,findTarget,clueUsage,moveIdx } from './data.js'
import { getItem,setItem,announceSave,onOtherTabSave } from './store.js'
import { friendly,getUser,onAuth,signIn,signUp,signOut,resetPw,updatePw,fetchRow,fetchStamp,pushRow,forcePush } from './cloud.js'

const bodyOf=d=>JSON.stringify(forExport(d));
const hashStr=s=>{let h=5381;for(let i=0;i<s.length;i++)h=(h*33+s.charCodeAt(i))|0;return s.length+':'+(h>>>0).toString(36)};
import { Btn,IB,Inp,TA,SecTitle,Label,Modal,useToast,useMedia,CopyBtn,Lines,useDialog,DialogProvider } from './ui.jsx'
import { FlowV } from './flow.jsx'

const isTextField=el=>el&&(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&!['checkbox','color','file','button'].includes(el.type))||el.isContentEditable);
// 드래그 중인 대상 (HTML5 DnD는 dragover에서 dataTransfer를 읽을 수 없어 모듈 변수로 공유)
let DRAG=null;

// ===== MAIN APP =====
export default function App(){return<DialogProvider><AppInner/></DialogProvider>}

function AppInner(){
  const dlg=useDialog();
  const[D,setD]=useState(null);const[loading,setL]=useState(true);
  const[sel,setSel]=useState({pid:null,sid:null,ptid:null,scid:null,eid:null});
  const[mode,setMode]=useState('edit');const[gm,setGm]=useState(true);
  const[theme,setThm]=useState('dark');const[op,setOp]=useState({});
  const[modal,setMdl]=useState(null);
  const isMobile=useMedia('(max-width:767px)');
  const[sbOpen,setSb]=useState(()=>typeof matchMedia==='undefined'||!matchMedia('(max-width:767px)').matches);
  const[zoom,setZoomS]=useState(()=>{try{return parseFloat(localStorage.getItem(SK+'-zoom'))||1}catch(e){return 1}});
  const setZoom=z=>{setZoomS(z);try{localStorage.setItem(SK+'-zoom',z)}catch(e){}};
  const[r20On,setR20On]=useState(false);
  const[conflict,setConflict]=useState(null);const[menu,setMenu]=useState(false); // conflict: {kind:'tab'} | {kind:'server',row}
  const[user,setUser]=useState(null);const[authReady,setAuthReady]=useState(false);
  const[sync,setSync]=useState({s:'off'}); // off | pending | syncing | ok | offline | err
  const{show:toast,T:Toast}=useToast();
  const hist=useRef([]);const hi=useRef(-1);const ht=useRef();const Dref=useRef(null);Dref.current=D;
  const conflictRef=useRef(null);conflictRef.current=conflict;
  const userRef=useRef(null);userRef.current=user;
  // 동기화 기준점: base = 마지막으로 확인한 서버 updated_at, synced = 그때의 데이터 내용
  const meta=useRef({uid:null,base:null,hash:null});const synced=useRef(null);const busy=useRef(false);

  useEffect(()=>{Promise.all([getItem('data'),getItem('meta')]).then(([raw,m])=>{const d=mig(raw||defData());
    setD(d);setThm(d.theme||'dark');if(m)meta.current=m;
    if(d.platforms?.length)setSel(s=>({...s,pid:s.pid||d.platforms[0].id}));
    hist.current=[JSON.stringify(d)];hi.current=0;setL(false)})},[]);

  // 실행 취소 기록: 입력이 멈춘 뒤 0.5초 후 스냅샷. 실행 취소 직전에는 대기 중인 변경을 먼저 기록한다.
  const commitHist=useCallback(()=>{clearTimeout(ht.current);const d=Dref.current;if(!d)return;const sn=JSON.stringify(d);
    if(hi.current>=0&&hist.current[hi.current]===sn)return;
    hist.current=hist.current.slice(0,hi.current+1);hist.current.push(sn);if(hist.current.length>50)hist.current.shift();hi.current=hist.current.length-1},[]);

  // 이 기기에 저장 (IndexedDB)
  const svt=useRef();
  useEffect(()=>{if(!D||loading)return;
    if(conflictRef.current?.kind!=='tab'){clearTimeout(svt.current);svt.current=setTimeout(()=>setItem('data',D).then(ok=>{if(ok)announceSave();else toast('⚠ 이 기기에 저장하지 못했습니다 — JSON으로 내보내 백업하세요',4000)}),300)}
    clearTimeout(ht.current);ht.current=setTimeout(commitHist,500)},[D]);

  // 다른 탭에서 저장하면 감지 → 이 탭의 저장을 멈추고 사용자에게 선택을 맡김
  useEffect(()=>onOtherTabSave(()=>{clearTimeout(svt.current);setConflict(c=>c||{kind:'tab'})}),[]);

  // ===== 클라우드 동기화 =====
  const saveMeta=(m)=>{meta.current=m;setItem('meta',m)};
  const markSynced=(uid,base,body)=>{synced.current=body;saveMeta({uid,base,hash:hashStr(body)});setSync({s:'ok',t:new Date()})};
  const fail=e=>{const msg=friendly(e);setSync({s:/연결하지 못했습니다/.test(msg)?'offline':'err',msg})};
  // 서버 데이터로 교체
  const adopt=useCallback((row,uid)=>{const nd=mig(JSON.parse(JSON.stringify(row.data)));const body=bodyOf(nd);
    setD(nd);setThm(nd.theme||'dark');setSel(s=>nd.platforms.some(p=>p.id===s.pid)?s:{pid:nd.platforms?.[0]?.id||null,sid:null,ptid:null,scid:null,eid:null});
    markSynced(uid,row.updated_at,body)},[]);
  const push=useCallback(async()=>{const u=userRef.current;if(!u||busy.current||conflictRef.current)return;
    const d=Dref.current;const body=bodyOf(d);if(body===synced.current){setSync(s=>s.s==='pending'?{s:'ok',t:s.t||new Date()}:s);return}
    busy.current=true;setSync({s:'syncing'});
    try{const base=meta.current.uid===u.id?meta.current.base:null;
      const r=await pushRow(u.id,forExport(d),base);
      if(r.conflict){const row=await fetchRow(u.id);
        if(row&&bodyOf(mig(JSON.parse(JSON.stringify(row.data))))===body)markSynced(u.id,row.updated_at,body);
        else{setConflict({kind:'server',row});setSync({s:'err',msg:'다른 기기에서 먼저 변경됨'})}}
      else markSynced(u.id,r.updated_at,body)}
    catch(e){fail(e)}finally{busy.current=false}},[]);
  // 로그인 직후·창 복귀 시: 서버와 이 기기 상태를 비교해 불러오기/올리기/충돌 판단
  const syncNow=useCallback(async()=>{const u=userRef.current;if(!u||busy.current||conflictRef.current)return;
    busy.current=true;setSync({s:'syncing'});
    try{const row=await fetchRow(u.id);const d=Dref.current;const body=bodyOf(d);const m=meta.current;const known=m.uid===u.id;
      busy.current=false;
      if(!row){if(known)saveMeta({...m,base:null});else saveMeta({uid:u.id,base:null,hash:null});synced.current=null;return push()}
      const sBody=bodyOf(mig(JSON.parse(JSON.stringify(row.data))));
      if(sBody===body)return markSynced(u.id,row.updated_at,body);
      const localDirty=known?hashStr(body)!==m.hash:d.scenarios.length>0;
      const serverChanged=!known||m.base!==row.updated_at;
      if(!localDirty)return adopt(row,u.id);
      if(!serverChanged){synced.current=null;return push()}
      setConflict({kind:'server',row});setSync({s:'err',msg:'이 기기와 클라우드의 내용이 다름'})}
    catch(e){busy.current=false;fail(e)}},[push,adopt]);

  // 로그인 상태 추적
  useEffect(()=>{let alive=true;getUser().then(u=>{if(alive){setUser(u);setAuthReady(true)}}).catch(()=>setAuthReady(true));
    const off=onAuth((u,ev)=>{setUser(u);if(ev==='PASSWORD_RECOVERY')setMdl('account-recovery')});return()=>{alive=false;off()}},[]);
  // 로그인되면(또는 다른 계정으로 바뀌면) 동기화
  useEffect(()=>{if(loading||!authReady)return;if(!user){setSync({s:'off'});return}setConflict(c=>c?.kind==='server'?null:c);syncNow()},[user?.id,loading,authReady]);
  // 편집 후 3초 뒤 자동 업로드
  const pvt=useRef();
  useEffect(()=>{if(!D||loading||!user||conflict)return;if(bodyOf(D)===synced.current)return;
    setSync(s=>s.s==='syncing'?s:{...s,s:'pending'});clearTimeout(pvt.current);pvt.current=setTimeout(push,3000);return()=>clearTimeout(pvt.current)},[D,user?.id,conflict]);
  // 창으로 돌아오거나 1분마다 서버 변경 확인, 다시 온라인이 되면 업로드
  useEffect(()=>{if(!user)return;
    const check=async()=>{if(document.hidden||busy.current||conflictRef.current)return;
      try{const st=await fetchStamp(user.id);if(st!==meta.current.base)syncNow();else if(bodyOf(Dref.current)!==synced.current)push()}catch(e){fail(e)}};
    const vis=()=>{if(!document.hidden)check()};const iv=setInterval(check,60000);
    document.addEventListener('visibilitychange',vis);window.addEventListener('online',check);
    return()=>{clearInterval(iv);document.removeEventListener('visibilitychange',vis);window.removeEventListener('online',check)}},[user?.id]);
  // 업로드되지 않은 변경이 있는데 창을 닫으려 하면 경고
  useEffect(()=>{const h=e=>{if(userRef.current&&Dref.current&&bodyOf(Dref.current)!==synced.current&&!conflictRef.current){e.preventDefault();e.returnValue=''}};
    window.addEventListener('beforeunload',h);return()=>window.removeEventListener('beforeunload',h)},[]);

  useEffect(()=>{document.documentElement.setAttribute('data-theme',theme)},[theme]);
  useEffect(()=>{if(sel.ptid)setOp(v=>v[sel.ptid]?v:{...v,[sel.ptid]:true})},[sel.ptid]);
  useEffect(()=>{if(isMobile)setSb(false)},[isMobile]);

  const up=useCallback(fn=>{setD(p=>{const n=JSON.parse(JSON.stringify(p));fn(n);return n})},[]);
  // 데이터 전체 교체 (가져오기·다른 탭 내용) — 테마·선택 상태도 함께 맞춤
  const replaceD=useCallback((nd,keepSel)=>{setD(nd);setThm(nd.theme||'dark');
    setSel(s=>keepSel&&nd.platforms.some(p=>p.id===s.pid)?s:{pid:nd.platforms?.[0]?.id||null,sid:null,ptid:null,scid:null,eid:null})},[]);
  const undo=useCallback(()=>{commitHist();if(hi.current<=0){toast('되돌릴 수 없음');return}hi.current--;setD(mig(JSON.parse(hist.current[hi.current])));toast('실행 취소')},[toast,commitHist]);
  const redo=useCallback(()=>{commitHist();if(hi.current>=hist.current.length-1){toast('다시 실행할 내용 없음');return}hi.current++;setD(mig(JSON.parse(hist.current[hi.current])));toast('다시 실행')},[toast,commitHist]);

  useEffect(()=>{const h=e=>{const m=e.ctrlKey||e.metaKey;if(!m)return;const k=e.key.toLowerCase();
    // 입력 중에는 브라우저 기본 실행 취소(글자 단위)를 그대로 쓴다
    if((k==='z'||k==='y')&&isTextField(e.target))return;
    if(k==='z'&&!e.shiftKey){e.preventDefault();undo()}else if((k==='z'&&e.shiftKey)||k==='y'){e.preventDefault();redo()}
    else if(k==='f'){e.preventDefault();setMdl('find')}};document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h)},[undo,redo]);

  if(loading||!D)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--tx3)'}}>로딩 중...</div>;

  const plat=D.platforms.find(p=>p.id===sel.pid);
  const sc=D.scenarios.find(s=>s.id===sel.sid);
  const pt=sc?.parts.find(p=>p.id===sel.ptid);
  const scene=pt?.scenes.find(s=>s.id===sel.scid);
  const ending=sc?.endings.find(e=>e.id===sel.eid);
  const isR20=plat?.name.toLowerCase().includes('roll20');
  const isCoco=plat&&(plat.name.includes('코코')||plat.name.toLowerCase().includes('coco'));

  const go=s=>{setSel(s);if(isMobile)setSb(false)};
  const toggleTheme=()=>{const t=theme==='dark'?'light':'dark';setThm(t);up(d=>{d.theme=t})};

  const exportAll=()=>{download(forExport(D),'scenario-forge.json');toast('내보내기 완료')};
  const importAll=f=>{const r=new FileReader();r.onload=async()=>{let p;try{p=JSON.parse(r.result);if(!p.platforms)throw Error()}catch(e){dlg.alert('올바른 scenario-forge JSON 파일이 아닙니다.',{title:'가져오기 실패'});return}
    if(!await dlg.confirm('현재 데이터 전체를 이 파일 내용으로 덮어씁니다.'+(user?'\n(로그인 중이므로 클라우드에도 반영됩니다)':''),{title:'가져오기',okLabel:'덮어쓰기',danger:true}))return;
    replaceD(mig(p));toast('가져오기 완료')};r.readAsText(f)};
  const exportSingle=()=>{if(!sc)return;download({v:'sf1',scenario:sc},(sc.title||'scenario')+'.json');toast('내보내기 완료')};
  const mergeImp=f=>{const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result);let s=p.v==='sf1'?p.scenario:p.scenarios?.[0];if(!s)throw Error();s.id=uid();if(!D.platforms.some(x=>x.id===s.platformId))s.platformId=sel.pid||D.platforms[0]?.id;
    up(d=>{mig({scenarios:[s],platforms:d.platforms});d.scenarios.push(s)});setSel({pid:s.platformId,sid:s.id,ptid:null,scid:null,eid:null});toast('"'+s.title+'" 병합됨')}catch(e){dlg.alert('시나리오 파일을 읽을 수 없습니다.',{title:'병합 실패'})}};r.readAsText(f)};

  // 충돌 해결
  const loadOther=async()=>{if(conflict?.kind==='server'){adopt(conflict.row,user.id);setConflict(null);toast('클라우드 내용을 불러왔습니다');return}
    try{const nd=mig(await getItem('data'));replaceD(nd,true);setConflict(null);toast('다른 탭의 내용을 불러왔습니다')}catch(e){toast('불러오기 실패')}};
  const keepMine=async()=>{const srv=conflict?.kind==='server';
    if(!await dlg.confirm(srv?'클라우드에 저장된 다른 내용이 이 기기의 내용으로 바뀝니다.':'다른 탭에서 저장한 변경 내용이 사라집니다.',{title:srv?'이 기기 내용으로 클라우드 덮어쓰기':'이 탭 내용으로 덮어쓰기',okLabel:'덮어쓰기',danger:true}))return;
    if(srv){try{setSync({s:'syncing'});const body=bodyOf(D);const r=await forcePush(user.id,forExport(D));markSynced(user.id,r.updated_at,body);setConflict(null);toast('이 기기 내용으로 저장했습니다')}catch(e){fail(e);toast(friendly(e),4000)}return}
    const ok=await setItem('data',D);if(ok)announceSave();setConflict(null);toast(ok?'이 탭 내용으로 저장했습니다':'저장 실패')};

  const SY={off:['var(--tx3)','로그인하면 클라우드에 자동 저장됩니다'],pending:['var(--gold)','변경 사항 저장 대기 중'],syncing:['var(--gold)','클라우드에 저장 중…'],
    ok:['var(--green)','클라우드에 저장됨'+(sync.t?' · '+sync.t.toLocaleTimeString():'')],offline:['var(--red)','오프라인 — 연결되면 자동으로 저장합니다'],err:['var(--red)','동기화 문제: '+(sync.msg||'')]}[sync.s]||['var(--tx3)',''];
  const cloudDot=user?SY[0]:null;
  const cloudTitle=(user?`클라우드 (${user.email}) — `:'로그인 — ')+SY[1];
  const sidebarProps={D,sel,go,setSel,up,sc,plat,op,setOp,setMdl,toast,dlg,setSb,isMobile};

  return(<>
    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':sbOpen?'260px 1fr':'0 1fr',gridTemplateRows:'44px auto 1fr',height:`calc(100vh / ${zoom})`,zoom,transition:'grid-template-columns .15s'}}>
      {/* TOPBAR */}
      <div className="no-print topbar" style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:6,padding:'0 12px',background:'var(--sf1)',borderBottom:'1px solid var(--bdr)',overflowX:'auto'}}>
        {(!sbOpen||isMobile)&&<IB I={isMobile?Menu:PanelLeftOpen} onClick={()=>setSb(!sbOpen)} title="사이드바 열기"/>}
        <div style={{display:'flex',alignItems:'center',gap:6,marginRight:4,flexShrink:0}}>
          <div style={{width:22,height:22,borderRadius:5,background:'linear-gradient(135deg,var(--blue),var(--purple))',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:10,color:'#fff'}}>S.</div>
          <span className="hide-m" style={{fontFamily:'JetBrains Mono,monospace',fontWeight:600,fontSize:12,color:'var(--tx1)',letterSpacing:'-.03em'}}>scenario-forge</span>
        </div>
        <div style={{flex:1}}/>
        <button onClick={()=>setGm(!gm)} title={gm?'GM 전용 블록 표시 중 — 클릭하면 플레이어 공개용으로 숨김':'플레이어 공개 화면 — 클릭하면 GM 블록 표시'} style={{display:'flex',alignItems:'center',gap:5,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,cursor:'pointer',flexShrink:0,
          border:`1px solid ${gm?'var(--green)':'var(--bdr)'}`,color:gm?'var(--green)':'var(--tx3)',background:gm?'var(--greenA)':'transparent'}}>● {gm?'GM':'공개'}</button>
        <div role="tablist" style={{display:'flex',background:'var(--sf2)',borderRadius:8,padding:2,border:'1px solid var(--bdr)',flexShrink:0}}>
          {['edit','play','flow'].map(m=><button key={m} role="tab" aria-selected={mode===m} onClick={()=>setMode(m)} style={{padding:isMobile?'4px 8px':'4px 12px',borderRadius:6,fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,
            border:'none',cursor:'pointer',background:mode===m?'var(--sf1)':'transparent',color:mode===m?'var(--tx1)':'var(--tx3)',boxShadow:mode===m?'0 1px 3px rgba(0,0,0,.1)':'none'}}>{m}</button>)}
        </div>
        <IB I={Undo2} onClick={undo} title="실행 취소 (Ctrl+Z)"/><IB I={Redo2} onClick={redo} title="다시 실행 (Ctrl+Shift+Z)"/>
        {isMobile?<IB I={MoreHorizontal} onClick={()=>setMenu(!menu)} title="더보기" active={menu}/>:<>
        <Btn small onClick={()=>setMdl('find')} title="찾기 · 바꾸기 (Ctrl+F)"><Search size={11}/>찾기</Btn>
        <Btn small onClick={()=>setMdl('account')} title={cloudTitle} style={{position:'relative'}}>{user?<Cloud size={11}/>:<><LogIn size={11}/>로그인</>}
          {cloudDot&&<span style={{position:'absolute',top:-3,right:-3,width:7,height:7,borderRadius:'50%',background:cloudDot,border:'1px solid var(--sf1)'}}/>}</Btn>
        <Btn small onClick={exportAll} title="전체 JSON 내보내기"><FileDown size={11}/></Btn>
        <Btn small onClick={()=>document.getElementById('imp')?.click()} title="JSON 가져오기 (전체 덮어쓰기)"><FileUp size={11}/></Btn>
        <div style={{display:'flex',background:'var(--sf2)',borderRadius:6,padding:2,border:'1px solid var(--bdr)'}}>
          {[{z:.9,f:10},{z:1,f:12},{z:1.15,f:15}].map(({z,f})=><button key={z} onClick={()=>setZoom(z)} title={'글자 크기 '+Math.round(z*100)+'%'}
            style={{width:22,height:22,borderRadius:4,border:'none',background:zoom===z?'var(--tx1)':'transparent',color:zoom===z?'var(--bg)':'var(--tx3)',fontWeight:700,fontSize:f,cursor:'pointer'}}>가</button>)}
        </div></>}
        <input type="file" id="imp" accept=".json" hidden onChange={e=>{if(e.target.files[0])importAll(e.target.files[0]);e.target.value=''}}/>
        {!isMobile&&<IB I={theme==='dark'?Sun:Moon} onClick={toggleTheme} title="테마 전환"/>}
      </div>

      {/* 모바일 더보기 메뉴 */}
      {isMobile&&menu&&<><div className="no-print" onClick={()=>setMenu(false)} style={{position:'fixed',inset:0,zIndex:60}}/>
        <div className="no-print" role="menu" style={{position:'fixed',top:48,right:8,zIndex:61,background:'var(--sf1)',border:'1px solid var(--bdr)',borderRadius:10,boxShadow:'0 8px 30px rgba(0,0,0,.35)',padding:6,minWidth:200,display:'flex',flexDirection:'column',gap:2}}>
          {[[Search,'찾기 · 바꾸기',()=>setMdl('find')],[user?Cloud:LogIn,user?'클라우드 · '+SY[1]:'로그인 (클라우드 저장)',()=>setMdl('account')],[FileDown,'전체 JSON 내보내기',exportAll],[FileUp,'JSON 가져오기',()=>document.getElementById('imp')?.click()],[theme==='dark'?Sun:Moon,theme==='dark'?'라이트 테마':'다크 테마',toggleTheme]].map(([I,l,fn])=>
            <button key={l} role="menuitem" onClick={()=>{setMenu(false);fn()}} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 10px',borderRadius:6,fontSize:13,color:'var(--tx1)',textAlign:'left'}}><I size={14}/>{l}</button>)}
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',borderTop:'1px solid var(--bdr)',marginTop:2,fontSize:12,color:'var(--tx3)'}}>글자 크기
            {[.9,1,1.15].map(z=><button key={z} onClick={()=>setZoom(z)} style={{padding:'3px 8px',borderRadius:4,border:'1px solid var(--bdr)',background:zoom===z?'var(--tx1)':'transparent',color:zoom===z?'var(--bg)':'var(--tx2)',fontSize:11}}>{Math.round(z*100)}%</button>)}</div>
        </div></>}
      {/* 다른 탭 충돌 배너 */}
      <div className="no-print" style={{gridColumn:'1/-1'}}>
        {conflict&&<div role="alert" style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',padding:'8px 14px',background:'var(--goldA)',borderBottom:'1px solid var(--gold)',color:'var(--tx1)',fontSize:12}}>
          <AlertTriangle size={14} style={{color:'var(--gold)',flexShrink:0}}/>
          {conflict.kind==='server'
            ?<span style={{flex:1,minWidth:200}}>클라우드에 이 기기와 <b>다른 내용</b>이 있습니다 (클라우드 저장 시각 {new Date(conflict.row.updated_at).toLocaleString()}). 어느 쪽을 쓸지 선택할 때까지 <b>클라우드 저장을 멈췄습니다.</b> 이 기기에는 계속 저장됩니다.</span>
            :<span style={{flex:1,minWidth:200}}>다른 탭에서 데이터가 변경되었습니다. 덮어쓰기를 막기 위해 <b>이 탭의 자동 저장을 멈췄습니다.</b></span>}
          {conflict.kind==='server'&&<Btn small onClick={exportAll} title="이 기기 내용을 JSON 파일로 백업">이 기기 내용 백업</Btn>}
          <Btn small primary onClick={loadOther}>{conflict.kind==='server'?'클라우드 내용 불러오기':'다른 탭 내용 불러오기'}</Btn>
          <Btn small danger onClick={keepMine}>{conflict.kind==='server'?'이 기기 내용으로 덮어쓰기':'이 탭 내용으로 덮어쓰기'}</Btn>
        </div>}
      </div>

      {/* SIDEBAR */}
      {isMobile&&sbOpen&&<div className="no-print" onClick={()=>setSb(false)} style={{position:'fixed',inset:0,top:44,background:'rgba(0,0,0,.45)',zIndex:40}}/>}
      <div className="no-print" style={isMobile
        ?{position:'fixed',top:44,left:0,bottom:0,width:'min(300px,86vw)',zIndex:41,background:'var(--sf1)',borderRight:'1px solid var(--bdr)',overflowY:'auto',overflowX:'hidden',display:sbOpen?'flex':'none',flexDirection:'column',fontSize:12,boxShadow:'4px 0 24px rgba(0,0,0,.3)'}
        :{background:'var(--sf1)',borderRight:'1px solid var(--bdr)',overflowY:'auto',overflowX:'hidden',display:'flex',flexDirection:'column',visibility:sbOpen?'visible':'hidden',position:'relative',fontSize:12,minHeight:0}}>
        {sbOpen&&!isMobile&&<IB I={PanelLeftClose} onClick={()=>setSb(false)} title="사이드바 닫기" style={{position:'absolute',top:6,right:6,zIndex:5}}/>}
        <Sidebar {...sidebarProps}/>
      </div>

      {/* MAIN */}
      <div className="main" style={{overflowY:'auto',padding:'22px 30px 80px',background:'var(--bg2)',minHeight:0,minWidth:0}}>
        {mode==='flow'&&sc?<FlowV sc={sc} sel={sel} setSel={go} setMode={setMode}/>
        :ending?<EndingP ending={ending} sc={sc} plat={plat} mode={mode} gm={gm} up={up} sel={sel} toast={toast} setMdl={setMdl} go={go}/>
        :scene?<SceneP scene={scene} pt={pt} sc={sc} plat={plat} mode={mode} gm={gm} up={up} sel={sel} toast={toast} isR20={isR20} isCoco={isCoco} r20On={r20On} setR20On={setR20On} go={go}/>
        :sc?<OverviewP sc={sc} plat={plat} up={up} sel={sel} toast={toast} exportSingle={exportSingle} mergeImp={mergeImp} setMdl={setMdl} go={go}/>
        :<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,color:'var(--tx3)',textAlign:'center'}}>
          <BookOpen size={32} strokeWidth={1.5} style={{opacity:.5}}/><h3 style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,color:'var(--tx2)'}}>{D.scenarios.some(s=>s.platformId===sel.pid)?'시나리오를 선택하세요':'새 시나리오를 만들어 보세요'}</h3>
          {isMobile&&!sbOpen&&<Btn onClick={()=>setSb(true)}><Menu size={12}/>목록 열기</Btn>}</div>}
      </div>
    </div>
    {/* MODALS */}
    {(modal==='account'||modal==='account-recovery')&&<AccountM user={user} sync={sync} SY={SY} recovery={modal==='account-recovery'} syncNow={()=>{setConflict(c=>c?.kind==='server'?c:null);syncNow()}} toast={toast} onClose={()=>setMdl(null)}/>}
    {modal==='find'&&<FindM D={D} up={up} setSel={go} setMode={setMode} onClose={()=>setMdl(null)} toast={toast}/>}
    {(modal==='platform'||modal?.type==='platform')&&<PlatM D={D} up={up} setSel={setSel} sel={sel} editId={modal?.id} onClose={()=>setMdl(null)} toast={toast}/>}
    {modal==='cmd'&&<CmdM plat={plat} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {modal==='lib'&&<LibM sc={sc} up={up} sel={sel} scene={scene} onClose={()=>setMdl(null)} toast={toast}/>}
    {modal==='endingTypes'&&<ETM sc={sc} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {modal?.type==='clueEdit'&&<ClueEditM sc={sc} clueId={modal.clueId} up={up} sel={sel} onClose={()=>setMdl(null)} go={go}/>}
    {Toast}
  </>);
}

// ===== SIDEBAR =====
const rowSt=(on)=>({display:'flex',alignItems:'center',gap:5,padding:'4px 8px',borderRadius:6,cursor:'pointer',background:on?'var(--blueA)':undefined,color:on?'var(--blue)':'var(--tx2)',fontWeight:on?600:500});
const ell={flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'};
const Sec=({children})=><div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>{children}</div>;

// 드래그 정렬용 속성 생성: kind가 같은 대상 위로만 드롭 허용
function useDrop(){const[over,setOver]=useState(null);
  const src=(payload)=>({draggable:true,onDragStart:e=>{DRAG=payload;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','');e.currentTarget.classList.add('dragging')},
    onDragEnd:e=>{DRAG=null;setOver(null);e.currentTarget.classList.remove('dragging')}});
  const dst=(key,accept,onDrop)=>({onDragOver:e=>{if(DRAG&&accept(DRAG)){e.preventDefault();e.dataTransfer.dropEffect='move';if(over!==key)setOver(key)}},
    onDragLeave:e=>{if(!e.currentTarget.contains(e.relatedTarget)&&over===key)setOver(null)},
    onDrop:e=>{if(DRAG&&accept(DRAG)){e.preventDefault();onDrop(DRAG);DRAG=null;setOver(null)}}});
  return{over,src,dst}}

function Sidebar({D,sel,go,setSel,up,sc,plat,op,setOp,setMdl,toast,dlg,isMobile}){
  const scs=D.scenarios.filter(s=>s.platformId===sel.pid);
  const uSc=fn=>up(d=>{fn(d.scenarios.find(x=>x.id===sel.sid))});
  const{over,src,dst}=useDrop();
  const newScenario=async()=>{if(!sel.pid){toast('사이트를 먼저 선택하세요');return}const n=await dlg.prompt('새 시나리오','',{placeholder:'시나리오 이름'});if(!n)return;const nid=uid();
    up(d=>{d.scenarios.push({id:nid,title:n,platformId:sel.pid,setting:'',synopsis:'',parts:[],endings:[],clues:[],eventTimeline:[],sessionHistory:[],endingTypes:DEF_ET.map(e=>({...e})),library:{npcs:[],items:[],places:[]}})});
    go({pid:sel.pid,sid:nid,ptid:null,scid:null,eid:null})};
  const newEnding=async()=>{const n=await dlg.prompt('새 엔딩','',{placeholder:'엔딩 이름'});if(!n)return;const nid=uid();
    uSc(s=>{s.endings.push({id:nid,title:n,endingType:s.endingTypes[0]?.id||'normal',condition:'',blocks:[{id:uid(),type:'text',label:'엔딩 나레이션',content:''}]})});
    go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:nid})};
  const newClue=async()=>{const n=await dlg.prompt('새 단서','',{placeholder:'단서 이름'});if(!n)return;const id=uid();
    uSc(s=>{s.clues.push({id,name:n,description:'',foundInSceneId:'',leadsToSceneId:'',isRedHerring:false,leadsTo:''})});setMdl({type:'clueEdit',clueId:id})};
  const newPart=async()=>{const n=await dlg.prompt('새 파트','',{placeholder:'파트 이름 (예: 1장 — 도착)'});if(!n)return;const nid=uid();
    uSc(s=>{s.parts.push({id:nid,title:n,scenes:[]})});setOp(v=>({...v,[nid]:true}))};
  const newScene=async(p)=>{const n=await dlg.prompt('새 씬','',{placeholder:'씬 이름',message:`파트: ${p.title}`});if(!n)return;const nid=uid();
    uSc(s=>{s.parts.find(x=>x.id===p.id).scenes.push({id:nid,title:n,location:'',timeOfDay:'',npcsPresent:'',done:false,blocks:[{id:uid(),type:'text',label:'나레이션',content:''}],sessionLog:[],connections:[]})});
    setOp(v=>({...v,[p.id]:true}));go({pid:sel.pid,sid:sel.sid,ptid:p.id,scid:nid,eid:null})};
  // 씬 이동: 대상 파트의 beforeId 앞(없으면 끝)으로
  const moveScene=(from,toPt,beforeId)=>{if(from.id===beforeId)return;uSc(s=>{const fp=s.parts.find(x=>x.id===from.ptid);const i=fp.scenes.findIndex(x=>x.id===from.id);const[x]=fp.scenes.splice(i,1);
    const tp=s.parts.find(p=>p.id===toPt);const j=beforeId?tp.scenes.findIndex(y=>y.id===beforeId):-1;tp.scenes.splice(j<0?tp.scenes.length:j,0,x)});
    if(sel.scid===from.id)setSel(v=>({...v,ptid:toPt}));setOp(v=>({...v,[toPt]:true}))};
  const movePart=(fromId,beforeId)=>{if(fromId===beforeId)return;uSc(s=>{const i=s.parts.findIndex(p=>p.id===fromId);const j=s.parts.findIndex(p=>p.id===beforeId);moveIdx(s.parts,i,j)})};

  return<>
    {/* Platforms */}
    <Sec>
      <SecTitle>Platforms</SecTitle>
      {D.platforms.map(p=><div key={p.id} className={'row'+(sel.pid===p.id?' sel':'')} onClick={()=>go({pid:p.id,sid:null,ptid:null,scid:null,eid:null})} style={rowSt(sel.pid===p.id)}>
        <span style={{width:7,height:7,borderRadius:'50%',background:p.color,flexShrink:0}}/><span style={ell}>{p.name}</span>
        <span style={{fontSize:10,color:'var(--tx3)',fontWeight:500}}>{D.scenarios.filter(s=>s.platformId===p.id).length}</span>
        <span className="acts" onClick={e=>e.stopPropagation()}><IB I={Pencil} s={12} title="사이트 편집" onClick={()=>setMdl({type:'platform',id:p.id})}/></span></div>)}
      <Btn small onClick={()=>setMdl('platform')} style={{width:'100%',marginTop:4,justifyContent:'center',borderStyle:'dashed'}}><Plus size={10}/>사이트</Btn>
    </Sec>
    {/* Scenarios */}
    <Sec>
      <SecTitle right={<IB I={Plus} s={13} title="새 시나리오" onClick={newScenario}/>}>Scenarios</SecTitle>
      {!scs.length&&<button onClick={newScenario} style={{width:'100%',color:'var(--tx3)',fontSize:11,textAlign:'center',padding:8,border:'1px dashed var(--bdr)',borderRadius:6}}>+ 첫 시나리오 만들기</button>}
      {scs.map(s=><div key={s.id} className={'row'+(sel.sid===s.id?' sel':'')} onClick={()=>go({pid:sel.pid,sid:s.id,ptid:null,scid:null,eid:null})} style={rowSt(sel.sid===s.id)}>
        <span style={ell}>{s.title}</span>
        <span className="acts" onClick={e=>e.stopPropagation()}><IB I={Trash2} s={12} danger title="시나리오 삭제" onClick={async()=>{if(!await dlg.confirm(`"${s.title}" 시나리오와 그 안의 모든 씬·엔딩·단서가 삭제됩니다.`,{title:'시나리오 삭제',okLabel:'삭제',danger:true}))return;
          up(d=>{d.scenarios=d.scenarios.filter(x=>x.id!==s.id)});if(sel.sid===s.id)setSel(v=>({...v,sid:null,ptid:null,scid:null,eid:null}))}}/></span></div>)}
    </Sec>
    {sc&&<>
    {/* Scene Tree */}
    <Sec>
      <SecTitle right={<IB I={Settings} s={13} onClick={()=>setMdl('cmd')} title="명령어 라이브러리"/>}>Scenes</SecTitle>
      {sc.parts.map(p=>{const isO=op[p.id];const dc=p.scenes.filter(s=>s.done).length;const pk='p'+p.id;
        return<div key={p.id} style={{marginBottom:2}}>
          <div className={'row'+(over===pk?(DRAG?.kind==='part'?' drag-over-top':' drag-over-in'):'')} {...src({kind:'part',id:p.id})}
            {...dst(pk,d=>d.kind==='part'||d.kind==='scene',d=>d.kind==='part'?movePart(d.id,p.id):moveScene(d,p.id,null))}
            onClick={()=>setOp(v=>({...v,[p.id]:!v[p.id]}))}
            style={{display:'flex',alignItems:'center',gap:4,padding:'4px 6px',borderRadius:6,cursor:'pointer',fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,color:'var(--tx2)'}}>
            <span style={{fontSize:10,color:'var(--tx3)',width:12,textAlign:'center',transition:'transform .1s',transform:isO?'rotate(90deg)':'none'}}>▶</span>
            <span style={ell}>{p.title}</span>
            <span style={{fontSize:10,color:'var(--tx3)'}}>{dc}/{p.scenes.length}</span>
            <span className="acts" onClick={e=>e.stopPropagation()} style={{display:'flex',gap:1}}>
              <IB I={Pencil} s={11} title="파트 이름 변경" onClick={async()=>{const n=await dlg.prompt('파트 이름 변경',p.title);if(n)uSc(s=>{s.parts.find(x=>x.id===p.id).title=n})}}/>
              <IB I={Trash2} s={11} danger title="파트 삭제" onClick={async()=>{if(!await dlg.confirm(`"${p.title}" 파트와 씬 ${p.scenes.length}개가 삭제됩니다.`,{title:'파트 삭제',okLabel:'삭제',danger:true}))return;
                uSc(s=>{s.parts=s.parts.filter(x=>x.id!==p.id);dropConns(s,new Set(p.scenes.map(x=>x.id)))});if(sel.ptid===p.id)setSel(v=>({...v,ptid:null,scid:null}))}}/>
            </span>
          </div>
          {isO&&<div style={{paddingLeft:14,marginLeft:8,borderLeft:'1px solid var(--bdr)'}}>
            {p.scenes.map(s=>{const k='s'+s.id;const on=sel.scid===s.id;return<div key={s.id} className={'row'+(on?' sel':'')+(over===k?' drag-over-top':'')} {...src({kind:'scene',id:s.id,ptid:p.id})}
              {...dst(k,d=>d.kind==='scene',d=>moveScene(d,p.id,s.id))}
              onClick={()=>go({pid:sel.pid,sid:sel.sid,ptid:p.id,scid:s.id,eid:null})}
              style={{display:'flex',alignItems:'center',gap:5,padding:'3px 6px',borderRadius:5,cursor:'pointer',fontFamily:'JetBrains Mono,monospace',fontSize:11,
                boxShadow:over===k?'0 -2px 0 0 var(--blue)':undefined,borderLeft:`2px solid ${s.done?'var(--green)':'transparent'}`,
                background:on?'var(--blueA)':undefined,color:on?'var(--blue)':s.done?'var(--tx3)':'var(--tx2)',textDecoration:s.done?'line-through':'none'}}>
              <input type="checkbox" checked={s.done||false} title="진행 완료" onChange={e=>{const v=e.target.checked;uSc(x=>{x.parts.find(y=>y.id===p.id).scenes.find(y=>y.id===s.id).done=v})}}
                onClick={e=>e.stopPropagation()} style={{accentColor:'var(--green)',margin:0,cursor:'pointer',width:12,height:12,flexShrink:0}}/>
              <span style={ell}>{s.title}</span>
              <span className="acts" onClick={e=>e.stopPropagation()} style={{display:'flex',gap:1}}>
                <IB I={CopyPlus} s={11} title="씬 복제" onClick={()=>{uSc(x=>{const pt2=x.parts.find(y=>y.id===p.id);const cp=JSON.parse(JSON.stringify(s));cp.id=uid();cp.title+=' (복사)';cp.done=false;for(const b of cp.blocks)b.id=uid();const i=pt2.scenes.findIndex(y=>y.id===s.id);pt2.scenes.splice(i+1,0,cp)});toast('복제됨')}}/>
                <IB I={Trash2} s={11} danger title="씬 삭제" onClick={async()=>{if(!await dlg.confirm(`"${s.title}" 씬을 삭제합니다.`,{title:'씬 삭제',okLabel:'삭제',danger:true}))return;
                  uSc(x=>{const p2=x.parts.find(y=>y.id===p.id);p2.scenes=p2.scenes.filter(y=>y.id!==s.id);dropConns(x,new Set([s.id]))});if(sel.scid===s.id)setSel(v=>({...v,scid:null}))}}/>
              </span></div>})}
            <Btn small onClick={()=>newScene(p)} style={{width:'100%',justifyContent:'center',marginTop:2,borderStyle:'dashed'}}><Plus size={10}/>씬</Btn>
          </div>}
        </div>})}
      <Btn small onClick={newPart} style={{width:'100%',justifyContent:'center',marginTop:4,borderStyle:'dashed'}}><FolderPlus size={11}/>파트</Btn>
      {sc.parts.some(p=>p.scenes.length>1)&&!isMobile&&<div style={{fontSize:10,color:'var(--tx3)',marginTop:6,textAlign:'center'}}>씬·파트는 끌어서 순서를 바꿀 수 있습니다</div>}
    </Sec>
    {/* Endings */}
    <Sec>
      <SecTitle right={<IB I={Plus} s={13} title="새 엔딩" onClick={newEnding}/>}>Endings</SecTitle>
      {!sc.endings.length&&<div style={{color:'var(--tx3)',fontSize:11,padding:'2px 8px'}}>없음</div>}
      {sc.endings.map(e=>{const et=sc.endingTypes.find(t=>t.id===e.endingType)||{l:'?',c:'#8b949e'};const on=sel.eid===e.id;
        return<div key={e.id} className={'row'+(on?' sel':'')} onClick={()=>go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:e.id})} style={{...rowSt(on),fontSize:12,padding:'3px 8px'}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:et.c,flexShrink:0}}/>
          <span style={ell}>{e.title||'(제목 없음)'}</span>
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,color:et.c,flexShrink:0}}>{et.l}</span>
          <span className="acts" onClick={ev=>ev.stopPropagation()}><IB I={Trash2} s={11} danger title="엔딩 삭제" onClick={async()=>{if(!await dlg.confirm(`"${e.title}" 엔딩을 삭제합니다.`,{title:'엔딩 삭제',okLabel:'삭제',danger:true}))return;
            uSc(s=>{s.endings=s.endings.filter(x=>x.id!==e.id);dropConns(s,new Set([e.id]))});if(sel.eid===e.id)setSel(v=>({...v,eid:null}))}}/></span>
        </div>})}
    </Sec>
    {/* Clues */}
    <Sec>
      <SecTitle right={<IB I={Plus} s={13} title="새 단서" onClick={newClue}/>}>Clues</SecTitle>
      {(()=>{const use=clueUsage(sc);return sc.clues.map(c=><div key={c.id} className="row" onClick={()=>setMdl({type:'clueEdit',clueId:c.id})} style={{...rowSt(false),fontSize:12,padding:'3px 8px',color:'var(--tx2)'}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:c.isRedHerring?'var(--red)':'var(--teal)',flexShrink:0}}/>
        <span style={ell}>{c.name}</span>
        {!use[c.id]&&<span title="어느 씬에도 배치되지 않음"><AlertTriangle size={11} style={{color:'var(--gold)'}}/></span>}
        {c.isRedHerring&&<span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,color:'var(--red)',background:'var(--redA)',padding:'0 5px',borderRadius:8}}>미끼</span>}
        <span className="acts" onClick={e=>e.stopPropagation()}><IB I={Trash2} s={11} danger title="단서 삭제" onClick={async()=>{if(!await dlg.confirm(`단서 "${c.name}"을(를) 삭제합니다.`,{title:'단서 삭제',okLabel:'삭제',danger:true}))return;uSc(s=>{s.clues=s.clues.filter(x=>x.id!==c.id)})}}/></span>
      </div>)})()}
      {!sc.clues.length&&<div style={{color:'var(--tx3)',fontSize:11,padding:'2px 8px'}}>없음</div>}
    </Sec>
    {/* Sessions */}
    <Sec>
      <SecTitle right={<IB I={Plus} s={13} title="세션 기록 추가" onClick={()=>{uSc(s=>{s.sessionHistory.push({id:uid(),date:new Date().toISOString().slice(0,10),summary:''})})}}/>}>Sessions</SecTitle>
      {(sc.sessionHistory||[]).map(s=><div key={s.id} className="row" onClick={async()=>{const v=await dlg.prompt(`세션 요약 — ${s.date}`,s.summary);if(v!==null)uSc(x=>{x.sessionHistory.find(y=>y.id===s.id).summary=v})}}
        style={{display:'flex',alignItems:'center',gap:5,padding:'3px 8px',fontSize:11,color:'var(--tx2)',borderRadius:4,cursor:'pointer'}}>
        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx3)',flexShrink:0}}>{s.date}</span>
        <span style={ell}>{s.summary||'(클릭하여 입력)'}</span>
        <span className="acts" onClick={e=>e.stopPropagation()}><IB I={Trash2} s={11} danger title="세션 기록 삭제" onClick={async()=>{if(!await dlg.confirm(`${s.date} 세션 기록을 삭제합니다.`,{title:'세션 기록 삭제',okLabel:'삭제',danger:true}))return;uSc(x=>{x.sessionHistory=x.sessionHistory.filter(y=>y.id!==s.id)})}}/></span></div>)}
      {!sc.sessionHistory?.length&&<div style={{color:'var(--tx3)',fontSize:11,padding:'2px 8px'}}>없음</div>}
    </Sec>
    <Sec><Btn small onClick={()=>setMdl('lib')} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}>NPC · 아이템 · 장소</Btn></Sec>
    </>}
    {!sc&&<div style={{color:'var(--tx3)',fontSize:11,textAlign:'center',padding:16}}>시나리오를 선택하면 씬·엔딩·단서가 표시됩니다</div>}
  </>;
}

// ===== SCENE PANEL =====
function SceneP({scene,pt,sc,plat,mode,gm,up,sel,toast,isR20,isCoco,r20On,setR20On,go}){
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

  const goT=t=>t.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:t.ptid,scid:t.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:t.id});
  if(mode==='play'){const flat=allScenes(sc);const i=flat.findIndex(x=>x.id===scene.id);
    const asT=x=>x&&{kind:'scene',ptid:x.ptid,id:x.id,title:x.title};
    return<PlayV entry={scene} sc={sc} pt={pt} plat={plat} gm={gm} isSc nav={{prev:asT(flat[i-1]),next:asT(flat[i+1]),
      targets:(scene.connections||[]).map(c=>findTarget(sc,c.targetSceneId)).filter(Boolean),go:goT,done:!!scene.done,toggleDone:()=>uS(x=>{x.done=!x.done})}}/>}
  const cmds=plat?.commands||[];
  return<div>
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx3)',marginBottom:4}}>{plat?.name||''} / {sc.title} / {pt.title}</div>
    <input className="ghost" aria-label="씬 제목" value={scene.title} onChange={e=>uS(s=>{s.title=e.target.value})} style={{fontFamily:'Instrument Serif,serif',fontSize:26,fontWeight:400,color:'var(--tx1)',border:'none',background:'transparent',padding:'0 4px',marginLeft:-4,width:'100%',outline:'none',marginBottom:2}}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:16,padding:'8px 0',marginBottom:14,borderBottom:'1px solid var(--bdr)'}}>
      {[['Location','장소','location'],['Time','시간대','timeOfDay'],['NPCs','등장인물','npcsPresent']].map(([k,ph,f])=>
        <div key={f} style={{display:'flex',flexDirection:'column',gap:1}}>
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',letterSpacing:'.04em',textTransform:'uppercase'}}>{k}</span>
          <input className="ghost" value={scene[f]||''} onChange={e=>uS(s=>{s[f]=e.target.value})} placeholder={ph}
            style={{border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontSize:12,color:'var(--tx2)',padding:'2px 4px',outline:'none',minWidth:100}}/>
        </div>)}
    </div>
    <div style={{marginBottom:12}}>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',textTransform:'uppercase',marginRight:6}}>Connections</span>
      {(scene.connections||[]).map((c,i)=>{const t=findTarget(sc,c.targetSceneId);const col=t?.kind==='ending'?'var(--coral)':'var(--blue)';
        return<span key={i} style={{display:'inline-flex',alignItems:'center',gap:3,background:t?.kind==='ending'?'var(--coralA)':'var(--blueA)',color:col,padding:'1px 4px 1px 8px',borderRadius:12,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,marginRight:4,marginBottom:3}}>
          <button onClick={()=>t&&goT(t)} title="이동" style={{color:'inherit',fontWeight:600,fontSize:10}}>→ {t?.kind==='ending'?'🏁 ':''}{t?.title||'?'}</button>
          <button onClick={()=>uS(s=>{s.connections.splice(i,1)})} title="연결 삭제" aria-label="연결 삭제" style={{color:'inherit',cursor:'pointer',fontSize:10,padding:'0 3px'}}>✕</button></span>})}
      <select value="" onChange={e=>{const id=e.target.value;if(id)uS(s=>{s.connections.push({targetSceneId:id})})}}
        style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--blue)',background:'var(--blueA)',border:'1px dashed var(--blue)',borderRadius:12,padding:'1px 7px',cursor:'pointer',outline:'none'}}>
        <option value="">+ 연결</option>
        {sc.parts.map(p=><optgroup key={p.id} label={p.title}>{p.scenes.filter(s=>s.id!==scene.id&&!(scene.connections||[]).some(c=>c.targetSceneId===s.id)).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>)}
        {sc.endings.length>0&&<optgroup label="엔딩">{sc.endings.filter(e=>!(scene.connections||[]).some(c=>c.targetSceneId===e.id)).map(e=><option key={e.id} value={e.id}>🏁 {e.title}</option>)}</optgroup>}
      </select>
    </div>
    {/* R20/Coco preview with toggle */}
    {isR20&&<div style={{marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:r20On?8:0}}>
        <button onClick={()=>setR20On(!r20On)} style={{display:'flex',alignItems:'center',gap:5,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,cursor:'pointer',
          border:`1px solid ${r20On?'var(--red)':'var(--bdr)'}`,color:r20On?'var(--red)':'var(--tx4)',background:r20On?'var(--redA)':'transparent'}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:r20On?'var(--red)':'var(--tx4)'}}/>Roll20 미리보기 {r20On?'ON':'OFF'}
        </button>
      </div>
      {r20On&&<R20P scene={scene}/>}
    </div>}
    {isCoco&&<CocoP scene={scene}/>}
    {/* Floating command bar */}
    {cmds.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:3,padding:'6px 8px',marginBottom:12,border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)'}}>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx3)',display:'flex',alignItems:'center',marginRight:4}}>⌘</span>
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
function EndingP({ending,sc,plat,mode,gm,up,sel,toast,setMdl,go}){
  const uE=fn=>up(d=>{const e=d.scenarios.find(x=>x.id===sel.sid).endings.find(x=>x.id===sel.eid);fn(e)});
  if(mode==='play')return<PlayV entry={ending} sc={sc} plat={plat} gm={gm}/>;
  return<div>
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx3)',marginBottom:4}}>{plat?.name||''} / {sc.title} / endings/</div>
    <input className="ghost" aria-label="엔딩 제목" value={ending.title} onChange={e=>uE(en=>{en.title=e.target.value})} style={{fontFamily:'Instrument Serif,serif',fontSize:26,fontWeight:400,color:'var(--tx1)',border:'none',background:'transparent',padding:'0 4px',marginLeft:-4,width:'100%',outline:'none'}}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:4,margin:'8px 0 14px'}}>
      {sc.endingTypes.map(t=><button key={t.id} onClick={()=>uE(en=>{en.endingType=t.id})}
        style={{padding:'4px 11px',borderRadius:20,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono,monospace',cursor:'pointer',
          border:`1px solid ${ending.endingType===t.id?t.c:'var(--bdr)'}`,background:ending.endingType===t.id?t.c:'transparent',color:ending.endingType===t.id?'#fff':'var(--tx3)'}}>{t.l}</button>)}
      <button onClick={()=>setMdl('endingTypes')} title="엔딩 타입 관리" style={{padding:'4px 8px',borderRadius:20,fontSize:10,border:'1px dashed var(--tx4)',color:'var(--tx3)',cursor:'pointer'}}>✎</button>
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
// BGM: 유튜브 링크는 바로 재생 가능한 플레이어로, 음악 파일은 오디오 플레이어로
const ytId=u=>u?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/)?.[1]||null;
const isAudio=u=>/\.(mp3|ogg|wav|m4a|flac|aac)(\?.*)?$/i.test(u||'');
// 씬 전체 복사용 텍스트: 화면에 보이는(GM 토글 반영) 글 블록만 모음
function sceneText(entry,gm,isR20){const out=[entry.title,''];
  for(const b of entry.blocks||[]){const gmOnly=['memo','truth','clue','session-log'].includes(b.type);if(gmOnly&&!gm)continue;
    if(['text','memo','truth','session-log'].includes(b.type)&&b.content?.trim())out.push(`[${b.label}]`,b.content,'');
    if(b.type==='lines'&&b.items?.length){out.push(`[${b.label}]`);for(const it of b.items)if(it.text)for(const l of it.text.split('\n'))if(l.trim())out.push(isR20&&it.label?`/as "${it.label}" ${l}`:(it.label?it.label+': ':'')+l);out.push('')}
    if(b.type==='handout'&&b.content?.trim())out.push(`[${b.title||b.label}]`,b.content,'')}
  return out.join('\n').trim()}
function PlayV({entry,sc,pt,plat,gm,isSc,nav}){
  const isR20=plat?.name.toLowerCase().includes('roll20');
  const asLine=name=>l=>isR20&&name?`/as "${name}" ${l}`:l;
  const renderB=(b)=>{const m=BT[b.type]||BT.text;const isGm=['memo','truth','clue','session-log'].includes(b.type);
    if(isGm&&!gm)return null;
    const wrap=(color,children,copy,copyLabel='전체 복사')=><div key={b.id} style={{marginBottom:16,paddingLeft:12,borderLeft:`2px solid ${color}`,position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:`2px solid ${color}`,background:'var(--bg2)'}}/>
      <div style={{display:'flex',alignItems:'center',gap:4,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4,minHeight:20}}>
        <span style={{flex:1}}>// {b.label||m.l}{isGm&&<span style={{marginLeft:6,color:'var(--gold)'}}>GM</span>}</span>{copy&&<CopyBtn text={copy} label={copyLabel} title="블록 전체 복사"/>}</div>{children}</div>;
    const card={border:'1px solid var(--bdr)',borderRadius:8,background:'var(--sf1)',padding:12};
    const itemHead=(icon,title,copy)=><div style={{display:'flex',alignItems:'center',gap:6,fontWeight:700,fontSize:12,marginBottom:4,color:'var(--tx1)'}}>
      {icon}<span style={{flex:1,minWidth:0}}>{title||<span style={{color:'var(--tx3)',fontWeight:400}}>(제목 없음)</span>}</span>{copy&&<CopyBtn text={copy} label="전체" title="전체 복사"/>}</div>;
    const gmNote=v=>gm&&v?<div style={{marginTop:8,border:'1px solid rgba(210,153,34,.15)',background:'var(--goldA)',borderRadius:6,padding:'8px 10px',fontSize:12,whiteSpace:'pre-wrap'}}>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,color:'var(--gold)',border:'1px solid var(--gold)',borderRadius:99,padding:'0 5px',marginRight:6}}>GM</span>{v}</div>:null;
    if(['text','memo','truth','session-log'].includes(b.type)){const bg={memo:'var(--goldA)',truth:'var(--coralA)','session-log':'var(--purpleA)'}[b.type]||'var(--sf1)';
      return wrap(m.c,b.content?<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:bg,padding:'10px 14px',fontSize:13,lineHeight:1.7}}><Lines text={b.content} render={mdR}/></div>
        :<div style={{color:'var(--tx3)',fontSize:12}}>(비어 있음)</div>,b.content||null)}
    if(b.type==='clue'){const cl=sc?.clues.find(c=>c.id===b.clueId);return wrap('var(--teal)',<div>
      {cl&&<span style={{display:'inline-flex',alignItems:'center',gap:3,background:'var(--tealA)',color:'var(--teal)',padding:'2px 8px',borderRadius:12,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,marginBottom:6}}>🔗 {cl.name}{cl.isRedHerring&&' (미끼)'}</span>}
      {b.content&&<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--tealA)',padding:'10px 14px',fontSize:13,lineHeight:1.7}}><Lines text={b.content}/></div>}
    </div>,b.content||null)}
    if(b.type==='npc')return wrap('var(--purple)',<div style={card}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
        {b.imageUrl&&<img src={b.imageUrl} alt="" style={{width:44,height:44,borderRadius:'50%',objectFit:'cover',border:'1px solid var(--bdr)'}} onError={e=>{e.target.style.display='none'}}/>}
        <div style={{flex:1,minWidth:0}}><div style={{fontFamily:'Instrument Serif,serif',fontSize:17,color:'var(--tx1)'}}>{b.name||'?'}</div>{b.role&&<div style={{fontSize:11,color:'var(--tx3)'}}>{b.role}</div>}</div>
        {b.name&&<CopyBtn text={b.name} label="이름" title="이름 복사"/>}
      </div>
      {b.traits&&<ul style={{paddingLeft:16,fontSize:12,lineHeight:1.7,margin:0}}>{b.traits.split('\n').filter(l=>l.trim()).map((t,i)=><li key={i}>{t}</li>)}</ul>}
      {b.lines?.trim()&&<div style={{marginTop:6,borderTop:'1px dashed var(--bdr)',paddingTop:6,fontSize:13,fontStyle:'italic'}}><Lines text={b.lines} wrap={asLine(b.name)}/></div>}
    </div>);
    if(b.type==='item'||b.type==='place')return wrap(m.c,<div style={card}>
      <div style={{display:'flex',gap:10}}>
        {b.imageUrl&&<img src={b.imageUrl} alt="" style={{width:64,height:64,borderRadius:6,objectFit:'cover',border:'1px solid var(--bdr)',flexShrink:0}} onError={e=>{e.target.style.display='none'}}/>}
        <div style={{flex:1,minWidth:0}}><div style={{fontFamily:'Instrument Serif,serif',fontSize:17,color:'var(--tx1)'}}>{b.name||'?'}</div>
          {b.description&&<div style={{fontSize:13,lineHeight:1.7}}><Lines text={b.description}/></div>}</div></div>
      {gmNote(b.gmNote)}</div>,b.description||null);
    if(b.type==='bgm'){const yt=ytId(b.url);return wrap(m.c,<div style={card}>
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <Music size={14} style={{color:'var(--coral)'}}/><span style={{fontWeight:600,color:'var(--tx1)',flex:1}}>{b.title||'(제목 없음)'}</span>
        {b.url&&<CopyBtn text={b.url} label="링크" title="링크 복사"/>}
        {/^https?:\/\//i.test(b.url||'')&&<a href={b.url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:11,color:'var(--blue)'}}><ExternalLink size={11}/>열기</a>}</div>
      {yt&&<div style={{marginTop:8,position:'relative',paddingTop:'56.25%',borderRadius:6,overflow:'hidden',background:'#000'}}>
        <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title={b.title||'BGM'} allow="autoplay; encrypted-media" allowFullScreen loading="lazy" style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0}}/></div>}
      {!yt&&isAudio(b.url)&&<audio controls src={b.url} style={{width:'100%',marginTop:8}}/>}
      {b.note&&<div style={{marginTop:6,fontSize:12,color:'var(--tx3)',whiteSpace:'pre-wrap'}}>{b.note}</div>}</div>)}
    if(b.type==='handout')return wrap('var(--teal)',<div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden',background:'var(--sf1)'}}>
      {b.title&&<div style={{padding:'10px 14px 0',fontFamily:'Instrument Serif,serif',fontWeight:700,fontSize:15}}>{b.title}</div>}
      {b.imageUrl&&<img src={b.imageUrl} alt="" style={{maxWidth:'calc(100% - 28px)',borderRadius:4,margin:'6px 14px'}} onError={e=>{e.target.style.display='none'}}/>}
      {b.content&&<div style={{padding:'10px 14px',fontSize:13,lineHeight:1.8}}><Lines text={b.content}/></div>}
      {gm&&b.gmNote&&<div style={{margin:'0 10px 10px'}}>{gmNote(b.gmNote)}</div>}
    </div>,b.content||null,'복사');
    if(b.type==='branches'&&b.items?.length)return wrap(m.c,<div>{b.items.map(it=><div key={it.id} style={{...card,padding:10,marginBottom:6,borderLeft:`3px solid ${m.c}`}}>
      {itemHead(<GitBranch size={12} style={{color:m.c,flexShrink:0}}/>,it.label,it.text||null)}
      {it.text&&<div style={{fontSize:13,lineHeight:1.7}}><Lines text={it.text}/></div>}</div>)}</div>);
    if(b.type==='lines'&&b.items?.length)return wrap(m.c,<div>{b.items.map(it=><div key={it.id} style={{...card,padding:10,marginBottom:6,borderLeft:`3px solid ${m.c}`}}>
      {itemHead(<MessageSquareQuote size={12} style={{color:m.c,flexShrink:0}}/>,it.label,it.text?it.text.split('\n').filter(l=>l.trim()).map(asLine(it.label)).join('\n'):null)}
      {it.text&&<div style={{fontSize:13,lineHeight:1.7,fontStyle:'italic'}}><Lines text={it.text} wrap={asLine(it.label)}/></div>}</div>)}</div>);
    if(b.type==='checks'&&b.items?.length)return wrap('var(--red)',<div>{b.items.map(c=><div key={c.id} style={{...card,padding:10,marginBottom:6}}>
      {itemHead(<Dice5 size={12} style={{color:'var(--red)',flexShrink:0}}/>,c.name)}
      {[['대성공',c.critSuccess,'var(--gold)'],['성공',c.success,'var(--green)'],['실패',c.fail,'var(--tx3)'],['대실패',c.critFail,'var(--red)']].map(([lb,v,cl])=>
        v?<div key={lb} style={{display:'flex',gap:8,padding:'4px 0',borderTop:'1px dashed var(--bdr)',fontSize:12,lineHeight:1.6}}>
          <span style={{flex:'0 0 50px',fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,color:cl,paddingTop:2}}>{lb}</span><div style={{flex:1,minWidth:0}}><Lines text={v}/></div></div>:null)}
    </div>)}</div>);
    return null;
  };
  return<div>
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx3)',marginBottom:4}}>{plat?.name||''} / {sc?.title} / {pt?.title||'endings'}</div>
    <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:8}}>
      <h1 style={{fontFamily:'Instrument Serif,serif',fontSize:28,fontWeight:400,color:'var(--tx1)',flex:1,minWidth:0}}>{entry.title}</h1>
      <span style={{marginTop:10}}><CopyBtn text={sceneText(entry,gm,isR20)} label="전체 복사" title="이 씬의 글 전체 복사 (GM 블록은 GM 모드일 때만)"/></span>
      {nav&&<Btn onClick={nav.toggleDone} style={{marginTop:6,...(nav.done?{borderColor:'var(--green)',color:'var(--green)',background:'var(--greenA)'}:{})}} title="씬 진행 완료 표시">
        {nav.done?<CircleCheck size={13}/>:<Circle size={13}/>}{nav.done?'완료됨':'완료로 표시'}</Btn>}
    </div>
    {isSc&&(entry.location||entry.timeOfDay||entry.npcsPresent)&&<div style={{display:'flex',gap:16,paddingBottom:8,marginBottom:14,borderBottom:'1px solid var(--bdr)',fontFamily:'JetBrains Mono,monospace',fontSize:11}}>
      {entry.location&&<span><b style={{color:'var(--tx3)'}}>loc</b> {entry.location}</span>}
      {entry.timeOfDay&&<span><b style={{color:'var(--tx3)'}}>time</b> {entry.timeOfDay}</span>}
      {entry.npcsPresent&&<span><b style={{color:'var(--tx3)'}}>npc</b> {entry.npcsPresent}</span>}
    </div>}
    {entry.condition&&<div style={{marginBottom:16,paddingLeft:12,borderLeft:'2px solid var(--coral)',position:'relative'}}>
      <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:'2px solid var(--coral)',background:'var(--bg2)'}}/>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>// condition</div>
      <div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--coralA)',padding:'10px 14px',whiteSpace:'pre-wrap'}}>{entry.condition}</div>
    </div>}
    {(entry.blocks||[]).map(renderB)}
    {nav&&<div className="no-print" style={{marginTop:28,paddingTop:14,borderTop:'1px solid var(--bdr)'}}>
      {nav.targets.length>0&&<div style={{marginBottom:12}}>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:6}}>// 다음으로 이어지는 곳</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{nav.targets.map(t=><Btn key={t.id} onClick={()=>nav.go(t)} style={t.kind==='ending'?{borderColor:'var(--coral)',color:'var(--coral)'}:{borderColor:'var(--blue)',color:'var(--blue)'}}>
          {t.kind==='ending'?'🏁':'→'} {t.title}</Btn>)}</div></div>}
      <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
        {nav.prev?<Btn onClick={()=>nav.go(nav.prev)} style={{maxWidth:'48%'}}><ChevronLeft size={13}/><span style={ell}>{nav.prev.title}</span></Btn>:<span/>}
        {nav.next&&<Btn onClick={()=>{if(!nav.done)nav.toggleDone();nav.go(nav.next)}} primary title="이 씬을 완료로 표시하고 다음 씬으로" style={{maxWidth:'48%'}}><span style={ell}>{nav.next.title}</span><ChevronRight size={13}/></Btn>}
      </div>
    </div>}
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
    <div style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:'#161b22',borderBottom:'1px solid #30363d',fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'#484f58'}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:'#f85149'}}/>Roll20 Chat — 나레이션 · 대사만 표시</div>
    <div className="r20chat" dangerouslySetInnerHTML={{__html:html}}/></div>}
function CocoP({scene}){const ts=[];for(const b of(scene.blocks||[])){if(b.type==='text'&&b.content)ts.push(b.content);if(b.type==='lines'&&b.items)for(const l of b.items)if(l.text)ts.push((l.label?l.label+'：':'')+l.text)}
  return<div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden',marginBottom:16}}>
    <div style={{padding:'5px 10px',background:'#2a2a3a',borderBottom:'1px solid #3a3a4a',fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'#888'}}>코코포리아 미리보기</div>
    <div style={{background:'#1e1e2e',minHeight:50,maxHeight:300,overflowY:'auto'}} dangerouslySetInnerHTML={{__html:ts.length?renderCoco(ts.join('\n')):'<div style="color:#666;font-size:12px;padding:10px">코코포리아 서식 입력 시 표시</div>'}}/></div>}

// ===== BLOCK LIST =====
function BL({entry,upE,sc}){
  const{over,src,dst}=useDrop();const refs=useRef({});
  const moveB=(fromId,beforeId)=>{if(fromId===beforeId)return;upE(e=>{const i=e.blocks.findIndex(x=>x.id===fromId);const j=beforeId?e.blocks.findIndex(x=>x.id===beforeId):e.blocks.length;if(i>=0)moveIdx(e.blocks,i,j)})};
  // 블록 전체가 아닌 손잡이에서만 드래그 시작 (텍스트 선택 방해 방지)
  const grip=b=>{const g=src({kind:'block',id:b.id,owner:entry.id});return<span className="grip" title="끌어서 순서 변경" {...g}
    onDragStart={e=>{g.onDragStart(e);const el=refs.current[b.id];if(el)e.dataTransfer.setDragImage(el,10,10)}}><GripVertical size={13}/></span>};
  const acc=d=>d.kind==='block'&&d.owner===entry.id;
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
      if(b.collapsed)return<div key={b.id} ref={el=>refs.current[b.id]=el} {...dst(b.id,acc,d=>moveB(d.id,b.id))} className={over===b.id?'drag-over-top':''} style={{marginBottom:8,paddingLeft:12,borderLeft:`2px solid ${m.c}`,opacity:.6,position:'relative'}}>
        <div style={{position:'absolute',left:-5,top:6,width:8,height:8,borderRadius:'50%',border:`2px solid ${m.c}`,background:'var(--bg2)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:5}}>{grip(b)}
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',flex:1}}>// {b.label} <span style={{color:'var(--tx3)',fontSize:10}}>▸ 접힘</span></span>
          <IB I={ChevronDown} s={12} title="펼치기" onClick={()=>upB(b.id,x=>{x.collapsed=false})}/><IB I={CopyPlus} s={12} title="블록 복제" onClick={()=>upE(e=>{const cp=JSON.parse(JSON.stringify(b));cp.id=uid();cp.label+=' (복사)';e.blocks.splice(i+1,0,cp)})}/><IB I={Trash2} s={12} danger title="블록 삭제" onClick={()=>upE(e=>{e.blocks=e.blocks.filter(x=>x.id!==b.id)})}/>
        </div></div>;
      return<div key={b.id} ref={el=>refs.current[b.id]=el} {...dst(b.id,acc,d=>moveB(d.id,b.id))} className={over===b.id?'drag-over-top':''} style={{marginBottom:16,paddingLeft:12,borderLeft:`2px solid ${m.c}`,position:'relative',marginLeft:b.indent?24:0}}>
        <div style={{position:'absolute',left:-5,top:8,width:8,height:8,borderRadius:'50%',border:`2px solid ${m.c}`,background:'var(--bg2)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:5}}>{grip(b)}
          <input className="ghost" aria-label="블록 이름" value={b.label} onChange={e=>upB(b.id,x=>{x.label=e.target.value})}
            style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,color:'var(--tx3)',border:'none',background:'transparent',padding:'1px 4px',flex:1,minWidth:0,outline:'none'}}/>
          <IB I={ChevronUp} s={12} onClick={()=>upB(b.id,x=>{x.collapsed=true})} title="접기"/>
          <IB I={ArrowUp} s={12} title="위로" disabled={i===0} onClick={()=>upE(e=>{[e.blocks[i-1],e.blocks[i]]=[e.blocks[i],e.blocks[i-1]]})}/>
          <IB I={ArrowDown} s={12} title="아래로" disabled={i===entry.blocks.length-1} onClick={()=>upE(e=>{[e.blocks[i],e.blocks[i+1]]=[e.blocks[i+1],e.blocks[i]]})}/>
          <IB I={CopyPlus} s={12} title="블록 복제" onClick={()=>upE(e=>{const cp=JSON.parse(JSON.stringify(b));cp.id=uid();cp.label+=' (복사)';e.blocks.splice(i+1,0,cp)})}/>
          <IB I={Trash2} s={12} danger title="블록 삭제" onClick={()=>upE(e=>{e.blocks=e.blocks.filter(x=>x.id!==b.id)})}/>
        </div>
        <BB b={b} upB={upB} sc={sc} upE={upE} i={i}/>
      </div>})}
    <div {...dst('end',acc,d=>moveB(d.id,null))} style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8,paddingTop:14,borderTop:over==='end'?'2px solid var(--blue)':'1px dashed var(--bdr)'}}>
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
      <div style={{display:'flex',gap:5,marginBottom:4}}><input className="ghost" value={it.label} onChange={e=>up(x=>{x.items[ii].label=e.target.value})} placeholder={tp==='branches'?'선택지':'화자'}
        style={{flex:1,border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontWeight:700,fontSize:12,padding:'2px 0',outline:'none',color:'var(--tx1)'}}/><IB I={Trash2} s={12} danger title="삭제" onClick={()=>up(x=>{x.items.splice(ii,1)})}/></div>
      <TA value={it.text} onChange={v=>up(x=>{x.items[ii].text=v})} placeholder={tp==='branches'?'전개':'대사'}/></div>)}
    <Btn small onClick={()=>up(x=>{x.items.push({id:uid(),label:'',text:''})})} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>{tp==='branches'?'분기':'대사'}</Btn></div>}
  if(b.type==='checks')return<div>
    {(b.items||[]).map((c,ci)=><div key={c.id} style={{border:'1px solid var(--bdr)',borderRadius:8,padding:10,marginBottom:5,borderLeft:'3px solid var(--red)'}}>
      <div style={{display:'flex',gap:5,marginBottom:4}}><input className="ghost" value={c.name} onChange={e=>up(x=>{x.items[ci].name=e.target.value})} placeholder="판정명"
        style={{flex:1,border:'none',borderBottom:'1px dashed var(--bdr2)',background:'transparent',fontWeight:700,fontSize:12,padding:'2px 0',outline:'none',color:'var(--tx1)'}}/><IB I={Trash2} s={12} danger title="삭제" onClick={()=>up(x=>{x.items.splice(ci,1)})}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
        {[['critSuccess','대성공','var(--goldA)','var(--gold)'],['success','성공','var(--greenA)','var(--green)'],['fail','실패','var(--sf2)','var(--tx4)'],['critFail','대실패','var(--redA)','var(--red)']].map(([k,lb,bg,cl])=>
          <div key={k}><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,color:cl}}>{lb}</span><TA value={c[k]||''} onChange={v=>up(x=>{x.items[ci][k]=v})} bg={bg}/></div>)}</div>
    </div>)}
    <Btn small onClick={()=>up(x=>{x.items.push({id:uid(),name:'',critSuccess:'',success:'',fail:'',critFail:''})})} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>판정</Btn></div>;
  return null}
// ===== OVERVIEW =====
function OverviewP({sc,plat,up,sel,toast,exportSingle,mergeImp,setMdl,go}){
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  const use=clueUsage(sc);
  // 결론별 단서 수: 실제로 씬/엔딩에 배치된 단서만 '유효'로 센다
  const conc={};for(const c of sc.clues)if(c.leadsTo&&!c.isRedHerring){const k=c.leadsTo.trim();conc[k]??={all:0,placed:0};conc[k].all++;if(use[c.id])conc[k].placed++}
  const goW=w=>w.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:w.ptid,scid:w.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:w.id});
  const unplaced=sc.clues.filter(c=>!use[c.id]);const noConc=sc.clues.filter(c=>!c.isRedHerring&&!c.leadsTo?.trim());
  return<div>
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--tx3)',marginBottom:4}}>{plat?.name||''}</div>
    <input className="ghost" aria-label="시나리오 제목" value={sc.title} onChange={e=>uS(s=>{s.title=e.target.value})} style={{fontFamily:'Instrument Serif,serif',fontSize:28,fontWeight:400,color:'var(--tx1)',border:'none',background:'transparent',padding:'0 4px',marginLeft:-4,width:'100%',outline:'none',marginBottom:14}}/>
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
    <div style={{fontSize:11,color:'var(--tx3)',marginBottom:6}}>결론 하나에 최소 3개의 단서가 씬에 배치되어 있어야 플레이어가 놓치지 않습니다.</div>
    {Object.keys(conc).length===0?<div style={{fontSize:12,color:'var(--tx3)',marginBottom:14}}>단서 편집에서 "연결 결론"을 입력하면 여기서 검증됩니다.</div>
    :<div style={{marginBottom:14}}>{Object.entries(conc).map(([k,{all,placed}])=>{
      const st=placed>=3?{bg:'var(--greenA)',c:'var(--green)',i:'✓'}:placed>=2?{bg:'var(--goldA)',c:'var(--gold)',i:'△'}:{bg:'var(--redA)',c:'var(--red)',i:'✕'};
      return<div key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'3px 0'}}>
        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:20,background:st.bg,color:st.c,flexShrink:0}}>{st.i} {placed}/3</span><span style={{fontSize:12}}>{k}</span>
        {all>placed&&<span style={{fontSize:11,color:'var(--gold)'}}>(미배치 {all-placed}개)</span>}</div>})}</div>}
    <SecTitle>단서 배치 현황</SecTitle>
    {!sc.clues.length?<div style={{fontSize:12,color:'var(--tx3)',marginBottom:14}}>단서가 없습니다.</div>
    :<div style={{marginBottom:14,border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden'}}>
      {(unplaced.length>0||noConc.length>0)&&<div style={{padding:'6px 10px',background:'var(--goldA)',fontSize:11,color:'var(--tx2)',display:'flex',gap:6,alignItems:'center',borderBottom:'1px solid var(--bdr)'}}>
        <AlertTriangle size={12} style={{color:'var(--gold)'}}/>{[unplaced.length&&`씬에 배치되지 않은 단서 ${unplaced.length}개`,noConc.length&&`연결 결론이 없는 단서 ${noConc.length}개`].filter(Boolean).join(' · ')}</div>}
      {sc.clues.map(c=><div key={c.id} style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',padding:'6px 10px',borderBottom:'1px solid var(--bdr)',fontSize:12}}>
        <button onClick={()=>setMdl({type:'clueEdit',clueId:c.id})} style={{display:'flex',alignItems:'center',gap:5,fontWeight:600,color:'var(--tx1)',minWidth:110,fontSize:12}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:c.isRedHerring?'var(--red)':'var(--teal)'}}/>{c.name||'?'}</button>
        <span style={{fontSize:11,color:c.isRedHerring?'var(--red)':c.leadsTo?'var(--tx3)':'var(--gold)'}}>{c.isRedHerring?'미끼':c.leadsTo?'→ '+c.leadsTo:'결론 없음'}</span>
        <span style={{flex:1}}/>
        {use[c.id]?use[c.id].map((w,i)=><button key={i} onClick={()=>goW(w)} style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,padding:'1px 7px',borderRadius:12,background:'var(--tealA)',color:'var(--teal)'}}>{w.kind==='ending'?'🏁 ':''}{w.title}</button>)
          :<span style={{fontSize:11,color:'var(--gold)',display:'inline-flex',alignItems:'center',gap:3}}><AlertTriangle size={11}/>배치 안 됨</span>}
      </div>)}</div>}
    <SecTitle right={<IB I={Plus} s={13} onClick={()=>uS(s=>{s.eventTimeline.push({id:uid(),time:'',event:'',isHidden:false})})}/>}>사건 연표</SecTitle>
    {!sc.eventTimeline.length?<div style={{fontSize:11,color:'var(--tx3)',marginBottom:14}}>배경 사건을 시간순으로 기록</div>
    :<div style={{marginBottom:14}}>{sc.eventTimeline.map((ev,i)=><div key={ev.id} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid var(--bdr)',fontSize:12,alignItems:'center',opacity:ev.isHidden?.5:1}}>
      <input className="ghost" value={ev.time} onChange={e=>uS(s=>{s.eventTimeline[i].time=e.target.value})} placeholder="시간" style={{flex:'0 0 80px',border:'none',background:'transparent',fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,color:'var(--blue)',outline:'none'}}/>
      <input className="ghost" value={ev.event} onChange={e=>uS(s=>{s.eventTimeline[i].event=e.target.value})} placeholder="사건" style={{flex:1,border:'none',background:'transparent',fontSize:12,color:'var(--tx2)',outline:'none'}}/>
      <IB I={ev.isHidden?EyeOff:Eye} s={13} title={ev.isHidden?'숨김 (플레이어 비공개)':'공개'} onClick={()=>uS(s=>{s.eventTimeline[i].isHidden=!s.eventTimeline[i].isHidden})}/><IB I={Trash2} s={13} danger title="삭제" onClick={()=>uS(s=>{s.eventTimeline.splice(i,1)})}/></div>)}</div>}
    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
      <Btn primary onClick={exportSingle}><FileDown size={11}/>이 시나리오만 내보내기</Btn>
      <Btn onClick={()=>document.getElementById('mg')?.click()}><FileUp size={11}/>시나리오 병합</Btn>
      <input type="file" id="mg" accept=".json" hidden onChange={e=>{if(e.target.files[0])mergeImp(e.target.files[0]);e.target.value=''}}/></div>
  </div>}

// ===== MODALS =====
function AccountM({user,sync,SY,recovery,syncNow,toast,onClose}){
  const[tab,setTab]=useState('in');const[email,setEmail]=useState('');const[pw,setPw]=useState('');
  const[busy,setBusy]=useState(false);const[err,setErr]=useState(null);const[info,setInfo]=useState(null);
  const run=async(fn)=>{setErr(null);setInfo(null);setBusy(true);try{await fn()}catch(e){setErr(friendly(e))}finally{setBusy(false)}};
  const submit=()=>run(async()=>{if(!email.trim()||!pw){throw Error('이메일과 비밀번호를 입력하세요.')}
    if(tab==='in'){await signIn(email.trim(),pw);toast('로그인했습니다');onClose()}
    else{const r=await signUp(email.trim(),pw);if(r.needConfirm)setInfo(`${email.trim()}로 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인하세요.`);else{toast('가입하고 로그인했습니다');onClose()}}});
  const enter=e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)submit()};
  const box=(c,bg,children)=><div role={c==='var(--red)'?'alert':undefined} style={{display:'flex',gap:6,alignItems:'flex-start',padding:'8px 10px',marginBottom:10,borderRadius:8,border:`1px solid ${c}`,background:bg,color:'var(--tx1)',fontSize:12,lineHeight:1.6}}>{children}</div>;
  const msgs=<>{err&&box('var(--red)','var(--redA)',<><AlertTriangle size={13} style={{color:'var(--red)',flexShrink:0,marginTop:3}}/><span>{err}</span></>)}
    {info&&box('var(--green)','var(--greenA)',<span>✓ {info}</span>)}</>;

  if(recovery)return<Modal title="새 비밀번호 설정" onClose={onClose} width={400} footer={<Btn primary disabled={busy} onClick={()=>run(async()=>{if(pw.length<6)throw Error('Password should be at least 6');await updatePw(pw);toast('비밀번호를 바꿨습니다');onClose()})}>저장</Btn>}>
    {msgs}<Label>새 비밀번호 (6자 이상)</Label><Inp type="password" value={pw} onChange={setPw} autoFocus autoComplete="new-password"/></Modal>;

  if(user)return<Modal title="☁ 클라우드" onClose={onClose} width={420} footer={<><Btn onClick={()=>run(async()=>{await signOut();toast('로그아웃했습니다');onClose()})} disabled={busy} style={{marginRight:'auto'}}><LogOut size={11}/>로그아웃</Btn><Btn primary onClick={onClose}>닫기</Btn></>}>
    <div style={{fontSize:13,color:'var(--tx1)',marginBottom:4}}><b>{user.email}</b></div>
    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--tx2)',marginBottom:12}}>
      <span style={{width:8,height:8,borderRadius:'50%',background:SY[0],flexShrink:0}}/><span style={{flex:1}}>{SY[1]}</span>
      <Btn small onClick={syncNow} disabled={sync.s==='syncing'} title="지금 클라우드와 비교해 동기화"><RefreshCw size={11}/>지금 동기화</Btn></div>
    {msgs}
    <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.7,borderTop:'1px solid var(--bdr)',paddingTop:10}}>
      · 편집하면 3초 뒤 자동으로 클라우드에 저장되고, 다른 기기에서 로그인하면 같은 내용을 볼 수 있습니다.<br/>
      · 오프라인일 때도 이 기기에는 계속 저장되며, 다시 연결되면 자동으로 올라갑니다.<br/>
      · 두 기기에서 동시에 고치면 덮어쓰지 않고 어느 쪽을 쓸지 묻습니다.<br/>
      · 로그아웃해도 이 기기의 데이터는 남아 있습니다.</div></Modal>;

  return<Modal title="로그인" onClose={onClose} width={400} footer={<Btn primary onClick={submit} disabled={busy}>{busy?'처리 중…':tab==='in'?'로그인':'가입'}</Btn>}>
    <div role="tablist" style={{display:'flex',background:'var(--sf2)',borderRadius:6,padding:2,border:'1px solid var(--bdr)',marginBottom:12}}>
      {[['in','로그인'],['up','회원가입']].map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} onClick={()=>{setTab(k);setErr(null);setInfo(null)}} style={{flex:1,padding:'5px 10px',borderRadius:4,fontSize:12,fontWeight:600,
        background:tab===k?'var(--sf1)':'transparent',color:tab===k?'var(--tx1)':'var(--tx3)'}}>{l}</button>)}</div>
    <div style={{fontSize:12,color:'var(--tx3)',marginBottom:12,lineHeight:1.6}}>로그인하면 시나리오가 클라우드에 자동 저장되어 다른 기기에서도 이어서 작업할 수 있습니다. 로그인하지 않아도 이 기기에는 저장됩니다.</div>
    {msgs}
    <div style={{marginBottom:8}}><Label>이메일</Label><Inp type="email" value={email} onChange={setEmail} onKeyDown={enter} autoFocus autoComplete="email" placeholder="you@example.com"/></div>
    <div style={{marginBottom:6}}><Label>비밀번호{tab==='up'&&' (6자 이상)'}</Label><Inp type="password" value={pw} onChange={setPw} onKeyDown={enter} autoComplete={tab==='in'?'current-password':'new-password'}/></div>
    {tab==='in'&&<button onClick={()=>run(async()=>{if(!email.trim())throw Error('비밀번호를 재설정할 이메일을 먼저 입력하세요.');await resetPw(email.trim());setInfo('비밀번호 재설정 메일을 보냈습니다. 메일의 링크를 누르면 이 사이트에서 새 비밀번호를 정할 수 있습니다.')})}
      style={{fontSize:11,color:'var(--blue)',padding:0}}>비밀번호를 잊으셨나요?</button>}
  </Modal>}

function FindM({D,up,setSel,setMode,onClose,toast}){const dlg=useDialog();const[t,setT]=useState('');const[rt,setRt]=useState('');const[rm,setRm]=useState('find');
  const res=useMemo(()=>{if(!t.trim())return[];const lt=t.toLowerCase(),r=[];
    eachEntry(D,(en,sc,p)=>{let c=0;const chk=v=>{if(v?.toLowerCase().includes(lt))c++};chk(en.title);chk(en.condition);
      for(const b of en.blocks||[])eachText(b,(o,k)=>chk(o[k]));
      if(c)r.push(p?{sc,p,s:en,c,tp:'scene'}:{sc,e:en,c,tp:'ending'})});return r},[t,D]);
  const countAll=()=>{if(!t)return 0;let n=0;eachEntry(D,en=>{if(en.condition)n+=countIn(en.condition,t);for(const b of en.blocks||[])eachText(b,(o,k)=>{n+=countIn(o[k],t)})});return n};
  const doReplace=async()=>{if(!t){toast('검색어 필요');return}const n=countAll();if(!n){toast('결과 없음');return}if(!await dlg.confirm(`"${t}" → "${rt}" 로 ${n}건을 바꿉니다.\n(실행 취소로 되돌릴 수 있습니다)`,{title:'모두 바꾸기',okLabel:'바꾸기'}))return;
    up(d=>{eachEntry(d,en=>{if(en.condition)en.condition=en.condition.split(t).join(rt);for(const b of en.blocks||[])eachText(b,(o,k)=>{o[k]=o[k].split(t).join(rt)})})});onClose();toast('바꾸기 완료')};
  return<Modal title="찾기 · 바꾸기" onClose={onClose} width={460} footer={rm==='replace'?<Btn primary onClick={doReplace}>바꾸기</Btn>:null}>
    <div style={{display:'flex',background:'var(--sf2)',borderRadius:6,padding:2,border:'1px solid var(--bdr)',marginBottom:10}}>
      {['find','replace'].map(m=><button key={m} onClick={()=>setRm(m)} style={{flex:1,padding:'4px 10px',borderRadius:4,fontSize:11,fontWeight:600,fontFamily:'JetBrains Mono,monospace',
        border:'none',cursor:'pointer',background:rm===m?'var(--sf1)':'transparent',color:rm===m?'var(--tx1)':'var(--tx4)'}}>{m==='find'?'찾기':'바꾸기'}</button>)}</div>
    <Inp value={t} onChange={setT} placeholder="찾을 단어" mono autoFocus style={{marginBottom:8}}/>
    {rm==='replace'&&<Inp value={rt} onChange={setRt} placeholder="바꿀 단어" mono style={{marginBottom:8}}/>}
    {rm==='replace'&&t&&<div style={{fontSize:12,color:'var(--tx3)',padding:'6px 8px',border:'1px solid var(--bdr)',borderRadius:6,marginBottom:8}}>전체에서 <b style={{color:'var(--tx1)'}}>{countAll()}건</b></div>}
    {rm==='find'&&<div style={{maxHeight:300,overflowY:'auto'}}>{!t.trim()?<div style={{color:'var(--tx3)',fontSize:11}}>검색어 입력</div>:!res.length?<div style={{color:'var(--tx3)',fontSize:11}}>없음</div>
      :res.map((r,i)=><div key={i} onClick={()=>{if(r.tp==='scene')setSel({pid:r.sc.platformId,sid:r.sc.id,ptid:r.p.id,scid:r.s.id,eid:null});else setSel({pid:r.sc.platformId,sid:r.sc.id,ptid:null,scid:null,eid:r.e.id});setMode('edit');onClose()}}
        style={{border:'1px solid var(--bdr)',borderRadius:6,padding:'7px 10px',marginBottom:4,cursor:'pointer'}}>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:600,fontSize:12}}>{r.tp==='scene'?r.s.title:r.e.title}</div>
        <div style={{fontSize:10,color:'var(--tx3)'}}>{r.sc.title} · {r.c}건</div></div>)}</div>}
  </Modal>}

function PlatM({D,up,setSel,sel,editId,onClose,toast}){const dlg=useDialog();const ed=D.platforms.find(p=>p.id===editId);
  const[n,setN]=useState(ed?.name||'');const[c,setC]=useState(ed?.color||PLAT_C[D.platforms.length%PLAT_C.length]);
  const cnt=ed?D.scenarios.filter(s=>s.platformId===ed.id).length:0;const others=D.platforms.filter(p=>p.id!==editId);
  const[moveTo,setMoveTo]=useState(others[0]?.id||'');
  const save=()=>{if(!n.trim()){toast('이름을 입력하세요');return}
    if(ed)up(d=>{const p=d.platforms.find(x=>x.id===ed.id);p.name=n.trim();p.color=c});
    else{const pid=uid();up(d=>{d.platforms.push({id:pid,name:n.trim(),color:c,commands:[]})});setSel({pid,sid:null,ptid:null,scid:null,eid:null})}onClose()};
  const del=async()=>{if(!others.length){toast('마지막 사이트는 삭제할 수 없습니다');return}
    const tgt=others.find(p=>p.id===moveTo);
    if(!await dlg.confirm(cnt?`"${ed.name}"을(를) 삭제하고, 시나리오 ${cnt}개는 "${tgt.name}"(으)로 옮깁니다.`:`"${ed.name}"을(를) 삭제합니다. (명령어 라이브러리도 함께 삭제)`,{title:'사이트 삭제',okLabel:'삭제',danger:true}))return;
    up(d=>{for(const s of d.scenarios)if(s.platformId===ed.id)s.platformId=moveTo;d.platforms=d.platforms.filter(p=>p.id!==ed.id)});
    if(sel.pid===ed.id)setSel({pid:moveTo,sid:null,ptid:null,scid:null,eid:null});onClose();toast('삭제됨')};
  return<Modal title={ed?'사이트 편집':'사이트 추가'} onClose={onClose} width={400} footer={<>{ed&&<Btn danger onClick={del} style={{marginRight:'auto'}}><Trash2 size={11}/>삭제</Btn>}<Btn onClick={onClose}>취소</Btn><Btn primary onClick={save}>{ed?'저장':'추가'}</Btn></>}>
    <div style={{marginBottom:10}}><Label>이름</Label><Inp value={n} onChange={setN} placeholder="Roll20, 코코포리아..." autoFocus onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)save()}}/>
      <div style={{fontSize:11,color:'var(--tx3)',marginTop:4}}>이름에 "Roll20" 또는 "코코"가 들어가면 채팅 미리보기가 켜집니다.</div></div>
    <div><Label>색상</Label>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{PLAT_C.map(cc=><button key={cc} onClick={()=>setC(cc)} title={cc} aria-label={'색상 '+cc} style={{width:24,height:24,borderRadius:'50%',background:cc,cursor:'pointer',border:`2px solid ${cc===c?'var(--tx1)':'transparent'}`}}/>)}</div></div>
    {ed&&cnt>0&&others.length>0&&<div style={{marginTop:14,paddingTop:10,borderTop:'1px solid var(--bdr)'}}><Label>삭제 시 시나리오 {cnt}개를 옮길 사이트</Label>
      <select value={moveTo} onChange={e=>setMoveTo(e.target.value)} style={{width:'100%',padding:'5px 8px',border:'1px solid var(--bdr)',borderRadius:6,background:'var(--sf1)',color:'var(--tx1)',fontSize:12}}>
        {others.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
  </Modal>}

function CmdM({plat,up,sel,onClose}){const[ei,setEi]=useState(null);const[newColor,setNewColor]=useState('#AA0000');
  if(!plat)return<Modal title="명령어" onClose={onClose}><div style={{color:'var(--tx3)'}}>사이트 선택</div></Modal>;
  const cms=plat.commands||[];const ed=cms.find(c=>c.id===ei);const colors=plat.savedColors||[];
  const uP=fn=>up(d=>{const p=d.platforms.find(x=>x.id===sel.pid);fn(p)});
  return<Modal title={`명령어 — ${plat.name}`} onClose={onClose} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    {/* Commands */}
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>COMMANDS</div>
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
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:6}}>SAVED COLORS — 롤꾸에서 자주 쓰는 색상</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:5,alignItems:'center',marginBottom:8}}>
      {colors.map((hex,i)=><div key={i} style={{position:'relative'}}>
        <div style={{width:26,height:26,borderRadius:'50%',background:hex,border:'2px solid var(--bdr)',cursor:'pointer'}} title={hex}
          onClick={()=>{navigator.clipboard?.writeText(hex)}}/>
        <button onClick={()=>uP(p=>{p.savedColors=p.savedColors.filter((_,j)=>j!==i)})}
          style={{position:'absolute',top:-4,right:-4,width:14,height:14,borderRadius:'50%',background:'var(--red)',color:'#fff',fontSize:10,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
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
  if(!sc)return<Modal title="자료" onClose={onClose}><div style={{color:'var(--tx3)'}}>시나리오 선택</div></Modal>;
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
        <Btn danger small onClick={()=>{uS(s=>{s.library[tab]=s.library[tab].filter(x=>x.id!==ei)});setEi(null)}} title="자료 삭제"><Trash2 size={9}/>삭제</Btn></div></div>}
    <Btn small onClick={()=>{const nid=uid();const ne=tab==='npcs'?{id:nid,name:'',imageUrl:'',role:'',traits:'',lines:''}:{id:nid,name:'',imageUrl:'',description:'',gmNote:''};
      uS(s=>{s.library[tab].push(ne)});setEi(nid)}} style={{width:'100%',justifyContent:'center',borderStyle:'dashed'}}><Plus size={9}/>추가</Btn></Modal>}

function ETM({sc,up,sel,onClose}){const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  return<Modal title="엔딩 타입 관리" onClose={onClose} width={400} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    {sc.endingTypes.map((et,i)=><div key={et.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',borderBottom:'1px solid var(--bdr)'}}>
      <input type="color" value={et.c} onChange={e=>uS(s=>{s.endingTypes[i].c=e.target.value})} style={{width:24,height:24,border:'1px solid var(--bdr)',borderRadius:4,padding:1,cursor:'pointer'}}/>
      <Inp value={et.l} onChange={v=>uS(s=>{s.endingTypes[i].l=v})}/>
      <IB I={Trash2} s={13} danger title="타입 삭제 (이 타입의 엔딩은 첫 타입으로 변경)" disabled={sc.endingTypes.length<=1} onClick={()=>{if(sc.endingTypes.length<=1)return;uS(s=>{s.endingTypes.splice(i,1);for(const e of s.endings)if(e.endingType===et.id)e.endingType=s.endingTypes[0].id})}}/></div>)}
    <Btn small onClick={()=>uS(s=>{s.endingTypes.push({id:uid(),l:'새 타입',c:PLAT_C[s.endingTypes.length%PLAT_C.length]})})} style={{width:'100%',justifyContent:'center',marginTop:6,borderStyle:'dashed'}}><Plus size={9}/>추가</Btn></Modal>}

function ClueEditM({sc,clueId,up,sel,onClose,go}){
  const clue=sc.clues.find(c=>c.id===clueId);if(!clue)return null;
  const uS=fn=>up(d=>{const s=d.scenarios.find(x=>x.id===sel.sid);fn(s)});
  const uC=fn=>uS(s=>{const c=s.clues.find(x=>x.id===clueId);fn(c)});
  return<Modal title="단서 편집" onClose={onClose} width={400} footer={<Btn primary onClick={onClose}>완료</Btn>}>
    <div style={{marginBottom:8}}><Label>이름</Label><Inp value={clue.name} onChange={v=>uC(c=>{c.name=v})}/></div>
    <div style={{marginBottom:8}}><Label>설명</Label><TA value={clue.description||''} onChange={v=>uC(c=>{c.description=v})} placeholder="단서에 대한 상세 설명"/></div>
    <div style={{marginBottom:8}}><Label>연결 결론 (3단서 법칙용)</Label><Inp value={clue.leadsTo||''} onChange={v=>uC(c=>{c.leadsTo=v})} placeholder="예: 범인의 정체, 등대의 비밀"/></div>
    <div style={{marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
      <label style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
        <input type="checkbox" checked={clue.isRedHerring} onChange={e=>uC(c=>{c.isRedHerring=e.target.checked})} style={{accentColor:'var(--red)'}}/>
        레드 헤링 (미끼 단서)</label></div>
    <div style={{marginTop:12,paddingTop:10,borderTop:'1px solid var(--bdr)'}}><Label>등장 위치 (단서 블록이 연결된 곳)</Label>
      {(clueUsage(sc)[clueId]||[]).map((w,i)=><button key={i} onClick={()=>{onClose();w.kind==='scene'?go({pid:sel.pid,sid:sel.sid,ptid:w.ptid,scid:w.id,eid:null}):go({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid:w.id})}}
        style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:12,background:'var(--tealA)',color:'var(--teal)',marginRight:4,marginBottom:4}}>{w.kind==='ending'?'🏁 ':''}{w.title}</button>)}
      {!clueUsage(sc)[clueId]&&<div style={{fontSize:12,color:'var(--gold)',display:'flex',alignItems:'center',gap:5}}><AlertTriangle size={12}/>아직 어느 씬에도 배치되지 않았습니다. 씬에 "단서" 블록을 추가하고 이 단서를 선택하세요.</div>}
    </div>
  </Modal>}
