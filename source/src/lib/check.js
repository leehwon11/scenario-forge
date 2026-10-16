import { allScenes, clueUsage, collectBgm } from './data.js'

// ===== 준비 점검 =====
// 세션 전에 빠진 곳을 찾는다. 씬 목록의 색 점(초록·노랑·빨강)과 오른쪽 "준비 점검" 칸이 같은 결과를 쓴다.

// 블록에 실제 내용이 있는지
export function blockFilled(b){
  if(['text','memo','truth','session-log'].includes(b.type))return!!b.content?.trim();
  if(['lines','branches','checks'].includes(b.type))return(b.items||[]).some(it=>Object.values(it).some(v=>typeof v==='string'&&v.trim()&&v!==it.id));
  if(b.type==='clue')return!!b.clueId;
  if(b.type==='npc'||b.type==='item'||b.type==='place')return!!(b.name?.trim()||b.description?.trim());
  if(b.type==='handout')return!!(b.title?.trim()||b.content?.trim());
  if(b.type==='bgm')return!!(b.title?.trim()||b.url?.trim());
  return false}

const lvOf=notes=>notes.some(n=>n.lv==='bad')?'bad':notes.length?'warn':'ok';

// 씬·엔딩별 상태: {id: {lv:'ok'|'warn'|'bad', notes:[{lv,t}]}}
export function entryIssues(sc){
  const flat=allScenes(sc);const endIds=new Set(sc.endings.map(e=>e.id));const res={};
  const incoming=new Set();for(const s of flat)for(const c of s.connections||[])incoming.add(c.targetSceneId);
  const valid=s=>(s.connections||[]).filter(c=>endIds.has(c.targetSceneId)||flat.some(x=>x.id===c.targetSceneId));
  flat.forEach((s,i)=>{const notes=[];const conns=valid(s);
    if(!(s.blocks||[]).some(blockFilled))notes.push({lv:'bad',t:'내용이 비어 있어요'});
    const last=i===flat.length-1;const nextInPart=flat[i+1]&&flat[i+1].ptid===s.ptid;
    if(last&&sc.endings.length&&!conns.some(c=>endIds.has(c.targetSceneId)))notes.push({lv:'bad',t:'이어지는 엔딩이 없어요'});
    else if(!last&&!nextInPart&&!conns.length)notes.push({lv:'warn',t:'다음 씬 연결이 없어요'});
    for(const b of s.blocks||[])if(b.type==='clue'&&!b.clueId){notes.push({lv:'warn',t:'단서 블록에 단서가 골라져 있지 않아요'});break}
    res[s.id]={lv:lvOf(notes),notes}});
  for(const e of sc.endings){const notes=[];
    if(!incoming.has(e.id))notes.push({lv:'warn',t:'이 엔딩으로 이어지는 씬이 없어요'});
    if(!(e.blocks||[]).some(blockFilled))notes.push({lv:'warn',t:'엔딩 내용이 비어 있어요'});
    res[e.id]={lv:lvOf(notes),notes}}
  return res}

// 결론별 단서 수 (씬·엔딩에 배치된 단서만 센다)
export function conclusions(sc){const use=clueUsage(sc);const conc={};
  for(const c of sc.clues)if(c.leadsTo?.trim()&&!c.isRedHerring){const k=c.leadsTo.trim();conc[k]??={all:0,placed:0};conc[k].all++;if(use[c.id])conc[k].placed++}
  return Object.entries(conc).map(([k,v])=>({key:k,...v}))}

// 플래그: 어디에도 조건으로 안 쓰인 플래그, 지워진 플래그를 가리키는 조건
export function flagIssues(sc){const used=new Set();
  for(const p of sc.parts)for(const s of p.scenes)for(const b of s.blocks||[])if(b.type==='branches')for(const it of b.items||[])for(const id of it.needs||[])used.add(id);
  for(const e of sc.endings)for(const id of e.needs||[])used.add(id);
  const ids=new Set(sc.flags.map(f=>f.id));
  return{unused:sc.flags.filter(f=>!used.has(f.id)),missing:[...used].filter(id=>!ids.has(id)).length,used:used.size}}

// 세션에 쓸 것 개수
export function sessionAssets(sc,plat){let handouts=0,npcs=0;
  for(const p of sc.parts)for(const s of p.scenes)for(const b of s.blocks||[]){if(b.type==='handout')handouts++;if(b.type==='npc')npcs++}
  return{bgm:collectBgm(sc).length,tpl:plat?.templates?.length||0,handouts,npcs}}
