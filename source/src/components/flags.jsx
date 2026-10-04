import { Flag, X } from "lucide-react";

// ===== 상태 플래그 조건 =====
// 편집: 분기·엔딩에 "필요한 플래그"를 고르는 칩
export function FlagPicker({defs,value=[],onChange}){
  if(!defs?.length)return<div className="flag-hint"><Flag size={10}/>세션 패널에서 플래그를 만들면 조건으로 지정할 수 있습니다</div>;
  const rest=defs.filter(f=>!value.includes(f.id));
  return<div className="flag-pick"><Flag size={10} style={{color:'var(--tx3)'}}/><span className="flag-cap">필요 플래그</span>
    {value.map(id=>{const f=defs.find(x=>x.id===id);return<span key={id} className="flag-chip">{f?.name||'(삭제됨)'}
      <button onClick={()=>onChange(value.filter(x=>x!==id))} aria-label="조건에서 빼기"><X size={9}/></button></span>})}
    {rest.length>0&&<select value="" onChange={e=>{if(e.target.value)onChange([...value,e.target.value])}} className="flag-add" aria-label="필요 플래그 추가">
      <option value="">+ 추가</option>{rest.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>}
  </div>}

// play: 조건 충족 여부. 칩을 누르면 플래그를 켜고 끔
export function FlagStatus({defs,needs,state,onToggle}){
  const list=(needs||[]).map(id=>defs?.find(f=>f.id===id)).filter(Boolean);if(!list.length)return null;
  const met=list.every(f=>state?.[f.id]);
  return<div className="flag-status" title={met?'조건 충족':'아직 충족되지 않은 조건이 있습니다'}>
    <span className={'flag-met '+(met?'ok':'no')}>{met?'✓ 조건 충족':'조건 미충족'}</span>
    {list.map(f=><button key={f.id} className={'flag-chip '+(state?.[f.id]?'on':'off')} onClick={()=>onToggle?.(f.id)} title={(state?.[f.id]?'켜짐':'꺼짐')+' — 눌러서 바꾸기'}>
      {state?.[f.id]?'✓':'✗'} {f.name}</button>)}</div>}
