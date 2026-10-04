import { useState, useMemo } from "react";

// ===== FLOW VIEW =====
// 파트를 행으로, 씬을 카드로 배치하고 씬 연결(분기)을 화살표로 그린다.
const CW=168,CH=74,GX=44,GY=64,PAD=16,HEAD=26;

export function FlowV({sc,sel,setSel,setMode}){
  const[hov,setHov]=useState(null);
  const goScene=(ptid,scid)=>{setSel({pid:sel.pid,sid:sel.sid,ptid,scid,eid:null});setMode('edit')};
  const goEnding=(eid)=>{setSel({pid:sel.pid,sid:sel.sid,ptid:null,scid:null,eid});setMode('edit')};

  const L=useMemo(()=>{const pos={},rows=[];let y=PAD,maxX=0;
    sc.parts.forEach(p=>{rows.push({kind:'part',p,y});y+=HEAD;
      p.scenes.forEach((s,i)=>{const x=PAD+i*(CW+GX);pos[s.id]={x,y,kind:'scene',ptid:p.id,s};maxX=Math.max(maxX,x+CW)});
      y+=(p.scenes.length?CH:28)+GY});
    if(sc.endings.length){rows.push({kind:'end',y});y+=HEAD;
      sc.endings.forEach((e,i)=>{const x=PAD+i*(CW+GX);pos[e.id]={x,y,kind:'ending',e};maxX=Math.max(maxX,x+CW)});y+=CH+GY}
    // 간선: 명시적 연결 + 같은 파트 안의 순서(연결이 없을 때만)
    const edges=[];
    sc.parts.forEach(p=>p.scenes.forEach((s,i)=>{const own=(s.connections||[]).filter(c=>pos[c.targetSceneId]);
      own.forEach(c=>edges.push({from:s.id,to:c.targetSceneId,kind:'conn'}));
      const nx=p.scenes[i+1];if(nx&&!own.length)edges.push({from:s.id,to:nx.id,kind:'seq'})}));
    return{pos,rows,edges,w:Math.max(maxX+PAD,320),h:y-GY+PAD}},[sc]);

  if(!sc.parts.length&&!sc.endings.length)return<div style={{color:'var(--tx3)',textAlign:'center',padding:40,fontFamily:'JetBrains Mono,monospace',fontSize:13}}>파트와 씬을 먼저 만들어주세요</div>;

  const etOf=e=>sc.endingTypes.find(t=>t.id===e.endingType)||{l:'?',c:'#8b949e'};
  const path=(a,b)=>{
    if(b.y>a.y){const x1=a.x+CW/2,y1=a.y+CH,x2=b.x+CW/2,y2=b.y;const dy=Math.max(30,(y2-y1)/2);return`M${x1},${y1} C${x1},${y1+dy} ${x2},${y2-dy} ${x2},${y2}`}
    if(b.y<a.y){const x1=a.x+CW/2,y1=a.y,x2=b.x+CW/2,y2=b.y+CH;const k=60;return`M${x1},${y1} C${x1+k},${y1-k} ${x2+k},${y2+k} ${x2},${y2}`}
    if(b.x>a.x){const x1=a.x+CW,y1=a.y+CH/2,x2=b.x,y2=b.y+CH/2;if(b.x-a.x<=CW+GX)return`M${x1},${y1} L${x2},${y2}`;
      return`M${a.x+CW/2},${a.y} C${a.x+CW/2},${a.y-40} ${b.x+CW/2},${b.y-40} ${b.x+CW/2},${b.y}`}
    return`M${a.x+CW/2},${a.y+CH} C${a.x+CW/2},${a.y+CH+40} ${b.x+CW/2},${b.y+CH+40} ${b.x+CW/2},${b.y+CH}`};
  const active=e=>!hov||e.from===hov||e.to===hov;
  const badge=(bg,c,t,title)=><span title={title} style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,padding:'0 5px',borderRadius:8,background:bg,color:c}}>{t}</span>;

  return<div>
    <div style={{display:'flex',alignItems:'baseline',gap:12,flexWrap:'wrap',marginBottom:12}}>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:700,color:'var(--tx1)'}}>flow</div>
      <div style={{display:'flex',gap:12,fontSize:11,color:'var(--tx3)',flexWrap:'wrap'}}>
        <span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--blue)" strokeWidth="2"/></svg> 씬 연결</span>
        <span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--bdr2)" strokeWidth="1.5" strokeDasharray="4 3"/></svg> 순서</span>
        <span>카드에 마우스를 올리면 해당 경로가 강조됩니다</span>
      </div>
    </div>
    <div style={{overflow:'auto',border:'1px solid var(--bdr)',borderRadius:10,background:'var(--bg)'}}>
      <div style={{position:'relative',width:L.w,height:L.h}}>
        <svg width={L.w} height={L.h} style={{position:'absolute',inset:0,pointerEvents:'none'}}>
          <defs>
            {[['a-conn','var(--blue)'],['a-seq','var(--bdr2)'],['a-end','var(--coral)']].map(([id,c])=><marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill={c}/></marker>)}
          </defs>
          {L.edges.map((e,i)=>{const a=L.pos[e.from],b=L.pos[e.to];const toEnd=b.kind==='ending';const on=active(e);
            const col=e.kind==='seq'?'var(--bdr2)':toEnd?'var(--coral)':'var(--blue)';
            return<path key={i} d={path(a,b)} fill="none" stroke={col} strokeWidth={e.kind==='seq'?1.5:hov&&on?2.5:1.8} strokeDasharray={e.kind==='seq'?'4 3':undefined}
              opacity={on?1:.15} markerEnd={`url(#${e.kind==='seq'?'a-seq':toEnd?'a-end':'a-conn'})`} style={{transition:'opacity .12s'}}/>})}
        </svg>
        {L.rows.map((r,i)=><div key={i} style={{position:'absolute',left:PAD,top:r.y,fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:12,color:'var(--tx1)',display:'flex',gap:6,alignItems:'center',whiteSpace:'nowrap'}}>
          {r.kind==='part'?<>{r.p.title}<span style={{fontSize:10,color:'var(--tx3)',fontWeight:500}}>{r.p.scenes.filter(s=>s.done).length}/{r.p.scenes.length}</span>
            {!r.p.scenes.length&&<span style={{fontSize:11,color:'var(--tx3)',fontWeight:400}}>— 씬 없음</span>}</>
          :<>endings/<span style={{fontSize:10,color:'var(--tx3)',fontWeight:500}}>{sc.endings.length}</span></>}</div>)}
        {Object.entries(L.pos).map(([id,P])=>{const hl=hov===id||(hov&&L.edges.some(e=>(e.from===hov&&e.to===id)||(e.to===hov&&e.from===id)&&e.kind==='conn'));
          if(P.kind==='scene'){const s=P.s;const cnt=t=>s.blocks?.filter(b=>b.type===t).length||0;const cur=sel.scid===id;
            return<button key={id} className={'fcard'+(hl?' hl':'')} onClick={()=>goScene(P.ptid,id)} onMouseEnter={()=>setHov(id)} onMouseLeave={()=>setHov(null)} onFocus={()=>setHov(id)} onBlur={()=>setHov(null)}
              style={{position:'absolute',left:P.x,top:P.y,width:CW,height:CH,textAlign:'left',border:`1px solid ${cur?'var(--blue)':'var(--bdr)'}`,borderLeft:s.done?'3px solid var(--green)':undefined,borderRadius:8,background:'var(--sf1)',padding:'8px 10px',cursor:'pointer',display:'flex',flexDirection:'column',gap:4,overflow:'hidden'}}>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color:s.done?'var(--tx3)':'var(--tx1)',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',lineHeight:1.35}}>{s.title}</div>
              <div style={{display:'flex',gap:3,marginTop:'auto',flexWrap:'wrap'}}>
                {s.done&&badge('var(--greenA)','var(--green)','✓ 완료')}
                {cnt('clue')>0&&badge('var(--tealA)','var(--teal)','🔍'+cnt('clue'),'단서 블록')}
                {cnt('branches')>0&&badge('var(--blueA)','var(--blue)','⑂'+cnt('branches'),'선택지 분기')}
                {cnt('checks')>0&&badge('var(--redA)','var(--red)','🎲'+cnt('checks'),'판정')}
              </div></button>}
          const e=P.e,et=etOf(e);
          return<button key={id} className={'fcard'+(hl?' hl':'')} onClick={()=>goEnding(id)} onMouseEnter={()=>setHov(id)} onMouseLeave={()=>setHov(null)} onFocus={()=>setHov(id)} onBlur={()=>setHov(null)}
            style={{position:'absolute',left:P.x,top:P.y,width:CW,height:CH,textAlign:'left',border:'1px solid var(--bdr)',borderTop:`3px solid ${et.c}`,borderRadius:8,background:'var(--sf1)',padding:'8px 10px',cursor:'pointer',display:'flex',flexDirection:'column',gap:4}}>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color:'var(--tx1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🏁 {e.title||'?'}</div>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,color:et.c}}>{et.l}</div>
            {!L.edges.some(x=>x.to===id)&&<div style={{fontSize:10,color:'var(--gold)'}}>⚠ 연결된 씬 없음</div>}</button>})}
      </div>
    </div>
  </div>;
}
