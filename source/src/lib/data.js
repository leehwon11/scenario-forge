import { defTpl } from './rollkku.js'
import { BookOpen,Dice5,FileDown,FileText,GitBranch,Lightbulb,MapPin,MessageSquareQuote,Music,Package,Sparkles,StickyNote,Users } from "lucide-react";

// ===== CONSTANTS =====
export const SK='scenario-forge-v4';
export const BT={
  truth:{l:'진상',c:'var(--coral)',I:Sparkles},text:{l:'나레이션',c:'var(--blue)',I:FileText},
  memo:{l:'키퍼 메모',c:'var(--gold)',I:BookOpen},clue:{l:'단서',c:'var(--teal)',I:Lightbulb},
  lines:{l:'대사',c:'#c07030',I:MessageSquareQuote},branches:{l:'선택지 분기',c:'var(--blue)',I:GitBranch},
  checks:{l:'판정 결과',c:'var(--red)',I:Dice5},npc:{l:'NPC',c:'var(--purple)',I:Users},
  handout:{l:'핸드아웃',c:'var(--teal)',I:FileDown},bgm:{l:'BGM',c:'var(--coral)',I:Music},
  item:{l:'아이템',c:'var(--gold)',I:Package},place:{l:'장소',c:'var(--blue)',I:MapPin},
  'session-log':{l:'세션 메모',c:'var(--purple)',I:StickyNote},
};
export const DEF_ET=[{id:'normal',l:'노멀',c:'#8b949e'},{id:'good',l:'해피',c:'#d29922'},{id:'bad',l:'배드',c:'#f85149'},{id:'true',l:'트루',c:'#39d2c0'},{id:'special',l:'특수',c:'#bc8cff'}];
export const PLAT_C=['#58a6ff','#d29922','#4a6aac','#f85149','#8b949e','#bc8cff','#39d2c0','#c07030'];
export const uid=()=>'id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 플레이 뷰용 간단 마크다운 (굵게/기울임)
export const mdR=l=>esc(l).replace(/\*\*\*([^*]+)\*\*\*/g,'<b><i>$1</i></b>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<i>$1</i>');
// 내보내기·Gist 업로드 시 토큰이 파일에 섞여 나가지 않도록 제거
// 내보내기용: 기기별 설정(cloud 등)은 제외
export const forExport=d=>{const{cloud,...rest}=d;return rest};
export const download=(obj,name)=>{const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)};

export function defData(){const r=uid(),k=uid();return{platforms:[
  {id:r,name:'Roll20',color:'#58a6ff',commands:[{id:uid(),l:'/desc',s:'/desc ',cat:'기본'},{id:uid(),l:'굵게',s:'**텍스트**',cat:'서식'},{id:uid(),l:'/emas',s:'/emas "이름" ',cat:'기본'},{id:uid(),l:'/as',s:'/as "이름" ',cat:'기본'},{id:uid(),l:'Oosh',s:'[텍스트](#" style="color:#AA0000;text-decoration:none;)',cat:'롤꾸'}]},
  {id:k,name:'코코포리아',color:'#bc8cff',commands:[{id:uid(),l:'귓속말',s:'((귓속말: ))',cat:'기본'},{id:uid(),l:'설명',s:'【설명】',cat:'기본'}]}
],scenarios:[],theme:'light'}}

export function mig(d){delete d.cloud; /* 예전 Gist 토큰 등은 더 이상 쓰지 않으므로 제거 */d.theme??='light';
// 사이트: 명령어·저장 색·롤꾸 템플릿 (Roll20은 기본 템플릿을 넣어 줌)
for(const p of(d.platforms||[])){p.commands??=[];p.savedColors??=[];if(p.templates===undefined)p.templates=/roll20/i.test(p.name||'')?defTpl():[]}
for(const sc of(d.scenarios||[])){
  sc.library??={npcs:[],items:[],places:[]};for(const k of['npcs','items','places'])if(!Array.isArray(sc.library[k]))sc.library[k]=[];
  sc.endingTypes??=DEF_ET.map(e=>({...e}));sc.endings??=[];sc.clues??=[];sc.eventTimeline??=[];sc.sessionHistory??=[];sc.setting??='';sc.synopsis??='';
  for(const c of sc.clues){c.isRedHerring??=false;c.leadsTo??=''}
  for(const e of sc.endings){e.blocks??=[];e.condition??='';e.endingType??='normal';e.needs??=[]}
  migSession(sc);
  migLib(sc);
  for(const p of(sc.parts||[]))for(const s of(p.scenes||[])){
    if(!Array.isArray(s.blocks))s.blocks=[{id:uid(),type:'text',label:'나레이션',content:''}];
    s.location??='';s.timeOfDay??='';s.npcsPresent??='';s.sessionLog??=[];s.connections??=[];
  }
}
if(d.library){for(const sc of d.scenarios)if(!sc.library.npcs.length&&d.library.npcs)sc.library.npcs=[...d.library.npcs];delete d.library}
return d}

