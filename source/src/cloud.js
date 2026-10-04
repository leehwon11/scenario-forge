// ===== Supabase 클라우드 동기화 =====
// 사용자당 scenario_data 한 줄(data: 전체 JSON, updated_at: 마지막 저장 시각)을 쓴다.
// 덮어쓰기 충돌을 막기 위해 "내가 마지막으로 본 updated_at"과 같을 때만 갱신한다 (낙관적 잠금).
// anon 키는 브라우저 공개용 키다. 데이터 보호는 Supabase의 RLS 정책이 담당한다 (supabase-setup.sql 참고).
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL='https://njzvpyjkmwufavglizyo.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenZweWprbXd1ZmF2Z2xpenlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMTY1MjgsImV4cCI6MjEwNjU5MjUyOH0.WYX_0tKkZzEjtkY9SJoS2U2Pw-zjQzCu8BfD-iHYc6U';
const T='scenario_data';

export const sb=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

// 오류를 사람이 읽을 수 있는 문장으로
export function friendly(e){
  const m=String(e?.message||e||'');
  if(/Failed to fetch|NetworkError|Load failed|fetch/i.test(m)&&!/row/i.test(m))return'서버에 연결하지 못했습니다. 인터넷 연결을 확인하세요. (Supabase 무료 프로젝트가 일시 정지된 경우에도 이렇게 보입니다)';
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

export async function getUser(){const{data}=await sb.auth.getSession();return data.session?.user||null}
export const onAuth=fn=>{const{data}=sb.auth.onAuthStateChange((ev,s)=>fn(s?.user||null,ev));return()=>data.subscription.unsubscribe()};
export async function signIn(email,pw){const{data,error}=await sb.auth.signInWithPassword({email,password:pw});if(error)throw error;return data.user}
// 이메일 인증이 켜진 프로젝트면 user는 오지만 session이 없다 → needConfirm
export async function signUp(email,pw){const{data,error}=await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;return{user:data.user,needConfirm:!data.session}}
export async function signOut(){await sb.auth.signOut()}
export async function resetPw(email){const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error}
export async function updatePw(pw){const{error}=await sb.auth.updateUser({password:pw});if(error)throw error}

// 서버 데이터 읽기 → {data, updated_at} 또는 null(아직 없음)
export async function fetchRow(uid){
  const{data,error}=await sb.from(T).select('data,updated_at').eq('user_id',uid).maybeSingle();
  if(error)throw error;return data}
// 서버의 updated_at만 확인 (가벼운 변경 감지용)
export async function fetchStamp(uid){
  const{data,error}=await sb.from(T).select('updated_at').eq('user_id',uid).maybeSingle();
  if(error)throw error;return data?.updated_at??null}
// 저장: base가 서버 값과 같을 때만 갱신. 다르면 {conflict:true}
export async function pushRow(uid,payload,base){
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
export async function forcePush(uid,payload){
  const now=new Date().toISOString();
  const{data,error}=await sb.from(T).upsert({user_id:uid,data:payload,updated_at:now},{onConflict:'user_id'}).select('updated_at').maybeSingle();
  if(error)throw error;return{updated_at:data?.updated_at??now}}
