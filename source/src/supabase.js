import { createClient } from '@supabase/supabase-js'

// ========================================
// Supabase 설정
// 1. supabase.com에서 프로젝트 생성
// 2. Settings > API에서 URL과 anon key 복사
// 3. 아래 값을 교체
// 4. SQL Editor에서 테이블 생성:
//    CREATE TABLE scenario_data (
//      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
//      data JSONB NOT NULL DEFAULT '{}',
//      updated_at TIMESTAMPTZ DEFAULT now()
//    );
//    ALTER TABLE scenario_data ENABLE ROW LEVEL SECURITY;
//    CREATE POLICY "Users can manage own data" ON scenario_data
//      FOR ALL USING (auth.uid() = user_id)
//      WITH CHECK (auth.uid() = user_id);
// ========================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'

let supabase = null
try {
  if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
} catch(e) { console.warn('Supabase init failed:', e) }

export function isSupabaseConfigured() {
  return supabase !== null
}

export async function signUp(email, password) {
  if (!supabase) throw new Error('Supabase 미설정')
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase 미설정')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getUser() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function onAuthChange(callback) {
  if (!supabase) return
  supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}

export async function cloudSave(data) {
  if (!supabase) throw new Error('Supabase 미설정')
  const user = await getUser()
  if (!user) throw new Error('로그인 필요')
  
  const { error } = await supabase
    .from('scenario_data')
    .upsert({
      user_id: user.id,
      data: data,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  
  if (error) throw error
}

export async function cloudLoad() {
  if (!supabase) throw new Error('Supabase 미설정')
  const user = await getUser()
  if (!user) throw new Error('로그인 필요')
  
  const { data, error } = await supabase
    .from('scenario_data')
    .select('data')
    .eq('user_id', user.id)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data?.data || null
}
