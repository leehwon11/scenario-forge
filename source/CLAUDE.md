# 시나리오 대장간 (scenario-forge)

한국 TRPG(CoC, 인세인 등) GM/키퍼용 시나리오 노트 웹앱. Roll20·코코포리아 온라인 세션용.
사용자는 GM이고 코딩은 잘 모름 → 설명은 쉬운 한국어로, 결과물은 바로 배포 가능한 형태로.

## 기술 스택
- React 19 + Vite, lucide-react 아이콘, @supabase/supabase-js
- 저장: IndexedDB(`scenario-forge` DB, `kv` 스토어의 `data`) + Supabase 자동 동기화
  - 예전 버전은 localStorage(`scenario-forge-v4`)에 저장했음 → `lib/store.js`가 처음 한 번 옮기고,
    이후에도 localStorage가 다른 버전에 의해 바뀌면 그쪽을 가져오며 기존 데이터는 `backup` 키에 남긴다
- 배포: GitHub Pages. `cd source && npm run deploy` (= `vite build` 후 `dist/`를 저장소 루트로 복사, 루트 `assets/`는 비우고 새로)
- 폰트: IBM Plex Sans KR(화면) / Hahmlet(제목·읽어 줄 글) / JetBrains Mono(명령어·롤꾸 코드) — Google Fonts, `tokens.css`의 `--f-*` 변수로만 지정

## 파일 구조 (source/src)
- `App.jsx` — 앱 뼈대: 상태·저장·클라우드 동기화·위쪽 바·레이아웃(씬 목록 | 가운데 | 준비 점검)·세션 화면·미니 창(PiP)·모달 연결
- `lib/` — `data.js`(상수·mig·유틸), `check.js`(준비 점검: 씬 상태 점·3단서·플래그), `store.js`(IndexedDB·탭 간 알림), `cloud.js`(Supabase), `r20.js`(Roll20 미리보기 엔진), `rollkku.js`(?{} 파서·기본 롤꾸 템플릿)
- `components/` — `ui.jsx`(버튼·모달·대화상자·토스트·복사, 미니 창 클립보드), `Nav.jsx`(왼쪽 씬 목록 + 엔딩·단서·BGM·세션 기록·자료 바로가기), `CmdBar.jsx`(고정 명령어 바), `insert.js`(마지막 입력칸에 넣기), `flags.jsx`, `dnd.js`
- `views/` — `Home`(사이트·시나리오 카드), `SceneView`·`EndingView`·`Overview`(가운데 편집), `CheckPanel`(오른쪽 준비 점검), `SessionMode`(세션 화면 = Desk 미니 창), `SessionPanel`(행동 순서·단서·플래그, 세션 화면 탭에서 씀), `FlowView`, `ChatPreview`, `PlayView`(BGM 도우미만)
- `blocks/` — `BlockList.jsx`(블록 편집·추가 메뉴), `SlashMenu.jsx`("/" 명령어 팔레트)
- `modals/` — 계정·찾기·사이트·명령어·자료실·엔딩 타입·단서·사용법(Help)·채우기(Fill)·롤꾸 보관함(Template)
- `styles/` — `tokens.css`(색 변수), `base.css`, `components.css`
- `public/supabase-config.js` — Supabase URL/anon 키 (빌드 없이 수정 가능, service_role 키 금지)
- `../supabase-setup.sql` — 테이블 `scenario_data(user_id PK, data jsonb, updated_at)` + RLS (여러 번 실행해도 안전)

## 데이터 모델 (요약)
platforms[] { name, color, commands[{l,s,cat}], savedColors[], templates[{name,code}] }
scenarios[] { platformId, title, setting, synopsis, parts[{title, scenes[{title, location, timeOfDay, npcIds[](자료실 NPC), npcsPresent(직접 적은 이름), done, connections[{targetSceneId}], blocks[]}]}],
  endings[{title, endingType, condition, needs[], blocks[]}], endingTypes[{id,l,c}], clues[{name, description, leadsTo, isRedHerring}],
  eventTimeline[], sessionHistory[{date, summary}], library{npcs[{name,role,imageUrl,traits,lines,gmNote}], items/places[{name,imageUrl,description,gmNote}]},
  flags[{id,name}], session{flags{}, found{}, order[], turn, round, sent{}(세션 화면에서 보낸 줄)}, pcs[](예전 데이터 보존용, 화면 없음) }
블록 타입: text, memo, truth, clue, lines, branches(items[].needs), checks, npc, handout, bgm, item, place, session-log
하위 씬: scene.parentId(같은 파트의 상위 씬, 한 단계만). `normalizePart`가 하위 씬을 상위 씬 바로 뒤로 모으고 잘못된 parentId를 지움, 번호는 `sceneNums`(3, 3-1…).
npc·item·place 블록은 내용 없이 `refId`(자료실 항목 id, ''이면 아직 안 고름)만 가진다 → 표시할 때 `resolveB(sc,b)`, 쓰이는 곳은 `libUses(sc)`.
예전 데이터는 `migLib`이 자료실로 옮김(같은 이름은 합침). 단서 결론은 `concKey`로 띄어쓰기 무시하고 묶는다.
`mig()`가 구버전 데이터를 보정함 — 필드 추가 시 반드시 mig(또는 migSession)에도 기본값 추가.

