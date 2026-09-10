-- Guarantees that an import updates one process per client instead of creating duplicates.
-- Apply this only after resolving any existing duplicate (placa, cliente_id) pairs.
create unique index if not exists processos_placa_cliente_id_unique_idx
  on public.processos (placa, cliente_id)
  where placa is not null and btrim(placa) <> '';

create table if not exists public.auditoria_acessos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  acao text not null,
  entidade text not null,
  entidade_id text,
  criado_em timestamptz not null default now()
);

create index if not exists auditoria_acessos_criado_em_idx
  on public.auditoria_acessos (criado_em desc);

alter table public.auditoria_acessos enable row level security;