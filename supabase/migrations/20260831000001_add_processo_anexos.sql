create table if not exists public.anexos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome_arquivo text not null,
  url_arquivo text not null,
  tamanho_bytes bigint not null check (tamanho_bytes >= 0),
  enviado_por text not null,
  criado_em timestamptz not null default now()
);

create index if not exists anexos_processo_id_criado_em_idx
  on public.anexos (processo_id, criado_em desc);

alter table public.anexos enable row level security;

insert into storage.buckets (id, name, public)
values ('anexos-processos', 'anexos-processos', false)
on conflict (id) do update set public = false;