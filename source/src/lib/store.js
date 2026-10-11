import { SK } from './data.js'

// ===== 로컬 저장소 =====
// IndexedDB에 저장 (용량 제한이 사실상 없음). IndexedDB를 쓸 수 없는 환경(일부 시크릿 모드 등)에서는 localStorage로 대체.
// 이전 버전이 localStorage에 남긴 데이터는 처음 한 번 IndexedDB로 옮긴다.

const DB='scenario-forge',ST='kv';
let dbp=null;
function openDB(){
  if(!dbp)dbp=new Promise((res,rej)=>{
    if(typeof indexedDB==='undefined')return rej(Error('no idb'));
    const r=indexedDB.open(DB,1);
    r.onupgradeneeded=()=>r.result.createObjectStore(ST);
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(Error('blocked'));
  }).catch(e=>{dbp=null;throw e});
  return dbp}
function tx(mode,fn){return openDB().then(db=>new Promise((res,rej)=>{const t=db.transaction(ST,mode);const s=t.objectStore(ST);const r=fn(s);
  t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)}))}

const lsGet=k=>{try{const v=localStorage.getItem(k);return v==null?undefined:JSON.parse(v)}catch(e){return undefined}};
const lsSet=k=>v=>{localStorage.setItem(k,JSON.stringify(v))};

const hashStr=x=>{let h=5381;for(let i=0;i<x.length;i++)h=(h*33+x.charCodeAt(i))|0;return x.length+':'+(h>>>0).toString(36)};
// localStorage에 데이터가 있고, 그 내용이 이 앱이 마지막으로 가져온 것과 다르면 → 다른 버전(예전 한 파일짜리 앱)이 저장한 더 새 데이터
// 그 경우 localStorage 쪽을 쓰고, 기존 IndexedDB 데이터는 'backup'으로 남겨 계정 창에서 되살릴 수 있게 한다.
async function adoptLegacy(idbVal){
  let raw=null;try{raw=localStorage.getItem(SK)}catch(e){}
  if(raw==null)return idbVal;
  const h=hashStr(raw);const seen=await tx('readonly',s=>s.get('lsHash')).catch(()=>undefined);
  if(seen===h)return idbVal;
  let ls;try{ls=JSON.parse(raw)}catch(e){return idbVal}
  // 기록이 없는 경우(예전 이 앱 버전): 예전 한 파일짜리 앱이 남긴 흔적(platforms[].templates)이 있을 때만 새 데이터로 본다
  const newer=idbVal===undefined||(seen!==undefined)||(ls?.platforms||[]).some(p=>Array.isArray(p.templates));
  if(newer&&idbVal!==undefined&&JSON.stringify(idbVal)!==raw)await tx('readwrite',s=>s.put({at:new Date().toISOString(),data:idbVal,reason:'다른 버전의 데이터를 불러오기 전'},'backup'));
  if(newer)await tx('readwrite',s=>s.put(ls,'data'));
  await tx('readwrite',s=>s.put(h,'lsHash'));
  return newer?ls:idbVal}

export async function getItem(k){
  try{const v=await tx('readonly',s=>s.get(k));
    if(k==='data')return await adoptLegacy(v);
    return v}
  catch(e){return lsGet(k==='data'?SK:SK+'-'+k)}}
export async function setItem(k,v){
  try{await tx('readwrite',s=>s.put(v,k));return true}
  catch(e){try{lsSet(k==='data'?SK:SK+'-'+k)(v);return true}catch(e2){return false}}}

// 다른 탭에 저장 사실 알림 (IndexedDB는 storage 이벤트가 없으므로 BroadcastChannel 사용)
const TAB=Math.random().toString(36).slice(2);
const bc=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(DB):null;
export const announceSave=()=>{bc?.postMessage({type:'saved',tab:TAB})};
export const onOtherTabSave=fn=>{if(!bc)return()=>{};const h=e=>{if(e.data?.type==='saved'&&e.data.tab!==TAB)fn()};bc.addEventListener('message',h);return()=>bc.removeEventListener('message',h)};