## 디자인 규칙 ("Desk") — 사용자가 고른 시안 그대로 (시안: https://claude.ai/artifact/GCH21NKvJavGLFVTzBeTTb 의 Desk·Mini 아트보드)
화면 구성: 위쪽 바(로고 · 시나리오 ▾ · 지금 씬 | 저장 상태 · 집필/흐름도 · ↶↷ · 찾기 · ⋯ · ? · 파란 "▶ 세션 시작")
/ 왼쪽 씬 목록(`.nav`, 번호 · 제목 · 준비 상태 색 점) / 가운데 편집(`.ed-pg`: SCENE 번호 · 제목 · 속성 칩 · 블록 카드 · "추가" 버튼 줄)
/ 오른쪽 준비 점검(`.chk`). 세션 화면(`.ss`)은 Desk "미니 창" 시안: 씬 넘기기 · 탭(진행/행동 순서/단서/플래그) · 번호 붙은 읽어 줄 줄 · 아래 큰 "다음 줄 복사 Space".
흰 종이 + 코발트 파랑(라이트가 기본), 다크는 남색 계열. 색·글꼴은 `styles/tokens.css` 변수만 쓰고 직접 HEX 금지.
블록 카드 `.blk` + 종류 색 이름표 `.blk-tag`(이름 직접 수정), 라벨은 한글 — 예전 `// label`·영어 대문자 라벨은 쓰지 않음.
화면 구성 스타일은 `components.css` 맨 아래 "Desk 화면 구성" 구역. 스크롤바는 가는 둥근 회색 막대(`base.css`).
브라우저 기본 prompt/confirm/alert 금지 → `useDialog()`의 `prompt/confirm/alert`.
삭제는 `useAct().removed(label, fn)`로 하면 "되돌리기" 알림이 붙는다. 최소 글자 크기 10px.

## 주요 기능
첫 화면(사이트·시나리오 카드), 집필/흐름도 + 세션 화면(Space 다음 줄 복사·보냄 표시·← → 씬 넘기기·미니 창), 준비 점검(씬 상태 점·3단서·플래그), GM 정보 켜고 끄기, 고정 명령어 바(명령어·저장 색·✦템플릿 칩), "/" 명령어 팔레트,
롤꾸 보관함 + `?{질문|안내문}` 채우기 창, 블록 안 "?{} 채우기" 버튼, 세션 화면 줄 단위·전체 복사,
Roll20·코코포리아 미리보기, 씬 목록(펼침 기억·너비 조절·씬/파트 드래그·BGM 목록·여러 줄 세션 기록),
세션 화면 탭(행동 순서·단서 획득 체크·상태 플래그), 분기·엔딩 필요 플래그, 3단서 법칙 검증(준비 점검)·단서 배치 현황(개요),
찾기·바꾸기(범위), Undo/Redo + 삭제 되돌리기, Supabase 로그인·자동 저장·기기 간 충돌 확인·백업 되살리기, ? 사용법.

## 사용자가 빼달라고 한 기능 (다시 넣지 말 것)
PC 정보 카드 / SAN·HP 트래커, 빠른 참조표(키퍼 스크린), 타이머, 시나리오 구조 템플릿, Stars & Wishes 피드백, 인쇄, 최근 본 씬

## Roll20 롤꾸 주의사항
- Oosh 핵 `[텍스트](#" style="...;)` 안에서는 괄호 들어간 CSS 함수(rgba(), linear-gradient()) 쓰면 깨짐 → HEX 8자리(#RRGGBBAA) 사용
- `position:absolute`는 블록끼리 안 붙음, 각 [ ]는 별개 <a> 태그
- ?{쿼리} 안에서는 줄바꿈 불가 → 채우기 창의 "줄바꿈을 <br>로" 옵션 사용

## 남은 할 일 후보
시나리오 정보 카드(인원·플레이타임·로스트율), 세션 퀵메모, NPC 관계도, 배포용 내보내기, 롤꾸 문법 경고(rgba→HEX 자동변환),
모바일에서 씬·파트 순서 바꾸기

## 성능 메모
- 데이터 변경은 `up(fn)` → immer `produce`(바뀐 부분만 새 객체, 결과는 얼어 있음). 상태 객체를 직접 고치면 오류 → 꼭 up/uSc 안에서만 고칠 것.
- 실행 취소 기록·클라우드 "바뀜" 판단은 객체 비교(`syncedD`), 계산 결과는 `memo1`(WeakMap)로 시나리오 객체별 캐시.
- 이 기기 저장은 1초 모아서 + 창 숨김/닫힘 때 바로(`saveNow`, 테스트용 `window.__sfSave`).
- Supabase 코드는 로그인 기록이 있을 때만 불러옴(`cloud.js`의 `client()`), 자주 안 여는 창은 `React.lazy` + 쉬는 시간에 미리 받기.
- 배포 주소(https)에서는 `public/sw.js` 서비스 워커가 앱 파일을 보관(오프라인에서도 열림).

## 작업 후 확인
`npm run build`가 에러 없이 되는지, 그리고 가능하면 브라우저로 play·flow 모드 진입이 되는지 확인.
(과거에 빌드는 되는데 런타임에 깨진 적 있음: React import 누락, mdR 함수 누락, 없는 lucide 아이콘 이름)
기능을 바꾸면 `modals/HelpModal.jsx`(앱 안 사용법)도 같이 고칠 것.

## 참고
롤20(app.roll20.net)은 `X-Frame-Options: SAMEORIGIN`이라 앱 안에 넣어 보여줄 수 없다 → 대신 세션 화면을 Document Picture-in-Picture 미니 창으로 띄운다(크롬·엣지).