// 삭제된 씬을 가리키는 연결 정리
export const dropConns=(sc,ids)=>{for(const p of sc.parts)for(const s of p.scenes)s.connections=(s.connections||[]).filter(c=>!ids.has(c.targetSceneId))};

// ===== PERSISTENCE =====


// ===== 찾기·바꾸기 공통 =====
export const B_KEYS=['content','name','role','traits','lines','title','description','gmNote','note'];
export const I_KEYS=['label','text','name','critSuccess','success','fail','critFail'];
export function eachText(b,fn){for(const k of B_KEYS)if(typeof b[k]==='string')fn(b,k);for(const it of(b.items||[]))for(const k of I_KEYS)if(typeof it[k]==='string')fn(it,k)}
export function eachEntry(D,fn){for(const sc of D.scenarios){for(const p of sc.parts)for(const s of p.scenes)fn(s,sc,p);for(const e of(sc.endings||[]))fn(e,sc,null)}}
export const countIn=(v,t)=>{let n=0,i=0;while((i=v.indexOf(t,i))!==-1){n++;i+=t.length}return n};

// ===== 씬·엔딩 조회 =====
export const allScenes=sc=>sc.parts.flatMap(p=>p.scenes.map(s=>({...s,ptid:p.id,ptTitle:p.title})));
// 연결 대상: 씬 또는 엔딩
export function findTarget(sc,id){for(const p of sc.parts)for(const s of p.scenes)if(s.id===id)return{kind:'scene',ptid:p.id,id,title:s.title};
  const e=sc.endings.find(x=>x.id===id);return e?{kind:'ending',id,title:e.title}:null}
// 단서별 등장 위치 (단서 블록이 연결된 씬/엔딩)
export function clueUsage(sc){const u={};const add=(cid,where)=>{if(!cid)return;(u[cid]??=[]).push(where)};
  for(const p of sc.parts)for(const s of p.scenes)for(const b of s.blocks||[])if(b.type==='clue')add(b.clueId,{kind:'scene',ptid:p.id,id:s.id,title:s.title});
  for(const e of sc.endings)for(const b of e.blocks||[])if(b.type==='clue')add(b.clueId,{kind:'ending',id:e.id,title:e.title});
  return u}
// 배열 내 이동 (드래그 정렬)
export const moveIdx=(arr,from,to)=>{const[x]=arr.splice(from,1);arr.splice(to>from?to-1:to,0,x)};

// ===== 세션 진행 (행동 순서·단서 획득·플래그) =====
export const newSession=()=>({flags:{},found:{},order:[],turn:0,round:1,sent:{}});
export function migSession(sc){
  sc.flags??=[];sc.pcs??=[]; // pcs: 예전 버전 데이터 보존용(화면에는 안 씀)
  // 예전 버전 PC(hp/san/dex 고정 필드) → 자유 수치 목록
  for(const pc of sc.pcs){pc.id??=uid();pc.name??='';pc.player??='';pc.notes??='';
    if(!Array.isArray(pc.stats)){pc.stats=[];
      if(pc.hp!=null)pc.stats.push({id:uid(),label:'HP',cur:+pc.hp||0,max:+pc.hpMax||+pc.hp||0});
      if(pc.san!=null)pc.stats.push({id:uid(),label:'SAN',cur:+pc.san||0,max:+pc.sanMax||+pc.san||0});
      if(pc.init==null&&pc.dex!=null)pc.init=+pc.dex||0;
      if(pc.skills)pc.notes=[pc.skills,pc.notes].filter(Boolean).join('\n');
      for(const k of['hp','hpMax','san','sanMax','dex','skills'])delete pc[k]}
    pc.init??=0}
  const ss=sc.session??=newSession();ss.flags??={};ss.found??={};ss.order??=[];ss.turn??=0;ss.round??=1;ss.sent??={}; /* sent: 세션 화면에서 이미 복사해 보낸 줄 */
  for(const p of sc.parts||[])for(const s of p.scenes||[])for(const b of s.blocks||[])if(b.type==='branches')for(const it of b.items||[])it.needs??=[];
  return sc}
// 결론별 단서 진행: 전체 / 씬에 배치됨 / 이번 세션에 획득
export function clueProgress(sc){const use=clueUsage(sc),found=sc.session?.found||{},g={};
  for(const c of sc.clues){const k=c.isRedHerring?'__red':(concKey(c.leadsTo)||'__none');const x=g[k]??={key:k.startsWith('__')?k:c.leadsTo.trim(),clues:[],placed:0,found:0};x.clues.push(c);if(use[c.id])x.placed++;if(found[c.id])x.found++}
  return Object.values(g).sort((a,b)=>(a.key.startsWith('__')?1:0)-(b.key.startsWith('__')?1:0))}
