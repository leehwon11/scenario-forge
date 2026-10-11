# 시나리오 대장간 (scenario-forge)

한국 TRPG(CoC, 인세인 등) GM/키퍼용 시나리오 노트 웹앱. Roll20·코코포리아 온라인 세션용.
사용자는 GM이고 코딩은 잘 모름 → 설명은 쉬운 한국어로, 결과물은 바로 배포 가능한 형태로.

## 기술 스택
- React 19 + Vite, lucide-react 아이콘, @supabase/supabase-js
- 저장: IndexedDB(`scenario-forge` DB, `kv` 스토어의 `data`) + Supabase 자동 동기화
  - 예전 버전은 localStorage(`scenario-forge-v4`)에 저장했음 → `lib/store.js`가 처음 한 번 옮기고,
    이후에도 localStorage가 다른 버전에 의해 바뀌면 그쪽을 가져오며 기존 데이터는 `backup` 키에 남긴다
- 배포: GitHub Pages. `cd source && npm run deploy` (= `vite build` 후 `dist/`를 저장소 루트로 복사, 루트 `assets/`는 비우고 새로)
- 폰트: JetBrains Mono / DM Sans / Instrument Serif (Google Fonts)

## 파일 구조 (source/src)
- `App.jsx` — 앱 뼈대: 상태·저장·클라우드 동기화·위쪽 바·레이아웃·모달 연결
- `lib/` — `data.js`(상수·mig·유틸), `store.js`(IndexedDB·탭 간 알림), `cloud.js`(Supabase), `r20.js`(Roll20 미리보기 엔진), `rollkku.js`(?{} 파서·기본 롤꾸 템플릿)
- `components/` — `ui.jsx`(버튼·모달·대화상자·토스트·복사), `Sidebar.jsx`, `CmdBar.jsx`(고정 명령어 바), `insert.js`(마지막 입력칸에 넣기), `flags.jsx`, `dnd.js`
- `views/` — `SceneView`, `EndingView`, `PlayView`, `FlowView`, `Overview`, `SessionPanel`, `ChatPreview`
- `blocks/` — `BlockList.jsx`(블록 편집·추가 메뉴), `SlashMenu.jsx`("/" 명령어 팔레트)
- `modals/` — 계정·찾기·사이트·명령어·자료실·엔딩 타입·단서·사용법(Help)·채우기(Fill)·롤꾸 보관함(Template)
- `styles/` — `tokens.css`(색 변수), `base.css`, `components.css`
- `public/supabase-config.js` — Supabase URL/anon 키 (빌드 없이 수정 가능, service_role 키 금지)
- `../supabase-setup.sql` — 테이블 `scenario_data(user_id PK, data jsonb, updated_at)` + RLS (여러 번 실행해도 안전)

## 데이터 모델 (요약)
platforms[] { name, color, commands[{l,s,cat}], savedColors[], templates[{name,code}] }
scenarios[] { platformId, title, setting, synopsis, parts[{title, scenes[{title, location, timeOfDay, npcsPresent, done, connections[{targetSceneId}], blocks[]}]}],
  endings[{title, endingType, condition, needs[], blocks[]}], endingTypes[{id,l,c}], clues[{name, description, leadsTo, isRedHerring}],
  eventTimeline[], sessionHistory[{date, summary}], library{npcs,items,places},
  flags[{id,name}], session{flags{}, found{}, order[], turn, round}, pcs[](예전 데이터 보존용, 화면 없음) }
블록 타입: text, memo, truth, clue, lines, branches(items[].needs), checks, npc, handout, bgm, item, place, session-log
`mig()`가 구버전 데이터를 보정함 — 필드 추가 시 반드시 mig(또는 migSession)에도 기본값 추가.

## 디자인 규칙 ("모던 터미널")
GitHub Dark 계열 팔레트, 라이트모드 지원, 제목은 Instrument Serif, 라벨은 JetBrains Mono `// label` 형식,
블록은 왼쪽 세로선 + 도트 마커(`.rail`/`.rail-dot`). 브라우저 기본 prompt/confirm/alert 금지 → `useDialog()`의 `prompt/confirm/alert`.
삭제는 `useAct().removed(label, fn)`로 하면 "되돌리기" 알림이 붙는다. 최소 글자 크기 10px.

## 주요 기능
편집/플레이/flow 3모드, GM/공개 토글, 고정 명령어 바(명령어·저장 색·✦템플릿 칩), "/" 명령어 팔레트,
롤꾸 보관함 + `?{질문|안내문}` 채우기 창, 블록 안 "?{} 채우기" 버튼, play 줄 단위·블록·씬 전체 복사,
Roll20·코코포리아 미리보기, 사이드바(접기·너비 조절·씬/파트 드래그·BGM 목록·여러 줄 세션 기록),
세션 패널(행동 순서·단서 획득 체크·상태 플래그), 분기·엔딩 필요 플래그, 3단서 법칙 검증·단서 배치 현황,
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

## 작업 후 확인
`npm run build`가 에러 없이 되는지, 그리고 가능하면 브라우저로 play·flow 모드 진입이 되는지 확인.
(과거에 빌드는 되는데 런타임에 깨진 적 있음: React import 누락, mdR 함수 누락, 없는 lucide 아이콘 이름)
기능을 바꾸면 `modals/HelpModal.jsx`(앱 안 사용법)도 같이 고칠 것.
