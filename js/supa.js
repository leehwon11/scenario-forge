const URL='YOUR_SUPABASE_URL',KEY='YOUR_SUPABASE_ANON_KEY';
let sb=null;
export function isConfigured(){return sb!==null}
export function init(){if(URL==='YOUR_SUPABASE_URL')return;try{if(window.supabase)sb=window.supabase.createClient(URL,KEY)}catch(e){}}
export async function signIn(email,pw){if(!sb)throw Error('Supabase 미설정');const{data,error}=await sb.auth.signInWithPassword({email,password:pw});if(error)throw error;return data}
export async function signUp(email,pw){if(!sb)throw Error('Supabase 미설정');const{data,error}=await sb.auth.signUp({email,password:pw});if(error)throw error;return data}
export async function signOut(){if(sb)await sb.auth.signOut()}
export async function getUser(){if(!sb)return null;const{data:{user}}=await sb.auth.getUser();return user}
export async function cloudSave(data){if(!sb)throw Error('미설정');const u=await getUser();if(!u)throw Error('로그인필요');const{error}=await sb.from('scenario_data').upsert({user_id:u.id,data,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error}
export async function cloudLoad(){if(!sb)throw Error('미설정');const u=await getUser();if(!u)throw Error('로그인필요');const{data,error}=await sb.from('scenario_data').select('data').eq('user_id',u.id).single();if(error&&error.code!=='PGRST116')throw error;return data?.data||null}
