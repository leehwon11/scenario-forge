// scenario-forge — main application
'use strict';

var SK='scenario-forge-v2',RK='scenario-forge-recent-v2',PLAT_COLORS=['#5b9cf5','#d4a544','#4a6aac','#f05050','#888','#9878c8','#40b8a8','#c07030'];
var ICONS={
trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>',
chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>',
check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
grip:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
dup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10" stroke-linecap="round"/></svg>',
fold:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h8M4 18h16" stroke-linecap="round"/></svg>'
};

var DEFAULT_ENDING_TYPES=[
  {id:'normal',label:'노멀',color:'#888'},
  {id:'good',label:'해피',color:'#d4a544'},
  {id:'bad',label:'배드',color:'#f05050'},
  {id:'true',label:'트루',color:'#40b8a8'},
  {id:'special',label:'특수',color:'#9878c8'}
];

var BLOCK_TYPES={
  truth:{label:'진상',color:'var(--truth)',cls:'truth'},
  text:{label:'나레이션',color:'var(--accent)',cls:''},
  memo:{label:'키퍼 메모',color:'var(--gold)',cls:'memo'},
  clue:{label:'단서',color:'var(--clue)',cls:'clue-b'},
  lines:{label:'대사',color:'#c07030',cls:''},
  branches:{label:'선택지 분기',color:'#4a6aac',cls:''},
  checks:{label:'판정 결과',color:'var(--danger)',cls:''},
  npc:{label:'NPC',color:'#9878c8',cls:''},
  handout:{label:'핸드아웃',color:'var(--clue)',cls:''},
  bgm:{label:'BGM',color:'#c06080',cls:''},
  item:{label:'아이템',color:'#d4a544',cls:''},
  place:{label:'장소',color:'#4a8aac',cls:''},
  'session-log':{label:'세션 메모',color:'var(--session)',cls:'session-b'}
};

