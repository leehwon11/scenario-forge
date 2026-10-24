// ===== 오프라인 대비 (서비스 워커) =====
// 한 번 연 뒤에는 앱 파일을 브라우저에 보관해, 세션 중 인터넷이 끊겨도 새로고침하면 열리게 한다.
// - 페이지(index.html)·설정 파일: 인터넷 먼저, 안 되면 보관본
// - 빌드된 파일(assets/…, 이름에 해시가 붙어 바뀌지 않음): 보관본 먼저
// - 구글 폰트: 보관본을 바로 쓰고 뒤에서 새로 받아 둠
// 시나리오 데이터는 원래 이 기기(IndexedDB)에 저장되므로 따로 다루지 않는다. Supabase 요청은 건드리지 않는다.
const C='sf-app-v1';
const put=(req,res)=>{if(res&&res.ok){const c=res.clone();caches.open(C).then(x=>x.put(req,c))}return res};
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===self.location.origin){
    if(r.mode==='navigate'||/\/$|\.html$|supabase-config\.js$|sw\.js$/.test(u.pathname)){
      e.respondWith(fetch(r).then(res=>put(r,res)).catch(()=>caches.match(r).then(m=>m||caches.match(new URL('./',self.registration.scope).href))));return}
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>put(r,res))));return}
  if(/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))
    e.respondWith(caches.match(r).then(m=>{const net=fetch(r).then(res=>put(r,res)).catch(()=>m);return m||net}));
});
