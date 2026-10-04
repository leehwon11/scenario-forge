import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AlertTriangle,BookOpen,Cloud,FileDown,FileUp,LogIn,Menu,Moon,MoreHorizontal,PanelLeftClose,PanelLeftOpen,Redo2,Search,Sun,Undo2,Swords,CircleQuestionMark } from "lucide-react";
import { Sidebar } from './components/Sidebar.jsx'
import { ActCtx,Btn,DialogProvider,IB,useDialog,useMedia,useToast } from './components/ui.jsx'
import { fetchRow,fetchStamp,forcePush,friendly,getUser,onAuth,pushRow } from './lib/cloud.js'
import { SK,defData,download,forExport,mig,uid } from './lib/data.js'
import { announceSave,getItem,onOtherTabSave,setItem } from './lib/store.js'
import { AccountM } from './modals/AccountModal.jsx'
import { ClueEditM } from './modals/ClueModal.jsx'
import { CmdM } from './modals/CommandModal.jsx'
import { ETM } from './modals/EndingTypeModal.jsx'
import { FindM } from './modals/FindModal.jsx'
import { PCModal } from './modals/PCModal.jsx'
import { HelpModal } from './modals/HelpModal.jsx'
import { SessionPanel } from './views/SessionPanel.jsx'
import { LibM } from './modals/LibraryModal.jsx'
import { PlatM } from './modals/PlatformModal.jsx'
import { EndingP } from './views/EndingView.jsx'
import { FlowV } from './views/FlowView.jsx'
import { OverviewP } from './views/Overview.jsx'
import { SceneP } from './views/SceneView.jsx'

const bodyOf=d=>JSON.stringify(forExport(d));
const hashStr=s=>{let h=5381;for(let i=0;i<s.length;i++)h=(h*33+s.charCodeAt(i))|0;return s.length+':'+(h>>>0).toString(36)};

