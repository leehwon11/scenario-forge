import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle,ChevronDown,CircleQuestionMark,Cloud,FileDown,FileUp,ListChecks,LogIn,Menu,Moon,MoreHorizontal,PanelLeftClose,PanelLeftOpen,Play,Redo2,Search,Sun,Undo2,X } from "lucide-react";
import { Nav } from './components/Nav.jsx'
import { Home } from './views/Home.jsx'
import { CheckPanel } from './views/CheckPanel.jsx'
import { SessionMode } from './views/SessionMode.jsx'
import { entryIssues } from './lib/check.js'
import { ActCtx,Btn,DialogProvider,IB,copyText,setCopyWin,useDialog,useMedia,useToast } from './components/ui.jsx'
import { fetchRow,fetchStamp,forcePush,friendly,getUser,onAuth,pushRow } from './lib/cloud.js'
import { SK,defData,download,forExport,mig,sceneNums,uid } from './lib/data.js'
import { announceSave,getItem,onOtherTabSave,setItem } from './lib/store.js'
import { AccountM } from './modals/AccountModal.jsx'
import { ClueEditM } from './modals/ClueModal.jsx'
import { CmdM } from './modals/CommandModal.jsx'
import { ETM } from './modals/EndingTypeModal.jsx'
import { FindM } from './modals/FindModal.jsx'
import { HelpModal } from './modals/HelpModal.jsx'
import { FillM } from './modals/FillModal.jsx'
import { TplM } from './modals/TemplateModal.jsx'
import { insertAtLast } from './components/insert.js'
import { parseQueries } from './lib/rollkku.js'
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
  const[theme,setThm]=useState('light');const[op,setOp]=useState({});
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
  // 세션 화면(진행) — 켜져 있으면 가운데가 세션 화면으로 바뀐다. pip: 늘 위에 떠 있는 미니 창
  const[live,setLive]=useState(false);const[pip,setPip]=useState(null);
  // 오른쪽 준비 점검 칸 (넓은 화면에서는 기본으로 열림)
  const wide=useMedia('(min-width:1240px)');const[chkOpenS,setChk]=useState(null);const chkOpen=chkOpenS??wide;
  const[crumb,setCrumb]=useState(false);
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
    setD(d);setThm(d.theme||'light');if(m)meta.current=m;
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
  // 이 기기 데이터를 덮어쓰기 전에 백업 (계정 창의 "백업 되살리기")
  const backupLocal=useCallback(reason=>{const d=Dref.current;if(d)setItem('backup',{at:new Date().toISOString(),data:JSON.parse(JSON.stringify(d)),reason})},[]);
  const adopt=useCallback((row,uid)=>{const nd=mig(JSON.parse(JSON.stringify(row.data)));const body=bodyOf(nd);
    if(bodyOf(Dref.current||{})!==body)backupLocal('클라우드 내용을 불러오기 전');
    setD(nd);setThm(nd.theme||'light');setSel(s=>nd.platforms.some(p=>p.id===s.pid)?s:{pid:nd.platforms?.[0]?.id||null,sid:null,ptid:null,scid:null,eid:null});
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
  // 명령어·템플릿 넣기: ?{} 자리가 있으면 채우기 창을 먼저 띄우고, 없으면 마지막으로 클릭한 글 입력칸에 바로 넣는다
  const[fill,setFill]=useState(null);
  const putText=useCallback(t=>{if(!insertAtLast(t)){copyText(t);toast('입력칸이 선택되지 않아 클립보드에 복사했습니다',2500)}},[toast]);
  const useCode=useCallback((code,title)=>{if(!parseQueries(code).length){putText(code);return}setFill({code,title,mode:'insert',onApply:putText})},[putText]);
  const act=useMemo(()=>({toast,removed,useCode,openFill:setFill}),[toast,removed,useCode]);
  // 데이터 전체 교체 (가져오기·다른 탭 내용) — 테마·선택 상태도 함께 맞춤
  const replaceD=useCallback((nd,keepSel)=>{setD(nd);setThm(nd.theme||'light');
    setSel(s=>keepSel&&nd.platforms.some(p=>p.id===s.pid)?s:{pid:nd.platforms?.[0]?.id||null,sid:null,ptid:null,scid:null,eid:null})},[]);
  const undo=useCallback(()=>{commitHist();if(hi.current<=0){toast('되돌릴 수 없음');return}hi.current--;setD(mig(JSON.parse(hist.current[hi.current])));toast('실행 취소')},[toast,commitHist]);
  const redo=useCallback(()=>{commitHist();if(hi.current>=hist.current.length-1){toast('다시 실행할 내용 없음');return}hi.current++;setD(mig(JSON.parse(hist.current[hi.current])));toast('다시 실행')},[toast,commitHist]);

  useEffect(()=>{const h=e=>{const m=e.ctrlKey||e.metaKey;if(!m)return;const k=e.key.toLowerCase();
    // 입력 중에는 브라우저 기본 실행 취소(글자 단위)를 그대로 쓴다
    if((k==='z'||k==='y')&&isTextField(e.target))return;
    if(k==='z'&&!e.shiftKey){e.preventDefault();undo()}else if((k==='z'&&e.shiftKey)||k==='y'){e.preventDefault();redo()}
    else if(k==='f'){e.preventDefault();setMdl('find')}};
    const hq=e=>{if(e.key==='?'&&!e.ctrlKey&&!e.metaKey&&!isTextField(e.target)&&!document.querySelector('[role=dialog]')){e.preventDefault();setMdl('help')}};document.addEventListener('keydown',hq);document.addEventListener('keydown',h);return()=>{document.removeEventListener('keydown',h);document.removeEventListener('keydown',hq)}},[undo,redo]);

  if(loading||!D)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--tx3)'}}>불러오는 중…</div>;

  const plat=D.platforms.find(p=>p.id===sel.pid);
  const sc=D.scenarios.find(s=>s.id===sel.sid);
  const pt=sc?.parts.find(p=>p.id===sel.ptid);
  const scene=pt?.scenes.find(s=>s.id===sel.scid);
  const ending=sc?.endings.find(e=>e.id===sel.eid);
  const isR20=plat?.name.toLowerCase().includes('roll20');
  const isCoco=plat&&(plat.name.includes('코코')||plat.name.toLowerCase().includes('coco'));
  const issues=sc?entryIssues(sc):{};
  const sceneNo=scene?sceneNums(sc)[scene.id]:'';

  const go=s=>{setSel(s);if(isMobile)setSb(false);setCrumb(false)};
  const toggleTheme=()=>{const t=theme==='dark'?'light':'dark';setThm(t);up(d=>{d.theme=t})};
  const startLive=()=>{if(!sc)return;setLive(true);setMode('edit')};
  const endLive=()=>{if(pip&&!pip.closed)pip.close();setPip(null);setLive(false)};
  // 늘 위에 떠 있는 미니 창 (Chrome·Edge의 Document Picture-in-Picture)
  const canPip=typeof window!=='undefined'&&'documentPictureInPicture' in window;
  const openPip=async()=>{try{const w=await window.documentPictureInPicture.requestWindow({width:440,height:760});
    for(const n of document.head.querySelectorAll('link[rel=stylesheet],style'))w.document.head.appendChild(n.cloneNode(true));
    w.document.documentElement.setAttribute('data-theme',theme);w.document.title='시나리오 대장간 · 세션';
    w.addEventListener('pagehide',()=>{setPip(null);setCopyWin(null)});setCopyWin(w);setPip(w)}
    catch(e){toast('미니 창을 열지 못했습니다',2500)}};

  const exportAll=()=>{download(forExport(D),'scenario-forge.json');toast('내보내기 완료')};
  const importAll=f=>{const r=new FileReader();r.onload=async()=>{let p;try{p=JSON.parse(r.result);if(!p.platforms)throw Error()}catch(e){dlg.alert('올바른 scenario-forge JSON 파일이 아닙니다.',{title:'가져오기 실패'});return}
    if(!await dlg.confirm('현재 데이터 전체를 이 파일 내용으로 덮어씁니다.'+(user?'\n(로그인 중이므로 클라우드에도 반영됩니다)':''),{title:'가져오기',okLabel:'덮어쓰기',danger:true}))return;
    backupLocal('파일을 가져오기 전');replaceD(mig(p));toast('가져오기 완료')};r.readAsText(f)};
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
  const syncShort={off:'이 기기에 저장됨',pending:'저장 대기',syncing:'저장 중…',ok:'클라우드 저장됨',offline:'오프라인',err:'동기화 확인 필요'}[sync.s]||'';
  const navProps={sel,go,setSel,up,sc,plat,op,setOp,setMdl,toast,dlg,isMobile,issues};
  const scs=D.scenarios.filter(s=>s.platformId===sel.pid);
  const showNav=!!sc&&sbOpen;const showChk=!!sc&&!live&&mode==='edit'&&chkOpen&&!isMobile;
  const page=scene?scene.title:ending?ending.title:sc?'개요':'';
  const menuItems=[[Search,'찾기 · 바꾸기',()=>setMdl('find')],[user?Cloud:LogIn,user?'클라우드 · '+SY[1]:'로그인 (클라우드 저장)',()=>setMdl('account')],[FileDown,'전체 JSON 내보내기',exportAll],[FileUp,'JSON 가져오기 (전체 덮어쓰기)',()=>document.getElementById('imp')?.click()],[theme==='dark'?Sun:Moon,theme==='dark'?'밝은 화면':'어두운 화면',toggleTheme],[CircleQuestionMark,'사용법',()=>setMdl('help')],...(sc&&isMobile&&!live?[[ListChecks,'준비 점검',()=>setChk(true)]]:[])];
  const sessionEl=sc&&<SessionMode sc={sc} plat={plat} sel={sel} go={go} up={up} gm={gm} setGm={setGm} setMdl={setMdl} onEnd={endLive} canPip={canPip&&!isMobile} onPip={openPip}/>;

  return(<ActCtx.Provider value={act}>
    <div className="app" style={{height:`calc(100vh / ${zoom})`,zoom}}>
      {/* 위쪽 바 */}
      <header className="topbar no-print">
        {sc&&(!sbOpen||isMobile)&&<IB I={isMobile?Menu:PanelLeftOpen} s={16} onClick={()=>setSb(!sbOpen)} title="씬 목록 열기"/>}
        {sc&&sbOpen&&!isMobile&&<IB I={PanelLeftClose} s={16} onClick={()=>setSb(false)} title="씬 목록 닫기"/>}
        <button className="tb-home" onClick={()=>{endLive();go({pid:sel.pid,sid:null,ptid:null,scid:null,eid:null})}} title="모든 시나리오">
          <span className="tb-logo" aria-hidden="true">鍛</span><span className="hide-m tb-name">시나리오 대장간</span></button>
        <div className="tb-crumb">
          {sc?<><span className="tb-sep">/</span>
            <button className="tb-sc" onClick={()=>setCrumb(!crumb)} aria-expanded={crumb} title="다른 시나리오로">{sc.title}<ChevronDown size={13}/></button>
            {page&&<><span className="tb-sep hide-m">/</span><b className="hide-m">{page}</b></>}</>
          :plat&&<><span className="tb-sep">/</span><span className="tb-plat"><i style={{background:plat.color}}/>{plat.name}</span></>}
          {crumb&&sc&&<><div className="pop-bg" onClick={()=>setCrumb(false)}/>
            <div className="pop" role="menu">
              <div className="pop-k">{plat?.name} 시나리오</div>
              {scs.map(s=><button key={s.id} role="menuitem" className={s.id===sc.id?'on':''} onClick={()=>go({pid:sel.pid,sid:s.id,ptid:null,scid:null,eid:null})}>{s.title}</button>)}
              <button role="menuitem" className="pop-all" onClick={()=>{endLive();go({pid:sel.pid,sid:null,ptid:null,scid:null,eid:null})}}>모든 시나리오 · 사이트 보기</button></div></>}
        </div>
        <div style={{flex:1}}/>
        <button className="tb-sync hide-m" onClick={()=>setMdl('account')} title={(user?`클라우드 (${user.email}) — `:'로그인 — ')+SY[1]}><i style={{background:user?SY[0]:'var(--tx4)'}}/>{user?syncShort:'로그인'}</button>
        {sc&&!live&&<div role="tablist" className="seg">
          {[['edit','집필'],['flow','흐름도']].map(([m,l])=><button key={m} role="tab" aria-selected={mode===m} onClick={()=>setMode(m)}>{l}</button>)}</div>}
        <IB I={Undo2} s={16} onClick={undo} title="실행 취소 (Ctrl+Z)"/><IB I={Redo2} s={16} onClick={redo} title="다시 실행 (Ctrl+Shift+Z)"/>
        {!isMobile&&<button className="tbtn" onClick={()=>setMdl('find')} title="찾기 · 바꾸기 (Ctrl+F)"><Search size={13}/>찾기</button>}
        {sc&&!live&&!wide&&!isMobile&&mode==='edit'&&<button className={'tbtn'+(chkOpen?' on':'')} onClick={()=>setChk(!chkOpen)} aria-pressed={chkOpen} title="준비 점검 칸"><ListChecks size={13}/>점검</button>}
        <IB I={MoreHorizontal} s={16} onClick={()=>setMenu(!menu)} title="더보기 (내보내기·가져오기·글자 크기·테마)" active={menu}/>
        {!isMobile&&<button className="help-btn" onClick={()=>setMdl('help')} title="사용법 (?)" aria-label="사용법">?</button>}
        {sc&&<button className={'sess-btn'+(live?' on':'')} onClick={live?endLive:startLive} title={live?'세션 화면을 닫고 집필로':'세션 진행 화면 열기'}>
          {live?<><X size={13}/><span className="hide-m">세션 끝내기</span></>:<><Play size={12} fill="currentColor"/><span className="hide-m">세션 시작</span></>}</button>}
        <input type="file" id="imp" accept=".json" hidden onChange={e=>{if(e.target.files[0])importAll(e.target.files[0]);e.target.value=''}}/>
      </header>

      {/* 더보기 메뉴 */}
      {menu&&<><div className="pop-bg no-print" onClick={()=>setMenu(false)}/>
        <div className="pop pop-r no-print" role="menu">
          {menuItems.map(([I,l,fn])=><button key={l} role="menuitem" onClick={()=>{setMenu(false);fn()}}><I size={14}/>{l}</button>)}
          <div className="pop-zoom">글자 크기{[.9,1,1.15].map(z=><button key={z} onClick={()=>setZoom(z)} aria-pressed={zoom===z}>{Math.round(z*100)}%</button>)}</div>
        </div></>}
      {/* 충돌 배너 */}
      {conflict&&<div role="alert" className="conflict no-print">
        <AlertTriangle size={14} style={{color:'var(--gold)',flexShrink:0}}/>
        {conflict.kind==='server'
          ?<span style={{flex:1,minWidth:200}}>클라우드에 이 기기와 <b>다른 내용</b>이 있습니다 (클라우드 저장 시각 {new Date(conflict.row.updated_at).toLocaleString()}). 어느 쪽을 쓸지 선택할 때까지 <b>클라우드 저장을 멈췄습니다.</b> 이 기기에는 계속 저장됩니다.</span>
          :<span style={{flex:1,minWidth:200}}>다른 탭에서 데이터가 변경되었습니다. 덮어쓰기를 막기 위해 <b>이 탭의 자동 저장을 멈췄습니다.</b></span>}
        {conflict.kind==='server'&&<Btn small onClick={exportAll} title="이 기기 내용을 JSON 파일로 백업">이 기기 내용 백업</Btn>}
        <Btn small primary onClick={loadOther}>{conflict.kind==='server'?'클라우드 내용 불러오기':'다른 탭 내용 불러오기'}</Btn>
        <Btn small danger onClick={keepMine}>{conflict.kind==='server'?'이 기기 내용으로 덮어쓰기':'이 탭 내용으로 덮어쓰기'}</Btn>
      </div>}

      <div className="app-body" style={{gridTemplateColumns:isMobile?'1fr':`${showNav?sbW+'px ':''}1fr${showChk?' 300px':''}`}}>
        {/* 왼쪽 씬 목록 */}
        {sc&&isMobile&&sbOpen&&<div className="drawer-bg no-print" onClick={()=>setSb(false)}/>}
        {showNav&&<div className={'nav-wrap no-print'+(isMobile?' drawer':'')}><Nav {...navProps}/>
          {!isMobile&&<div className="sb-resize" role="separator" aria-orientation="vertical" aria-label="씬 목록 너비 조절" title="끌어서 너비 조절 · 더블클릭하면 기본값"
            onPointerDown={startResize} onDoubleClick={()=>{setSbW(260);try{localStorage.setItem(SK+'-sbw',260)}catch(e){}}}/>}</div>}

        {/* 가운데 */}
        <main className={'main'+(live?' main-live':'')}>
          {live&&sc?(pip?<div className="pip-hold"><b>미니 창에서 세션 진행 중</b><span>롤20 창 위에 떠 있는 작은 창을 쓰세요.</span>
              <Btn onClick={()=>{pip.close();setPip(null)}}>큰 화면으로 돌아오기</Btn></div>:sessionEl)
          :mode==='flow'&&sc?<div className="flow-pg"><FlowV sc={sc} sel={sel} setSel={go} setMode={setMode}/></div>
          :ending?<EndingP ending={ending} sc={sc} plat={plat} up={up} sel={sel} setMdl={setMdl}/>
          :scene?<SceneP scene={scene} pt={pt} sc={sc} plat={plat} up={up} sel={sel} isR20={isR20} isCoco={isCoco} r20On={r20On} setR20On={setR20On} go={go} setMdl={setMdl} no={sceneNo}/>
          :sc?<OverviewP sc={sc} plat={plat} up={up} sel={sel} toast={toast} exportSingle={exportSingle} mergeImp={mergeImp} setMdl={setMdl} go={go}/>
          :<Home D={D} sel={sel} go={go} setSel={setSel} up={up} setMdl={setMdl} dlg={dlg} toast={toast}/>}
        </main>

        {/* 오른쪽 준비 점검 */}
        {showChk&&<CheckPanel sc={sc} plat={plat} issues={issues} go={go} sel={sel} setMdl={setMdl} onStart={startLive}/>}
        {sc&&isMobile&&!live&&chkOpenS===true&&<><div className="drawer-bg no-print" onClick={()=>setChk(false)}/>
          <div className="drawer drawer-r no-print"><CheckPanel sc={sc} plat={plat} issues={issues} go={s2=>{setChk(false);go(s2)}} sel={sel} setMdl={setMdl} onStart={()=>{setChk(false);startLive()}}/></div></>}
      </div>
    </div>
    {pip&&sc&&live&&createPortal(<ActCtx.Provider value={act}><SessionMode sc={sc} plat={plat} sel={sel} go={go} up={up} gm={gm} setGm={setGm} setMdl={setMdl} onEnd={()=>{pip.close();setPip(null)}} win={pip} pip/></ActCtx.Provider>,pip.document.body)}
    {/* MODALS */}
    {(modal==='account'||modal==='account-recovery')&&<AccountM user={user} sync={sync} SY={SY} recovery={modal==='account-recovery'} syncNow={()=>{setConflict(c=>c?.kind==='server'?c:null);syncNow()}} toast={toast}
      loadCloud={async()=>{try{const row=await fetchRow(user.id);if(!row){toast('클라우드에 저장된 데이터가 없습니다');return false}setConflict(null);adopt(row,user.id);toast('☁ 클라우드 내용을 불러왔습니다');return true}catch(e){toast(friendly(e),4000);return false}}}
      restoreBackup={async()=>{const b=await getItem('backup');if(!b?.data){toast('백업이 없습니다');return}backupLocal('백업을 되살리기 전');replaceD(mig(b.data),true);toast('백업을 되살렸습니다')}} onClose={()=>setMdl(null)}/>}
    {modal==='find'&&<FindM D={D} up={up} sel={sel} setSel={go} setMode={setMode} onClose={()=>setMdl(null)} toast={toast} onLib={(kind,id)=>{setLive(false);setMdl({type:'lib',kind,id})}}/>}
    {(modal==='platform'||modal?.type==='platform')&&<PlatM D={D} up={up} setSel={setSel} sel={sel} editId={modal?.id} onClose={()=>setMdl(null)} toast={toast}/>}
    {modal==='cmd'&&<CmdM plat={plat} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {(modal==='lib'||modal?.type==='lib')&&sc&&<LibM key={(modal?.kind||'')+(modal?.id||'')} sc={sc} up={up} sel={sel} scene={scene} ending={ending} go={go} initKind={modal?.kind||'npcs'} initId={modal?.id||null} onClose={()=>setMdl(null)} toast={toast}/>}
    {modal==='endingTypes'&&<ETM sc={sc} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {modal==='help'&&<HelpModal onClose={()=>setMdl(null)}/>}
    {modal==='tpl'&&<TplM plat={plat} up={up} sel={sel} onClose={()=>setMdl(null)}/>}
    {fill&&<FillM key={fill.code} fill={fill} onClose={()=>setFill(null)}/>}
    {modal?.type==='clueEdit'&&<ClueEditM sc={sc} clueId={modal.clueId} up={up} sel={sel} onClose={()=>setMdl(null)} go={go}/>}
    {Toast}
  </ActCtx.Provider>);
}
