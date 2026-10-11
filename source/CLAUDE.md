# 시나리오 대장간 (scenario-forge)

한국 TRPG(CoC, 인세인 등) GM/키퍼용 시나리오 노트 웹앱. Roll20·코코포리아 온라인 세션용.
사용자는 GM이고 코딩은 잘 모름 → 설명은 쉬운 한국어로, 결과물은 바로 배포 가능한 형태로.

## 기술 스택
- React 18 + Vite, lucide-react 아이콘, @supabase/supabase-js
- 저장: localStorage(`scenario-forge-v4`) + Supabase 자동 동기화
- 배포: GitHub Pages (`npm run build` → `dist/` 내용을 레포에 올림, `base: './'`)
- 폰트: JetBrains Mono / DM Sans / Instrument Serif (Google Fonts)

## 파일 구조
- `src/App.jsx` — 앱 전체 (컴포넌트·모달·사이드바·동기화 훅). 파일 끝 "v5 ADDITIONS" 이후가 최신 기능
- `src/r20.js` — Roll20 롤꾸 미리보기 엔진 (문자 단위 파서, Oosh CSS 핵, [[roll]], ?{query}, API 버튼)
- `src/supabase.js` — 인증·클라우드 저장, 에러 한국어 변환(koErr)
- `src/style.css` — 테마 변수(다크/라이트), r20 채팅 스타일
- `public/supabase-config.js` — Supabase URL/anon 키 (빌드 없이 수정 가능, service_role 키 금지)
- `supabase-setup.sql` — 테이블 `scenario_data(user_id PK, data jsonb, updated_at)` + RLS

## 데이터 모델 (요약)
platforms[] { name, color, commands[{l,s,cat}], savedColors[], templates[{name,code}] }
scenarios[] { platformId, title, setting, synopsis, parts[{title, scenes[{title, location, timeOfDay, npcsPresent, done, connections[], blocks[]}]}],
  endings[{title, endingType, condition, blocks[]}], endingTypes[{id,l,c}], clues[{name, description, leadsTo, isRedHerring}],
  eventTimeline[], sessionHistory[{date, summary}], library{npcs,items,places} }
블록 타입: text, memo, truth, clue, lines, branches, checks, npc, handout, bgm, item, place, session-log
`mig()`가 구버전 데이터를 보정함 — 필드 추가 시 반드시 mig에도 기본값 추가.

## 디자인 규칙 (v4 "모던 터미널")
GitHub Dark 계열 팔레트, 라이트모드 지원, 제목은 Instrument Serif, 라벨은 JetBrains Mono `// label` 형식,
블록은 왼쪽 세로선 + 도트 마커. 브라우저 기본 prompt/confirm 금지 → `askText/askConfirm/askChoice` 사용.

## 주요 기능
편집/플레이/flow 3모드, GM/공개 토글, 상단 고정 명령어 바(명령어·저장 색상·✦템플릿 칩),
롤꾸 보관함 + `?{질문|안내문}` 채우기 모달(빈칸은 ?{} 유지 옵션, 줄바꿈→<br>),
Roll20 미리보기(나레이션·대사 블록만, ON/OFF), 코코포리아 미리보기, 플레이모드 줄 단위 복사,
사이드바 탭(씬/단서/엔딩/BGM/기록), 3단서 법칙 검증, 사건 연표, Undo/Redo, 찾기·바꾸기,
시나리오 단일 내보내기/병합, Supabase 로그인·자동저장·기기 간 충돌 확인·백업 되살리기.

## 사용자가 빼달라고 한 기능 (다시 넣지 말 것)
PC 정보 카드 / SAN·HP 트래커, 빠른 참조표(키퍼 스크린), 타이머, 시나리오 구조 템플릿, Stars & Wishes 피드백

## Roll20 롤꾸 주의사항
- Oosh 핵 `[텍스트](#" style="...;)` 안에서는 괄호 들어간 CSS 함수(rgba(), linear-gradient()) 쓰면 깨짐 → HEX 8자리(#RRGGBBAA) 사용
- `position:absolute`는 블록끼리 안 붙음, 각 [ ]는 별개 <a> 태그
- ?{쿼리} 안에서는 줄바꿈 불가

## 남은 할 일 후보
모바일 서랍형 사이드바, 블록 드래그 이동, 씬을 다른 파트로 옮기기, 시나리오 정보 카드(인원·플레이타임·로스트율),
세션 중 단서/핸드아웃 공개 체크, 세션 퀵메모, NPC 관계도, 배포용 내보내기, 롤꾸 문법 경고(rgba→HEX 자동변환)

## 작업 후 확인
`npm run build`가 에러 없이 되는지, 그리고 가능하면 브라우저로 play·flow 모드 진입이 되는지 확인.
(과거에 빌드는 되는데 런타임에 깨진 적 있음: React import 누락, mdR 함수 누락)
