import { useState } from "react";
import { AlertTriangle,LogOut,RefreshCw } from "lucide-react";
import { Btn,Inp,Label,Modal } from '../components/ui.jsx'
import { friendly,resetPw,signIn,signOut,signUp,updatePw } from '../lib/cloud.js'

// ===== MODALS =====
export function AccountM({user,sync,SY,recovery,syncNow,toast,onClose}){
  const[tab,setTab]=useState('in');const[email,setEmail]=useState('');const[pw,setPw]=useState('');
  const[busy,setBusy]=useState(false);const[err,setErr]=useState(null);const[info,setInfo]=useState(null);
  const run=async(fn)=>{setErr(null);setInfo(null);setBusy(true);try{await fn()}catch(e){setErr(friendly(e))}finally{setBusy(false)}};
  const submit=()=>run(async()=>{if(!email.trim()||!pw){throw Error('이메일과 비밀번호를 입력하세요.')}
    if(tab==='in'){await signIn(email.trim(),pw);toast('로그인했습니다');onClose()}
    else{const r=await signUp(email.trim(),pw);if(r.needConfirm)setInfo(`${email.trim()}로 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인하세요.`);else{toast('가입하고 로그인했습니다');onClose()}}});
  const enter=e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)submit()};
  const box=(c,bg,children)=><div role={c==='var(--red)'?'alert':undefined} style={{display:'flex',gap:6,alignItems:'flex-start',padding:'8px 10px',marginBottom:10,borderRadius:8,border:`1px solid ${c}`,background:bg,color:'var(--tx1)',fontSize:12,lineHeight:1.6}}>{children}</div>;
  const msgs=<>{err&&box('var(--red)','var(--redA)',<><AlertTriangle size={13} style={{color:'var(--red)',flexShrink:0,marginTop:3}}/><span>{err}</span></>)}
    {info&&box('var(--green)','var(--greenA)',<span>✓ {info}</span>)}</>;

  if(recovery)return<Modal title="새 비밀번호 설정" onClose={onClose} width={400} footer={<Btn primary disabled={busy} onClick={()=>run(async()=>{if(pw.length<6)throw Error('Password should be at least 6');await updatePw(pw);toast('비밀번호를 바꿨습니다');onClose()})}>저장</Btn>}>
    {msgs}<Label>새 비밀번호 (6자 이상)</Label><Inp type="password" value={pw} onChange={setPw} autoFocus autoComplete="new-password"/></Modal>;

  if(user)return<Modal title="☁ 클라우드" onClose={onClose} width={420} footer={<><Btn onClick={()=>run(async()=>{await signOut();toast('로그아웃했습니다');onClose()})} disabled={busy} style={{marginRight:'auto'}}><LogOut size={11}/>로그아웃</Btn><Btn primary onClick={onClose}>닫기</Btn></>}>
    <div style={{fontSize:13,color:'var(--tx1)',marginBottom:4}}><b>{user.email}</b></div>
    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--tx2)',marginBottom:12}}>
      <span style={{width:8,height:8,borderRadius:'50%',background:SY[0],flexShrink:0}}/><span style={{flex:1}}>{SY[1]}</span>
      <Btn small onClick={syncNow} disabled={sync.s==='syncing'} title="지금 클라우드와 비교해 동기화"><RefreshCw size={11}/>지금 동기화</Btn></div>
    {msgs}
    <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.7,borderTop:'1px solid var(--bdr)',paddingTop:10}}>
      · 편집하면 3초 뒤 자동으로 클라우드에 저장되고, 다른 기기에서 로그인하면 같은 내용을 볼 수 있습니다.<br/>
      · 오프라인일 때도 이 기기에는 계속 저장되며, 다시 연결되면 자동으로 올라갑니다.<br/>
      · 두 기기에서 동시에 고치면 덮어쓰지 않고 어느 쪽을 쓸지 묻습니다.<br/>
      · 로그아웃해도 이 기기의 데이터는 남아 있습니다.</div></Modal>;

  return<Modal title="로그인" onClose={onClose} width={400} footer={<Btn primary onClick={submit} disabled={busy}>{busy?'처리 중…':tab==='in'?'로그인':'가입'}</Btn>}>
    <div role="tablist" style={{display:'flex',background:'var(--sf2)',borderRadius:6,padding:2,border:'1px solid var(--bdr)',marginBottom:12}}>
      {[['in','로그인'],['up','회원가입']].map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} onClick={()=>{setTab(k);setErr(null);setInfo(null)}} style={{flex:1,padding:'5px 10px',borderRadius:4,fontSize:12,fontWeight:600,
        background:tab===k?'var(--sf1)':'transparent',color:tab===k?'var(--tx1)':'var(--tx3)'}}>{l}</button>)}</div>
    <div style={{fontSize:12,color:'var(--tx3)',marginBottom:12,lineHeight:1.6}}>로그인하면 시나리오가 클라우드에 자동 저장되어 다른 기기에서도 이어서 작업할 수 있습니다. 로그인하지 않아도 이 기기에는 저장됩니다.</div>
    {msgs}
    <div style={{marginBottom:8}}><Label>이메일</Label><Inp type="email" value={email} onChange={setEmail} onKeyDown={enter} autoFocus autoComplete="email" placeholder="you@example.com"/></div>
    <div style={{marginBottom:6}}><Label>비밀번호{tab==='up'&&' (6자 이상)'}</Label><Inp type="password" value={pw} onChange={setPw} onKeyDown={enter} autoComplete={tab==='in'?'current-password':'new-password'}/></div>
    {tab==='in'&&<button onClick={()=>run(async()=>{if(!email.trim())throw Error('비밀번호를 재설정할 이메일을 먼저 입력하세요.');await resetPw(email.trim());setInfo('비밀번호 재설정 메일을 보냈습니다. 메일의 링크를 누르면 이 사이트에서 새 비밀번호를 정할 수 있습니다.')})}
      style={{fontSize:11,color:'var(--blue)',padding:0}}>비밀번호를 잊으셨나요?</button>}
  </Modal>}
