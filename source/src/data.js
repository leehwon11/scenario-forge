import { Sparkles,FileText,BookOpen,Lightbulb,MessageSquareQuote,GitBranch,Dice5,Users,FileDown,Music,Package,MapPin,StickyNote } from "lucide-react";

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
  for(const e of sc.endings){e.blocks??=[];e.condition??='';e.endingType??='normal'}
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
