import { uid } from './data.js'

// ===== Supabase 클라우드 동기화 =====
// 사용자당 scenario_data 한 줄(data: 전체 JSON, updated_at: 마지막 저장 시각)을 쓴다.
// 덮어쓰기 충돌을 막기 위해 "내가 마지막으로 본 updated_at"과 같을 때만 갱신한다 (낙관적 잠금).
// anon 키는 브라우저 공개용 키다. 데이터 보호는 Supabase의 RLS 정책이 담당한다 (supabase-setup.sql 참고).

// 설정은 public/supabase-config.js (배포 후 저장소 루트의 supabase-config.js)에서 읽는다 — 다시 빌드하지 않고 바꿀 수 있음.
// 그 파일이 없을 때를 대비해 현재 프로젝트 값을 기본값으로 둔다.
const DEF_URL='https://njzvpyjkmwufavglizyo.supabase.co';
const DEF_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenZweWprbXd1ZmF2Z2xpenlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMTY1MjgsImV4cCI6MjEwNjU5MjUyOH0.WYX_0tKkZzEjtkY9SJoS2U2Pw-zjQzCu8BfD-iHYc6U';
const cfg=(typeof window!=='undefined'&&window.SF_SUPABASE)||{};
const SUPABASE_URL=String(cfg.url||DEF_URL).trim(),SUPABASE_ANON_KEY=String(cfg.anonKey||DEF_KEY).trim();
const T='scenario_data';

// Supabase 코드는 크기가 커서 필요할 때만 불러온다 (로그인된 기기이거나, 로그인 창에서 로그인할 때).
// 로그인한 적 없는 기기에서는 첫 화면을 그만큼 빨리 연다.
const OK=SUPABASE_URL.startsWith('https://')&&SUPABASE_ANON_KEY.length>20;
export const isConfigured=()=>OK;
let sbP=null;const listeners=new Set();
const client=()=>sbP??=(OK?import('@supabase/supabase-js').then(({createClient})=>{
  const c=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  c.auth.onAuthStateChange((ev,s)=>{for(const f of listeners)f(s?.user||null,ev)});return c}):Promise.resolve(null));
// 이 기기에 로그인 기록(세션 토큰)이 있거나, 메일의 인증·비밀번호 재설정 링크로 들어왔는지
const ref=(SUPABASE_URL.match(/https:\/\/([^.]+)/)||[])[1];
const hasSession=()=>{try{if(ref&&localStorage.getItem(`sb-${ref}-auth-token`))return true;for(let i=0;i<localStorage.length;i++)if(/^sb-.*-auth-token$/.test(localStorage.key(i)))return true}catch(e){}
  return /access_token=|[?&]code=|type=recovery/.test(location.hash+location.search)};

// 오류를 사람이 읽을 수 있는 문장으로
export function friendly(e){
  const m=String(e?.message||e||'');
  if(/Failed to fetch|NetworkError|Load failed|fetch/i.test(m)&&!/row/i.test(m))return'서버에 연결하지 못했습니다. 인터넷 연결을 확인하세요. (Supabase 무료 프로젝트가 일시 정지된 경우에도 이렇게 보입니다)';
  if(/Invalid API key|invalid JWT/i.test(m))return'Supabase anon 키가 잘못됐습니다. supabase-config.js를 확인하세요.';
  if(/Invalid login credentials/i.test(m))return'이메일 또는 비밀번호가 올바르지 않습니다.';
  if(/Email not confirmed/i.test(m))return'이메일 인증이 아직 완료되지 않았습니다. 받은편지함의 확인 메일을 눌러주세요.';
  if(/User already registered/i.test(m))return'이미 가입된 이메일입니다. 로그인하세요.';
  if(/Password should be at least/i.test(m))return'비밀번호는 6자 이상이어야 합니다.';
  if(/valid email|invalid format/i.test(m))return'이메일 형식이 올바르지 않습니다.';
  if(/rate limit|too many/i.test(m))return'요청이 너무 많습니다. 잠시 후 다시 시도하세요.';
  if(/relation .* does not exist|Could not find the table|PGRST205|42P01/i.test(m))return'Supabase에 scenario_data 테이블이 없습니다. supabase-setup.sql을 실행하세요.';
  if(/column .* does not exist|PGRST204/i.test(m))return'Supabase 테이블 구조가 맞지 않습니다. supabase-setup.sql을 실행하세요.';
  if(/row-level security|permission denied|42501/i.test(m))return'Supabase 접근 권한(RLS) 설정이 맞지 않습니다. supabase-setup.sql을 실행하세요.';
  if(/JWT expired|session/i.test(m))return'로그인이 만료되었습니다. 다시 로그인하세요.';
  return m||'알 수 없는 오류';
}

export async function getUser(){if(!OK||!hasSession())return null;const sb=await client();const{data}=await sb.auth.getSession();return data.session?.user||null}
export const onAuth=fn=>{listeners.add(fn);if(OK&&hasSession())client();return()=>listeners.delete(fn)};
const need=async()=>{if(!OK)throw Error('Supabase 연결 정보가 없습니다. 저장소의 supabase-config.js에 url과 anonKey를 넣어주세요.');return client()};
export async function signIn(email,pw){const sb=await need();const{data,error}=await sb.auth.signInWithPassword({email,password:pw});if(error)throw error;return data.user}
// 이메일 인증이 켜진 프로젝트면 user는 오지만 session이 없다 → needConfirm
export async function signUp(email,pw){const sb=await need();const{data,error}=await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;return{user:data.user,needConfirm:!data.session}}
export async function signOut(){if(!sbP)return;const sb=await sbP;if(sb)await sb.auth.signOut()}
export async function resetPw(email){const sb=await need();const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error}
export async function updatePw(pw){const sb=await need();const{error}=await sb.auth.updateUser({password:pw});if(error)throw error}

// 서버 데이터 읽기 → {data, updated_at} 또는 null(아직 없음)
export async function fetchRow(uid){const sb=await need();
  const{data,error}=await sb.from(T).select('data,updated_at').eq('user_id',uid).maybeSingle();
  if(error)throw error;return data}
// 서버의 updated_at만 확인 (가벼운 변경 감지용)
export async function fetchStamp(uid){const sb=await need();
  const{data,error}=await sb.from(T).select('updated_at').eq('user_id',uid).maybeSingle();
  if(error)throw error;return data?.updated_at??null}
// 저장: base가 서버 값과 같을 때만 갱신. 다르면 {conflict:true}
export async function pushRow(uid,payload,base){const sb=await need();
  const now=new Date().toISOString();
  if(base==null){
    const{data,error}=await sb.from(T).insert({user_id:uid,data:payload,updated_at:now}).select('updated_at').maybeSingle();
    if(error){if(error.code==='23505')return{conflict:true};throw error}
    return{updated_at:data?.updated_at??now}}
  const{data,error}=await sb.from(T).update({data:payload,updated_at:now}).eq('user_id',uid).eq('updated_at',base).select('updated_at');
  if(error)throw error;
  if(!data?.length)return{conflict:true};
  return{updated_at:data[0].updated_at}}
// 강제 덮어쓰기 (충돌 해결 시 "이 기기 내용으로")
export async function forcePush(uid,payload){const sb=await need();
  const now=new Date().toISOString();
  const{data,error}=await sb.from(T).upsert({user_id:uid,data:payload,updated_at:now},{onConflict:'user_id'}).select('updated_at').maybeSingle();
  if(error)throw error;return{updated_at:data?.updated_at??now}}
