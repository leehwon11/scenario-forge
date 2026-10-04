import { useState, useMemo } from "react";
import { Btn,Inp,Modal,useDialog } from '../components/ui.jsx'
import { countIn,eachText } from '../lib/data.js'

// 범위 안의 씬·엔딩 순회: scope==='here'면 지금 보고 있는 시나리오(+선택된 씬/엔딩)만
function entriesIn(D,scope,sel){const out=[];
  for(const sc of D.scenarios){if(scope!=='all'&&sc.id!==sel.sid)continue;
    for(const p of sc.parts)for(const s of p.scenes){if(scope==='entry'&&s.id!==sel.scid)continue;out.push({sc,p,en:s,tp:'scene'})}
    for(const e of sc.endings||[]){if(scope==='entry'&&e.id!==sel.eid)continue;out.push({sc,p:null,en:e,tp:'ending'})}}
  return out}
// 검색어 주변 문맥을 잘라 강조 표시
function Snip({text,q}){const i=text.toLowerCase().indexOf(q.toLowerCase());if(i<0)return null;
  const a=Math.max(0,i-24),b=Math.min(text.length,i+q.length+40);
  return<div style={{fontSize:12,color:'var(--tx2)',lineHeight:1.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
    {a>0&&'…'}{text.slice(a,i).replace(/\n/g,' ')}<mark className="hl">{text.slice(i,i+q.length)}</mark>{text.slice(i+q.length,b).replace(/\n/g,' ')}{b<text.length&&'…'}</div>}

export function FindM({D,up,sel,setSel,setMode,onClose,toast}){const dlg=useDialog();const[t,setT]=useState('');const[rt,setRt]=useState('');const[rm,setRm]=useState('find');
  const scopes=[['all','전체'],...(sel.sid?[['here','이 시나리오']]:[]),...(sel.scid||sel.eid?[['entry',sel.scid?'이 씬':'이 엔딩']]:[])];
  const[scope,setScope]=useState('all');
  const res=useMemo(()=>{if(!t.trim())return[];const lt=t.toLowerCase(),r=[];
    for(const x of entriesIn(D,scope,sel)){const hits=[];const chk=v=>{if(typeof v==='string'&&v.toLowerCase().includes(lt))hits.push(v)};chk(x.en.title);chk(x.en.condition);
      for(const b of x.en.blocks||[])eachText(b,(o,k)=>chk(o[k]));
      if(hits.length)r.push({...x,hits})}return r},[t,D,scope,sel]);
  const countAll=()=>{if(!t)return 0;let n=0;for(const{en}of entriesIn(D,scope,sel)){if(en.condition)n+=countIn(en.condition,t);for(const b of en.blocks||[])eachText(b,(o,k)=>{n+=countIn(o[k],t)})}return n};
  const doReplace=async()=>{if(!t){toast('검색어 필요');return}const n=countAll();if(!n){toast('결과 없음');return}
    if(!await dlg.confirm(`"${t}" → "${rt}" 로 ${n}건을 바꿉니다.\n(실행 취소로 되돌릴 수 있습니다)`,{title:'모두 바꾸기',okLabel:'바꾸기'}))return;
    up(d=>{for(const{en}of entriesIn(d,scope,sel)){if(en.condition)en.condition=en.condition.split(t).join(rt);for(const b of en.blocks||[])eachText(b,(o,k)=>{o[k]=o[k].split(t).join(rt)})}});onClose();toast(n+'건 바꿨습니다')};
  const seg=(items,val,set)=><div style={{display:'flex',background:'var(--sf2)',borderRadius:6,padding:2,border:'1px solid var(--bdr)',marginBottom:8}}>
    {items.map(([k,l])=><button key={k} onClick={()=>set(k)} aria-pressed={val===k} style={{flex:1,padding:'4px 10px',borderRadius:4,fontSize:11,fontWeight:600,background:val===k?'var(--sf1)':'transparent',color:val===k?'var(--tx1)':'var(--tx3)'}}>{l}</button>)}</div>;
  const total=res.reduce((a,r)=>a+r.hits.length,0);
  return<Modal title="찾기 · 바꾸기" onClose={onClose} width={520} footer={rm==='replace'?<Btn primary onClick={doReplace}>모두 바꾸기</Btn>:null}>
    {seg([['find','찾기'],['replace','바꾸기']],rm,setRm)}
    {scopes.length>1&&<div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,color:'var(--tx3)',marginBottom:8,flexShrink:0}}>범위</span><div style={{flex:1}}>{seg(scopes,scope,setScope)}</div></div>}
    <Inp value={t} onChange={setT} placeholder="찾을 단어" mono autoFocus style={{marginBottom:8}}/>
    {rm==='replace'&&<Inp value={rt} onChange={setRt} placeholder="바꿀 단어" mono style={{marginBottom:8}}/>}
    {rm==='replace'&&t&&<div style={{fontSize:12,color:'var(--tx3)',padding:'6px 8px',border:'1px solid var(--bdr)',borderRadius:6,marginBottom:8}}>범위 안에서 <b style={{color:'var(--tx1)'}}>{countAll()}건</b> (대소문자 구분)</div>}
    {rm==='find'&&<div style={{maxHeight:360,overflowY:'auto'}}>{!t.trim()?<div style={{color:'var(--tx3)',fontSize:12}}>검색어를 입력하세요</div>:!res.length?<div style={{color:'var(--tx3)',fontSize:12}}>결과 없음</div>
      :<><div style={{fontSize:11,color:'var(--tx3)',marginBottom:6}}>{res.length}곳에서 {total}건</div>
      {res.map((r,i)=><button key={i} onClick={()=>{if(r.tp==='scene')setSel({pid:r.sc.platformId,sid:r.sc.id,ptid:r.p.id,scid:r.en.id,eid:null});else setSel({pid:r.sc.platformId,sid:r.sc.id,ptid:null,scid:null,eid:r.en.id});setMode('edit');onClose()}}
        className="find-hit" style={{display:'block',width:'100%',textAlign:'left',border:'1px solid var(--bdr)',borderRadius:6,padding:'7px 10px',marginBottom:4,cursor:'pointer'}}>
        <div style={{display:'flex',gap:6,alignItems:'baseline'}}><span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:600,fontSize:12,color:'var(--tx1)'}}>{r.tp==='ending'?'🏁 ':''}{r.en.title}</span>
          <span style={{fontSize:10,color:'var(--tx3)'}}>{r.sc.title}{r.p?' / '+r.p.title:''} · {r.hits.length}건</span></div>
        {r.hits.slice(0,3).map((h,j)=><Snip key={j} text={h} q={t}/>)}{r.hits.length>3&&<div style={{fontSize:11,color:'var(--tx3)'}}>…외 {r.hits.length-3}건</div>}</button>)}</>}</div>}
  </Modal>}
