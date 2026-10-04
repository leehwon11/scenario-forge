const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R20S=/^(color|background-color|background-image|background|font-size|font-style|font-weight|text-decoration|text-align|text-shadow|text-transform|letter-spacing|line-height|display|padding|padding-top|padding-bottom|padding-left|padding-right|margin|margin-top|margin-bottom|margin-left|margin-right|border|border-radius|border-color|border-style|border-width|box-shadow|width|max-width|height|opacity|vertical-align|white-space|word-spacing)$/i;

function sanCSS(r){return r.split(';').map(d=>{const[p,...v]=d.split(':');const pr=p?.trim(),vl=v.join(':')?.trim();if(!pr||!vl||!R20S.test(pr)||/javascript|expression/i.test(vl))return'';return pr+':'+vl}).filter(Boolean).join(';')}

function r20Links(raw){let o='',i=0;const L=raw.length;while(i<L){
  if(raw[i]==='['&&i+1<L&&raw[i+1]==='['){const e=raw.indexOf(']]',i+2);if(e===-1){o+=esc(raw[i]);i++;continue}
    const ex=raw.slice(i+2,e),dm=ex.match(/(\d*)d(\d+)/i);let res='?',cl='iroll';
    if(dm){const c=parseInt(dm[1])||1,s=parseInt(dm[2]);let t=0;for(let n=0;n<c;n++)t+=Math.floor(Math.random()*s)+1;res=t;if(c===1&&t===s)cl+=' crit';if(c===1&&t===1)cl+=' fumble'}
    o+=`<span class="${cl}" title="${esc(ex)}">${res}</span>`;i=e+2;continue}
  if(raw[i]==='['&&raw[i-1]!=='\\'){let d=1,j=i+1;while(j<L&&d>0){if(raw[j]==='[')d++;if(raw[j]===']')d--;j++}
    if(d!==0){o+=esc(raw[i]);i++;continue}const txt=raw.slice(i+1,j-1);
    if(j<L&&raw[j]==='('){let pd=1,k=j+1;while(k<L&&pd>0){if(raw[k]==='(')pd++;if(raw[k]===')')pd--;k++}
      if(pd!==0){o+=esc(raw.slice(i,k));i=k;continue}const hr=raw.slice(j+1,k-1);
      const sm=hr.match(/^([^"]*)"?\s*style\s*=\s*"(.*)$/i);
      if(sm){o+=`<a href="#" style="${esc(sanCSS(sm[2].replace(/"\s*$/,'')))}">${r20Inline(txt)}</a>`;i=k;continue}
      if(hr[0]==='!'){o+=`<span class="apibtn">${esc(txt)}</span>`;i=k;continue}
      if(/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(hr)){o+=`<img class="r20img" src="${esc(hr)}">`;i=k;continue}
      if(/^https?:\/\//i.test(hr)){o+=`<a href="${esc(hr)}" style="color:#4a8acf;text-decoration:underline">${esc(txt)}</a>`;i=k;continue}
      o+=`<a href="#" style="color:#4a8acf">${esc(txt)}</a>`;i=k;continue}
    o+=esc(raw[i]);i++;continue}
  if(raw[i]==='?'&&i+1<L&&raw[i+1]==='{'){const qe=raw.indexOf('}',i+2);if(qe===-1){o+=esc(raw[i]);i++;continue}
    const[q,dd]=raw.slice(i+2,qe).split('|');o+=`<span class="query">${esc(dd||q)}</span>`;i=qe+1;continue}
  o+=esc(raw[i]);i++}return o}

export function r20Inline(r){let s=r20Links(r);
  s=s.replace(/&lt;span\s+style=&quot;([^&]*(?:&amp;[^&]*)*)&quot;&gt;/gi,(_,st)=>`<span style="${sanCSS(st.replace(/&amp;/g,'&').replace(/&quot;/g,'"'))}">`);
  s=s.replace(/&lt;\/span&gt;/gi,'</span>');s=s.replace(/&lt;b&gt;/gi,'<b>').replace(/&lt;\/b&gt;/gi,'</b>');
  s=s.replace(/&lt;i&gt;/gi,'<i>').replace(/&lt;\/i&gt;/gi,'</i>');
  s=s.replace(/\*\*\*([^*]+)\*\*\*/g,'<b><i>$1</i></b>');s=s.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');s=s.replace(/\*([^*]+)\*/g,'<i>$1</i>');return s}

export function renderR20(t){if(!t)return'';return t.split('\n').map(l=>{
  if(!l.trim())return'<div style="height:4px"></div>';
  if(/^\/desc\s+/i.test(l))return`<div class="r20msg desc">${r20Inline(l.replace(/^\/desc\s+/i,''))}</div>`;
  const em=l.match(/^\/emas\s+"([^"]+)"\s*(.*)/i);if(em)return`<div class="r20msg"><b style="color:#d47b20">${esc(em[1])}</b> <i>${r20Inline(em[2])}</i></div>`;
  const as=l.match(/^\/as\s+"([^"]+)"\s*(.*)/i);if(as)return`<div class="r20msg"><b style="color:#555">${esc(as[1])}:</b> ${r20Inline(as[2])}</div>`;
  if(/^\/w\s+gm\s+/i.test(l))return`<div class="r20msg" style="background:#d8d0e8;border-left:3px solid #9070b0;font-style:italic">${r20Inline(l.replace(/^\/w\s+gm\s+/i,''))}</div>`;
  const rl=l.match(/^\/r(?:oll)?\s+(.*)/i);if(rl)return`<div class="r20msg" style="background:#fff8e0">${r20Inline('[['+rl[1]+']]')}</div>`;
  return`<div class="r20msg">${r20Inline(l)}</div>`}).join('')}

export function renderCoco(t){if(!t)return'';return t.split('\n').map(l=>{
  if(!l.trim())return'';if(/^【/.test(l))return`<div style="text-align:center;color:#aaa;font-style:italic;padding:8px">${esc(l)}</div>`;
  if(/^\(\(/.test(l))return`<div style="text-align:center;color:#8ab4f8;font-size:12px;padding:6px">${esc(l)}</div>`;
  const n=l.match(/^([^:：]+)[：:]\s*(.*)/);if(n)return`<div style="padding:6px 10px"><b style="color:#8ab4f8;margin-right:6px">${esc(n[1])}</b>${esc(n[2])}</div>`;
  return`<div style="padding:6px 10px">${esc(l)}</div>`}).join('')}
