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
],scenarios:[],theme:'dark'}}

export function mig(d){delete d.cloud; /* 예전 Gist 토큰 등은 더 이상 쓰지 않으므로 제거 */d.theme??='dark';
for(const sc of(d.scenarios||[])){
  sc.library??={npcs:[],items:[],places:[]};for(const k of['npcs','items','places'])if(!Array.isArray(sc.library[k]))sc.library[k]=[];
  sc.endingTypes??=DEF_ET.map(e=>({...e}));sc.endings??=[];sc.clues??=[];sc.eventTimeline??=[];sc.sessionHistory??=[];sc.setting??='';sc.synopsis??='';
  for(const c of sc.clues){c.isRedHerring??=false;c.leadsTo??=''}
  for(const e of sc.endings){e.blocks??=[];e.condition??='';e.endingType??='normal';e.needs??=[]}
  migSession(sc);
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

// ===== 세션 진행 (PC·행동 순서·타이머·단서 획득·플래그) =====
export const DEF_STATS=[{label:'HP',max:10},{label:'SAN',max:50}];
export const newSession=()=>({flags:{},found:{},order:[],turn:0,round:1,timer:{acc:0,startedAt:null}});
export const makePC=(tpl,name='')=>({id:uid(),name,player:'',init:0,notes:'',stats:(tpl||DEF_STATS).map(t=>({id:uid(),label:t.label,cur:t.max,max:t.max}))});
export function migSession(sc){
  sc.statTemplate??=DEF_STATS.map(x=>({...x}));sc.flags??=[];sc.pcs??=[];
  // 예전 버전 PC(hp/san/dex 고정 필드) → 자유 수치 목록
  for(const pc of sc.pcs){pc.id??=uid();pc.name??='';pc.player??='';pc.notes??='';
    if(!Array.isArray(pc.stats)){pc.stats=[];
      if(pc.hp!=null)pc.stats.push({id:uid(),label:'HP',cur:+pc.hp||0,max:+pc.hpMax||+pc.hp||0});
      if(pc.san!=null)pc.stats.push({id:uid(),label:'SAN',cur:+pc.san||0,max:+pc.sanMax||+pc.san||0});
      if(pc.init==null&&pc.dex!=null)pc.init=+pc.dex||0;
      if(pc.skills)pc.notes=[pc.skills,pc.notes].filter(Boolean).join('\n');
      for(const k of['hp','hpMax','san','sanMax','dex','skills'])delete pc[k]}
    pc.init??=0}
  const ss=sc.session??=newSession();ss.flags??={};ss.found??={};ss.order??=[];ss.turn??=0;ss.round??=1;ss.timer??={acc:0,startedAt:null};
  for(const p of sc.parts||[])for(const s of p.scenes||[])for(const b of s.blocks||[])if(b.type==='branches')for(const it of b.items||[])it.needs??=[];
  return sc}
// 결론별 단서 진행: 전체 / 씬에 배치됨 / 이번 세션에 획득
export function clueProgress(sc){const use=clueUsage(sc),found=sc.session?.found||{},g={};
  for(const c of sc.clues){const k=c.isRedHerring?'__red':(c.leadsTo?.trim()||'__none');const x=g[k]??={key:k,clues:[],placed:0,found:0};x.clues.push(c);if(use[c.id])x.placed++;if(found[c.id])x.found++}
  return Object.values(g).sort((a,b)=>(a.key.startsWith('__')?1:0)-(b.key.startsWith('__')?1:0))}
export const elapsed=t=>(t?.acc||0)+(t?.startedAt?Date.now()-t.startedAt:0);
export const fmtTime=ms=>{const s=Math.floor(ms/1000);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':':'')+String(m).padStart(h?2:1,'0')+':'+String(x).padStart(2,'0')};
// 행동 순서 정렬 (높은 값 먼저, 같으면 PC 먼저)
export const sortOrder=o=>[...o].sort((a,b)=>(+b.init||0)-(+a.init||0)||(b.pcId?1:0)-(a.pcId?1:0));
