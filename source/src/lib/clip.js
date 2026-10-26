import { LIB_KIND, SK, uid } from './data.js'

// ===== 블록 클립보드 =====
// 블록을 복사해 두면 다른 씬·엔딩(다른 시나리오 포함)에 붙여넣을 수 있다. 이 기기(localStorage)에 기억해서 탭을 바꿔도 남는다.
// 블록이 가리키는 자료실 항목·단서·플래그의 사본도 함께 담아, 다른 시나리오에 붙일 때 이름으로 찾거나 새로 만든다.
const KEY=SK+'-blockclip';
const EV='sf-clip';
const norm=v=>String(v||'').replace(/\s+/g,'').toLowerCase();

export function makeClip(sc,blocks){const refs={lib:{},clues:{},flags:{}};
  for(const b of blocks){const k=LIB_KIND[b.type];
    if(k&&b.refId){const e=sc.library?.[k]?.find(x=>x.id===b.refId);if(e)refs.lib[b.refId]={kind:k,entry:e}}
    if(b.type==='clue'&&b.clueId){const c=sc.clues.find(x=>x.id===b.clueId);if(c)refs.clues[c.id]=c}
    if(b.type==='branches')for(const it of b.items||[])for(const id of it.needs||[]){const f=sc.flags.find(x=>x.id===id);if(f)refs.flags[id]=f}}
  return JSON.parse(JSON.stringify({sid:sc.id,scTitle:sc.title,blocks,refs,at:Date.now()}))}

export const readClip=()=>{try{const c=JSON.parse(localStorage.getItem(KEY));return c?.blocks?.length?c:null}catch(e){return null}};
export const writeClip=c=>{try{localStorage.setItem(KEY,JSON.stringify(c))}catch(e){}window.dispatchEvent(new Event(EV))};
export const clearClip=()=>{try{localStorage.removeItem(KEY)}catch(e){}window.dispatchEvent(new Event(EV))};
// 클립보드가 바뀌면 알려 줌 (같은 탭: 사용자 이벤트, 다른 탭: storage 이벤트)
export const onClip=fn=>{const s=e=>{if(!e.key||e.key===KEY)fn()};window.addEventListener(EV,fn);window.addEventListener('storage',s);return()=>{window.removeEventListener(EV,fn);window.removeEventListener('storage',s)}};

// dst: 붙여넣을 시나리오(immer draft). 새 id로 복사한 블록 배열을 돌려준다.
export function pasteBlocks(clip,dst){const same=clip.sid===dst.id;const m={lib:{},clue:{},flag:{}};
  const libId=id=>{if(!id||same)return id;if(m.lib[id])return m.lib[id];const r=clip.refs.lib[id];if(!r)return'';
    let e=r.entry.name?.trim()?dst.library[r.kind].find(x=>norm(x.name)===norm(r.entry.name)):null;
    if(!e){e={...r.entry,id:uid()};dst.library[r.kind].push(e)}return m.lib[id]=e.id};
  const clueId=id=>{if(!id||same)return id;if(m.clue[id])return m.clue[id];const c=clip.refs.clues[id];if(!c)return'';
    let x=dst.clues.find(y=>norm(y.name)===norm(c.name));if(!x){x={...c,id:uid()};dst.clues.push(x)}return m.clue[id]=x.id};
  const flagId=id=>{if(same)return id;if(m.flag[id])return m.flag[id];const f=clip.refs.flags[id];if(!f)return null;
    let x=dst.flags.find(y=>norm(y.name)===norm(f.name));if(!x){x={...f,id:uid()};dst.flags.push(x)}return m.flag[id]=x.id};
  return clip.blocks.map(b0=>{const b=JSON.parse(JSON.stringify(b0));b.id=uid();for(const it of b.items||[])it.id=uid();
    if(LIB_KIND[b.type]&&b.refId)b.refId=libId(b.refId);
    if(b.type==='clue'&&b.clueId)b.clueId=clueId(b.clueId);
    if(b.type==='branches')for(const it of b.items||[])it.needs=(it.needs||[]).map(flagId).filter(Boolean);
    return b})}

// 시나리오(draft) 안에서 씬·엔딩 찾기
export const findEntry=(s,id)=>{for(const p of s.parts)for(const x of p.scenes)if(x.id===id)return x;return s.endings.find(e=>e.id===id)||null};
