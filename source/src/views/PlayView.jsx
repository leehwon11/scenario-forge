import { ChevronLeft,ChevronRight,Circle,CircleCheck,Dice5,ExternalLink,GitBranch,MessageSquareQuote,Music } from "lucide-react";
import { Btn,CopyBtn,Lines,ell } from '../components/ui.jsx'
import { BT,mdR } from '../lib/data.js'

// ===== PLAY VIEW =====
// BGM: 유튜브 링크는 바로 재생 가능한 플레이어로, 음악 파일은 오디오 플레이어로
export const ytId=u=>u?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/)?.[1]||null;
export const isAudio=u=>/\.(mp3|ogg|wav|m4a|flac|aac)(\?.*)?$/i.test(u||'');
// 씬 전체 복사용 텍스트: 화면에 보이는(GM 토글 반영) 글 블록만 모음
export function sceneText(entry,gm,isR20){const out=[entry.title,''];
  for(const b of entry.blocks||[]){const gmOnly=['memo','truth','clue','session-log'].includes(b.type);if(gmOnly&&!gm)continue;
    if(['text','memo','truth','session-log'].includes(b.type)&&b.content?.trim())out.push(`[${b.label}]`,b.content,'');
    if(b.type==='lines'&&b.items?.length){out.push(`[${b.label}]`);for(const it of b.items)if(it.text)for(const l of it.text.split('\n'))if(l.trim())out.push(isR20&&it.label?`/as "${it.label}" ${l}`:(it.label?it.label+': ':'')+l);out.push('')}
    if(b.type==='handout'&&b.content?.trim())out.push(`[${b.title||b.label}]`,b.content,'')}
  return out.join('\n').trim()}
