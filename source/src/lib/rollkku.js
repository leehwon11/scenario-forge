import { uid } from './data.js'

// ===== 롤꾸 템플릿 · ?{질문|안내문} 채우기 =====
// Roll20의 ?{질문|기본값} 문법을 "입력칸"으로 보고, 채운 값으로 바꿔 넣는다.
// (예전 한 파일짜리 버전 v5에서 옮겨 온 코드 — 동작 동일)

// ?{질문|기본값} 파서 — 같은 질문은 한 번만 (Roll20과 동일)
function scanQ(code,i){let d=1,j=i+2;while(j<code.length&&d>0){if(code[j]==='{')d++;else if(code[j]==='}')d--;j++}return d===0?j:-1}
export function parseQueries(code){const out=[],seen=new Set();let i=0;if(!code)return out;
  while((i=code.indexOf('?{',i))!==-1){const j=scanQ(code,i);if(j<0)break;const inner=code.slice(i+2,j-1);
    if(!seen.has(inner)){seen.add(inner);const parts=inner.split('|');
      out.push({key:inner,label:parts[0].trim()||'(질문)',def:parts[1]??'',options:parts.length>2?parts.slice(1).map(o=>{const[a,...b]=o.split(',');return{label:a,value:b.length?b.join(','):a}}):null})}
    i=j}return out}
export function fillQueries(code,vals,keepEmpty,br){let res='',i=0;
  while(true){const k=code.indexOf('?{',i);if(k===-1){res+=code.slice(i);break}const j=scanQ(code,k);if(j<0){res+=code.slice(i);break}
    const inner=code.slice(k+2,j-1);const v=vals[inner];res+=code.slice(i,k);
    if(v==null||v==='')res+=keepEmpty?code.slice(k,j):(inner.split('|')[1]??'');
    else res+=br?String(v).replace(/\r?\n/g,'<br>'):String(v).replace(/\r?\n/g,' ');
    i=j}return res}

export function defTpl(){return[
  {id:uid(),name:'핸드아웃',code:`/desc [·· HANDOUT ··](#" style="font-size: 18px; font-family: Fantasy, gulim !important; background: #ffffff; text-align: center; display: block; padding: 10px 15px; padding-bottom: 0; font-style: normal !important; font-weight: normal !important; border-radius: 20px 20px 0 0; margin-left: -4px; text-decoration: none; box-shadow: -4px 4px 0 #d7d7d7; letter-spacing: 2px; border-bottom: none; color: #d7d7d7; )[**?{핸드아웃 명|이름}**](#" style="font-size: 16px; font-family: gulim !important; background: #ffffff; text-align: center; display: block; padding: 10px 15px; padding-bottom: 0; font-style: normal !important; font-weight: normal !important; margin-left: -4px; text-decoration: none; box-shadow: -4px 4px 0 #d7d7d7; letter-spacing: -1px; border-top: none; border-bottom: none; color: #252525; )[━━━━━━━━━━━━━━━━━─](#" style="font-size: 12px; font-family: gulim !important; color: #d7d7d7; background: #ffffff; text-align: center; display: block; padding: 10px 15px; padding-bottom: 0; font-style: normal !important; font-weight: normal !important; margin-left: -4px; text-decoration: none; box-shadow: -4px 4px 0 #d7d7d7; letter-spacing: -1px; border-top: none; border-bottom: none; )[?{내용|내용을 입력해주세요.}](#" style="font-size: 14px; font-family: gulim !important; line-height: 180%; background: #ffffff; text-align: center; display: block; padding: 10px 15px; padding-bottom: 0; font-style: normal !important; font-weight: normal !important; margin-left: -4px; text-decoration: none; box-shadow: -4px 4px 0 #d7d7d7; letter-spacing: -1px; border-top: none; border-bottom: none; color: #252525;)[　](#" style="font-size: 3px; font-family: gulim !important; color: #252525; background: #ffffff; text-align: center; display: block; padding: 3px 5px; font-style: normal !important; font-weight: normal !important; border-radius: 0 0 20px 20px; margin-left: -4px; text-decoration: none; border-top: none; box-shadow: -4px 4px 0 #d7d7d7; letter-spacing: -1px; )`},
  {id:uid(),name:'메시지 (받음)',code:`/desc [?{받은 메시지|}](#" style="display:block; background:#ffffff; color:#252525; border-radius:12px 12px 12px 0; padding:10px 14px; margin-right:40px; text-decoration:none; font-style:normal !important; font-weight:normal !important; line-height:180%; font-size:14px; text-align:left; box-shadow: -4px 4px 0 #d7d7d7;)`},
  {id:uid(),name:'메시지 (보냄)',code:`/desc [?{보낸 메시지|}](#" style="display:block; background:#d4edff; color:#252525; border-radius:12px 12px 0 12px; padding:10px 14px; margin-left:40px; text-decoration:none; font-style:normal !important; font-weight:normal !important; line-height:180%; font-size:14px; text-align:left;)`},
  {id:uid(),name:'진동 (지이잉)',code:`/desc [?{진동 텍스트|지이잉.}](#" style="display:block; font-size:18px; color:#222222; text-align:center; padding:12px; text-decoration:none; font-style:normal !important; font-weight:normal !important; letter-spacing:6px; text-shadow: 5px 0 0 #aaaaaa, 10px 0 0 #dddddd; background:transparent;)`},
]}
