// ===== 마지막으로 클릭한 글 입력칸에 넣기 =====
// 명령어 바·롤꾸 보관함·"/" 팔레트가 공통으로 쓴다. 블록 목록([data-block-list]) 안의 textarea만 추적.
let lastTA=null;
if(typeof document!=='undefined')document.addEventListener('focusin',e=>{const t=e.target;if(t?.tagName==='TEXTAREA'&&t.closest('[data-block-list]'))lastTA=t});

// React 제어 컴포넌트는 value를 직접 대입하면 onChange가 안 일어나므로 네이티브 setter + input 이벤트
export function setNativeValue(el,val){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}))}

// 성공하면 true. 입력칸을 한 번도 안 눌렀거나 사라졌으면 false
export function insertAtLast(text){const ta=lastTA;if(!ta||!document.body.contains(ta))return false;
  const s=ta.selectionStart??ta.value.length,e=ta.selectionEnd??s;
  setNativeValue(ta,ta.value.slice(0,s)+text+ta.value.slice(e));const pos=s+text.length;
  requestAnimationFrame(()=>{try{ta.focus({preventScroll:true});ta.setSelectionRange(pos,pos)}catch(_){}});return true}
