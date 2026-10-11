import { createClient } from '@supabase/supabase-js'

// 설정은 public/supabase-config.js (배포 후엔 루트의 supabase-config.js)에서 읽어요
const cfg = (typeof window !== 'undefined' && window.SF_SUPABASE) || {}
const URL = String(cfg.url || '').trim()
const KEY = String(cfg.anonKey || '').trim()

export const sb = (URL.startsWith('https://') && KEY.length > 20)
  ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

export const isConfigured = () => !!sb
const TBL = 'scenario_data'
const here = () => location.origin + location.pathname

export function koErr(e) {
  const m = (e && (e.message || e.error_description || e.msg || String(e))) || ''
  if (/Invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 맞지 않아요'
  if (/Email not confirmed/i.test(m)) return '이메일 인증이 아직 안 됐어요. 메일함의 인증 링크를 눌러주세요'
  if (/already (been )?registered|already exists/i.test(m)) return '이미 가입된 이메일이에요. 로그인해주세요'
  if (/Password should be|at least 6/i.test(m)) return '비밀번호는 6자 이상이어야 해요'
  if (/valid email|invalid format|Unable to validate email/i.test(m)) return '이메일 형식이 올바르지 않아요'
  if (/rate limit|too many|security purposes/i.test(m)) return '요청이 너무 잦아요. 잠시 후 다시 시도해주세요'
  if (/does not exist|Could not find the table|schema cache/i.test(m)) return 'scenario_data 테이블이 없어요. SQL을 먼저 실행해주세요'
  if (/row-level security|violates/i.test(m)) return '권한 설정(RLS) 문제예요. SQL을 다시 실행해주세요'
  if (/no unique|ON CONFLICT/i.test(m)) return '예전 버전 테이블이에요. 새 SQL로 테이블을 다시 만들어주세요'
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return '서버에 연결할 수 없어요. 인터넷이나 Supabase URL을 확인해주세요'
  if (/Invalid API key|JWT/i.test(m)) return 'anon 키가 잘못됐어요. supabase-config.js를 확인해주세요'
  return m || '알 수 없는 오류'
}

export async function getSession() { if (!sb) return null; const { data } = await sb.auth.getSession(); return data.session }
export function onAuth(cb) {
  if (!sb) return () => {}
  const { data } = sb.auth.onAuthStateChange((ev, session) => cb(ev, session?.user || null))
  return () => data.subscription.unsubscribe()
}
export async function signIn(email, pw) { const { data, error } = await sb.auth.signInWithPassword({ email, password: pw }); if (error) throw error; return data }
export async function signUp(email, pw) { const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: here() } }); if (error) throw error; return data }
export async function signOut() { if (sb) await sb.auth.signOut() }
export async function resetPw(email) { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: here() }); if (error) throw error }
export async function updatePw(pw) { const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw error }

export async function cloudMeta(uid) {
  const { data, error } = await sb.from(TBL).select('updated_at').eq('user_id', uid).maybeSingle()
  if (error) throw error; return data?.updated_at || null
}
export async function cloudLoad(uid) {
  const { data, error } = await sb.from(TBL).select('data,updated_at').eq('user_id', uid).maybeSingle()
  if (error) throw error; return data || null
}
export async function cloudSave(uid, payload) {
  const ts = new Date().toISOString()
  const { error } = await sb.from(TBL).upsert({ user_id: uid, data: payload, updated_at: ts }, { onConflict: 'user_id' })
  if (error) throw error; return ts
}
