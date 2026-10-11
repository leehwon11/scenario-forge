-- =====================================================================
--  시나리오 대장간 — Supabase SQL (SQL Editor에 통째로 붙여넣고 Run)
--  예전에 만든 scenario_data 테이블이 있으면 지우고 새로 만들어요.
--  (예전 SQL은 user_id 중복 방지가 없어서 저장이 꼬여요)
-- =====================================================================
drop table if exists public.scenario_data;

create table public.scenario_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.scenario_data enable row level security;

create policy "sf_select_own" on public.scenario_data for select using (auth.uid() = user_id);
create policy "sf_insert_own" on public.scenario_data for insert with check (auth.uid() = user_id);
create policy "sf_update_own" on public.scenario_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sf_delete_own" on public.scenario_data for delete using (auth.uid() = user_id);
