import { useState } from "react";
import { Modal, Btn } from '../components/ui.jsx'

// ===== 사용법 (? 버튼) =====
// 탭별로 짧게. 화면에 실제로 보이는 버튼 이름을 그대로 써서 찾기 쉽게 한다.

const K=({children})=><kbd className="kbd">{children}</kbd>;
const B=({children})=><b className="help-b">{children}</b>;
const Step=({n,children})=><li className="help-step"><span className="help-n">{n}</span><div>{children}</div></li>;
const Tip=({children})=><div className="help-tip">💡 {children}</div>;

const TABS=[
 ['start','시작하기',<>
  <p className="help-lead">시나리오 대장간은 TRPG 시나리오를 <B>쓰고</B>, 세션에서 <B>진행</B>하는 GM용 도구입니다.</p>
  <ol className="help-steps">
   <Step n="1">왼쪽 <B>Platforms</B>에서 사이트(Roll20, 코코포리아 등)를 고릅니다. 없으면 <B>+ 사이트</B>로 추가하세요.</Step>
   <Step n="2"><B>Scenarios</B>의 <B>+</B>로 시나리오를 만듭니다.</Step>
   <Step n="3"><B>Scenes</B>에서 <B>+ 파트</B>로 장(章)을 만들고, 그 안에 <B>+ 씬</B>을 추가합니다.</Step>
   <Step n="4">씬을 열고 <B>+ 블록 추가</B>로 나레이션·대사·판정 등을 채웁니다.</Step>
   <Step n="5">세션 날에는 위쪽 <B>play</B>로 바꾸고 <B>세션</B> 패널을 열어 진행합니다.</Step>
  </ol>
  <h4>화면 구성</h4>
  <ul>
   <li><B>edit</B> — 쓰고 고치는 화면</li>
   <li><B>play</B> — 세션 진행용. 글을 줄마다 복사해 채팅창에 붙여넣을 수 있습니다</li>
   <li><B>flow</B> — 씬과 엔딩이 어떻게 이어지는지 그림으로 보기</li>
   <li><B>● GM / 공개</B> — GM 전용 블록(진상·키퍼 메모·단서·세션 메모)을 보이거나 숨깁니다. 화면 공유할 때는 <B>공개</B>로</li>
  </ul>
  <Tip>모든 내용은 자동 저장됩니다. 로그인하면 클라우드에도 저장되어 다른 기기에서 이어서 쓸 수 있습니다.</Tip>
 </>],
 ['edit','편집',<>
  <h4>블록</h4>
  <ul>
   <li><B>+ 블록 추가</B>를 누르면 종류가 나옵니다. <span className="help-gm">GM</span> 표시는 플레이어에게 숨겨지는 블록입니다.</li>
   <li>블록 머리줄 버튼: 들여쓰기 · 접기 · 위/아래 · 복제 · 삭제</li>
   <li>왼쪽 <B>⋮⋮</B> 손잡이를 끌면 순서를 바꿀 수 있습니다.</li>
   <li>블록 이름(예: <code>// 나레이션</code>)은 눌러서 바꿀 수 있습니다.</li>
  </ul>
  <h4>명령어 넣기</h4>
  <ul>
   <li>글을 쓰다가 줄 처음이나 띄어쓰기 뒤에서 <K>/</K>를 치면 명령어 목록이 뜹니다.</li>
   <li><code>/de</code>처럼 이어 치면 걸러지고, <K>↑</K><K>↓</K>로 고른 뒤 <K>Enter</K>나 <K>Tab</K>으로 넣습니다. <K>Esc</K>는 닫기.</li>
   <li>씬 위쪽의 명령어 칩을 눌러도 커서 위치에 들어갑니다.</li>
   <li>명령어와 자주 쓰는 색은 <B>Scenes</B> 옆 ⚙(명령어 라이브러리)에서 관리합니다.</li>
  </ul>
  <h4>씬 정보</h4>
  <ul>
   <li><B>Location · Time · NPCs</B>에 장소·시간대·등장인물을 적어 둡니다.</li>
   <li><B>Connections</B>의 <B>+ 연결</B>로 다음 씬이나 엔딩을 지정하면 play·flow에 표시됩니다.</li>
   <li>Roll20 사이트에서는 <B>Roll20 미리보기</B>로 채팅에 어떻게 보일지 확인할 수 있습니다.</li>
  </ul>
  <h4>지우기와 되돌리기</h4>
  <ul>
   <li>씬·엔딩·단서·블록은 바로 지워지고, 아래 알림의 <B>되돌리기</B>로 6초 안에 복구할 수 있습니다.</li>
   <li>그 밖의 변경은 <K>Ctrl</K>+<K>Z</K>(실행 취소), <K>Ctrl</K>+<K>Shift</K>+<K>Z</K>(다시 실행). 글 입력 중에는 글자 단위로 되돌립니다.</li>
  </ul>
 </>],
 ['play','진행 (play)',<>
  <ul>
   <li>글 위에 마우스를 올리면 줄 끝에 <B>복사</B> 버튼이 진해집니다. 한 줄씩 복사해 채팅창에 붙여넣으세요.</li>
   <li>블록 오른쪽 위 <B>전체 복사</B>는 블록 전체를, 씬 제목 옆 <B>전체 복사</B>는 씬의 글 전체를 복사합니다.</li>
   <li>Roll20에서는 대사를 복사하면 <code>/as "화자" 대사</code> 형식으로 복사됩니다.</li>
   <li>BGM 블록의 유튜브 링크·음악 파일은 그 자리에서 바로 재생됩니다.</li>
   <li>단서 블록의 <B>획득 표시</B>를 누르면 세션 패널에 반영됩니다.</li>
   <li>맨 아래 <B>다음으로 이어지는 곳</B>과 이전/다음 씬 버튼으로 이동합니다. 오른쪽 아래 다음 씬 버튼은 현재 씬을 완료로 표시하고 넘어갑니다.</li>
  </ul>
  <Tip>플레이어에게 화면을 보여줄 때는 위쪽 <B>● GM</B>을 눌러 <B>공개</B>로 바꾸면 GM 전용 내용이 숨겨집니다.</Tip>
 </>],
 ['session','세션 패널',<>
  <p className="help-lead">위쪽 <B>⚔ 세션</B> 버튼으로 엽니다. 세션 중 옆에 띄워 두는 도구입니다.</p>
  <ul>
   <li><B>타이머</B> — ▶로 시작, ❚❚로 멈춤. 세션 진행 시간을 잽니다.</li>
   <li><B>PC</B> — 인물 추가 아이콘으로 PC를 만들고 HP·SAN 등을 −/+ 또는 숫자로 조절합니다. ✎에서 수치를 추가하거나 이름을 바꿀 수 있고, <B>이 구성을 기본값으로</B>를 누르면 새 PC가 같은 수치로 시작합니다.</li>
   <li><B>행동 순서</B> — <B>PC 모두 넣기</B>와 <B>+</B>(NPC·적)로 채우고 값을 적으면 높은 순으로 정렬됩니다. <B>다음 차례</B>로 넘기고, 한 바퀴 돌면 라운드가 올라갑니다.</li>
   <li><B>단서 획득</B> — 결론별로 플레이어가 얻은 단서를 체크합니다. 결론 하나에 3개를 얻으면 초록색이 됩니다.</li>
   <li><B>상태 플래그</B> — "열쇠 획득" 같은 진행 상태를 스위치로 켜고 끕니다.</li>
   <li>↺ <B>새 세션 시작</B> — 타이머·행동 순서·단서·플래그를 초기화합니다. PC 수치는 그대로입니다.</li>
  </ul>
  <h4>플래그를 조건으로 쓰기</h4>
  <ol className="help-steps">
   <Step n="1">세션 패널에서 플래그를 만듭니다. (예: 열쇠 획득)</Step>
   <Step n="2">edit 화면의 <B>선택지 분기</B> 항목이나 엔딩 조건 아래 <B>필요 플래그 + 추가</B>에서 고릅니다.</Step>
   <Step n="3">play 화면에 <B>✓ 조건 충족</B> / <B>조건 미충족</B>이 표시되고, 칩을 눌러 바로 켜고 끌 수 있습니다.</Step>
  </ol>
 </>],
 ['scenario','시나리오 관리',<>
  <h4>단서와 3단서 법칙</h4>
  <ul>
   <li><B>Clues</B>의 <B>+</B>로 단서를 만들고, 편집 창에서 <B>연결 결론</B>(예: 범인의 정체)을 적습니다.</li>
   <li>씬에 <B>단서</B> 블록을 넣고 그 단서를 고르면 "배치"됩니다. 배치되지 않은 단서는 ⚠로 표시됩니다.</li>
   <li>시나리오 첫 화면(개요)에서 결론마다 단서가 3개 이상 배치됐는지 확인할 수 있습니다.</li>
  </ul>
  <h4>엔딩</h4>
  <ul>
   <li><B>Endings</B>의 <B>+</B>로 엔딩을 만들고, 해피·배드 같은 타입과 도달 조건을 적습니다. 타입은 ✎에서 추가·수정합니다.</li>
  </ul>
  <h4>자료와 기타</h4>
  <ul>
   <li><B>NPC · 아이템 · 장소</B>에 자주 쓰는 자료를 모아 두고 <B>씬에 추가</B>로 넣습니다.</li>
   <li><B>Sessions</B>에 세션 날짜와 요약을 기록합니다.</li>
   <li>개요 화면의 <B>사건 연표</B>로 배경 사건을 시간순으로 정리합니다.</li>
   <li><B>이 시나리오만 내보내기</B> / <B>시나리오 병합</B>으로 다른 사람과 시나리오를 주고받을 수 있습니다.</li>
  </ul>
 </>],
 ['save','저장 · 클라우드',<>
  <ul>
   <li>모든 변경은 이 기기(브라우저)에 자동 저장됩니다.</li>
   <li>위쪽 <B>로그인</B>에서 이메일로 가입·로그인하면 편집 3초 뒤 클라우드에 자동 저장됩니다. 버튼 옆 점: 초록 = 저장됨, 노랑 = 저장 중, 빨강 = 오프라인·문제.</li>
   <li>다른 기기에서 같은 계정으로 로그인하면 같은 내용이 보입니다.</li>
   <li>두 기기에서 동시에 고치면 덮어쓰지 않고 노란 알림으로 어느 쪽을 쓸지 묻습니다. 고르기 전에 <B>이 기기 내용 백업</B>으로 파일을 받아 둘 수 있습니다.</li>
   <li>위쪽 파일 아이콘으로 전체 데이터를 JSON 파일로 <B>내보내기</B> / <B>가져오기</B>할 수 있습니다. 가끔 백업해 두세요.</li>
  </ul>
  <Tip>"서버에 연결하지 못했습니다"가 계속 뜨면 Supabase 무료 프로젝트가 일시 정지됐을 수 있습니다. Supabase 대시보드에서 Restore를 누르세요.</Tip>
 </>],
 ['keys','단축키',<>
  <table className="help-keys"><tbody>
   <tr><td><K>?</K></td><td>이 사용법 열기 (글 입력 중이 아닐 때)</td></tr>
   <tr><td><K>Ctrl</K>+<K>Z</K></td><td>실행 취소</td></tr>
   <tr><td><K>Ctrl</K>+<K>Shift</K>+<K>Z</K> / <K>Ctrl</K>+<K>Y</K></td><td>다시 실행</td></tr>
   <tr><td><K>Ctrl</K>+<K>F</K></td><td>찾기 · 바꾸기 (범위: 전체 / 이 시나리오 / 이 씬)</td></tr>
   <tr><td><K>/</K></td><td>글 입력 중 명령어 목록</td></tr>
   <tr><td><K>Esc</K></td><td>창·메뉴 닫기</td></tr>
   <tr><td><K>Enter</K></td><td>입력 창에서 확인</td></tr>
  </tbody></table>
  <h4>화면 조절</h4>
  <ul>
   <li>사이드바 오른쪽 경계를 끌면 너비가 바뀝니다. 더블클릭하면 기본 너비로 돌아옵니다.</li>
   <li>사이드바 섹션 제목을 누르면 접히고, 접힌 상태가 기억됩니다.</li>
   <li>위쪽 <B>가 가 가</B>로 글자 크기, ☀/☾로 밝은·어두운 테마를 바꿉니다.</li>
   <li>Mac에서는 <K>Ctrl</K> 대신 <K>⌘</K>를 쓰세요.</li>
  </ul>
 </>],
];

export function HelpModal({onClose,initial='start'}){
  const[tab,setTab]=useState(initial);const cur=TABS.find(t=>t[0]===tab)||TABS[0];
  return<Modal title="? 사용법" onClose={onClose} width={680} footer={<Btn primary onClick={onClose}>닫기</Btn>}>
    <div className="help">
      <nav className="help-nav" role="tablist" aria-label="사용법 목차">
        {TABS.map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{l}</button>)}
      </nav>
      <div className="help-body" role="tabpanel">{cur[2]}</div>
    </div>
  </Modal>}