function uid(){return 'id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function ytId(u){if(!u)return null;var m=u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);return m?m[1]:null}

function defaultData(){
  var r=uid(),k=uid();
  return{
    platforms:[
      {id:r,name:'Roll20',color:'#5b9cf5',commands:[
        {id:uid(),label:'/desc',snippet:'/desc ',category:'기본'},
        {id:uid(),label:'굵게',snippet:'**굵은 글씨**',category:'서식'},
        {id:uid(),label:'색 강조',snippet:'<span style="color:#c0392b">텍스트</span>',category:'서식'},
        {id:uid(),label:'/emas',snippet:'/emas "이름" ',category:'기본'},
        {id:uid(),label:'/as',snippet:'/as "이름" ',category:'기본'},
        {id:uid(),label:'/w gm',snippet:'/w gm ',category:'기본'}
      ]},
      {id:k,name:'코코포리아',color:'#9878c8',commands:[
        {id:uid(),label:'귓속말',snippet:'((귓속말: ))',category:'기본'},
        {id:uid(),label:'설명',snippet:'【설명】',category:'기본'}
      ]}
    ],
    scenarios:[],
    cloud:{provider:'gist',token:'',gistId:''},
    theme:'dark'
  };
}

// ========== STATE ==========
var S={
  data:loadData(),
  mode:'edit',
  gmMode:true,
  platformId:null,
  scenarioId:null,
  partId:null,
  sceneId:null,
  endingId:null,
  openParts:{},
  recent:loadRecent(),
  history:[],historyIdx:-1,historyTimer:null,isRestoring:false,
  libTab:'npcs',openLibId:null,
  openCmdId:null
};

function loadData(){var d;try{var r=localStorage.getItem(SK);d=r?JSON.parse(r):defaultData()}catch(e){d=defaultData()}migrate(d);return d}
function loadRecent(){try{var r=localStorage.getItem(RK);return r?JSON.parse(r):[]}catch(e){return[]}}

function migrate(d){
  if(!d.cloud)d.cloud={provider:'gist',token:'',gistId:''};
  if(!d.theme)d.theme='dark';
  d.scenarios.forEach(function(sc){
    if(!sc.library)sc.library={npcs:[],items:[],places:[]};
    ['npcs','items','places'].forEach(function(k){if(!Array.isArray(sc.library[k]))sc.library[k]=[]});
    if(!Array.isArray(sc.endingTypes))sc.endingTypes=JSON.parse(JSON.stringify(DEFAULT_ENDING_TYPES));
    if(!Array.isArray(sc.endings))sc.endings=[];
    if(!Array.isArray(sc.clues))sc.clues=[];
    if(!Array.isArray(sc.pcs))sc.pcs=[];
    if(!Array.isArray(sc.eventTimeline))sc.eventTimeline=[];
    if(!Array.isArray(sc.sessionHistory))sc.sessionHistory=[];
    if(!sc.setting)sc.setting='';
    if(!sc.synopsis)sc.synopsis='';
    sc.endings.forEach(function(e){
      if(!Array.isArray(e.blocks))e.blocks=[];
      if(typeof e.condition!=='string')e.condition='';
      if(!e.endingType)e.endingType='normal';
    });
    sc.clues.forEach(function(c){
      if(!c.id)c.id=uid();
      if(!c.name)c.name='';
      if(!c.description)c.description='';
      if(!c.foundInSceneId)c.foundInSceneId='';
      if(!c.leadsToSceneId)c.leadsToSceneId='';
      if(typeof c.isRedHerring==='undefined')c.isRedHerring=false;
      if(!c.leadsTo)c.leadsTo='';
    });
    sc.pcs.forEach(function(pc){
      if(!pc.id)pc.id=uid();
      if(!pc.name)pc.name='';
      if(typeof pc.hp==='undefined')pc.hp=10;
      if(typeof pc.hpMax==='undefined')pc.hpMax=10;
      if(typeof pc.san==='undefined')pc.san=50;
      if(typeof pc.sanMax==='undefined')pc.sanMax=50;
      if(typeof pc.dex==='undefined')pc.dex=50;
      if(!pc.skills)pc.skills='';
      if(!pc.notes)pc.notes='';
    });
    (sc.parts||[]).forEach(function(p){
      (p.scenes||[]).forEach(function(s){
        if(!Array.isArray(s.blocks)){
          var blocks=[];
          if(s.content)blocks.push({id:uid(),type:'text',label:'나레이션',content:s.content});
          if(s.keeperMemo)blocks.push({id:uid(),type:'memo',label:'키퍼 메모',content:s.keeperMemo});
          if(!blocks.length)blocks.push({id:uid(),type:'text',label:'나레이션',content:''});
          s.blocks=blocks;
          delete s.content;delete s.keeperMemo;
        }
        if(!s.location)s.location='';
        if(!s.timeOfDay)s.timeOfDay='';
        if(!s.npcsPresent)s.npcsPresent='';
        if(!Array.isArray(s.sessionLog))s.sessionLog=[];
        if(!Array.isArray(s.connections))s.connections=[];
      });
    });
  });
  // migrate global library to per-scenario if exists
  if(d.library){
    d.scenarios.forEach(function(sc){
      if(!sc.library.npcs.length&&d.library.npcs)sc.library.npcs=JSON.parse(JSON.stringify(d.library.npcs));
      if(!sc.library.items.length&&d.library.items)sc.library.items=JSON.parse(JSON.stringify(d.library.items));
      if(!sc.library.places.length&&d.library.places)sc.library.places=JSON.parse(JSON.stringify(d.library.places));
    });
    delete d.library;
  }
}

function save(){
  try{localStorage.setItem(SK,JSON.stringify(S.data));updateSaveInd()}catch(e){toast('저장 실패')}
  scheduleHistory();
}
function updateSaveInd(){var el=$('save-ind');if(!el)return;var n=new Date();el.textContent='saved '+p2(n.getHours())+':'+p2(n.getMinutes())+':'+p2(n.getSeconds())}
function p2(n){return n<10?'0'+n:''+n}

// ========== HISTORY ==========
function snapData(){return JSON.stringify(S.data)}
function pushHistory(){
  if(S.isRestoring)return;
  var snap=snapData();
  if(S.historyIdx>=0&&S.history[S.historyIdx]===snap)return;
  S.history=S.history.slice(0,S.historyIdx+1);
  S.history.push(snap);
  if(S.history.length>50)S.history.shift();
  S.historyIdx=S.history.length-1;
  updateUndoRedo();
}
function scheduleHistory(){if(S.isRestoring)return;clearTimeout(S.historyTimer);S.historyTimer=setTimeout(pushHistory,500)}
function resetHistory(){S.history=[snapData()];S.historyIdx=0;updateUndoRedo()}
function updateUndoRedo(){
  var u=$('undo-btn'),r=$('redo-btn');
  if(u)u.disabled=S.historyIdx<=0;
  if(r)r.disabled=S.historyIdx>=S.history.length-1;
}
function restoreHistory(i){
  if(i<0||i>=S.history.length)return;
  S.isRestoring=true;S.historyIdx=i;
  S.data=JSON.parse(S.history[i]);migrate(S.data);
  validateSelection();
  try{localStorage.setItem(SK,JSON.stringify(S.data));updateSaveInd()}catch(e){}
  render();S.isRestoring=false;updateUndoRedo();
}
function undo(){clearTimeout(S.historyTimer);if(S.historyIdx<=0){toast('더 이상 되돌릴 수 없어요');return}restoreHistory(S.historyIdx-1);toast('실행 취소')}
function redo(){if(S.historyIdx>=S.history.length-1){toast('다시 실행할 내용 없음');return}restoreHistory(S.historyIdx+1);toast('다시 실행')}

// ========== HELPERS ==========
function $(id){return document.getElementById(id)}
function toast(msg){var t=$('toast');t.textContent=msg;t.className='toast show';clearTimeout(toast._t);toast._t=setTimeout(function(){t.className='toast'},1600)}
function toastUndo(label,fn){
  var t=$('toast');t.innerHTML='';var handled=false;
  var sp=document.createElement('span');sp.textContent=label+' 삭제됨';
  var btn=document.createElement('button');btn.className='toast-undo';btn.textContent='되돌리기';
  btn.onclick=function(){if(handled)return;handled=true;t.className='toast';fn()};
  t.appendChild(sp);t.appendChild(btn);t.className='toast show action';
  clearTimeout(toast._t);toast._t=setTimeout(function(){t.className='toast'},5000);
}

function getPlatform(id){return S.data.platforms.find(function(p){return p.id===id})}
function getScenario(id){return S.data.scenarios.find(function(s){return s.id===id})}
function curScenario(){return getScenario(S.scenarioId)}
function curPart(){var sc=curScenario();return sc&&sc.parts.find(function(p){return p.id===S.partId})}
function curScene(){var p=curPart();return p&&p.scenes.find(function(s){return s.id===S.sceneId})}
function curEnding(){if(!S.endingId)return null;var sc=curScenario();return sc&&sc.endings.find(function(e){return e.id===S.endingId})}
function curPlatform(){var sc=curScenario();return sc&&getPlatform(sc.platformId)}
function findBlock(entry,id){return(entry.blocks||[]).find(function(b){return b.id===id})}

function validateSelection(){
  if(S.platformId&&!getPlatform(S.platformId))S.platformId=null;
  if(S.scenarioId){var sc=getScenario(S.scenarioId);if(!sc){S.scenarioId=null;S.partId=null;S.sceneId=null;S.endingId=null}
  else{if(!S.platformId)S.platformId=sc.platformId;
    if(S.partId){var pt=sc.parts.find(function(p){return p.id===S.partId});if(!pt){S.partId=null;S.sceneId=null}
    else if(S.sceneId&&!pt.scenes.find(function(s){return s.id===S.sceneId}))S.sceneId=null}
    if(S.endingId&&!sc.endings.find(function(e){return e.id===S.endingId}))S.endingId=null
  }}
  if(!S.platformId&&S.data.platforms.length)S.platformId=S.data.platforms[0].id;
}

function moveInArr(arr,id,dir){
  var i=arr.findIndex(function(x){return x.id===id}),j=i+dir;
  if(i===-1||j<0||j>=arr.length)return;
  var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;
}

function flatScenes(sc){
  var out=[];sc.parts.forEach(function(p){p.scenes.forEach(function(s){out.push({partId:p.id,sceneId:s.id,partTitle:p.title,sceneTitle:s.title})})});return out;
}

function trackRecent(scenarioId,partId,sceneId){
  S.recent=S.recent.filter(function(r){return r.sceneId!==sceneId});
  S.recent.unshift({scenarioId:scenarioId,partId:partId,sceneId:sceneId,t:Date.now()});
  S.recent=S.recent.slice(0,8);
  try{localStorage.setItem(RK,JSON.stringify(S.recent))}catch(e){}
}

function selectScene(platformId,scenarioId,partId,sceneId){
  S.platformId=platformId;S.scenarioId=scenarioId;S.partId=partId;S.sceneId=sceneId;S.endingId=null;
  if(partId)S.openParts[partId]=true;
}
function selectEnding(platformId,scenarioId,endingId){
  S.platformId=platformId;S.scenarioId=scenarioId;S.endingId=endingId;S.partId=null;S.sceneId=null;
}

function autoResize(el){el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px'}
function autoResizeAll(root){(root||document).querySelectorAll('textarea').forEach(autoResize)}
document.addEventListener('input',function(e){if(e.target&&e.target.tagName==='TEXTAREA')autoResize(e.target)});

function copyText(text,btn){
  var done=function(){var orig=btn.innerHTML;btn.classList.add('copied');btn.innerHTML=ICONS.check+' 복사됨';setTimeout(function(){btn.classList.remove('copied');btn.innerHTML=orig},1000)};
  if(navigator.clipboard)navigator.clipboard.writeText(text||'').then(done).catch(function(){done()});else done();
}

function insertAtCursor(ta,text){
  if(!ta)return;var s=ta.selectionStart,e=ta.selectionEnd,v=ta.value;
  ta.value=v.slice(0,s)+text+v.slice(e);ta.selectionStart=ta.selectionEnd=s+text.length;
  ta.focus();ta.dispatchEvent(new Event('input',{bubbles:true}));
}

function openPrompt(title,initial,cb){
  var m=$('prompt-modal');$('prompt-title').textContent=title;
  var inp=$('prompt-input');inp.value=initial||'';m.hidden=false;
  setTimeout(function(){inp.focus();inp.select()},30);
  function close(){m.hidden=true;cleanup()}
  function ok(){var v=inp.value.trim();close();cb(v)}
  function key(e){if(e.key==='Enter')ok();if(e.key==='Escape')close()}
  function cleanup(){$('prompt-ok').removeEventListener('click',ok);$('prompt-cancel').removeEventListener('click',close);inp.removeEventListener('keydown',key)}
  $('prompt-ok').addEventListener('click',ok);$('prompt-cancel').addEventListener('click',close);inp.addEventListener('keydown',key);
}

// ========== RENDER ==========
function render(){renderPlatformTabs();renderScenarioList();renderEndingsList();renderCluesList();renderPCList();renderSessionList();renderTree();renderMain()}

function renderPlatformTabs(){
  var w=$('platform-tabs-wrap');
  var h='<div class="sb-title">platforms/</div>';
  S.data.platforms.forEach(function(p){
    var on=p.id===S.platformId;
    h+='<div class="s-item'+(on?' on':'')+'" data-plat="'+p.id+'"><span style="width:7px;height:7px;border-radius:50%;background:'+p.color+';flex-shrink:0"></span><span class="s-item-t">'+esc(p.name)+'</span></div>';
  });
  h+='<button class="add-btn" id="plat-add-btn">+ 사이트</button>';
  w.innerHTML=h;
  w.querySelectorAll('[data-plat]').forEach(function(el){
    el.onclick=function(){S.platformId=el.dataset.plat;S.scenarioId=null;S.partId=null;S.sceneId=null;S.endingId=null;render()}
  });
  var ab=w.querySelector('#plat-add-btn');if(ab)ab.onclick=openPlatformModal;
}

function renderScenarioList(){
  var w=$('scenario-list');
  var list=S.data.scenarios.filter(function(s){return s.platformId===S.platformId});
  if(!list.length){w.innerHTML='<div style="color:var(--faint);font-size:11px;text-align:center;padding:12px">시나리오 없음</div>';return}
  var h='';
  list.forEach(function(s){
    h+='<div class="s-item'+(s.id===S.scenarioId?' on':'')+'" data-sc="'+s.id+'"><span class="s-item-t">'+esc(s.title)+'</span><button class="ib" data-sc-del="'+s.id+'" title="삭제" style="flex-shrink:0">✕</button></div>';
  });
  w.innerHTML=h;
  w.querySelectorAll('[data-sc]').forEach(function(el){
    el.onclick=function(ev){if(ev.target.closest('[data-sc-del]'))return;S.scenarioId=el.dataset.sc;S.partId=null;S.sceneId=null;S.endingId=null;render()}
  });
  w.querySelectorAll('[data-sc-del]').forEach(function(btn){
    btn.onclick=function(ev){ev.stopPropagation();var id=btn.dataset.scDel,sc=getScenario(id);if(!sc||!confirm('"'+sc.title+'" 시나리오를 삭제할까요?'))return;
      var idx=S.data.scenarios.findIndex(function(s){return s.id===id});
      S.data.scenarios=S.data.scenarios.filter(function(s){return s.id!==id});
      if(S.scenarioId===id){S.scenarioId=null;S.partId=null;S.sceneId=null;S.endingId=null}
      save();render();toastUndo('"'+sc.title+'"',function(){S.data.scenarios.splice(idx,0,sc);save();render()})
    }
  });
}

function renderEndingsList(){
  var sec=$('endings-section'),w=$('endings-list');
  var sc=curScenario();if(!sc){sec.hidden=true;return}sec.hidden=false;
  var endings=sc.endings;
  if(!endings.length){w.innerHTML='<div style="color:var(--faint);font-size:11px;padding:4px 8px">엔딩 없음</div>';return}
  var h='';
  endings.forEach(function(e){
    var et=sc.endingTypes.find(function(t){return t.id===e.endingType})||{label:'?',color:'#888'};
    h+='<div class="end-item'+(e.id===S.endingId?' on':'')+'" data-end="'+e.id+'"><span class="end-dot" style="background:'+et.color+'"></span><span class="s-item-t">'+esc(e.title||'(제목 없음)')+'</span><span class="end-type">'+esc(et.label)+'</span></div>';
  });
  w.innerHTML=h;
  w.querySelectorAll('[data-end]').forEach(function(el){
    el.onclick=function(){selectEnding(S.platformId,S.scenarioId,el.dataset.end);renderEndingsList();renderTree();renderMain()}
  });
}

function renderCluesList(){
  var sec=$('clues-section'),w=$('clues-list');
  var sc=curScenario();if(!sc){sec.hidden=true;return}sec.hidden=false;
  var clues=sc.clues;
  if(!clues.length){w.innerHTML='<div style="color:var(--faint);font-size:11px;padding:4px 8px">단서 없음</div>';return}
  var h='';
  clues.forEach(function(c){
    var linkLabel='';
    if(c.leadsToSceneId){
      var found=null;sc.parts.forEach(function(p){p.scenes.forEach(function(s){if(s.id===c.leadsToSceneId)found=s})});
      if(found)linkLabel='→ '+found.title;
    }
    h+='<div class="clue-item" data-clue="'+c.id+'" title="'+esc(c.description)+'">';
    h+='<span class="clue-dot"'+(c.isRedHerring?' style="background:var(--danger)"':'')+'></span>';
    h+='<span class="s-item-t">'+esc(c.name||'(이름 없음)')+'</span>';
    if(c.isRedHerring)h+='<span class="clue-rh">미끼</span>';
    if(c.leadsTo)h+='<span class="clue-leads">→'+esc(c.leadsTo)+'</span>';
    else if(linkLabel)h+='<span class="clue-link">'+esc(linkLabel)+'</span>';
    h+='</div>';
  });
  w.innerHTML=h;
}

function renderTree(){
  var w=$('tree');var sc=curScenario();
  if(!sc){w.innerHTML='<div style="color:var(--faint);font-size:11px;text-align:center;padding:20px">시나리오를 선택하세요</div>';return}
  var h='';
  sc.parts.forEach(function(part,pi){
    var isOpen=!!S.openParts[part.id];
    var dc=part.scenes.filter(function(s){return s.done}).length;
    h+='<div class="part-block'+(isOpen?' open':'')+'" data-part="'+part.id+'">';
    h+='<div class="part-head" data-pt="'+part.id+'"><span class="part-chev">▸</span><span class="part-title">'+esc(part.title)+'</span><span class="part-ct">'+dc+'/'+part.scenes.length+'</span>';
    h+='<span class="part-actions">';
    h+='<button class="ib" data-pt-up="'+part.id+'" title="위로"'+(pi===0?' disabled':'')+'>↑</button>';
    h+='<button class="ib" data-pt-down="'+part.id+'" title="아래로"'+(pi===sc.parts.length-1?' disabled':'')+'>↓</button>';
    h+='<button class="ib" data-pt-rename="'+part.id+'" title="이름 변경">✎</button>';
    h+='<button class="ib" data-pt-del="'+part.id+'" title="삭제">✕</button>';
    h+='</span></div>';
    h+='<div class="scene-list">';
    part.scenes.forEach(function(scene,si){
      var on=scene.id===S.sceneId&&part.id===S.partId;
      h+='<div class="sc-item'+(on?' on':'')+(scene.done?' done':'')+'" data-scene="'+scene.id+'" data-scene-part="'+part.id+'">';
      h+='<input type="checkbox" data-sc-done="'+scene.id+'" data-sc-done-part="'+part.id+'"'+(scene.done?' checked':'')+' style="accent-color:var(--accent);margin:0;cursor:pointer" title="완료 표시">';
      h+='<span class="s-item-t">'+esc(scene.title)+'</span>';
      h+='<span class="sc-actions">';
      h+='<button class="ib" data-sc-dup="'+scene.id+'" data-sc-dup-part="'+part.id+'" title="복제">⊕</button>';
      h+='<button class="ib" data-sc-del="'+scene.id+'" data-sc-del-part="'+part.id+'" title="삭제">✕</button>';
      h+='</span></div>';
    });
    h+='<div class="add-btn" data-add-scene="'+part.id+'" style="margin:4px 0 2px">+ 씬</div>';
    h+='</div></div>';
  });
  h+='<div class="add-btn" data-add-part style="margin-top:4px">+ 파트</div>';
  w.innerHTML=h;

  w.querySelectorAll('[data-pt]').forEach(function(el){
    el.onclick=function(ev){if(ev.target.closest('.part-actions'))return;var id=el.dataset.pt;S.openParts[id]=!S.openParts[id];renderTree()}
  });
  w.querySelectorAll('[data-pt-up]').forEach(function(b){b.onclick=function(ev){ev.stopPropagation();moveInArr(sc.parts,b.dataset.ptUp,-1);save();renderTree()}});
  w.querySelectorAll('[data-pt-down]').forEach(function(b){b.onclick=function(ev){ev.stopPropagation();moveInArr(sc.parts,b.dataset.ptDown,1);save();renderTree()}});
  w.querySelectorAll('[data-pt-rename]').forEach(function(b){b.onclick=function(ev){ev.stopPropagation();var p=sc.parts.find(function(x){return x.id===b.dataset.ptRename});openPrompt('파트 이름 변경',p.title,function(v){if(!v)return;p.title=v;save();renderTree()})}});
  w.querySelectorAll('[data-pt-del]').forEach(function(b){b.onclick=function(ev){ev.stopPropagation();var id=b.dataset.ptDel,p=sc.parts.find(function(x){return x.id===id});if(!p||!confirm('"'+p.title+'" 파트를 삭제할까요?'))return;var idx=sc.parts.findIndex(function(x){return x.id===id});sc.parts.splice(idx,1);if(S.partId===id){S.partId=null;S.sceneId=null}save();render();toastUndo('"'+p.title+'"',function(){sc.parts.splice(idx,0,p);save();render()})}});
  w.querySelectorAll('[data-scene]').forEach(function(el){
    el.onclick=function(ev){if(ev.target.closest('.sc-actions')||ev.target.type==='checkbox')return;selectScene(S.platformId,S.scenarioId,el.dataset.scenePart,el.dataset.scene);renderTree();renderMain()}
  });
  w.querySelectorAll('[data-sc-done]').forEach(function(cb){cb.onclick=function(ev){ev.stopPropagation()};cb.onchange=function(){var p=sc.parts.find(function(x){return x.id===cb.dataset.scDonePart});var s=p.scenes.find(function(x){return x.id===cb.dataset.scDone});s.done=cb.checked;save();renderTree()}});
  w.querySelectorAll('[data-sc-del]').forEach(function(b){b.onclick=function(ev){ev.stopPropagation();var pid=b.dataset.scDelPart,sid=b.dataset.scDel;var p=sc.parts.find(function(x){return x.id===pid});var s=p.scenes.find(function(x){return x.id===sid});if(!confirm('"'+s.title+'" 삭제?'))return;var idx=p.scenes.findIndex(function(x){return x.id===sid});p.scenes.splice(idx,1);if(S.sceneId===sid)S.sceneId=null;save();render();toastUndo('"'+s.title+'"',function(){p.scenes.splice(idx,0,s);save();render()})}});
  w.querySelectorAll('[data-sc-dup]').forEach(function(b){b.onclick=function(ev){ev.stopPropagation();var p=sc.parts.find(function(x){return x.id===b.dataset.scDupPart});var s=p.scenes.find(function(x){return x.id===b.dataset.scDup});var copy=JSON.parse(JSON.stringify(s));copy.id=uid();copy.title+=' (복사)';copy.done=false;var idx=p.scenes.findIndex(function(x){return x.id===s.id});p.scenes.splice(idx+1,0,copy);save();renderTree();toast('씬 복제됨')}});
  w.querySelectorAll('[data-add-scene]').forEach(function(el){
    el.onclick=function(){var partId=el.dataset.addScene;var part=curScenario().parts.find(function(p){return p.id===partId});
      openPrompt('새 씬 이름','',function(v){if(!v)return;
        var s={id:uid(),title:v,location:'',timeOfDay:'',npcsPresent:'',done:false,blocks:[{id:uid(),type:'text',label:'나레이션',content:''}],sessionLog:[],connections:[]};
        part.scenes.push(s);S.openParts[partId]=true;selectScene(S.platformId,S.scenarioId,partId,s.id);save();render()})
    }
  });
  w.querySelector('[data-add-part]').onclick=function(){
    openPrompt('새 파트 이름','',function(v){if(!v)return;
      var p={id:uid(),title:v,scenes:[]};curScenario().parts.push(p);S.openParts[p.id]=true;save();renderTree()})
  };
}

// ========== MAIN PANEL ==========
function renderMain(){
  var main=$('main');
  if(S.mode==='timeline'){renderTimeline(main);return}
  var ending=curEnding();
  if(ending){renderEndingEdit(main,ending);return}
  var scene=curScene();
  if(!scene){
    var sc=curScenario();
    if(sc&&S.mode==='edit'){renderScenarioOverview(main,sc);return}
    main.innerHTML='<div class="main-empty"><h3>씬을 선택해주세요</h3><p>왼쪽에서 시나리오와 파트를 고르고, 씬을 선택하거나 새로 만들면 여기에 내용이 나타나요.</p></div>';
    document.title='scenario-forge';return;
  }
  document.title=scene.title+' · scenario-forge';
  trackRecent(S.scenarioId,S.partId,S.sceneId);
  if(S.mode==='edit')renderEditMode(main,scene);
  else renderPlayMode(main,scene);
}

// ========== SCENARIO OVERVIEW ==========
function renderScenarioOverview(main,sc){
  var h='<div class="crumb">'+esc((curPlatform()||{}).name||'')+'</div>';
  h+='<input class="sc-title-input" id="sc-overview-title" value="'+esc(sc.title)+'" style="margin-bottom:16px">';
  h+='<div class="block memo"><div class="blk-head"><span class="blk-label">시나리오 배경/설정</span></div><div class="blk-body"><textarea class="field-ta" id="sc-setting" placeholder="시대, 장소, 분위기, 전제 조건 등">'+esc(sc.setting)+'</textarea></div></div>';
  h+='<div class="block"><div class="blk-head"><span class="blk-label">시놉시스</span></div><div class="blk-body"><textarea class="field-ta" id="sc-synopsis" placeholder="전체 줄거리 요약 (GM 전용)">'+esc(sc.synopsis)+'</textarea></div></div>';
  // Stats
  var totalScenes=0,doneScenes=0,totalBlocks=0;
  sc.parts.forEach(function(p){p.scenes.forEach(function(s){totalScenes++;if(s.done)doneScenes++;totalBlocks+=s.blocks.length})});
  h+='<div style="display:flex;gap:16px;padding:12px 0;font-family:var(--font-mono);font-size:12px;color:var(--muted)">';
  h+='<span>씬 '+doneScenes+'/'+totalScenes+'</span>';
  h+='<span>블록 '+totalBlocks+'</span>';
  h+='<span>엔딩 '+sc.endings.length+'</span>';
  h+='<span>단서 '+sc.clues.length+'</span>';
  h+='</div>';
  // Ending types
  h+='<div style="margin-top:14px"><div class="sb-title" style="margin-bottom:8px">엔딩 타입 관리</div>';
  h+='<div class="et-pills" id="et-pills-overview">';
  sc.endingTypes.forEach(function(et){h+='<span class="et-pill" style="background:'+et.color+';color:#fff;border-color:'+et.color+'">'+esc(et.label)+'</span>'});
  h+='<button class="et-pill-add" id="open-et-manager">✎ 편집</button>';
  h+='</div></div>';
  // 3-Clue Validation
  h+='<div style="margin-top:14px"><div class="sb-title" style="margin-bottom:8px">3단서 법칙 검증</div>';
  var conclusions={};
  sc.clues.forEach(function(c){
    if(!c.leadsTo||c.isRedHerring)return;
    if(!conclusions[c.leadsTo])conclusions[c.leadsTo]=0;
    conclusions[c.leadsTo]++;
  });
  var conclusionKeys=Object.keys(conclusions);
  if(!conclusionKeys.length&&sc.clues.length){h+='<div style="font-size:11px;color:var(--faint);padding:4px 0">단서의 "연결 결론" 필드를 채우면 여기서 검증 결과를 볼 수 있어요.</div>'}
  else if(!conclusionKeys.length){h+='<div style="font-size:11px;color:var(--faint);padding:4px 0">단서를 먼저 추가하세요.</div>'}
  else{conclusionKeys.forEach(function(key){
    var cnt=conclusions[key];
    var cls=cnt>=3?'ok':cnt>=2?'warn':'bad';
    var icon=cnt>=3?'✓':cnt>=2?'△':'✕';
    h+='<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span class="clue-valid '+cls+'">'+icon+' '+cnt+'/3</span><span style="font-size:12px;color:var(--ink)">'+esc(key)+'</span></div>';
  })}
  h+='</div>';
  // Event Timeline
  h+='<div style="margin-top:14px"><div class="sb-title" style="margin-bottom:8px">사건 연표 <button class="ib" id="add-evt-btn" title="사건 추가">+</button></div>';
  if(!sc.eventTimeline.length){h+='<div style="font-size:11px;color:var(--faint);padding:4px 0">"탐사자가 개입하지 않았을 때 무슨 일이 벌어지는지" 시간순으로 기록하세요.</div>'}
  else{sc.eventTimeline.forEach(function(ev,i){
    h+='<div class="evt-row'+(ev.isHidden?' evt-hidden':'')+'"><span class="evt-time"><input style="border:none;background:transparent;font:inherit;color:inherit;width:100%;outline:none" data-evt-time="'+i+'" value="'+esc(ev.time)+'" placeholder="시간"></span>';
    h+='<span class="evt-text"><input style="border:none;background:transparent;font:inherit;color:inherit;width:100%;outline:none" data-evt-text="'+i+'" value="'+esc(ev.event)+'" placeholder="사건 내용"></span>';
    h+='<button class="ib" data-evt-hide="'+i+'" title="'+(ev.isHidden?'공개':'숨김')+'">'+(ev.isHidden?'◌':'◉')+'</button>';
    h+='<button class="ib" data-evt-del="'+i+'" title="삭제">✕</button></div>';
  })}
  h+='</div>';
  // Export single scenario
  h+='<div style="margin-top:14px"><button class="tb primary" id="export-single">이 시나리오만 내보내기</button> <button class="tb" id="import-merge">시나리오 병합 불러오기</button><input type="file" id="merge-file" accept=".json" hidden></div>';
  main.innerHTML=h;
  $('sc-overview-title').oninput=function(e){sc.title=e.target.value;save();renderScenarioList()};
  $('sc-setting').oninput=function(){sc.setting=this.value;save()};
  $('sc-synopsis').oninput=function(){sc.synopsis=this.value;save()};
  var etBtn=$('open-et-manager');if(etBtn)etBtn.onclick=function(){openEndingTypeManager(sc)};
  // Event timeline bindings
  var addEvt=$('add-evt-btn');if(addEvt)addEvt.onclick=function(){sc.eventTimeline.push({id:uid(),time:'',event:'',isHidden:false});save();renderScenarioOverview(main,sc)};
  main.querySelectorAll('[data-evt-time]').forEach(function(inp){inp.oninput=function(){sc.eventTimeline[parseInt(inp.dataset.evtTime)].time=inp.value;save()}});
  main.querySelectorAll('[data-evt-text]').forEach(function(inp){inp.oninput=function(){sc.eventTimeline[parseInt(inp.dataset.evtText)].event=inp.value;save()}});
  main.querySelectorAll('[data-evt-hide]').forEach(function(b){b.onclick=function(){var i=parseInt(b.dataset.evtHide);sc.eventTimeline[i].isHidden=!sc.eventTimeline[i].isHidden;save();renderScenarioOverview(main,sc)}});
  main.querySelectorAll('[data-evt-del]').forEach(function(b){b.onclick=function(){sc.eventTimeline.splice(parseInt(b.dataset.evtDel),1);save();renderScenarioOverview(main,sc)}});
  // Export/merge
  $('export-single').onclick=function(){exportSingleScenario(sc)};
  $('import-merge').onclick=function(){$('merge-file').click()};
  $('merge-file').onchange=function(e){if(e.target.files&&e.target.files[0])mergeImport(e.target.files[0]);e.target.value=''};
  autoResizeAll(main);
}

// ========== EDIT MODE ==========
function renderEditMode(main,scene){
  var sc=curScenario(),part=curPart(),plat=curPlatform();
  var h='<div class="crumb">'+esc((plat||{}).name||'')+' / '+esc(sc.title)+' / '+esc(part.title)+'</div>';
  h+='<input class="sc-title-input" id="edit-title" value="'+esc(scene.title)+'">';
  // Metadata
  h+='<div class="sc-meta">';
  h+='<div class="meta-field"><span class="meta-label">loc</span><input class="meta-input" id="meta-loc" value="'+esc(scene.location)+'" placeholder="장소"></div>';
  h+='<div class="meta-field"><span class="meta-label">time</span><input class="meta-input" id="meta-time" value="'+esc(scene.timeOfDay)+'" placeholder="시간대"></div>';
  h+='<div class="meta-field"><span class="meta-label">npc</span><input class="meta-input" id="meta-npc" value="'+esc(scene.npcsPresent)+'" placeholder="등장인물"></div>';
  h+='</div>';
  // Scene connections
  h+='<div style="margin-bottom:12px"><span class="meta-label">connections</span> ';
  (scene.connections||[]).forEach(function(c,i){
    var target=null;sc.parts.forEach(function(p){p.scenes.forEach(function(s){if(s.id===c.targetSceneId)target=s})});
    h+='<span class="clue-tag" style="background:var(--accent-soft);color:var(--accent)">→ '+esc(target?target.title:'?')+' <button class="ib" data-rm-conn="'+i+'" style="width:14px;height:14px;font-size:9px;color:inherit">✕</button></span>';
  });
  h+='<button class="cmd-chip" id="add-conn-btn">+ 연결</button></div>';
  // Roll20 preview
  var isRoll20=plat&&plat.name.toLowerCase().indexOf('roll20')!==-1;
  var isCoco=plat&&(plat.name.indexOf('코코')!==-1||plat.name.toLowerCase().indexOf('coco')!==-1||plat.name.toLowerCase().indexOf('ccfolia')!==-1);
  if(isRoll20){
    h+='<div class="r20-preview" id="r20-preview"><div class="r20-preview-head"><span class="r20-title"><span class="r20-dot"></span>Roll20 Chat Preview</span><button class="ib" id="r20-refresh" title="새로고침" style="color:#888">↻</button></div><div class="r20-chat" id="r20-body"></div></div>';
  }
  if(isCoco){
    h+='<div class="coco-preview" id="coco-preview"><div class="coco-preview-head"><span>코코포리아 미리보기</span><button class="ib" id="coco-refresh" title="새로고침" style="color:#888">↻</button></div><div class="coco-chat" id="coco-body"></div></div>';
  }
  h+='<div id="float-cmd" hidden></div>';
  h+='<div id="block-list"></div>';
  h+='<div class="add-block-bar">';
  Object.keys(BLOCK_TYPES).forEach(function(type){
    h+='<button class="add-btn add-block-btn" data-add-block="'+type+'">'+BLOCK_TYPES[type].label+'</button>';
  });
  h+='</div>';
  main.innerHTML=h;

  // Bindings
  $('edit-title').oninput=function(e){scene.title=e.target.value;save();renderTree()};
  $('meta-loc').oninput=function(){scene.location=this.value;save()};
  $('meta-time').oninput=function(){scene.timeOfDay=this.value;save()};
  $('meta-npc').oninput=function(){scene.npcsPresent=this.value;save()};

  // Connections
  main.querySelectorAll('[data-rm-conn]').forEach(function(btn){
    btn.onclick=function(ev){ev.stopPropagation();scene.connections.splice(parseInt(btn.dataset.rmConn),1);save();renderMain()}
  });
  var addConnBtn=$('add-conn-btn');
  if(addConnBtn)addConnBtn.onclick=function(){
    var flat=flatScenes(sc).filter(function(f){return f.sceneId!==scene.id});
    if(!flat.length){toast('연결할 씬이 없어요');return}
    var names=flat.map(function(f){return f.sceneTitle}).join(', ');
    openPrompt('연결할 씬 이름 ('+names+')','',function(v){
      if(!v)return;var target=flat.find(function(f){return f.sceneTitle===v});
      if(!target){toast('일치하는 씬을 찾을 수 없어요');return}
      scene.connections.push({targetSceneId:target.sceneId,label:''});save();renderMain()
    })
  };

  // Platform previews
  if(isRoll20){
    updateR20Preview(scene);
    var r20r=$('r20-refresh');if(r20r)r20r.onclick=function(){updateR20Preview(scene)};
  }
  if(isCoco){
    updateCocoPreview(scene);
    var cocor=$('coco-refresh');if(cocor)cocor.onclick=function(){updateCocoPreview(scene)};
  }

  // Block buttons
  main.querySelectorAll('[data-add-block]').forEach(function(btn){
    btn.onclick=function(){
      var type=btn.dataset.addBlock;
      var block={id:uid(),type:type,label:BLOCK_TYPES[type].label};
      if(type==='text'||type==='memo'||type==='truth')block.content='';
      if(type==='branches'||type==='checks'||type==='lines')block.items=[];
      if(type==='npc'){block.name='';block.imageUrl='';block.role='';block.traits='';block.lines=''}
      if(type==='handout'){block.title='';block.content='';block.gmNote=''}
      if(type==='bgm'){block.title='';block.url='';block.note=''}
      if(type==='item'||type==='place'){block.name='';block.imageUrl='';block.description='';block.gmNote=''}
      if(type==='clue'){block.clueId='';block.content=''}
      if(type==='session-log'){block.content=''}
      scene.blocks.push(block);save();renderBlockList(scene,plat)
    }
  });
  renderBlockList(scene,plat);
}

// ========== ROLL20 PREVIEW ENGINE ==========
// Reproduces Roll20's actual chat rendering:
// - Markdown: *italic* **bold** ***both***
// - Oosh CSS hack: [text](#" style="CSS;) → <a> with inline style
// - Commands: /desc /emas /as /em /ooc /w gm
// - Images: [alt](url.png) or bare image URLs
// - Inline rolls: [[expr]] → yellow roll box
// - Query prompts: ?{question|default} → dashed placeholder
// - API buttons: [label](!cmd) → pink button

// Allowed CSS properties in Roll20 (whitelist for sanitization)
var R20_SAFE_CSS=/^(color|background-color|background-image|background|font-size|font-style|font-weight|font-family|text-decoration|text-align|text-shadow|text-transform|letter-spacing|line-height|display|padding|padding-top|padding-bottom|padding-left|padding-right|margin|margin-top|margin-bottom|margin-left|margin-right|border|border-radius|border-color|border-style|border-width|box-shadow|width|max-width|min-width|height|float|opacity|vertical-align|white-space|overflow|word-break|word-spacing)$/i;

function sanitizeR20Style(raw){
  // Parse style string, keep only safe properties
  return raw.split(';').map(function(decl){
    var parts=decl.split(':');if(parts.length<2)return'';
    var prop=parts[0].trim(),val=parts.slice(1).join(':').trim();
    if(!prop||!val)return'';
    if(!R20_SAFE_CSS.test(prop))return'';
    // Block javascript: or expression()
    if(/javascript\s*:|expression\s*\(/i.test(val))return'';
    return prop+':'+val;
  }).filter(Boolean).join(';');
}

// Character-by-character parser for Roll20 markdown link syntax
// Handles: Oosh CSS hack, API buttons, images, regular links, nested parens
function parseR20Links(raw){
  var out='',i=0,len=raw.length;
  while(i<len){
    // Look for [[ inline rolls FIRST (before single [ link)
    if(raw[i]==='['&&i+1<len&&raw[i+1]==='['){
      var rollEnd=raw.indexOf(']]',i+2);
      if(rollEnd===-1){out+=esc(raw[i]);i++;continue}
      var expr=raw.slice(i+2,rollEnd);
      out+=renderInlineRoll(expr);
      i=rollEnd+2;
      continue;
    }
    // Look for [ to start a markdown link
    else if(raw[i]==='['&&raw[i-1]!=='\\'){
      // Find matching ]
      var bracketStart=i+1,depth=1,j=i+1;
      while(j<len&&depth>0){
        if(raw[j]==='['&&raw[j-1]!=='\\')depth++;
        else if(raw[j]===']'&&raw[j-1]!=='\\')depth--;
        j++;
      }
      if(depth!==0){out+=esc(raw[i]);i++;continue}
      var linkText=raw.slice(bracketStart,j-1);
      // Now expect (
      if(j<len&&raw[j]==='('){
        // Find matching ) counting nested parens
        var parenStart=j+1,pdepth=1,k=j+1;
        while(k<len&&pdepth>0){
          if(raw[k]==='(')pdepth++;
          else if(raw[k]===')')pdepth--;
          k++;
        }
        if(pdepth!==0){out+=esc(raw.slice(i,k));i=k;continue}
        var href=raw.slice(parenStart,k-1);
        var rendered=classifyR20Link(linkText,href);
        out+=rendered;
        i=k;
        continue;
      }else{
        out+=esc(raw[i]);i++;continue;
      }
    }
    // Look for ?{query}
    else if(raw[i]==='?'&&i+1<len&&raw[i+1]==='{'){
      var qEnd=raw.indexOf('}',i+2);
      if(qEnd===-1){out+=esc(raw[i]);i++;continue}
      var qInner=raw.slice(i+2,qEnd);
      var qParts=qInner.split('|');
      var qLabel=qParts[0],qDef=qParts[1]||'';
      out+='<span class="r20-query" title="질문: '+esc(qLabel)+'">'+(qDef?esc(qDef):esc(qLabel))+'</span>';
      i=qEnd+1;
      continue;
    }
    else{
      out+=esc(raw[i]);i++;
    }
  }
  return out;
}

function classifyR20Link(text,href){
  // 1. Oosh CSS hack: href starts with #" style=" or ~something" style="
  var styleMatch=href.match(/^([^"]*)"?\s*style\s*=\s*"(.*)$/i);
  if(styleMatch){
    var cssRaw=styleMatch[2].replace(/"\s*$/, '').replace(/;\s*$/,';');
    var safe=sanitizeR20Style(cssRaw);
    // Parse inner text (may contain ?{query} or markdown)
    var inner=parseR20Inline(text);
    return'<a href="#" style="'+esc(safe)+'">'+inner+'</a>';
  }
  // 2. API button: href starts with !
  if(href.charAt(0)==='!'){
    return'<span class="r20-apibtn" title="API: '+esc(href)+'">'+esc(text)+'</span>';
  }
  // 3. Ability/macro call: href starts with ~ or %
  if(href.charAt(0)==='~'||href.charAt(0)==='%'){
    // Check if it also has injected style
    var abilStyleMatch=href.match(/^[~%][^"]*"?\s*style\s*=\s*"(.*)$/i);
    if(abilStyleMatch){
      var safe2=sanitizeR20Style(abilStyleMatch[1].replace(/"\s*$/,''));
      return'<span class="r20-apibtn" style="'+esc(safe2)+'">'+esc(text)+'</span>';
    }
    return'<span class="r20-apibtn">'+esc(text)+'</span>';
  }
  // 4. Image: URL ends in image extension
  if(/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(href)){
    return'<img class="r20-img" src="'+esc(href)+'" alt="'+esc(text)+'" onerror="this.style.display=\'none\'">';
  }
  // 5. Regular link
  if(/^https?:\/\//i.test(href)){
    return'<a href="'+esc(href)+'" style="color:#4a8acf;text-decoration:underline" target="_blank" rel="noopener">'+esc(text)+'</a>';
  }
  // 6. Compendium or other internal link
  return'<a href="#" style="color:#4a8acf" title="'+esc(href)+'">'+esc(text)+'</a>';
}

function renderInlineRoll(expr){
  var diceMatch=expr.match(/(\d*)d(\d+)/i);
  var result='?',cls='r20-iroll';
  if(diceMatch){
    var count=parseInt(diceMatch[1])||1,sides=parseInt(diceMatch[2]);
    var total=0;for(var n=0;n<count;n++)total+=Math.floor(Math.random()*sides)+1;
    result=total;
    if(count===1&&total===sides)cls+=' crit';
    if(count===1&&total===1)cls+=' fumble';
  }else{
    try{result=Function('"use strict";return ('+expr.replace(/[^0-9+\-*/().]/g,'')+')')()}catch(e){result='?'}
  }
  return'<span class="'+cls+'" title="'+esc(expr)+'">'+result+'</span>';
}

function parseR20Inline(raw){
  // Step 1: Parse links, rolls, queries with character-level parser
  var s=parseR20Links(raw);
  // Step 2: Handle HTML tags and markdown on the result
  s=parseR20Markup(s);
  return s;
}

function parseR20Markup(s){
  // At this point, s may contain already-rendered HTML from parseR20Links (like <a>, <span>, <img>)
  // We only apply markdown and HTML tag processing to text portions outside existing tags

  // Handle raw HTML tags in source text (user-typed <span style>, <b>, <i>, <br>)
  // These come through as &lt;span...&gt; because parseR20Links uses esc()
  s=s.replace(/&lt;span\s+style=&quot;([^&]*(?:&amp;[^&]*)*)&quot;&gt;/gi, function(_,style){
    var decoded=style.replace(/&amp;/g,'&').replace(/&quot;/g,'"');
    return'<span style="'+sanitizeR20Style(decoded)+'">';
  });
  s=s.replace(/&lt;\/span&gt;/gi,'</span>');
  s=s.replace(/&lt;b&gt;/gi,'<b>').replace(/&lt;\/b&gt;/gi,'</b>');
  s=s.replace(/&lt;i&gt;/gi,'<i>').replace(/&lt;\/i&gt;/gi,'</i>');
  s=s.replace(/&lt;br\s*\/?&gt;/gi,'<br>');
  s=s.replace(/&lt;img\s+src=&quot;([^&]*)&quot;[^&]*&gt;/gi, function(_,src){
    return'<img class="r20-img" src="'+src+'" onerror="this.style.display=\'none\'">';
  });

  // Markdown: ***bold italic*** before ** and * (only outside HTML tags)
  s=s.replace(/\*\*\*([^*]+)\*\*\*/g,'<b><i>$1</i></b>');
  s=s.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  s=s.replace(/(?<![\\*])\*([^*]+)\*/g,'<i>$1</i>');
  // Markdown code: ``code``
  s=s.replace(/``([^`]+)``/g,'<code style="background:#e8e6df;padding:1px 4px;border-radius:2px;font-family:monospace;font-size:12px">$1</code>');

  // Bare image URLs not already inside tags
  s=s.replace(/(?<!['"=])(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?)/gi, function(m,url){
    return'<img class="r20-img" src="'+url+'" onerror="this.style.display=\'none\'">';
  });

  return s;
}

function renderR20(text){
  if(!text)return'';
  var lines=text.split('\n'),out='';
  lines.forEach(function(line){
    if(!line.trim()){out+='<div class="r20-msg" style="height:4px;padding:0;border:none"></div>';return}

    // /desc text
    if(/^\/desc\s+/i.test(line)){
      out+='<div class="r20-msg desc">'+parseR20Inline(line.replace(/^\/desc\s+/i,''))+'</div>';return;
    }
    // /emas "Name" text
    var emasM=line.match(/^\/emas\s+"([^"]+)"\s*(.*)/i);
    if(emasM){out+='<div class="r20-msg emas"><span class="r20-name">'+esc(emasM[1])+'</span> '+parseR20Inline(emasM[2])+'</div>';return}
    // /as "Name" text
    var asM=line.match(/^\/as\s+"([^"]+)"\s*(.*)/i);
    if(asM){out+='<div class="r20-msg as"><span class="r20-name">'+esc(asM[1])+':</span> '+parseR20Inline(asM[2])+'</div>';return}
    // /em text (emote)
    var emM=line.match(/^\/em\s+(.*)/i);
    if(emM){out+='<div class="r20-msg em">'+parseR20Inline(emM[1])+'</div>';return}
    // /ooc text
    var oocM=line.match(/^\/ooc\s+(.*)/i);
    if(oocM){out+='<div class="r20-msg ooc">'+parseR20Inline(oocM[1])+'</div>';return}
    // /w gm text (whisper to GM)
    if(/^\/w\s+gm\s+/i.test(line)){out+='<div class="r20-msg whisper">'+parseR20Inline(line.replace(/^\/w\s+gm\s+/i,''))+'</div>';return}
    // /w "name" text (whisper to player)
    var wM=line.match(/^\/w\s+"([^"]+)"\s*(.*)/i);
    if(wM){out+='<div class="r20-msg whisper" style="border-left-color:#5080a0;background:#d0e0e8">'+parseR20Inline(wM[2])+'</div>';return}
    // /roll or /r — dice command
    var rollM=line.match(/^\/r(?:oll)?\s+(.*)/i);
    if(rollM){
      var expr=rollM[1];
      out+='<div class="r20-msg general" style="background:#fff8e0"><b style="color:#888;font-size:11px">Rolling '+esc(expr)+'</b><br>'+parseR20Inline('[['+expr+']]')+'</div>';return;
    }
    // General message
    out+='<div class="r20-msg general">'+parseR20Inline(line)+'</div>';
  });
  return out;
}

function updateR20Preview(scene){
  var body=$('r20-body');if(!body)return;
  var texts=[];
  (scene.blocks||[]).forEach(function(b){
    if((b.type==='text'||b.type==='memo'||b.type==='truth')&&b.content)texts.push(b.content);
    if(b.type==='lines'&&b.items)(b.items||[]).forEach(function(l){if(l.text)texts.push((l.label?'/as "'+l.label+'" ':'')+l.text)});
  });
  body.innerHTML=texts.length?renderR20(texts.join('\n')):'<span style="color:#999;font-size:12px;padding:8px;display:block">나레이션·대사 블록에 Roll20 명령어를 입력하면 여기 미리보기가 표시됩니다.<br><br>지원: /desc /emas /as /em /ooc /w gm /roll<br>서식: **굵게** *기울임* [텍스트](#" style="CSS;)<br>이미지: [alt](url.png)<br>주사위: [[1d100]] 질문: ?{이름|기본값}</span>';
}

// ========== BLOCK LIST (EDIT MODE) ==========
function renderBlockList(entry,plat){
  var w=$('block-list');if(!w)return;
  var h='';
  entry.blocks.forEach(function(block,idx){
    var meta=BLOCK_TYPES[block.type]||BLOCK_TYPES.text;
    var folded=block.collapsed;
    h+='<div class="block '+(meta.cls||'')+(block.indent?' indented':'')+(folded?' folded':'')+'" data-block="'+block.id+'" draggable="true" style="--block-border-color:'+meta.color+'">';
    h+='<div class="blk-head">';
    h+='<span class="grip" title="드래그">'+ICONS.grip+'</span>';
    h+='<span class="blk-label"><input class="blk-label-input" data-blk-label="'+block.id+'" value="'+esc(block.label)+'"></span>';
    if(folded)h+='<span class="fold-tag">접힘 ▸</span>';
    h+='<span class="blk-ctrl">';
    h+='<button class="ib'+(block.collapsed?' active':'')+'" data-blk-fold="'+block.id+'" title="접기/펼치기">⌃</button>';
    h+='<button class="ib'+(block.indent?' active':'')+'" data-blk-indent="'+block.id+'" title="들여쓰기">⇥</button>';
    h+='<button class="ib" data-blk-dup="'+block.id+'" title="복제">'+ICONS.dup+'</button>';
    h+='<button class="ib" data-blk-up="'+block.id+'" title="위로"'+(idx===0?' disabled':'')+'>↑</button>';
    h+='<button class="ib" data-blk-down="'+block.id+'" title="아래로"'+(idx===entry.blocks.length-1?' disabled':'')+'>↓</button>';
    h+='<button class="ib" data-blk-del="'+block.id+'" title="삭제">✕</button>';
    h+='</span></div>';

    if(!folded){
      h+='<div class="blk-body">';
      if(block.type==='text')h+=ta(block,'여기에 장면 지문, 대사, 묘사를 적어주세요.');
      else if(block.type==='memo')h+=ta(block,'GM 전용 메모, 진행 팁, 유의사항');
      else if(block.type==='truth')h+=ta(block,'사건의 진상 (GM 전용)');
      else if(block.type==='session-log')h+=ta(block,'세션 중 실제로 일어난 일, 즉흥 변경사항, 메모');
      else if(block.type==='clue'){
        var sc=curScenario(),clueOpts='<option value="">-- 단서 선택 --</option>';
        if(sc)(sc.clues||[]).forEach(function(c){clueOpts+='<option value="'+c.id+'"'+(block.clueId===c.id?' selected':'')+'>'+esc(c.name)+'</option>'});
        h+='<select data-blk-clue-sel="'+block.id+'" style="width:100%;padding:6px 8px;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);color:var(--ink);margin-bottom:6px;font-size:12px">'+clueOpts+'</select>';
        h+=ta(block,'이 씬에서 단서가 발견되는 상황, 조건, 힌트');
      }
      else if(block.type==='branches'){h+='<div data-branch-wrap="'+block.id+'"></div><button class="add-btn" data-add-branch="'+block.id+'">+ 분기</button>'}
      else if(block.type==='lines'){h+='<div data-line-wrap="'+block.id+'"></div><button class="add-btn" data-add-line="'+block.id+'">+ 대사</button>'}
      else if(block.type==='checks'){h+='<div data-check-wrap="'+block.id+'"></div><button class="add-btn" data-add-check="'+block.id+'">+ 판정</button>'}
      else if(block.type==='npc'){
        h+='<div class="ent-form"><div class="ent-form-row"><div class="ent-avatar"><img data-npc-pv="'+block.id+'" src="'+esc(block.imageUrl)+'" onerror="this.style.display=\'none\'"></div><div class="ent-fields">';
        h+='<input data-npc-f="name" data-npc-id="'+block.id+'" placeholder="NPC 이름" value="'+esc(block.name)+'">';
        h+='<input data-npc-f="role" data-npc-id="'+block.id+'" placeholder="역할" value="'+esc(block.role)+'">';
        h+='<input data-npc-f="imageUrl" data-npc-id="'+block.id+'" placeholder="이미지 URL" value="'+esc(block.imageUrl)+'">';
        h+='</div></div>';
        h+='<span class="sub-label">특징</span><textarea data-npc-f="traits" data-npc-id="'+block.id+'">'+esc(block.traits)+'</textarea>';
        h+='<span class="sub-label">대사 예시</span><textarea data-npc-f="lines" data-npc-id="'+block.id+'">'+esc(block.lines)+'</textarea>';
        h+='</div>';
      }
      else if(block.type==='handout'){
        h+='<div class="ent-form"><span class="sub-label" style="margin-top:0">제목</span><input type="text" data-ho-f="title" data-ho-id="'+block.id+'" value="'+esc(block.title)+'">';
        h+='<span class="sub-label">이미지 URL (선택)</span><input type="text" data-ho-f="imageUrl" data-ho-id="'+block.id+'" value="'+esc(block.imageUrl||'')+'" placeholder="https://...">';
        if(block.imageUrl)h+='<img src="'+esc(block.imageUrl)+'" style="max-width:200px;border-radius:var(--radius);margin:6px 0" onerror="this.style.display=\'none\'">';
        h+='<span class="sub-label">내용</span><textarea data-ho-f="content" data-ho-id="'+block.id+'">'+esc(block.content)+'</textarea>';
        h+='<span class="sub-label">GM 메모</span><textarea data-ho-f="gmNote" data-ho-id="'+block.id+'" style="background:var(--gold-soft)">'+esc(block.gmNote)+'</textarea></div>';
      }
      else if(block.type==='bgm'){
        h+='<div class="ent-form"><span class="sub-label" style="margin-top:0">트랙 이름</span><input type="text" data-bgm-f="title" data-bgm-id="'+block.id+'" value="'+esc(block.title)+'">';
        h+='<span class="sub-label">URL</span><input type="text" data-bgm-f="url" data-bgm-id="'+block.id+'" value="'+esc(block.url)+'">';
        h+='<span class="sub-label">메모</span><textarea data-bgm-f="note" data-bgm-id="'+block.id+'">'+esc(block.note)+'</textarea></div>';
      }
      else if(block.type==='item'||block.type==='place'){
        var ph=block.type==='item'?'아이템':'장소';
        h+='<div class="ent-form"><div class="ent-form-row"><div class="ent-avatar" style="border-radius:8px"><img data-ent-pv="'+block.id+'" src="'+esc(block.imageUrl)+'" onerror="this.style.display=\'none\'"></div><div class="ent-fields">';
        h+='<input data-ent-f="name" data-ent-id="'+block.id+'" placeholder="'+ph+' 이름" value="'+esc(block.name)+'">';
        h+='<input data-ent-f="imageUrl" data-ent-id="'+block.id+'" placeholder="이미지 URL" value="'+esc(block.imageUrl)+'">';
        h+='</div></div>';
        h+='<span class="sub-label">설명</span><textarea data-ent-f="description" data-ent-id="'+block.id+'">'+esc(block.description)+'</textarea>';
        h+='<span class="sub-label">GM 메모</span><textarea data-ent-f="gmNote" data-ent-id="'+block.id+'" style="background:var(--gold-soft)">'+esc(block.gmNote)+'</textarea></div>';
      }
      h+='</div>';
    }
    h+='</div>';
  });
  if(!entry.blocks.length)h='<div style="color:var(--faint);font-size:12px;padding:16px 0">블록이 없어요. 아래에서 추가하세요.</div>';
  w.innerHTML=h;

  // ===== BINDINGS =====
  // Labels
  w.querySelectorAll('[data-blk-label]').forEach(function(inp){inp.oninput=function(){findBlock(entry,inp.dataset.blkLabel).label=inp.value;save()}});
  // Fold
  w.querySelectorAll('[data-blk-fold]').forEach(function(btn){btn.onclick=function(){var b=findBlock(entry,btn.dataset.blkFold);b.collapsed=!b.collapsed;save();renderBlockList(entry,plat)}});
  // Indent
  w.querySelectorAll('[data-blk-indent]').forEach(function(btn){btn.onclick=function(){var b=findBlock(entry,btn.dataset.blkIndent);b.indent=!b.indent;save();renderBlockList(entry,plat)}});
  // Duplicate
  w.querySelectorAll('[data-blk-dup]').forEach(function(btn){btn.onclick=function(){
    var b=findBlock(entry,btn.dataset.blkDup);if(!b)return;
    var copy=JSON.parse(JSON.stringify(b));copy.id=uid();copy.label+=' (복사)';
    var idx=entry.blocks.findIndex(function(x){return x.id===b.id});
    entry.blocks.splice(idx+1,0,copy);save();renderBlockList(entry,plat);toast('블록 복제됨')
  }});
  // Move
  w.querySelectorAll('[data-blk-up]').forEach(function(btn){btn.onclick=function(){moveInArr(entry.blocks,btn.dataset.blkUp,-1);save();renderBlockList(entry,plat)}});
  w.querySelectorAll('[data-blk-down]').forEach(function(btn){btn.onclick=function(){moveInArr(entry.blocks,btn.dataset.blkDown,1);save();renderBlockList(entry,plat)}});
  // Delete
  w.querySelectorAll('[data-blk-del]').forEach(function(btn){btn.onclick=function(){
    var id=btn.dataset.blkDel,idx=entry.blocks.findIndex(function(b){return b.id===id});if(idx===-1)return;
    var removed=entry.blocks[idx];entry.blocks.splice(idx,1);save();renderBlockList(entry,plat);
    toastUndo((BLOCK_TYPES[removed.type]||{}).label||'블록',function(){entry.blocks.splice(idx,0,removed);save();renderBlockList(entry,plat)})
  }});
  // Text content
  w.querySelectorAll('[data-blk-content]').forEach(function(ta){ta.oninput=function(){findBlock(entry,ta.dataset.blkContent).content=ta.value;save();if(plat&&plat.name.toLowerCase().indexOf('roll20')!==-1)updateR20Preview(entry)}});
  // Clue selector
  w.querySelectorAll('[data-blk-clue-sel]').forEach(function(sel){sel.onchange=function(){findBlock(entry,sel.dataset.blkClueSel).clueId=sel.value;save()}});
  // NPC fields
  w.querySelectorAll('[data-npc-f]').forEach(function(inp){inp.oninput=function(){var b=findBlock(entry,inp.dataset.npcId);b[inp.dataset.npcF]=inp.value;save();
    if(inp.dataset.npcF==='imageUrl'){var pv=w.querySelector('[data-npc-pv="'+b.id+'"]');if(pv){pv.src=inp.value;pv.style.display=''}}
  }});
  // Handout fields
  w.querySelectorAll('[data-ho-f]').forEach(function(inp){inp.oninput=function(){findBlock(entry,inp.dataset.hoId)[inp.dataset.hoF]=inp.value;save()}});
  // BGM fields
  w.querySelectorAll('[data-bgm-f]').forEach(function(inp){inp.oninput=function(){findBlock(entry,inp.dataset.bgmId)[inp.dataset.bgmF]=inp.value;save()}});
  // Entity fields (item/place)
  w.querySelectorAll('[data-ent-f]').forEach(function(inp){inp.oninput=function(){var b=findBlock(entry,inp.dataset.entId);b[inp.dataset.entF]=inp.value;save();
    if(inp.dataset.entF==='imageUrl'){var pv=w.querySelector('[data-ent-pv="'+b.id+'"]');if(pv){pv.src=inp.value;pv.style.display=''}}
  }});

  // Sub-block renderers
  entry.blocks.forEach(function(block){
    if(block.type==='branches'&&!block.collapsed)renderSubList(entry,block,'branch',plat);
    if(block.type==='lines'&&!block.collapsed)renderSubList(entry,block,'line',plat);
    if(block.type==='checks'&&!block.collapsed)renderCheckList(entry,block,plat);
  });
  w.querySelectorAll('[data-add-branch]').forEach(function(btn){btn.onclick=function(){var b=findBlock(entry,btn.dataset.addBranch);b.items.push({id:uid(),label:'',text:''});save();renderSubList(entry,b,'branch',plat)}});
  w.querySelectorAll('[data-add-line]').forEach(function(btn){btn.onclick=function(){var b=findBlock(entry,btn.dataset.addLine);b.items.push({id:uid(),label:'',text:''});save();renderSubList(entry,b,'line',plat)}});
  w.querySelectorAll('[data-add-check]').forEach(function(btn){btn.onclick=function(){var b=findBlock(entry,btn.dataset.addCheck);b.items.push({id:uid(),name:'',critSuccess:'',success:'',fail:'',critFail:''});save();renderCheckList(entry,b,plat)}});

  // Drag & drop
  var dragId=null;
  w.querySelectorAll('.block[data-block]').forEach(function(el){
    el.ondragstart=function(e){dragId=el.dataset.block;el.classList.add('dragging');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId)}};
    el.ondragend=function(){el.classList.remove('dragging');w.querySelectorAll('.block').forEach(function(b){b.classList.remove('drag-over')})};
    el.ondragover=function(e){e.preventDefault();if(dragId&&el.dataset.block!==dragId)el.classList.add('drag-over')};
    el.ondragleave=function(){el.classList.remove('drag-over')};
    el.ondrop=function(e){e.preventDefault();el.classList.remove('drag-over');var tid=el.dataset.block;if(!dragId||dragId===tid)return;
      var fi=entry.blocks.findIndex(function(b){return b.id===dragId}),ti=entry.blocks.findIndex(function(b){return b.id===tid});
      if(fi===-1||ti===-1)return;var moved=entry.blocks.splice(fi,1)[0];entry.blocks.splice(ti,0,moved);save();renderBlockList(entry,plat)}
  });

  // Float command bar
  renderFloatBar(entry,plat);
  autoResizeAll(w);
}

function ta(block,ph){return'<textarea class="field-ta" data-blk-content="'+block.id+'" placeholder="'+esc(ph)+'">'+esc(block.content)+'</textarea>'}

function renderSubList(entry,block,type,plat){
  var wrap=document.querySelector('[data-'+(type==='branch'?'branch':'line')+'-wrap="'+block.id+'"]');if(!wrap)return;
  var h='';
  block.items.forEach(function(item){
    h+='<div class="item-card '+(type==='branch'?'branch':'line-card')+'">';
    h+='<div class="item-card-head"><input class="mini-input" data-sub-label="'+item.id+'" data-sub-block="'+block.id+'" placeholder="'+(type==='branch'?'선택지':'화자')+'" value="'+esc(item.label)+'">';
    h+='<button class="rm-btn" data-sub-del="'+item.id+'" data-sub-block="'+block.id+'">✕</button></div>';
    h+='<textarea data-sub-text="'+item.id+'" data-sub-block="'+block.id+'" style="width:100%;border:1px solid var(--line);border-radius:4px;padding:6px 8px;font-size:12px;min-height:34px;resize:none;overflow:hidden;outline:none;background:var(--panel)" placeholder="'+(type==='branch'?'전개 내용':'대사 내용')+'">'+esc(item.text)+'</textarea>';
    h+='</div>';
  });
  wrap.innerHTML=h;
  wrap.querySelectorAll('[data-sub-label]').forEach(function(inp){inp.oninput=function(){var b=findBlock(entry,inp.dataset.subBlock);b.items.find(function(i){return i.id===inp.dataset.subLabel}).label=inp.value;save()}});
  wrap.querySelectorAll('[data-sub-text]').forEach(function(inp){inp.oninput=function(){var b=findBlock(entry,inp.dataset.subBlock);b.items.find(function(i){return i.id===inp.dataset.subText}).text=inp.value;save()}});
  wrap.querySelectorAll('[data-sub-del]').forEach(function(btn){btn.onclick=function(){var b=findBlock(entry,btn.dataset.subBlock);b.items=b.items.filter(function(i){return i.id!==btn.dataset.subDel});save();renderSubList(entry,b,type,plat)}});
  autoResizeAll(wrap);
}

function renderCheckList(entry,block,plat){
  var wrap=document.querySelector('[data-check-wrap="'+block.id+'"]');if(!wrap)return;
  var h='';
  block.items.forEach(function(c){
    h+='<div class="item-card check"><div class="item-card-head"><input class="mini-input" data-ck-name="'+c.id+'" data-ck-block="'+block.id+'" placeholder="판정명" value="'+esc(c.name)+'"><button class="rm-btn" data-ck-del="'+c.id+'" data-ck-block="'+block.id+'">✕</button></div>';
    h+='<div class="outcome-grid">';
    h+=oc(c.id,block.id,'critSuccess','cs','대성공',c.critSuccess);
    h+=oc(c.id,block.id,'success','s','성공',c.success);
    h+=oc(c.id,block.id,'fail','f','실패',c.fail);
    h+=oc(c.id,block.id,'critFail','cf','대실패',c.critFail);
    h+='</div></div>';
  });
  wrap.innerHTML=h;
  wrap.querySelectorAll('[data-ck-name]').forEach(function(inp){inp.oninput=function(){var b=findBlock(entry,inp.dataset.ckBlock);b.items.find(function(i){return i.id===inp.dataset.ckName}).name=inp.value;save()}});
  ['critSuccess','success','fail','critFail'].forEach(function(key){
    wrap.querySelectorAll('[data-ck-'+key+']').forEach(function(inp){inp.oninput=function(){var b=findBlock(entry,inp.dataset.ckBlock);b.items.find(function(i){return i.id===inp.getAttribute('data-ck-'+key)})[key]=inp.value;save()}})
  });
  wrap.querySelectorAll('[data-ck-del]').forEach(function(btn){btn.onclick=function(){var b=findBlock(entry,btn.dataset.ckBlock);b.items=b.items.filter(function(i){return i.id!==btn.dataset.ckDel});save();renderCheckList(entry,b,plat)}});
  autoResizeAll(wrap);
}
function oc(cid,bid,key,cls,label,val){return'<div class="outcome-field '+cls+'"><span class="outcome-label '+cls+'">'+label+'</span><textarea data-ck-'+key+'="'+cid+'" data-ck-block="'+bid+'">'+esc(val)+'</textarea></div>'}

function renderFloatBar(entry,plat){
  var bar=$('float-cmd');if(!bar)return;
  if(!plat||!plat.commands.length){bar.innerHTML='<button class="cmd-chip" id="float-cmd-manage">+ 명령어 등록</button>';var mb=bar.querySelector('#float-cmd-manage');if(mb)mb.onclick=openCommandModal;return}
  var h='';plat.commands.forEach(function(c){h+='<button class="cmd-chip" data-snippet="'+esc(c.snippet)+'" title="'+esc(c.category||'')+'">'+esc(c.label)+'</button>'});
  h+='<button class="cmd-chip" id="float-cmd-manage" style="border-style:dashed">⚙</button>';
  bar.innerHTML=h;
  bar.querySelectorAll('[data-snippet]').forEach(function(btn){
    btn.onmousedown=function(e){e.preventDefault()};
    btn.onclick=function(){if(S._lastField)insertAtCursor(S._lastField,btn.dataset.snippet)}
  });
  var mgBtn=bar.querySelector('#float-cmd-manage');if(mgBtn){mgBtn.onmousedown=function(e){e.preventDefault()};mgBtn.onclick=openCommandModal}
}

// ========== PLAY MODE ==========
function renderPlayMode(main,scene){
  var sc=curScenario(),part=curPart(),plat=curPlatform();
  var gm=S.gmMode;
  var h='<div class="crumb">'+esc((plat||{}).name||'')+' / '+esc(sc.title)+' / '+esc(part.title)+'</div>';
  h+='<div style="font-family:var(--font-mono);font-size:22px;font-weight:700;color:var(--ink-strong);margin-bottom:4px">'+esc(scene.title)+'</div>';
  // Metadata
  if(scene.location||scene.timeOfDay||scene.npcsPresent){
    h+='<div class="sc-meta">';
    if(scene.location)h+='<div class="meta-field"><span class="meta-label">loc</span><span class="meta-val">'+esc(scene.location)+'</span></div>';
    if(scene.timeOfDay)h+='<div class="meta-field"><span class="meta-label">time</span><span class="meta-val">'+esc(scene.timeOfDay)+'</span></div>';
    if(scene.npcsPresent)h+='<div class="meta-field"><span class="meta-label">npc</span><span class="meta-val">'+esc(scene.npcsPresent)+'</span></div>';
    h+='</div>';
  }
  h+=renderBlocksPlay(scene.blocks,gm);
  // Nav
  var flat=flatScenes(sc),ci=flat.findIndex(function(f){return f.sceneId===scene.id});
  var prev=ci>0?flat[ci-1]:null,next=ci<flat.length-1?flat[ci+1]:null;
  if(prev||next){
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:24px;padding-top:16px;border-top:1px solid var(--line)">';
    h+=prev?'<button class="tb" data-nav-part="'+prev.partId+'" data-nav-scene="'+prev.sceneId+'" style="justify-content:flex-start;text-align:left">← '+esc(prev.sceneTitle)+'</button>':'<span></span>';
    h+=next?'<button class="tb" data-nav-part="'+next.partId+'" data-nav-scene="'+next.sceneId+'" style="justify-content:flex-end;text-align:right">'+esc(next.sceneTitle)+' →</button>':'<span></span>';
    h+='</div>';
  }
  main.innerHTML=h;
  main.querySelectorAll('[data-nav-scene]').forEach(function(btn){btn.onclick=function(){selectScene(S.platformId,S.scenarioId,btn.dataset.navPart,btn.dataset.navScene);renderTree();renderMain();main.scrollTop=0}});
  main.querySelectorAll('[data-copy-raw]').forEach(function(btn){btn.onclick=function(){copyText(btn.dataset.copyRaw,btn)}});
}

function renderBlocksPlay(blocks,gm){
  var h='';
  (blocks||[]).forEach(function(block){
    var meta=BLOCK_TYPES[block.type]||BLOCK_TYPES.text;
    var isGmOnly=block.type==='memo'||block.type==='truth'||(block.type==='clue')||(block.type==='session-log');
    if(isGmOnly&&!gm){h+='<div class="block '+(meta.cls||'')+' gm-hidden" style="display:none"></div>';return}
    var ind=block.indent?' indented':'';
    if(block.type==='text'||block.type==='memo'||block.type==='truth'||block.type==='session-log'){
      h+='<div class="block '+(meta.cls||'')+ind+'">';
      h+='<div class="blk-head"><span class="blk-label">'+esc(block.label)+'</span><button class="copy-btn" data-copy-raw="'+esc(block.content)+'">'+ICONS.copy+'</button></div>';
      h+=playBox(block.content);
      h+='</div>';
    }else if(block.type==='clue'){
      var sc=curScenario(),clue=sc&&sc.clues.find(function(c){return c.id===block.clueId});
      h+='<div class="block clue-b'+ind+'">';
      h+='<div class="blk-head"><span class="blk-label">'+esc(block.label)+'</span></div>';
      if(clue)h+='<div style="margin-bottom:6px"><span class="clue-tag">🔗 '+esc(clue.name)+'</span></div>';
      h+=playBox(block.content);
      h+='</div>';
    }else if(block.type==='branches'&&block.items&&block.items.length){
      h+='<div class="block'+ind+'"><div class="blk-head"><span class="blk-label">'+esc(block.label)+'</span></div>';
      block.items.forEach(function(b){
        h+='<div class="item-card branch"><div style="font-weight:700;font-size:12px;margin-bottom:4px">'+esc(b.label||'(제목 없음)')+'</div>';
        h+=playBox(b.text)+'</div>';
      });
      h+='</div>';
    }else if(block.type==='lines'&&block.items&&block.items.length){
      h+='<div class="block'+ind+'"><div class="blk-head"><span class="blk-label">'+esc(block.label)+'</span></div>';
      block.items.forEach(function(l){
        h+='<div class="item-card line-card"><div style="font-weight:700;font-size:11px;color:var(--muted);margin-bottom:3px">'+esc(l.label||'')+'</div>';
        h+='<div style="font-style:italic">'+playBox(l.text)+'</div></div>';
      });
      h+='</div>';
    }else if(block.type==='checks'&&block.items&&block.items.length){
      h+='<div class="block'+ind+'"><div class="blk-head"><span class="blk-label">'+esc(block.label)+'</span></div>';
      block.items.forEach(function(c){
        h+='<div class="item-card check"><div style="font-weight:700;font-size:12px;margin-bottom:4px">'+esc(c.name||'(판정명 없음)')+'</div>';
        if(c.critSuccess)h+=outRow('cs','대성공',c.critSuccess);
        if(c.success)h+=outRow('s','성공',c.success);
        if(c.fail)h+=outRow('f','실패',c.fail);
        if(c.critFail)h+=outRow('cf','대실패',c.critFail);
        h+='</div>';
      });
      h+='</div>';
    }else if(block.type==='npc'){
      h+='<div class="block'+ind+'"><div class="blk-head"><span class="blk-label">'+esc(block.label)+'</span></div>';
      h+='<div class="ent-form" style="border-left:3px solid #9878c8"><div class="ent-form-row">';
      if(block.imageUrl)h+='<img class="ent-avatar" src="'+esc(block.imageUrl)+'" style="border-radius:50%" onerror="this.style.display=\'none\'">';
      h+='<div><div style="font-family:var(--font-mono);font-weight:700;font-size:14px">'+esc(block.name||'(이름 없음)')+'</div>';
      if(block.role)h+='<div style="font-size:11px;color:var(--muted)">'+esc(block.role)+'</div>';
      h+='</div></div>';
      if(block.traits){var tl=block.traits.split('\n').filter(function(l){return l.trim()});if(tl.length){h+='<ul style="margin:6px 0;padding-left:16px;font-size:12px;color:var(--ink)">';tl.forEach(function(t){h+='<li>'+esc(t)+'</li>'});h+='</ul>'}}
      h+='</div></div>';
    }else if(block.type==='handout'){
      h+='<div class="block'+ind+'"><div class="blk-head"><span class="blk-label">'+esc(block.label)+'</span>';
      if(block.content)h+='<button class="copy-btn" data-copy-raw="'+esc(block.content)+'">'+ICONS.copy+'</button>';
      h+='</div>';
      h+='<div class="ent-form">';
      if(block.title)h+='<div style="font-family:var(--font-mono);font-weight:700;font-size:14px;margin-bottom:6px">'+esc(block.title)+'</div>';
      if(block.content)h+=playBox(block.content);
      h+='</div>';
      if(gm&&block.gmNote)h+='<div style="margin-top:6px;border:1px solid rgba(212,165,68,.2);background:var(--gold-soft);border-radius:var(--radius);padding:8px 10px;font-size:12px;white-space:pre-wrap"><span style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:var(--gold);border:1px solid var(--gold);border-radius:999px;padding:1px 6px;margin-right:6px">GM</span>'+esc(block.gmNote)+'</div>';
      h+='</div>';
    }else if(block.type==='bgm'){
      var vid=ytId(block.url);
      h+='<div class="block'+ind+'"><div class="blk-head"><span class="blk-label">♪ '+esc(block.title||block.label)+'</span>';
      if(block.url)h+='<a class="copy-btn" href="'+esc(block.url)+'" target="_blank" rel="noopener">↗</a>';
      h+='</div>';
      if(vid)h+='<div style="position:relative;padding-top:56.25%;border-radius:var(--radius);overflow:hidden;background:#000"><iframe src="https://www.youtube.com/embed/'+vid+'" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay;encrypted-media" allowfullscreen></iframe></div>';
      if(block.note)h+='<div style="margin-top:6px;font-size:11px;color:var(--muted);white-space:pre-wrap">'+esc(block.note)+'</div>';
      h+='</div>';
    }else if(block.type==='item'||block.type==='place'){
      h+='<div class="block'+ind+'"><div class="blk-head"><span class="blk-label">'+esc(block.label)+'</span></div>';
      h+='<div class="ent-form">';
      h+='<div class="ent-form-row">';
      if(block.imageUrl)h+='<img class="ent-avatar" src="'+esc(block.imageUrl)+'" style="border-radius:8px" onerror="this.style.display=\'none\'">';
      h+='<div style="font-family:var(--font-mono);font-weight:700;font-size:14px">'+esc(block.name||'(이름 없음)')+'</div></div>';
      if(block.description)h+=playBox(block.description);
      if(gm&&block.gmNote)h+='<div style="margin-top:6px;border:1px solid rgba(212,165,68,.2);background:var(--gold-soft);border-radius:var(--radius);padding:8px 10px;font-size:12px;white-space:pre-wrap"><span style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:var(--gold);border:1px solid var(--gold);border-radius:999px;padding:1px 6px;margin-right:6px">GM</span>'+esc(block.gmNote)+'</div>';
      h+='</div></div>';
    }
  });
  return h;
}

function playBox(content){
  if(!content)return'<div class="play-box empty"></div>';
  var lines=content.split('\n'),h='<div class="play-box lines">';
  lines.forEach(function(line){
    if(!line.trim()){h+='<div style="height:8px"></div>';return}
    h+='<div class="text-line"><span>'+renderMd(line)+'</span><button class="copy-btn" data-copy-raw="'+esc(line)+'" style="flex-shrink:0;opacity:.4">'+ICONS.copy+'</button></div>';
  });
  return h+'</div>';
}
function outRow(cls,label,text){return'<div style="display:flex;gap:8px;padding:5px 0;border-top:1px dashed var(--line);font-size:12px"><span class="outcome-label '+cls+'" style="flex:0 0 60px">'+label+'</span><div style="flex:1;white-space:pre-wrap">'+esc(text)+'</div></div>'}

// ========== ENDING EDIT ==========
function renderEndingEdit(main,ending){
  var sc=curScenario(),plat=curPlatform();
  var et=sc.endingTypes.find(function(t){return t.id===ending.endingType})||{label:'?',color:'#888'};
  var h='<div class="crumb">'+esc((plat||{}).name||'')+' / '+esc(sc.title)+' / endings/</div>';
  h+='<input class="sc-title-input" id="end-title" value="'+esc(ending.title)+'">';
  h+='<div class="et-pills" id="end-pills"></div>';
  // Condition
  h+='<div class="block truth"><div class="blk-head"><span class="blk-label">도달 조건</span></div><div class="blk-body"><textarea class="field-ta" id="end-cond" placeholder="이 엔딩에 도달하려면?">'+esc(ending.condition)+'</textarea></div></div>';
  if(S.mode==='play'){
    h+=renderBlocksPlay(ending.blocks,S.gmMode);
    main.innerHTML=h;
    main.querySelectorAll('[data-copy-raw]').forEach(function(btn){btn.onclick=function(){copyText(btn.dataset.copyRaw,btn)}});
    return;
  }
  h+='<div id="float-cmd" hidden></div>';
  h+='<div id="block-list"></div>';
  h+='<div class="add-block-bar">';
  Object.keys(BLOCK_TYPES).forEach(function(type){h+='<button class="add-btn add-block-btn" data-add-block="'+type+'">'+BLOCK_TYPES[type].label+'</button>'});
  h+='</div>';
  main.innerHTML=h;
  $('end-title').oninput=function(e){ending.title=e.target.value;save();renderEndingsList()};
  $('end-cond').oninput=function(){ending.condition=this.value;save()};autoResize($('end-cond'));
  // Pills
  var pillsW=$('end-pills');
  sc.endingTypes.forEach(function(t){
    var on=(ending.endingType||'normal')===t.id;
    var btn=document.createElement('button');btn.className='et-pill'+(on?' on':'');btn.textContent=t.label;
    if(on)btn.style.cssText='background:'+t.color+';border-color:'+t.color;
    btn.onclick=function(){ending.endingType=t.id;save();renderEndingEdit(main,ending);renderEndingsList()};
    pillsW.appendChild(btn);
  });
  var editBtn=document.createElement('button');editBtn.className='et-pill-add';editBtn.textContent='✎';editBtn.onclick=function(){openEndingTypeManager(sc)};pillsW.appendChild(editBtn);
  // Block add
  main.querySelectorAll('[data-add-block]').forEach(function(btn){
    btn.onclick=function(){
      var type=btn.dataset.addBlock;
      var block={id:uid(),type:type,label:BLOCK_TYPES[type].label};
      if(type==='text'||type==='memo'||type==='truth'||type==='session-log')block.content='';
      if(type==='branches'||type==='checks'||type==='lines')block.items=[];
      if(type==='npc'){block.name='';block.imageUrl='';block.role='';block.traits='';block.lines=''}
      if(type==='handout'){block.title='';block.content='';block.gmNote=''}
      if(type==='bgm'){block.title='';block.url='';block.note=''}
      if(type==='item'||type==='place'){block.name='';block.imageUrl='';block.description='';block.gmNote=''}
      if(type==='clue'){block.clueId='';block.content=''}
      ending.blocks.push(block);save();renderBlockList(ending,plat)
    }
  });
  renderBlockList(ending,plat);
}

// ========== TIMELINE ==========
function renderTimeline(main){
  var sc=curScenario();
  if(!sc){main.innerHTML='<div class="main-empty"><h3>시나리오를 선택하세요</h3></div>';return}
  var plat=curPlatform();
  var h='<div class="crumb">'+esc((plat||{}).name||'')+' / '+esc(sc.title)+'</div>';
  h+='<div style="font-family:var(--font-mono);font-size:22px;font-weight:700;color:var(--ink-strong);margin-bottom:16px">flow</div>';
  if(!sc.parts.length&&!sc.endings.length){h+='<div style="color:var(--faint);text-align:center;padding:40px">파트와 씬을 먼저 만들어주세요</div>';main.innerHTML=h;return}
  h+='<div class="tl-wrap">';
  sc.parts.forEach(function(part,pi){
    var dc=part.scenes.filter(function(s){return s.done}).length;
    h+='<div class="tl-part"><div class="tl-part-title">'+esc(part.title)+' <span class="part-ct">'+dc+'/'+part.scenes.length+'</span></div>';
    if(part.scenes.length){
      h+='<div class="tl-row">';
      part.scenes.forEach(function(scene,si){
        var bc=0,cc=0,clc=0;(scene.blocks||[]).forEach(function(b){if(b.type==='branches')bc+=(b.items||[]).length;if(b.type==='checks')cc+=(b.items||[]).length;if(b.type==='clue')clc++});
        var on=scene.id===S.sceneId&&part.id===S.partId;
        h+='<div class="tl-node'+(on?' on':'')+(scene.done?' done':'')+'" data-tl-p="'+part.id+'" data-tl-s="'+scene.id+'">';
        h+='<div class="tl-node-title">'+esc(scene.title)+'</div>';
        h+='<div class="tl-badges">';
        if(scene.done)h+='<span class="tl-badge dn">✓</span>';
        if(bc)h+='<span class="tl-badge br">⑂'+bc+'</span>';
        if(cc)h+='<span class="tl-badge ck">🎲'+cc+'</span>';
        if(clc)h+='<span class="tl-badge cl">🔍'+clc+'</span>';
        h+='</div>';
        if(scene.connections&&scene.connections.length){
          h+='<div class="tl-conn">';
          scene.connections.forEach(function(c){
            var t=null;sc.parts.forEach(function(p){p.scenes.forEach(function(s){if(s.id===c.targetSceneId)t=s})});
            h+='→ '+esc(t?t.title:'?')+' ';
          });
          h+='</div>';
        }
        h+='</div>';
        if(si<part.scenes.length-1)h+='<div class="tl-arrow">→</div>';
      });
      h+='</div>';
    }
    if(pi<sc.parts.length-1)h+='<div class="tl-down">↓</div>';
    h+='</div>';
  });
  if(sc.endings.length){
    h+='<div class="tl-down">↓</div><div class="tl-part"><div class="tl-part-title">endings/ <span class="part-ct">'+sc.endings.length+'</span></div>';
    h+='<div class="tl-end-row">';
    sc.endings.forEach(function(e){
      var et=sc.endingTypes.find(function(t){return t.id===e.endingType})||{label:'?',color:'#888'};
      h+='<div class="tl-end-node" data-tl-end="'+e.id+'" style="border-top-color:'+et.color+'"><div class="tl-end-title">'+esc(e.title||'(제목 없음)')+'</div><div class="tl-end-type" style="color:'+et.color+'">'+esc(et.label)+'</div></div>';
    });
    h+='</div></div>';
  }
  h+='</div>';
  main.innerHTML=h;
  main.querySelectorAll('[data-tl-s]').forEach(function(n){n.onclick=function(){selectScene(S.platformId,S.scenarioId,n.dataset.tlP,n.dataset.tlS);S.mode='edit';syncModeBtns();render()}});
  main.querySelectorAll('[data-tl-end]').forEach(function(n){n.onclick=function(){selectEnding(S.platformId,S.scenarioId,n.dataset.tlEnd);S.mode='edit';syncModeBtns();render()}});
}
// ========== MODALS ==========
function syncModeBtns(){document.querySelectorAll('.mode-sw .mode-btn[data-mode]').forEach(function(b){b.classList.toggle('on',b.dataset.mode===S.mode)})}

function openPlatformModal(){
  var m=$('plat-modal'),inp=$('plat-name');inp.value='';m.hidden=false;
  var selColor=PLAT_COLORS[S.data.platforms.length%PLAT_COLORS.length];
  var cw=$('plat-colors');cw.innerHTML=PLAT_COLORS.map(function(c){return'<span style="width:22px;height:22px;border-radius:50%;background:'+c+';cursor:pointer;border:2px solid '+(c===selColor?'var(--ink)':'transparent')+'" data-pc="'+c+'"></span>'}).join('');
  cw.querySelectorAll('[data-pc]').forEach(function(s){s.onclick=function(){selColor=s.dataset.pc;cw.querySelectorAll('[data-pc]').forEach(function(x){x.style.borderColor=x.dataset.pc===selColor?'var(--ink)':'transparent'})}});
  setTimeout(function(){inp.focus()},30);
  function close(){m.hidden=true}
  $('plat-ok').onclick=function(){var n=inp.value.trim();if(!n){close();return}var p={id:uid(),name:n,color:selColor,commands:[]};S.data.platforms.push(p);S.platformId=p.id;save();close();render()};
  $('plat-cancel').onclick=close;
}

function openCommandModal(){
  var plat=curPlatform()||S.data.platforms[0];
  if(!plat){toast('먼저 사이트를 추가해주세요');return}
  var m=$('cmd-modal');$('cmd-platform-name').textContent=plat.name;
  S.openCmdId=null;m.hidden=false;
  renderCmdList(plat);
  $('cmd-close').onclick=$('cmd-done').onclick=function(){m.hidden=true;render()};
  $('cmd-add').onclick=function(){var c={id:uid(),label:'새 명령어',snippet:'',category:'기본'};plat.commands.push(c);S.openCmdId=c.id;save();renderCmdList(plat)};
}

function renderCmdList(plat){
  var w=$('cmd-list');
  // Categories
  var cats={};plat.commands.forEach(function(c){var cat=c.category||'기본';if(!cats[cat])cats[cat]=[];cats[cat].push(c)});
  var catW=$('cmd-categories');
  var catNames=Object.keys(cats);
  if(catNames.length>1){
    catW.innerHTML=catNames.map(function(c){return'<span class="cmd-chip" style="margin-bottom:8px;cursor:default">'+esc(c)+' ('+cats[c].length+')</span>'}).join(' ');
  }else catW.innerHTML='';

  var openCmd=plat.commands.find(function(c){return c.id===S.openCmdId});
  var h='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">';
  plat.commands.forEach(function(c){
    h+='<button class="cmd-chip'+(c.id===S.openCmdId?' on':'')+'" data-cmd-chip="'+c.id+'" style="'+(c.id===S.openCmdId?'background:var(--accent);color:#fff;border-color:var(--accent)':'')+'">'+esc(c.label||'(이름 없음)')+'</button>';
  });
  h+='</div>';
  if(openCmd){
    h+='<div class="ent-form" style="margin-top:8px">';
    h+='<span class="sub-label" style="margin-top:0">이름</span><input type="text" data-cmd-f="label" value="'+esc(openCmd.label)+'">';
    h+='<span class="sub-label">카테고리</span><input type="text" data-cmd-f="category" value="'+esc(openCmd.category||'')+'" placeholder="기본, 서식, 연출...">';
    h+='<span class="sub-label">삽입될 텍스트/코드</span><textarea data-cmd-f="snippet" style="font-family:var(--font-mono)">'+esc(openCmd.snippet)+'</textarea>';
    h+='<button class="tb danger" data-cmd-del="'+openCmd.id+'" style="margin-top:8px">삭제</button>';
    h+='</div>';
  }
  w.innerHTML=h;
  w.querySelectorAll('[data-cmd-chip]').forEach(function(chip){chip.onclick=function(){S.openCmdId=(S.openCmdId===chip.dataset.cmdChip)?null:chip.dataset.cmdChip;renderCmdList(plat)}});
  w.querySelectorAll('[data-cmd-f]').forEach(function(inp){inp.oninput=function(){openCmd[inp.dataset.cmdF]=inp.value;save();
    if(inp.dataset.cmdF==='label'){var chip=w.querySelector('[data-cmd-chip="'+openCmd.id+'"]');if(chip)chip.textContent=inp.value||'(이름 없음)'}
  }});
  w.querySelectorAll('[data-cmd-del]').forEach(function(btn){btn.onclick=function(){plat.commands=plat.commands.filter(function(c){return c.id!==btn.dataset.cmdDel});S.openCmdId=null;save();renderCmdList(plat)}});
  autoResizeAll(w);
}

// ========== ENDING TYPE MANAGER ==========
function openEndingTypeManager(sc){
  var m=$('et-modal');m.hidden=false;
  renderETList(sc);
  $('et-close').onclick=$('et-done').onclick=function(){m.hidden=true;render()};
  $('et-add').onclick=function(){sc.endingTypes.push({id:uid(),label:'새 타입',color:PLAT_COLORS[sc.endingTypes.length%PLAT_COLORS.length]});save();renderETList(sc)};
}
function renderETList(sc){
  var w=$('et-list');
  var h='';
  sc.endingTypes.forEach(function(et,i){
    h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)">';
    h+='<input type="color" data-etc="'+et.id+'" value="'+et.color+'" style="width:28px;height:28px;border:1px solid var(--line);border-radius:4px;cursor:pointer;padding:1px">';
    h+='<input type="text" data-etl="'+et.id+'" value="'+esc(et.label)+'" style="flex:1;border:1px solid var(--line);border-radius:4px;padding:6px 8px;font-size:12px;background:var(--panel);color:var(--ink)">';
    h+='<button class="rm-btn" data-etd="'+et.id+'">✕</button>';
    h+='</div>';
  });
  if(!sc.endingTypes.length)h='<div style="color:var(--faint);font-size:12px;padding:8px">아직 타입이 없어요.</div>';
  w.innerHTML=h;
  w.querySelectorAll('[data-etl]').forEach(function(inp){inp.oninput=function(){sc.endingTypes.find(function(t){return t.id===inp.dataset.etl}).label=inp.value;save()}});
  w.querySelectorAll('[data-etc]').forEach(function(inp){inp.oninput=function(){sc.endingTypes.find(function(t){return t.id===inp.dataset.etc}).color=inp.value;save()}});
  w.querySelectorAll('[data-etd]').forEach(function(btn){btn.onclick=function(){if(sc.endingTypes.length<=1){toast('최소 1개 타입은 필요해요');return}sc.endingTypes=sc.endingTypes.filter(function(t){return t.id!==btn.dataset.etd});save();renderETList(sc)}});
}

// ========== LIBRARY (PER-SCENARIO) ==========
function openLibrary(){
  var sc=curScenario();if(!sc){toast('먼저 시나리오를 선택하세요');return}
  var m=$('lib-modal');m.hidden=false;S.openLibId=null;
  renderLibTabs(sc);renderLibList(sc);
  $('lib-close').onclick=$('lib-done').onclick=function(){m.hidden=true;render()};
  $('lib-add').onclick=function(){
    var tab=S.libTab,lib=sc.library[tab];
    var entry;
    if(tab==='npcs')entry={id:uid(),name:'',imageUrl:'',role:'',traits:'',lines:''};
    else entry={id:uid(),name:'',imageUrl:'',description:'',gmNote:''};
    lib.push(entry);S.openLibId=entry.id;save();renderLibList(sc)
  };
}
function renderLibTabs(sc){
  $('lib-tabs').querySelectorAll('[data-lt]').forEach(function(btn){
    btn.classList.toggle('on',btn.dataset.lt===S.libTab);
    btn.onclick=function(){S.libTab=btn.dataset.lt;S.openLibId=null;renderLibTabs(sc);renderLibList(sc)}
  });
}
function renderLibList(sc){
  var w=$('lib-list'),tab=S.libTab,lib=sc.library[tab];
  var labels={npcs:'NPC',items:'아이템',places:'장소'};
  if(!lib.length){w.innerHTML='<div style="color:var(--faint);font-size:12px;padding:8px">'+labels[tab]+' 없음</div>';return}
  var openEntry=lib.find(function(e){return e.id===S.openLibId});
  var h='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">';
  lib.forEach(function(e){h+='<button class="cmd-chip'+(e.id===S.openLibId?' on':'')+'" data-lib-chip="'+e.id+'" style="'+(e.id===S.openLibId?'background:var(--accent);color:#fff;border-color:var(--accent)':'')+'">'+esc(e.name||'(이름 없음)')+'</button>'});
  h+='</div>';
  if(openEntry){
    h+='<div class="ent-form" style="margin-top:8px">';
    if(tab==='npcs'){
      h+='<span class="sub-label" style="margin-top:0">이름</span><input type="text" data-lf="name" value="'+esc(openEntry.name)+'">';
      h+='<span class="sub-label">역할</span><input type="text" data-lf="role" value="'+esc(openEntry.role)+'">';
      h+='<span class="sub-label">이미지 URL</span><input type="text" data-lf="imageUrl" value="'+esc(openEntry.imageUrl)+'">';
      h+='<span class="sub-label">특징</span><textarea data-lf="traits">'+esc(openEntry.traits)+'</textarea>';
      h+='<span class="sub-label">대사</span><textarea data-lf="lines">'+esc(openEntry.lines)+'</textarea>';
    }else{
      h+='<span class="sub-label" style="margin-top:0">이름</span><input type="text" data-lf="name" value="'+esc(openEntry.name)+'">';
      h+='<span class="sub-label">이미지 URL</span><input type="text" data-lf="imageUrl" value="'+esc(openEntry.imageUrl)+'">';
      h+='<span class="sub-label">설명</span><textarea data-lf="description">'+esc(openEntry.description)+'</textarea>';
      h+='<span class="sub-label">GM 메모</span><textarea data-lf="gmNote" style="background:var(--gold-soft)">'+esc(openEntry.gmNote)+'</textarea>';
    }
    var scene=curScene();
    h+='<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">';
    h+='<button class="tb primary" data-lib-insert="'+openEntry.id+'"'+(scene?'':' disabled')+'>씬에 카드 추가</button>';
    h+='<button class="tb danger" data-lib-del="'+openEntry.id+'">삭제</button>';
    h+='</div></div>';
  }
  w.innerHTML=h;
  w.querySelectorAll('[data-lib-chip]').forEach(function(chip){chip.onclick=function(){S.openLibId=(S.openLibId===chip.dataset.libChip)?null:chip.dataset.libChip;renderLibList(sc)}});
  w.querySelectorAll('[data-lf]').forEach(function(inp){inp.oninput=function(){openEntry[inp.dataset.lf]=inp.value;save();
    if(inp.dataset.lf==='name'){var chip=w.querySelector('[data-lib-chip="'+openEntry.id+'"]');if(chip)chip.textContent=inp.value||'(이름 없음)'}
  }});
  w.querySelectorAll('[data-lib-insert]').forEach(function(btn){btn.onclick=function(){
    var scene=curScene();if(!scene){toast('먼저 씬을 열어주세요');return}
    var blockType=tab==='npcs'?'npc':(tab==='items'?'item':'place');
    var block={id:uid(),type:blockType,label:BLOCK_TYPES[blockType].label};
    if(blockType==='npc'){block.name=openEntry.name;block.imageUrl=openEntry.imageUrl;block.role=openEntry.role;block.traits=openEntry.traits;block.lines=openEntry.lines}
    else{block.name=openEntry.name;block.imageUrl=openEntry.imageUrl;block.description=openEntry.description;block.gmNote=openEntry.gmNote}
    scene.blocks.push(block);save();toast('"'+(openEntry.name||labels[tab])+'" 추가됨');
  }});
  w.querySelectorAll('[data-lib-del]').forEach(function(btn){btn.onclick=function(){
    if(!confirm('삭제할까요?'))return;sc.library[tab]=lib.filter(function(e){return e.id!==btn.dataset.libDel});S.openLibId=null;save();renderLibList(sc)
  }});
  autoResizeAll(w);
}

// ========== FIND / REPLACE ==========
function openFindModal(){
  var m=$('find-modal');m.hidden=false;
  var fi=$('find-input'),rf=$('repl-find'),rt=$('repl-to'),fp=$('find-panel'),rp=$('replace-panel'),rok=$('repl-ok');
  fi.value='';rf.value='';rt.value='';
  function setMode(mode){
    m.querySelectorAll('[data-sm]').forEach(function(b){b.classList.toggle('on',b.dataset.sm===mode)});
    fp.hidden=mode!=='find';rp.hidden=mode!=='replace';rok.hidden=mode!=='replace';
    setTimeout(function(){(mode==='find'?fi:rf).focus()},20);
  }
  m.querySelectorAll('[data-sm]').forEach(function(btn){btn.onclick=function(){setMode(btn.dataset.sm)}});
  setMode('find');

  fi.oninput=function(){
    var term=fi.value.trim(),rw=$('find-results');
    if(!term){rw.innerHTML='<div style="color:var(--faint);font-size:11px;padding:8px">검색어를 입력하세요</div>';return}
    var results=searchAll(term);
    if(!results.length){rw.innerHTML='<div style="color:var(--faint);font-size:11px;padding:8px">결과 없음</div>';return}
    var h='<div style="font-size:11px;color:var(--muted);margin-bottom:6px">'+results.length+'개 항목</div>';
    results.forEach(function(r){
      h+='<div class="s-item" data-fr-sc="'+r.scenarioId+'" data-fr-plat="'+r.platformId+'"'+(r.partId?' data-fr-part="'+r.partId+'" data-fr-scene="'+r.sceneId+'"':'')+(r.endingId?' data-fr-end="'+r.endingId+'"':'')+' style="flex-direction:column;align-items:flex-start;gap:2px;padding:8px;margin-bottom:4px;border:1px solid var(--line);border-radius:var(--radius)">';
      h+='<div style="font-weight:700;font-size:12px">'+esc(r.title)+'</div>';
      h+='<div style="font-size:10px;color:var(--faint)">'+esc(r.path)+' · '+r.count+'건</div>';
      if(r.snippet)h+='<div style="font-size:11px;color:var(--muted);margin-top:2px">'+highlightTerm(r.snippet,term)+'</div>';
      h+='</div>';
    });
    rw.innerHTML=h;
    rw.querySelectorAll('[data-fr-sc]').forEach(function(el){el.onclick=function(){
      S.platformId=el.dataset.frPlat;S.scenarioId=el.dataset.frSc;
      if(el.dataset.frEnd){selectEnding(S.platformId,S.scenarioId,el.dataset.frEnd)}
      else if(el.dataset.frScene){selectScene(S.platformId,S.scenarioId,el.dataset.frPart,el.dataset.frScene)}
      S.mode='edit';syncModeBtns();m.hidden=true;render();
    }});
  };

  rf.oninput=function(){
    var term=rf.value,pv=$('repl-preview');
    if(!term){pv.textContent='검색어를 입력하면 건수가 표시됩니다';return}
    var n=countAllMatches(term);
    pv.innerHTML='전체에서 <b>'+n+'건</b> 발견';
  };
  rok.onclick=function(){
    var term=rf.value;if(!term){toast('찾을 단어 입력 필요');return}
    var n=countAllMatches(term);if(!n){toast('결과 없음');return}
    if(!confirm(n+'건을 모두 바꿀까요?'))return;
    replaceAll(term,rt.value);m.hidden=true;render();toast('바꾸기 완료');
  };
  $('find-close').onclick=$('find-cancel').onclick=function(){m.hidden=true};
  setTimeout(function(){fi.focus()},30);
}

function collectTexts(entry){
  var refs=[];
  (entry.blocks||[]).forEach(function(b){
    if(b.type==='text'||b.type==='memo'||b.type==='truth'||b.type==='session-log'||b.type==='clue')refs.push({get:function(){return b.content},set:function(v){b.content=v}});
    if(b.type==='branches'||b.type==='lines')(b.items||[]).forEach(function(i){refs.push({get:function(){return i.label},set:function(v){i.label=v}});refs.push({get:function(){return i.text},set:function(v){i.text=v}})});
    if(b.type==='checks')(b.items||[]).forEach(function(c){refs.push({get:function(){return c.name},set:function(v){c.name=v}});['critSuccess','success','fail','critFail'].forEach(function(k){refs.push({get:function(){return c[k]},set:function(v){c[k]=v}})})});
    if(b.type==='npc')['name','role','traits','lines'].forEach(function(k){refs.push({get:function(){return b[k]},set:function(v){b[k]=v}})});
    if(b.type==='handout')['title','content','gmNote'].forEach(function(k){refs.push({get:function(){return b[k]},set:function(v){b[k]=v}})});
    if(b.type==='item'||b.type==='place')['name','description','gmNote'].forEach(function(k){refs.push({get:function(){return b[k]},set:function(v){b[k]=v}})});
    if(b.type==='bgm')['title','note'].forEach(function(k){refs.push({get:function(){return b[k]},set:function(v){b[k]=v}})});
  });
  return refs;
}

function searchAll(term){
  var results=[],lt=term.toLowerCase();
  S.data.scenarios.forEach(function(sc){
    sc.parts.forEach(function(p){p.scenes.forEach(function(s){
      var count=0,snippet='';
      if(s.title&&s.title.toLowerCase().indexOf(lt)>-1)count++;
      collectTexts(s).forEach(function(r){var v=r.get()||'';var i=v.toLowerCase().indexOf(lt);if(i>-1){count++;if(!snippet){var st=Math.max(0,i-16),en=Math.min(v.length,i+term.length+30);snippet=(st>0?'…':'')+v.slice(st,en)+(en<v.length?'…':'')}}});
      if(count>0)results.push({scenarioId:sc.id,platformId:sc.platformId,partId:p.id,sceneId:s.id,title:s.title,path:sc.title+' / '+p.title,count:count,snippet:snippet});
    })});
    sc.endings.forEach(function(e){
      var count=0,snippet='';
      if(e.title&&e.title.toLowerCase().indexOf(lt)>-1)count++;
      if(e.condition&&e.condition.toLowerCase().indexOf(lt)>-1){count++;if(!snippet)snippet=e.condition.slice(0,50)}
      collectTexts(e).forEach(function(r){var v=r.get()||'';var i=v.toLowerCase().indexOf(lt);if(i>-1){count++;if(!snippet){var st=Math.max(0,i-16),en=Math.min(v.length,i+term.length+30);snippet=(st>0?'…':'')+v.slice(st,en)+(en<v.length?'…':'')}}});
      if(count>0)results.push({scenarioId:sc.id,platformId:sc.platformId,endingId:e.id,title:e.title||'(엔딩)',path:sc.title+' / endings',count:count,snippet:snippet});
    });
  });
  return results;
}
function countAllMatches(term){
  if(!term)return 0;var total=0;
  S.data.scenarios.forEach(function(sc){
    sc.parts.forEach(function(p){p.scenes.forEach(function(s){collectTexts(s).forEach(function(r){var v=r.get()||'',i=0;while((i=v.indexOf(term,i))!==-1){total++;i+=term.length}})})});
    sc.endings.forEach(function(e){collectTexts(e).forEach(function(r){var v=r.get()||'',i=0;while((i=v.indexOf(term,i))!==-1){total++;i+=term.length}})});
  });
  return total;
}
function replaceAll(term,repl){
  S.data.scenarios.forEach(function(sc){
    sc.parts.forEach(function(p){p.scenes.forEach(function(s){collectTexts(s).forEach(function(r){var v=r.get()||'';if(v.indexOf(term)!==-1)r.set(v.split(term).join(repl))})})});
    sc.endings.forEach(function(e){collectTexts(e).forEach(function(r){var v=r.get()||'';if(v.indexOf(term)!==-1)r.set(v.split(term).join(repl))})});
  });
  save();
}
function highlightTerm(text,term){var i=text.toLowerCase().indexOf(term.toLowerCase());if(i===-1)return esc(text);return esc(text.slice(0,i))+'<mark style="background:var(--accent-soft);color:var(--ink);font-weight:700;border-radius:2px">'+esc(text.slice(i,i+term.length))+'</mark>'+esc(text.slice(i+term.length))}

// ========== GITHUB GIST ==========
function openCloudModal(){
  var m=$('cloud-modal');m.hidden=false;
  $('gist-token').value=S.data.cloud.token||'';
  $('gist-id').value=S.data.cloud.gistId||'';
  $('cloud-close').onclick=function(){m.hidden=true};
  $('gist-push').onclick=function(){gistSave()};
  $('gist-pull').onclick=function(){gistLoad()};
}

function gistSave(){
  var token=$('gist-token').value.trim();if(!token){toast('토큰을 입력해주세요');return}
  S.data.cloud.token=token;
  var gistId=$('gist-id').value.trim();
  var body=JSON.stringify({description:'시나리오 대장간 백업',public:false,files:{'scenario-forge.json':{content:JSON.stringify(S.data,null,2)}}});
  var url=gistId?'https://api.github.com/gists/'+gistId:'https://api.github.com/gists';
  var method=gistId?'PATCH':'POST';
  toast('☁ 저장 중...');
  fetch(url,{method:method,headers:{'Authorization':'token '+token,'Content-Type':'application/json'},body:body})
  .then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})
  .then(function(data){
    S.data.cloud.gistId=data.id;$('gist-id').value=data.id;save();
    toast('☁ 저장 완료');
  }).catch(function(e){toast('☁ 저장 실패: '+e.message)});
}

function gistLoad(){
  var token=$('gist-token').value.trim(),gistId=$('gist-id').value.trim();
  if(!token||!gistId){toast('토큰과 Gist ID를 입력해주세요');return}
  toast('☁ 불러오는 중...');
  fetch('https://api.github.com/gists/'+gistId,{headers:{'Authorization':'token '+token}})
  .then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})
  .then(function(data){
    var file=data.files['scenario-forge.json'];if(!file){toast('파일을 찾을 수 없어요');return}
    var parsed=JSON.parse(file.content);
    if(!confirm('클라우드 데이터로 현재 데이터를 덮어씌울까요?'))return;
    migrate(parsed);S.data=parsed;S.data.cloud.token=token;S.data.cloud.gistId=gistId;
    S.scenarioId=null;S.partId=null;S.sceneId=null;S.endingId=null;S.openParts={};
    validateSelection();resetHistory();save();
    $('cloud-modal').hidden=true;render();toast('☁ 불러오기 완료');
  }).catch(function(e){toast('☁ 불러오기 실패: '+e.message)});
}

// ========== PRINT ==========
function openPrintModal(){
  var m=$('print-modal');m.hidden=false;
  $('print-close').onclick=$('print-cancel').onclick=function(){m.hidden=true};
  $('print-go').onclick=function(){
    var includeGm=$('print-gm').checked;
    var prevGm=S.gmMode;S.gmMode=includeGm;
    // Re-render main in play mode for print
    var prevMode=S.mode;S.mode='play';renderMain();
    m.hidden=true;
    setTimeout(function(){window.print();S.mode=prevMode;S.gmMode=prevGm;syncModeBtns();updateGmSwitch();renderMain()},100);
  };
}

// ========== EXPORT / IMPORT ==========
function exportData(){
  var blob=new Blob([JSON.stringify(S.data,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);var a=document.createElement('a');
  var sc=curScenario();var name=(sc?sc.title:'scenario-forge-backup').replace(/[\\/:*?"<>|]/g,'');
  a.href=url;a.download=name+'_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);toast('내보내기 완료');
}
function importData(file){
  var reader=new FileReader();
  reader.onload=function(){
    try{
      var parsed=JSON.parse(reader.result);
      if(!parsed||!Array.isArray(parsed.platforms)||!Array.isArray(parsed.scenarios))throw new Error('형식 오류');
      if(!confirm('현재 데이터를 덮어씌울까요?'))return;
      migrate(parsed);S.data=parsed;
      S.platformId=null;S.scenarioId=null;S.partId=null;S.sceneId=null;S.endingId=null;S.openParts={};
      validateSelection();resetHistory();save();render();toast('불러오기 완료');
    }catch(e){alert('올바른 JSON 파일이 아닙니다: '+e.message)}
  };reader.readAsText(file);
}

// ========== PC TRACKER ==========
function renderPCList(){
  var sec=$('pc-section'),w=$('pc-list');
  var sc=curScenario();if(!sc){if(sec)sec.hidden=true;return}if(sec)sec.hidden=false;
  if(!sc.pcs.length){w.innerHTML='<div style="font-size:11px;color:var(--faint);padding:4px 8px">PC 없음</div>';return}
  var h='';
  sc.pcs.forEach(function(pc){
    var hpPct=pc.hpMax?Math.round(pc.hp/pc.hpMax*100):0;
    var sanPct=pc.sanMax?Math.round(pc.san/pc.sanMax*100):0;
    h+='<div class="pc-card">';
    h+='<div class="pc-card-head"><span class="pc-name">'+esc(pc.name||'(이름 없음)')+'</span><button class="ib" data-pc-edit="'+pc.id+'" title="편집">✎</button><button class="ib" data-pc-del="'+pc.id+'" title="삭제">✕</button></div>';
    h+='<div class="pc-bars">';
    h+='<div class="pc-bar"><div class="pc-bar-label"><span>HP</span><span>'+pc.hp+'/'+pc.hpMax+'</span></div><div class="pc-bar-track"><div class="pc-bar-fill hp" style="width:'+hpPct+'%"></div></div>';
    h+='<div class="pc-bar-ctrl"><button data-hp-d="'+pc.id+'">−</button><span>'+pc.hp+'</span><button data-hp-u="'+pc.id+'">+</button></div></div>';
    h+='<div class="pc-bar"><div class="pc-bar-label"><span>SAN</span><span>'+pc.san+'/'+pc.sanMax+'</span></div><div class="pc-bar-track"><div class="pc-bar-fill san" style="width:'+sanPct+'%"></div></div>';
    h+='<div class="pc-bar-ctrl"><button data-san-d="'+pc.id+'">−</button><span>'+pc.san+'</span><button data-san-u="'+pc.id+'">+</button></div></div>';
    h+='</div>';
    if(pc.skills)h+='<div class="pc-skills">'+esc(pc.skills)+'</div>';
    h+='</div>';
  });
  w.innerHTML=h;
  w.querySelectorAll('[data-hp-u]').forEach(function(b){b.onclick=function(){var pc=sc.pcs.find(function(p){return p.id===b.dataset.hpU});pc.hp=Math.min(pc.hp+1,pc.hpMax);save();renderPCList()}});
  w.querySelectorAll('[data-hp-d]').forEach(function(b){b.onclick=function(){var pc=sc.pcs.find(function(p){return p.id===b.dataset.hpD});pc.hp=Math.max(pc.hp-1,0);save();renderPCList()}});
  w.querySelectorAll('[data-san-u]').forEach(function(b){b.onclick=function(){var pc=sc.pcs.find(function(p){return p.id===b.dataset.sanU});pc.san=Math.min(pc.san+1,pc.sanMax);save();renderPCList()}});
  w.querySelectorAll('[data-san-d]').forEach(function(b){b.onclick=function(){var pc=sc.pcs.find(function(p){return p.id===b.dataset.sanD});pc.san=Math.max(pc.san-1,0);save();renderPCList()}});
  w.querySelectorAll('[data-pc-del]').forEach(function(b){b.onclick=function(){sc.pcs=sc.pcs.filter(function(p){return p.id!==b.dataset.pcDel});save();renderPCList()}});
  w.querySelectorAll('[data-pc-edit]').forEach(function(b){b.onclick=function(){openPCEdit(sc,b.dataset.pcEdit)}});
}

function openPCEdit(sc,pcId){
  var pc=sc.pcs.find(function(p){return p.id===pcId});if(!pc)return;
  var fields='이름: '+pc.name+'\nHP최대: '+pc.hpMax+'\nSAN최대: '+pc.sanMax+'\nDEX: '+pc.dex+'\n기능치(한줄에 하나씩):\n'+pc.skills+'\n메모:\n'+pc.notes;
  openPrompt('PC 편집 — '+pc.name,pc.name,function(v){
    if(!v)return;pc.name=v;save();renderPCList();
  });
}

// ========== SESSION HISTORY ==========
function renderSessionList(){
  var sec=$('session-section'),w=$('session-list');
  var sc=curScenario();if(!sc){if(sec)sec.hidden=true;return}if(sec)sec.hidden=false;
  if(!sc.sessionHistory.length){w.innerHTML='<div style="font-size:11px;color:var(--faint);padding:4px 8px">기록 없음</div>';return}
  var h='';
  sc.sessionHistory.forEach(function(s){
    h+='<div class="sess-card" data-sess="'+s.id+'"><div class="sess-date">'+esc(s.date)+'</div><div class="sess-summary">'+esc(s.summary||'(내용 없음)')+'</div></div>';
  });
  w.innerHTML=h;
}

// ========== SINGLE SCENARIO EXPORT/MERGE ==========
function exportSingleScenario(sc){
  var data={scenario:JSON.parse(JSON.stringify(sc)),version:'scenario-forge-single-v1'};
  var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);var a=document.createElement('a');
  a.href=url;a.download=(sc.title||'scenario').replace(/[\\/:*?"<>|]/g,'')+'_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  toast('시나리오 내보내기 완료');
}
function mergeImport(file){
  var reader=new FileReader();
  reader.onload=function(){
    try{
      var parsed=JSON.parse(reader.result);
      var sc;
      if(parsed.version==='scenario-forge-single-v1'&&parsed.scenario){sc=parsed.scenario}
      else if(parsed.scenarios&&parsed.scenarios.length){sc=parsed.scenarios[0]}
      else throw new Error('형식 오류');
      sc.id=uid();
      if(!sc.platformId&&S.platformId)sc.platformId=S.platformId;
      migrate({scenarios:[sc],platforms:S.data.platforms});
      S.data.scenarios.push(sc);
      S.scenarioId=sc.id;S.partId=null;S.sceneId=null;S.endingId=null;
      save();render();toast('"'+sc.title+'" 병합 완료');
    }catch(e){alert('올바른 시나리오 파일이 아닙니다: '+e.message)}
  };reader.readAsText(file);
}

// ========== COCOFOLIA PREVIEW ==========
function renderCocofolia(text){
  if(!text)return'';
  var lines=text.split('\n'),out='';
  lines.forEach(function(line){
    if(!line.trim()){out+='<div class="coco-msg" style="height:4px;padding:0;border:none"></div>';return}
    // 【설명】or 【】 pattern
    if(/^【/.test(line)){out+='<div class="coco-msg narration">'+esc(line)+'</div>';return}
    // (( )) whisper
    if(/^\(\(/.test(line)){out+='<div class="coco-msg system">'+esc(line)+'</div>';return}
    // name: text pattern
    var nameMatch=line.match(/^([^:：]+)[：:]\s*(.*)/);
    if(nameMatch){out+='<div class="coco-msg"><span class="coco-name">'+esc(nameMatch[1])+'</span>'+esc(nameMatch[2])+'</div>';return}
    out+='<div class="coco-msg">'+esc(line)+'</div>';
  });
  return out;
}

function updateCocoPreview(scene){
  var body=$('coco-body');if(!body)return;
  var texts=[];
  (scene.blocks||[]).forEach(function(b){
    if((b.type==='text')&&b.content)texts.push(b.content);
    if(b.type==='lines'&&b.items)(b.items||[]).forEach(function(l){if(l.text)texts.push((l.label?l.label+'：':'')+l.text)});
  });
  body.innerHTML=texts.length?renderCocofolia(texts.join('\n')):'<span style="color:#666;font-size:12px;padding:12px;display:block">나레이션·대사 블록에 코코포리아 서식을 입력하면 미리보기가 표시됩니다.</span>';
}

// ========== MARKDOWN PLAY RENDER ==========
function renderMd(text){
  var s=esc(text);
  s=s.replace(/\*\*\*([^*]+)\*\*\*/g,'<b><i>$1</i></b>');
  s=s.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  s=s.replace(/(?<![\\*])\*([^*]+)\*/g,'<i>$1</i>');
  return s;
}

// ========== SIDEBAR RESIZE ==========
function setupSidebarResize(){
  var resizer=$('sb-resizer'),app=$('app');
  if(!resizer)return;
  var savedW;try{savedW=localStorage.getItem('sf-sb-w')}catch(e){}
  if(savedW){document.documentElement.style.setProperty('--sidebar-w',savedW+'px')}
  var collapsed;try{collapsed=localStorage.getItem('sf-sb-c')==='1'}catch(e){}
  if(collapsed)app.classList.add('collapsed');

  resizer.onmousedown=function(e){
    e.preventDefault();resizer.classList.add('drag');document.body.style.userSelect='none';
    function onMove(ev){var w=Math.max(200,Math.min(520,ev.clientX));document.documentElement.style.setProperty('--sidebar-w',w+'px');try{localStorage.setItem('sf-sb-w',w)}catch(e){}}
    function onUp(){resizer.classList.remove('drag');document.body.style.userSelect='';document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp)}
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
  };
  $('sb-collapse').onclick=function(){app.classList.add('collapsed');try{localStorage.setItem('sf-sb-c','1')}catch(e){}};
  $('sb-reopen').onclick=function(){app.classList.remove('collapsed');try{localStorage.setItem('sf-sb-c','0')}catch(e){}};
}

// ========== FONT SIZE ==========
function setupFontSize(){
  var saved;try{saved=localStorage.getItem('sf-font')||'1'}catch(e){saved='1'}
  document.body.style.zoom=saved;
  document.querySelectorAll('#font-sw button').forEach(function(b){
    b.classList.toggle('on',b.dataset.scale===saved);
    b.onclick=function(){
      document.body.style.zoom=b.dataset.scale;
      document.querySelectorAll('#font-sw button').forEach(function(x){x.classList.toggle('on',x===b)});
      try{localStorage.setItem('sf-font',b.dataset.scale)}catch(e){}
    };
  });
}

// ========== THEME ==========
function toggleTheme(){
  var th=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=th;S.data.theme=th;save();
}
function updateGmSwitch(){
  var sw=$('gm-sw'),lb=$('gm-label');
  if(!sw)return;
  sw.className='gm-sw '+(S.gmMode?'on':'off');
  lb.textContent=S.gmMode?'GM:ON':'GM:OFF';
}

// ========== FLOAT BAR POSITIONING ==========
function setupFloatBarTracking(){
  var hideTimer=null;
  document.addEventListener('focusin',function(e){
    var t=e.target;
    if(t.tagName!=='TEXTAREA'&&!(t.tagName==='INPUT'&&t.type==='text'))return;
    if(t.classList.contains('blk-label-input'))return;
    if(!t.closest('#block-list')&&!t.closest('#main'))return;
    clearTimeout(hideTimer);S._lastField=t;
    var bar=$('float-cmd');if(!bar)return;bar.hidden=false;
    posBar(bar,t);
  });
  document.addEventListener('focusout',function(e){
    if(e.target.tagName!=='TEXTAREA'&&!(e.target.tagName==='INPUT'&&e.target.type==='text'))return;
    hideTimer=setTimeout(function(){var bar=$('float-cmd');if(bar)bar.hidden=true},120);
  });
  var mainEl=$('main');if(mainEl)mainEl.addEventListener('scroll',function(){
    var bar=$('float-cmd');if(bar&&!bar.hidden&&S._lastField)posBar(bar,S._lastField);
  });
}
function posBar(bar,target){
  var r=target.getBoundingClientRect();
  var topbar=document.querySelector('.topbar');
  var minTop=(topbar?topbar.getBoundingClientRect().bottom:0)+4;
  var barH=bar.offsetHeight||36;
  bar.style.position='fixed';
  bar.style.left=Math.round(r.left)+'px';bar.style.width=Math.round(r.width)+'px';
  var topAbove=r.top-barH-4;
  bar.style.top=Math.round(topAbove>=minTop?topAbove:Math.min(r.bottom+4,window.innerHeight-barH-4))+'px';
}

// ========== EVENT BINDINGS ==========
// Mode switch
document.querySelectorAll('.mode-sw .mode-btn[data-mode]').forEach(function(btn){
  btn.onclick=function(){S.mode=btn.dataset.mode;syncModeBtns();renderMain()}
});
// GM toggle
$('gm-sw').onclick=function(){S.gmMode=!S.gmMode;updateGmSwitch();if(S.mode==='play')renderMain()};
// Theme
$('theme-btn').onclick=toggleTheme;
// Undo/redo
$('undo-btn').onclick=undo;$('redo-btn').onclick=redo;
// Toolbar buttons
$('find-btn').onclick=openFindModal;
$('print-btn').onclick=openPrintModal;
$('cloud-btn').onclick=openCloudModal;
$('export-btn').onclick=exportData;
$('import-btn').onclick=function(){$('import-file').click()};
$('import-file').onchange=function(e){if(e.target.files&&e.target.files[0])importData(e.target.files[0]);e.target.value=''};
// Sidebar buttons
$('add-scenario-btn').onclick=function(){
  if(!S.platformId){toast('먼저 사이트를 선택하세요');return}
  openPrompt('새 시나리오 이름','',function(v){if(!v)return;
    var sc={id:uid(),title:v,platformId:S.platformId,setting:'',synopsis:'',parts:[],endings:[],clues:[],
      pcs:[],eventTimeline:[],sessionHistory:[],
      endingTypes:JSON.parse(JSON.stringify(DEFAULT_ENDING_TYPES)),
      library:{npcs:[],items:[],places:[]}};
    S.data.scenarios.push(sc);S.scenarioId=sc.id;S.partId=null;S.sceneId=null;S.endingId=null;save();render()
  })
};
$('add-ending-btn').onclick=function(){
  var sc=curScenario();if(!sc){toast('시나리오를 선택하세요');return}
  openPrompt('새 엔딩 이름','',function(v){if(!v)return;
    var e={id:uid(),title:v,endingType:sc.endingTypes[0]?sc.endingTypes[0].id:'normal',condition:'',blocks:[{id:uid(),type:'text',label:'엔딩 나레이션',content:''}]};
    sc.endings.push(e);selectEnding(S.platformId,S.scenarioId,e.id);save();render()
  })
};
$('add-clue-btn').onclick=function(){
  var sc=curScenario();if(!sc){toast('시나리오를 선택하세요');return}
  openPrompt('새 단서 이름','',function(v){if(!v)return;
    sc.clues.push({id:uid(),name:v,description:'',foundInSceneId:'',leadsToSceneId:''});save();renderCluesList()
  })
};
$('open-lib-btn').onclick=$('open-lib-btn2').onclick=openLibrary;
$('cmd-lib-btn').onclick=openCommandModal;
$('add-pc-btn').onclick=function(){
  var sc=curScenario();if(!sc){toast('시나리오를 선택하세요');return}
  openPrompt('PC 이름','',function(v){if(!v)return;
    sc.pcs.push({id:uid(),name:v,hp:10,hpMax:10,san:50,sanMax:50,dex:50,skills:'',notes:''});save();renderPCList()
  })
};
$('add-session-btn').onclick=function(){
  var sc=curScenario();if(!sc){toast('시나리오를 선택하세요');return}
  var today=new Date().toISOString().slice(0,10);
  sc.sessionHistory.push({id:uid(),date:today,summary:'',notes:''});save();renderSessionList();
};
// Mobile sidebar
var mobileMenu=$('mobile-menu');
function syncMobile(){mobileMenu.style.display=window.innerWidth<=860?'inline-flex':'none'}
window.addEventListener('resize',syncMobile);syncMobile();
mobileMenu.onclick=function(){$('sidebar').classList.toggle('open')};

// Keyboard shortcuts
document.addEventListener('keydown',function(e){
  var mod=e.ctrlKey||e.metaKey;if(!mod)return;
  if(e.key==='s'||e.key==='S'){e.preventDefault();save();toast('저장됨')}
  else if(e.key==='f'||e.key==='F'){e.preventDefault();openFindModal()}
  else if((e.key==='z'||e.key==='Z')&&!e.shiftKey){e.preventDefault();undo()}
  else if((e.key==='z'||e.key==='Z')&&e.shiftKey){e.preventDefault();redo()}
  else if(e.key==='y'||e.key==='Y'){e.preventDefault();redo()}
});

// ========== INIT ==========
document.documentElement.dataset.theme=S.data.theme||'dark';
validateSelection();
resetHistory();
setupFloatBarTracking();
setupSidebarResize();
setupFontSize();
updateGmSwitch();
render();
updateSaveInd();