// 행동 순서 정렬 (높은 값 먼저, 같으면 PC 먼저)
export const sortOrder=o=>[...o].sort((a,b)=>(+b.init||0)-(+a.init||0)||(b.pcId?1:0)-(a.pcId?1:0));
// 시나리오 안의 BGM 블록을 씬 순서대로 (사이드바 BGM 목록)
export function collectBgm(sc){const out=[];
  for(const p of sc.parts)for(const s of p.scenes)for(const b of s.blocks||[])if(b.type==='bgm')out.push({b,ptid:p.id,scid:s.id,where:s.title});
  for(const e of sc.endings)for(const b of e.blocks||[])if(b.type==='bgm')out.push({b,eid:e.id,where:'엔딩 · '+(e.title||'')});
  return out}

// ===== 자료실 (NPC · 아이템 · 장소) =====
// 씬·엔딩의 NPC/아이템/장소 블록은 내용을 직접 갖지 않고 자료실 항목을 refId로 가리킨다.
// 그래서 어디서 고쳐도 같은 항목이 바뀐다. refId가 ''이면 아직 고르지 않은 빈 블록.
export const LIB_KIND={npc:'npcs',item:'items',place:'places'};
export const LIB_BT={npcs:'npc',items:'item',places:'place'};
export const LIB_LABEL={npcs:'NPC',items:'아이템',places:'장소'};
const LIB_KEYS=['name','role','imageUrl','traits','lines','description','gmNote'];
export const newLibEntry=(kind,name='')=>kind==='npcs'?{id:uid(),name,role:'',imageUrl:'',traits:'',lines:'',gmNote:''}:{id:uid(),name,imageUrl:'',description:'',gmNote:''};
const normName=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
export const libOf=(sc,b)=>{const k=LIB_KIND[b?.type];return k&&b.refId?sc.library?.[k]?.find(e=>e.id===b.refId)||null:null};
// 블록 + 자료실 내용을 합친 모습 (화면 표시·복사·점검용)
export const resolveB=(sc,b)=>{const e=libOf(sc,b);return e?{...b,...e,id:b.id,label:b.label,type:b.type}:b};
// 자료실 항목이 쓰이는 곳: {항목 id: [{kind:'scene'|'ending', ptid, id, title}]}
export function libUses(sc){const u={};const add=(id,w)=>{if(!id)return;const l=u[id]??=[];if(!l.some(x=>x.id===w.id))l.push(w)};
  for(const p of sc.parts)for(const s of p.scenes){const w={kind:'scene',ptid:p.id,id:s.id,title:s.title};for(const b of s.blocks||[])if(LIB_KIND[b.type])add(b.refId,w);for(const id of s.npcIds||[])add(id,w)}
  for(const e of sc.endings)for(const b of e.blocks||[])if(LIB_KIND[b.type])add(b.refId,{kind:'ending',id:e.id,title:e.title});
  return u}
// 씬에 나오는 NPC 이름 (자료실에서 고른 NPC + 직접 적은 이름)
export const sceneNpcNames=(sc,s)=>[...(s.npcIds||[]).map(id=>sc.library.npcs.find(n=>n.id===id)?.name).filter(Boolean),...(s.npcsPresent?[s.npcsPresent]:[])].join(', ');
// 예전 데이터: 블록 안에 내용이 있던 NPC/아이템/장소 → 자료실로 옮기고 연결 (같은 이름이 있으면 그 항목에 합침)
export function migLib(sc){const lib=sc.library;
  for(const k of['npcs','items','places'])for(const e of lib[k]){e.id??=uid();for(const f of Object.keys(newLibEntry(k)))if(f!=='id')e[f]??=''}
  const link=b=>{const k=LIB_KIND[b.type];if(!k||b.refId!==undefined)return;
    const has=LIB_KEYS.some(f=>typeof b[f]==='string'&&b[f].trim());
    if(!has){b.refId='';for(const f of LIB_KEYS)delete b[f];return}
    let e=b.name?.trim()?lib[k].find(x=>normName(x.name)===normName(b.name)):null;
    if(!e){e=newLibEntry(k);lib[k].push(e)}
    for(const f of LIB_KEYS)if(f in e&&typeof b[f]==='string'&&b[f].trim()&&!String(e[f]||'').trim())e[f]=b[f];
    b.refId=e.id;for(const f of LIB_KEYS)delete b[f]};
  for(const p of sc.parts||[])for(const s of p.scenes||[]){(s.blocks||[]).forEach(link);
    if(!Array.isArray(s.npcIds)){s.npcIds=[];
      // "등장 NPC" 글자 중 자료실 NPC 이름과 같은 것은 연결로 바꾼다
      const rest=[];for(const t of String(s.npcsPresent||'').split(/[,，、]/).map(x=>x.trim()).filter(Boolean)){const n=lib.npcs.find(x=>normName(x.name)===normName(t));if(n&&!s.npcIds.includes(n.id))s.npcIds.push(n.id);else if(!n)rest.push(t)}
      s.npcsPresent=rest.join(', ')}}
  for(const e of sc.endings||[])(e.blocks||[]).forEach(link);
  return sc}
// 결론 이름 비교: 띄어쓰기·대소문자 차이는 같은 결론으로 본다
export const concKey=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
