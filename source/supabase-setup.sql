-- scenario-forge Supabase 설정
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. 여러 번 실행해도 안전합니다.

-- 1) 사용자당 한 줄로 전체 데이터를 저장하는 테이블
create table if not exists public.scenario_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 예전에 만든 테이블에 빠진 열이 있으면 추가
alter table public.scenario_data add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.scenario_data add column if not exists updated_at timestamptz not null default now();

-- 2) 사용자당 한 줄만 (저장 시 upsert 기준)
create unique index if not exists scenario_data_user_id_key on public.scenario_data(user_id);

-- 3) 본인 데이터만 읽고 쓸 수 있도록 (RLS)
alter table public.scenario_data enable row level security;
drop policy if exists "Users can manage own data" on public.scenario_data;
create policy "Users can manage own data" on public.scenario_data
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
