// ===== 로컬 저장소 =====
// IndexedDB에 저장 (용량 제한이 사실상 없음). IndexedDB를 쓸 수 없는 환경(일부 시크릿 모드 등)에서는 localStorage로 대체.
// 이전 버전이 localStorage에 남긴 데이터는 처음 한 번 IndexedDB로 옮긴다.
import { SK } from './data.js'

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

export async function getItem(k){
  try{const v=await tx('readonly',s=>s.get(k));if(v!==undefined)return v;
    // 이전 버전(localStorage) 데이터 이전
    if(k==='data'){const old=lsGet(SK);if(old!==undefined){await tx('readwrite',s=>s.put(old,k));return old}}
    return undefined}
  catch(e){return lsGet(k==='data'?SK:SK+'-'+k)}}
export async function setItem(k,v){
  try{await tx('readwrite',s=>s.put(v,k));return true}
  catch(e){try{lsSet(k==='data'?SK:SK+'-'+k)(v);return true}catch(e2){return false}}}

// 다른 탭에 저장 사실 알림 (IndexedDB는 storage 이벤트가 없으므로 BroadcastChannel 사용)
const TAB=Math.random().toString(36).slice(2);
const bc=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(DB):null;
export const announceSave=()=>{bc?.postMessage({type:'saved',tab:TAB})};
export const onOtherTabSave=fn=>{if(!bc)return()=>{};const h=e=>{if(e.data?.type==='saved'&&e.data.tab!==TAB)fn()};bc.addEventListener('message',h);return()=>bc.removeEventListener('message',h)};
