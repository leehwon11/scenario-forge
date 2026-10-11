-- =====================================================================
--  시나리오 대장간 — Supabase 설정 SQL
--  Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.
--  여러 번 실행해도 안전합니다 (기존 데이터는 지우지 않음).
-- =====================================================================

-- 사용자당 한 줄로 전체 데이터를 저장
create table if not exists public.scenario_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 본인 데이터만 읽고 쓸 수 있도록 (RLS)
alter table public.scenario_data enable row level security;

drop policy if exists "sf_select_own" on public.scenario_data;
drop policy if exists "sf_insert_own" on public.scenario_data;
drop policy if exists "sf_update_own" on public.scenario_data;
drop policy if exists "sf_delete_own" on public.scenario_data;
create policy "sf_select_own" on public.scenario_data for select using (auth.uid() = user_id);
create policy "sf_insert_own" on public.scenario_data for insert with check (auth.uid() = user_id);
create policy "sf_update_own" on public.scenario_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sf_delete_own" on public.scenario_data for delete using (auth.uid() = user_id);
