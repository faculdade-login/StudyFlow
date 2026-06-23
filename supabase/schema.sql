-- StudyFlow — schema inicial para Supabase
-- Execute no SQL Editor do painel Supabase (ou via CLI: supabase db push)

-- Extensao para UUID (ja habilitada por padrao no Supabase)
-- create extension if not exists "uuid-ossp";

-- Perfis publicos (complementa auth.users do Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  lessons_completed integer not null default 0,
  hours_studied numeric(10, 1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cursos
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  platform text,
  deadline date,
  workload_hours numeric(10, 1),
  category text check (
    category is null or category in (
      'Tecnologia',
      'Design',
      'Idiomas',
      'Negócios',
      'Desenvolvimento Pessoal',
      'Ferramentas e Certificações'
    )
  ),
  queue_order integer,
  created_at timestamptz not null default now()
);

create index if not exists courses_user_queue_idx
  on public.courses (user_id, queue_order)
  where queue_order is not null;

-- Modulos
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

-- Aulas
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz
);

-- Atividades extras
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null,
  description text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Financas (privado por usuario)
create table if not exists public.finance_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  monthly_salary numeric(12, 2) not null default 0,
  current_savings numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null,
  date date not null
);

create table if not exists public.finance_monthly_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null,
  due_day smallint not null check (due_day between 1 and 31),
  is_superfluous boolean not null default false,
  paid boolean not null default false,
  paid_month text
);

create table if not exists public.finance_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null,
  due_date date not null,
  is_superfluous boolean not null default false,
  paid boolean not null default false,
  paid_at timestamptz
);

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null,
  date date not null,
  category text
);

create table if not exists public.finance_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  target_amount numeric(12, 2) not null,
  current_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- Trigger: criar profile ao cadastrar usuario no Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  insert into public.finance_settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.activities enable row level security;
alter table public.finance_settings enable row level security;
alter table public.finance_incomes enable row level security;
alter table public.finance_monthly_bills enable row level security;
alter table public.finance_debts enable row level security;
alter table public.finance_expenses enable row level security;
alter table public.finance_goals enable row level security;

-- Perfis: leitura publica para ranking, edicao so do proprio
create policy "Perfis visiveis no ranking"
  on public.profiles for select using (true);

create policy "Usuario edita proprio perfil"
  on public.profiles for update using (auth.uid() = id);

-- Cursos e filhos: dono edita; cursos visiveis no ranking (sem dados financeiros)
create policy "Usuario gerencia proprios cursos"
  on public.courses for all using (auth.uid() = user_id);

create policy "Modulos do dono do curso"
  on public.modules for all using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

create policy "Aulas do dono do curso"
  on public.lessons for all using (
    exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_id and c.user_id = auth.uid()
    )
  );

create policy "Atividades do dono do curso"
  on public.activities for all using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

-- Financas: apenas o proprio usuario
create policy "Financas so do usuario"
  on public.finance_settings for all using (auth.uid() = user_id);

create policy "Receitas so do usuario"
  on public.finance_incomes for all using (auth.uid() = user_id);

create policy "Contas mensais so do usuario"
  on public.finance_monthly_bills for all using (auth.uid() = user_id);

create policy "Dividas so do usuario"
  on public.finance_debts for all using (auth.uid() = user_id);

create policy "Gastos so do usuario"
  on public.finance_expenses for all using (auth.uid() = user_id);

create policy "Objetivos so do usuario"
  on public.finance_goals for all using (auth.uid() = user_id);

-- Ranking: view opcional (horas + aulas)
create or replace view public.ranking as
select
  id,
  name,
  lessons_completed,
  hours_studied
from public.profiles
order by hours_studied desc, lessons_completed desc;