export function PlayV({entry,sc,pt,plat,gm,isSc,nav}){
  const isR20=plat?.name.toLowerCase().includes('roll20');
  const asLine=name=>l=>isR20&&name?`/as "${name}" ${l}`:l;
  const renderB=(b)=>{const m=BT[b.type]||BT.text;const isGm=['memo','truth','clue','session-log'].includes(b.type);
    if(isGm&&!gm)return null;
    const wrap=(color,children,copy,copyLabel='전체 복사')=><div key={b.id} className="rail" style={{marginBottom:16,borderLeftColor:color}}>
      <div className="rail-dot" style={{borderColor:color}}/>
      <div style={{display:'flex',alignItems:'center',gap:4,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4,minHeight:20}}>
        <span style={{flex:1}}>// {b.label||m.l}{isGm&&<span style={{marginLeft:6,color:'var(--gold)'}}>GM</span>}</span>{copy&&<CopyBtn text={copy} label={copyLabel} title="블록 전체 복사"/>}</div>{children}</div>;
    const itemHead=(icon,title,copy)=><div style={{display:'flex',alignItems:'center',gap:6,fontWeight:700,fontSize:12,marginBottom:4,color:'var(--tx1)'}}>
      {icon}<span style={{flex:1,minWidth:0}}>{title||<span style={{color:'var(--tx3)',fontWeight:400}}>(제목 없음)</span>}</span>{copy&&<CopyBtn text={copy} label="전체" title="전체 복사"/>}</div>;
    const gmNote=v=>gm&&v?<div style={{marginTop:8,border:'1px solid rgba(210,153,34,.15)',background:'var(--goldA)',borderRadius:6,padding:'8px 10px',fontSize:12,whiteSpace:'pre-wrap'}}>
      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,color:'var(--gold)',border:'1px solid var(--gold)',borderRadius:99,padding:'0 5px',marginRight:6}}>GM</span>{v}</div>:null;
    if(['text','memo','truth','session-log'].includes(b.type)){const bg={memo:'var(--goldA)',truth:'var(--coralA)','session-log':'var(--purpleA)'}[b.type]||'var(--sf1)';
      return wrap(m.c,b.content?<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:bg,padding:'10px 14px',fontSize:13,lineHeight:1.7}}><Lines text={b.content} render={mdR}/></div>
        :<div style={{color:'var(--tx3)',fontSize:12}}>(비어 있음)</div>,b.content||null)}
    if(b.type==='clue'){const cl=sc?.clues.find(c=>c.id===b.clueId);return wrap('var(--teal)',<div>
      {cl&&<span style={{display:'inline-flex',alignItems:'center',gap:3,background:'var(--tealA)',color:'var(--teal)',padding:'2px 8px',borderRadius:12,fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,marginBottom:6}}>🔗 {cl.name}{cl.isRedHerring&&' (미끼)'}</span>}
      {b.content&&<div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--tealA)',padding:'10px 14px',fontSize:13,lineHeight:1.7}}><Lines text={b.content}/></div>}
    </div>,b.content||null)}
    if(b.type==='npc')return wrap('var(--purple)',<div className="card">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
        {b.imageUrl&&<img src={b.imageUrl} alt="" style={{width:44,height:44,borderRadius:'50%',objectFit:'cover',border:'1px solid var(--bdr)'}} onError={e=>{e.target.style.display='none'}}/>}
        <div style={{flex:1,minWidth:0}}><div style={{fontFamily:'Instrument Serif,serif',fontSize:17,color:'var(--tx1)'}}>{b.name||'?'}</div>{b.role&&<div style={{fontSize:11,color:'var(--tx3)'}}>{b.role}</div>}</div>
        {b.name&&<CopyBtn text={b.name} label="이름" title="이름 복사"/>}
      </div>
      {b.traits&&<ul style={{paddingLeft:16,fontSize:12,lineHeight:1.7,margin:0}}>{b.traits.split('\n').filter(l=>l.trim()).map((t,i)=><li key={i}>{t}</li>)}</ul>}
      {b.lines?.trim()&&<div style={{marginTop:6,borderTop:'1px dashed var(--bdr)',paddingTop:6,fontSize:13,fontStyle:'italic'}}><Lines text={b.lines} wrap={asLine(b.name)}/></div>}
    </div>);
    if(b.type==='item'||b.type==='place')return wrap(m.c,<div className="card">
      <div style={{display:'flex',gap:10}}>
        {b.imageUrl&&<img src={b.imageUrl} alt="" style={{width:64,height:64,borderRadius:6,objectFit:'cover',border:'1px solid var(--bdr)',flexShrink:0}} onError={e=>{e.target.style.display='none'}}/>}
        <div style={{flex:1,minWidth:0}}><div style={{fontFamily:'Instrument Serif,serif',fontSize:17,color:'var(--tx1)'}}>{b.name||'?'}</div>
          {b.description&&<div style={{fontSize:13,lineHeight:1.7}}><Lines text={b.description}/></div>}</div></div>
      {gmNote(b.gmNote)}</div>,b.description||null);
    if(b.type==='bgm'){const yt=ytId(b.url);return wrap(m.c,<div className="card">
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <Music size={14} style={{color:'var(--coral)'}}/><span style={{fontWeight:600,color:'var(--tx1)',flex:1}}>{b.title||'(제목 없음)'}</span>
        {b.url&&<CopyBtn text={b.url} label="링크" title="링크 복사"/>}
        {/^https?:\/\//i.test(b.url||'')&&<a href={b.url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:11,color:'var(--blue)'}}><ExternalLink size={11}/>열기</a>}</div>
      {yt&&<div style={{marginTop:8,position:'relative',paddingTop:'56.25%',borderRadius:6,overflow:'hidden',background:'#000'}}>
        <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title={b.title||'BGM'} allow="autoplay; encrypted-media" allowFullScreen loading="lazy" style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0}}/></div>}
      {!yt&&isAudio(b.url)&&<audio controls src={b.url} style={{width:'100%',marginTop:8}}/>}
      {b.note&&<div style={{marginTop:6,fontSize:12,color:'var(--tx3)',whiteSpace:'pre-wrap'}}>{b.note}</div>}</div>)}
    if(b.type==='handout')return wrap('var(--teal)',<div style={{border:'1px solid var(--bdr)',borderRadius:8,overflow:'hidden',background:'var(--sf1)'}}>
      {b.title&&<div style={{padding:'10px 14px 0',fontFamily:'Instrument Serif,serif',fontWeight:700,fontSize:15}}>{b.title}</div>}
      {b.imageUrl&&<img src={b.imageUrl} alt="" style={{maxWidth:'calc(100% - 28px)',borderRadius:4,margin:'6px 14px'}} onError={e=>{e.target.style.display='none'}}/>}
      {b.content&&<div style={{padding:'10px 14px',fontSize:13,lineHeight:1.8}}><Lines text={b.content}/></div>}
      {gm&&b.gmNote&&<div style={{margin:'0 10px 10px'}}>{gmNote(b.gmNote)}</div>}
    </div>,b.content||null,'복사');
    if(b.type==='branches'&&b.items?.length)return wrap(m.c,<div>{b.items.map(it=><div key={it.id} className="card" style={{padding:10,marginBottom:6,borderLeft:`3px solid ${m.c}`}}>
      {itemHead(<GitBranch size={12} style={{color:m.c,flexShrink:0}}/>,it.label,it.text||null)}
      {it.text&&<div style={{fontSize:13,lineHeight:1.7}}><Lines text={it.text}/></div>}</div>)}</div>);
    if(b.type==='lines'&&b.items?.length)return wrap(m.c,<div>{b.items.map(it=><div key={it.id} className="card" style={{padding:10,marginBottom:6,borderLeft:`3px solid ${m.c}`}}>
      {itemHead(<MessageSquareQuote size={12} style={{color:m.c,flexShrink:0}}/>,it.label,it.text?it.text.split('\n').filter(l=>l.trim()).map(asLine(it.label)).join('\n'):null)}
      {it.text&&<div style={{fontSize:13,lineHeight:1.7,fontStyle:'italic'}}><Lines text={it.text} wrap={asLine(it.label)}/></div>}</div>)}</div>);
    if(b.type==='checks'&&b.items?.length)return wrap('var(--red)',<div>{b.items.map(c=><div key={c.id} className="card" style={{padding:10,marginBottom:6}}>
      {itemHead(<Dice5 size={12} style={{color:'var(--red)',flexShrink:0}}/>,c.name)}
      {[['대성공',c.critSuccess,'var(--gold)'],['성공',c.success,'var(--green)'],['실패',c.fail,'var(--tx3)'],['대실패',c.critFail,'var(--red)']].map(([lb,v,cl])=>
        v?<div key={lb} style={{display:'flex',gap:8,padding:'4px 0',borderTop:'1px dashed var(--bdr)',fontSize:12,lineHeight:1.6}}>
          <span style={{flex:'0 0 50px',fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,color:cl,paddingTop:2}}>{lb}</span><div style={{flex:1,minWidth:0}}><Lines text={v}/></div></div>:null)}
    </div>)}</div>);
    return null;
  };
  return<div>
    <div className="crumb">{plat?.name||''} / {sc?.title} / {pt?.title||'endings'}</div>
    <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:8}}>
      <h1 style={{fontFamily:'Instrument Serif,serif',fontSize:28,fontWeight:400,color:'var(--tx1)',flex:1,minWidth:0}}>{entry.title}</h1>
      <span style={{marginTop:10}}><CopyBtn text={sceneText(entry,gm,isR20)} label="전체 복사" title="이 씬의 글 전체 복사 (GM 블록은 GM 모드일 때만)"/></span>
      {nav&&<Btn onClick={nav.toggleDone} style={{marginTop:6,...(nav.done?{borderColor:'var(--green)',color:'var(--green)',background:'var(--greenA)'}:{})}} title="씬 진행 완료 표시">
        {nav.done?<CircleCheck size={13}/>:<Circle size={13}/>}{nav.done?'완료됨':'완료로 표시'}</Btn>}
    </div>
    {isSc&&(entry.location||entry.timeOfDay||entry.npcsPresent)&&<div style={{display:'flex',gap:16,paddingBottom:8,marginBottom:14,borderBottom:'1px solid var(--bdr)',fontFamily:'JetBrains Mono,monospace',fontSize:11}}>
      {entry.location&&<span><b style={{color:'var(--tx3)'}}>loc</b> {entry.location}</span>}
      {entry.timeOfDay&&<span><b style={{color:'var(--tx3)'}}>time</b> {entry.timeOfDay}</span>}
      {entry.npcsPresent&&<span><b style={{color:'var(--tx3)'}}>npc</b> {entry.npcsPresent}</span>}
    </div>}
    {entry.condition&&<div className="rail" style={{marginBottom:16,borderLeftColor:'var(--coral)'}}>
      <div className="rail-dot" style={{borderColor:'var(--coral)'}}/>
      <div className="rail-label">// condition</div>
      <div style={{border:'1px solid var(--bdr)',borderRadius:8,background:'var(--coralA)',padding:'10px 14px',whiteSpace:'pre-wrap'}}>{entry.condition}</div>
    </div>}
    {(entry.blocks||[]).map(renderB)}
    {nav&&<div className="no-print" style={{marginTop:28,paddingTop:14,borderTop:'1px solid var(--bdr)'}}>
      {nav.targets.length>0&&<div style={{marginBottom:12}}>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:6}}>// 다음으로 이어지는 곳</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{nav.targets.map(t=><Btn key={t.id} onClick={()=>nav.go(t)} style={t.kind==='ending'?{borderColor:'var(--coral)',color:'var(--coral)'}:{borderColor:'var(--blue)',color:'var(--blue)'}}>
          {t.kind==='ending'?'🏁':'→'} {t.title}</Btn>)}</div></div>}
      <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
        {nav.prev?<Btn onClick={()=>nav.go(nav.prev)} style={{maxWidth:'48%'}}><ChevronLeft size={13}/><span style={ell}>{nav.prev.title}</span></Btn>:<span/>}
        {nav.next&&<Btn onClick={()=>{if(!nav.done)nav.toggleDone();nav.go(nav.next)}} primary title="이 씬을 완료로 표시하고 다음 씬으로" style={{maxWidth:'48%'}}><span style={ell}>{nav.next.title}</span><ChevronRight size={13}/></Btn>}
      </div>
    </div>}
  </div>;
}
