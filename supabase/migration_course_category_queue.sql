-- Execute este arquivo no SQL Editor do Supabase (Dashboard → SQL → New query)
-- Corrige: "Could not find the 'queue_order' column of 'courses' in the schema cache"

-- 1) Coluna category (se ainda nao existir)
alter table public.courses
  add column if not exists category text;

-- 2) Constraint da categoria (ignora se ja existir)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'courses_category_check'
  ) then
    alter table public.courses
      add constraint courses_category_check check (
        category is null or category in (
          'Tecnologia',
          'Design',
          'Idiomas',
          'Negócios',
          'Desenvolvimento Pessoal',
          'Ferramentas e Certificações'
        )
      );
  end if;
end $$;

-- 3) Coluna queue_order (fila de proximos cursos)
alter table public.courses
  add column if not exists queue_order integer;

-- 4) Indice para listar a fila ordenada
create index if not exists courses_user_queue_idx
  on public.courses (user_id, queue_order)
  where queue_order is not null;

-- 5) Atualiza o cache do PostgREST (Supabase API)
notify pgrst, 'reload schema';