const isTextField=el=>el&&(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&!['checkbox','color','file','button'].includes(el.type))||el.isContentEditable);

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
  // 사이드바 너비 (끌어서 조절, 더블클릭하면 기본값) — 이 기기에 기억
  const[sbW,setSbW]=useState(()=>{try{return Math.min(480,Math.max(200,parseInt(localStorage.getItem(SK+'-sbw'))||260))}catch(e){return 260}});
  const startResize=e=>{e.preventDefault();const x0=e.clientX,w0=sbW;let w=w0;
    const mv=ev=>{w=Math.min(480,Math.max(200,w0+(ev.clientX-x0)/zoom));setSbW(w)};
    const upH=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',upH);document.body.style.cursor='';try{localStorage.setItem(SK+'-sbw',Math.round(w))}catch(err){}};
    document.body.style.cursor='col-resize';document.addEventListener('pointermove',mv);document.addEventListener('pointerup',upH)};
  const[spOpen,setSpOpenS]=useState(()=>{try{return localStorage.getItem(SK+'-sp')==='1'}catch(e){return false}}); // 세션 패널
  const setSpOpen=v=>{setSpOpenS(v);try{localStorage.setItem(SK+'-sp',v?'1':'0')}catch(e){}};
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
  // 삭제처럼 되돌릴 일이 잦은 변경: 실행 후 "되돌리기" 버튼이 있는 알림
  const removed=useCallback((label,fn)=>{const before=Dref.current;fn();toast(label+' 삭제됨',6000,{label:'되돌리기',fn:()=>{setD(before);toast('되돌렸습니다')}})},[toast]);
  const act=useMemo(()=>({toast,removed}),[toast,removed]);
  // 데이터 전체 교체 (가져오기·다른 탭 내용) — 테마·선택 상태도 함께 맞춤
  const replaceD=useCallback((nd,keepSel)=>{setD(nd);setThm(nd.theme||'dark');
    setSel(s=>keepSel&&nd.platforms.some(p=>p.id===s.pid)?s:{pid:nd.platforms?.[0]?.id||null,sid:null,ptid:null,scid:null,eid:null})},[]);
  const undo=useCallback(()=>{commitHist();if(hi.current<=0){toast('되돌릴 수 없음');return}hi.current--;setD(mig(JSON.parse(hist.current[hi.current])));toast('실행 취소')},[toast,commitHist]);
  const redo=useCallback(()=>{commitHist();if(hi.current>=hist.current.length-1){toast('다시 실행할 내용 없음');return}hi.current++;setD(mig(JSON.parse(hist.current[hi.current])));toast('다시 실행')},[toast,commitHist]);

  useEffect(()=>{const h=e=>{const m=e.ctrlKey||e.metaKey;if(!m)return;const k=e.key.toLowerCase();
    // 입력 중에는 브라우저 기본 실행 취소(글자 단위)를 그대로 쓴다
    if((k==='z'||k==='y')&&isTextField(e.target))return;
    if(k==='z'&&!e.shiftKey){e.preventDefault();undo()}else if((k==='z'&&e.shiftKey)||k==='y'){e.preventDefault();redo()}
    else if(k==='f'){e.preventDefault();setMdl('find')}};
    const hq=e=>{if(e.key==='?'&&!e.ctrlKey&&!e.metaKey&&!isTextField(e.target)&&!document.querySelector('[role=dialog]')){e.preventDefault();setMdl('help')}};document.addEventListener('keydown',hq);document.addEventListener('keydown',h);return()=>{document.removeEventListener('keydown',h);document.removeEventListener('keydown',hq)}},[undo,redo]);

  if(loading||!D)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--tx3)'}}>로딩 중...</div>;

  const plat=D.platforms.find(p=>p.id===sel.pid);
  const sc=D.scenarios.find(s=>s.id===sel.sid);
  const pt=sc?.parts.find(p=>p.id===sel.ptid);
  const scene=pt?.scenes.find(s=>s.id===sel.scid);
  const ending=sc?.endings.find(e=>e.id===sel.eid);
  const isR20=plat?.name.toLowerCase().includes('roll20');
  const isCoco=plat&&(plat.name.includes('코코')||plat.name.toLowerCase().includes('coco'));

  const go=s=>{setSel(s);if(isMobile)setSb(false)};
  const spShow=spOpen&&!!sc;
  // 본문(play·편집)에서 쓰는 세션 상태: 단서 획득·플래그
  const uSess=fn=>up(d=>{fn(d.scenarios.find(x=>x.id===sel.sid).session)});
  const sess=sc&&{found:sc.session.found,flags:sc.session.flags,flagDefs:sc.flags,
    toggleFound:id=>uSess(x=>{x.found[id]=!x.found[id]}),toggleFlag:id=>uSess(x=>{x.flags[id]=!x.flags[id]})};
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

  return(<ActCtx.Provider value={act}>
    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':(sbOpen?`${sbW}px 1fr`:'0 1fr')+(spShow?' minmax(280px,320px)':''),gridTemplateRows:'44px auto 1fr',height:`calc(100vh / ${zoom})`,zoom,position:'relative',transition:'grid-template-columns .15s'}}>
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
        <Btn small onClick={()=>setSpOpen(!spOpen)} disabled={!sc} aria-pressed={spOpen} title={sc?'세션 패널 (PC·행동 순서·단서 획득·플래그)':'시나리오를 먼저 선택하세요'}
          style={spOpen&&sc?{borderColor:'var(--purple)',color:'var(--purple)',background:'var(--purpleA)'}:undefined}><Swords size={11}/><span className="hide-m">세션</span></Btn>
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
        {!isMobile&&<button className="help-btn" onClick={()=>setMdl('help')} title="사용법 (?)" aria-label="사용법">?</button>}
      </div>

      {/* 모바일 더보기 메뉴 */}
      {isMobile&&menu&&<><div className="no-print" onClick={()=>setMenu(false)} style={{position:'fixed',inset:0,zIndex:60}}/>
        <div className="no-print" role="menu" style={{position:'fixed',top:48,right:8,zIndex:61,background:'var(--sf1)',border:'1px solid var(--bdr)',borderRadius:10,boxShadow:'0 8px 30px rgba(0,0,0,.35)',padding:6,minWidth:200,display:'flex',flexDirection:'column',gap:2}}>
          {[[Search,'찾기 · 바꾸기',()=>setMdl('find')],[user?Cloud:LogIn,user?'클라우드 · '+SY[1]:'로그인 (클라우드 저장)',()=>setMdl('account')],[FileDown,'전체 JSON 내보내기',exportAll],[FileUp,'JSON 가져오기',()=>document.getElementById('imp')?.click()],[theme==='dark'?Sun:Moon,theme==='dark'?'라이트 테마':'다크 테마',toggleTheme],[CircleQuestionMark,'사용법',()=>setMdl('help')]].map(([I,l,fn])=>
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
      {!isMobile&&sbOpen&&<div className="sb-resize no-print" role="separator" aria-orientation="vertical" aria-label="사이드바 너비 조절" title="끌어서 너비 조절 · 더블클릭하면 기본값"
        onPointerDown={startResize} onDoubleClick={()=>{setSbW(260);try{localStorage.setItem(SK+'-sbw',260)}catch(e){}}} style={{left:sbW-3}}/>}

      {/* MAIN */}
      <div className="main" style={{overflowY:'auto',padding:'22px 30px 80px',background:'var(--bg2)',minHeight:0,minWidth:0}}>
        {mode==='flow'&&sc?<FlowV sc={sc} sel={sel} setSel={go} setMode={setMode}/>
        :ending?<EndingP ending={ending} sc={sc} plat={plat} mode={mode} gm={gm} up={up} sel={sel} toast={toast} setMdl={setMdl} go={go} sess={sess}/>
        :scene?<SceneP scene={scene} pt={pt} sc={sc} plat={plat} mode={mode} gm={gm} up={up} sel={sel} toast={toast} isR20={isR20} isCoco={isCoco} r20On={r20On} setR20On={setR20On} go={go} setMdl={setMdl} sess={sess}/>
        :sc?<OverviewP sc={sc} plat={plat} up={up} sel={sel} toast={toast} exportSingle={exportSingle} mergeImp={mergeImp} setMdl={setMdl} go={go}/>
        :<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,color:'var(--tx3)',textAlign:'center'}}>
          <BookOpen size={32} strokeWidth={1.5} style={{opacity:.5}}/><h3 style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,color:'var(--tx2)'}}>{D.scenarios.some(s=>s.platformId===sel.pid)?'시나리오를 선택하세요':'새 시나리오를 만들어 보세요'}</h3>
          {isMobile&&!sbOpen&&<Btn onClick={()=>setSb(true)}><Menu size={12}/>목록 열기</Btn>}</div>}
      </div>
      {/* 세션 패널: 데스크톱은 오른쪽 열, 모바일은 겹쳐 띄움 */}
      {spShow&&!isMobile&&<div className="no-print" style={{minHeight:0,borderLeft:'1px solid var(--bdr)',background:'var(--sf1)',overflow:'hidden'}}><SessionPanel sc={sc} up={up} sel={sel} setMdl={setMdl} onClose={()=>setSpOpen(false)}/></div>}
      {spShow&&isMobile&&<><div className="no-print" onClick={()=>setSpOpen(false)} style={{position:'fixed',inset:0,top:44,background:'rgba(0,0,0,.45)',zIndex:40}}/>
        <div className="no-print" style={{position:'fixed',top:44,right:0,bottom:0,width:'min(340px,92vw)',zIndex:41,background:'var(--sf1)',borderLeft:'1px solid var(--bdr)',boxShadow:'-4px 0 24px rgba(0,0,0,.3)'}}><SessionPanel sc={sc} up={up} sel={sel} setMdl={setMdl} onClose={()=>setSpOpen(false)}/></div></>}
    </div>
    {/* MODALS */}
    {(modal==='account'||modal==='account-recovery')&&<AccountM user={user} sync={sync} SY={SY} recovery={modal==='account-recovery'} syncNow={()=>{setConflict(c=>c?.kind==='server'?c:null);syncNow()}} toast={toast} onClose={()=>setMdl(null)}/>}
    {modal==='find'&&<FindM D={D} up={up} sel={sel} setSel={go} setMode={setMode} onClose={()=>setMdl(null)} toast={toast}/>}
    {(modal==='platform'||modal?.type==='platform')&&<PlatM D={D} up={up} setSel={setSel} sel={sel} editId={modal?.id} onClose={()=>setMdl(null)} toast={toast}/>}
    {modal==='cmd'&&<CmdM plat={plat} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {modal==='lib'&&<LibM sc={sc} up={up} sel={sel} scene={scene} onClose={()=>setMdl(null)} toast={toast}/>}
    {modal==='endingTypes'&&<ETM sc={sc} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {modal==='help'&&<HelpModal onClose={()=>setMdl(null)}/>}
    {modal?.type==='pc'&&sc&&<PCModal sc={sc} pcId={modal.pcId} up={up} sel={sel} toast={toast} onClose={()=>setMdl(null)}/>}
    {modal?.type==='clueEdit'&&<ClueEditM sc={sc} clueId={modal.clueId} up={up} sel={sel} onClose={()=>setMdl(null)} go={go}/>}
    {Toast}
  </ActCtx.Provider>);
}
