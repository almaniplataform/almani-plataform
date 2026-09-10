-- Customer data is visible only to users linked to the corresponding client.
alter table public.usuarios_cliente enable row level security;
alter table public.clientes enable row level security;
alter table public.processos enable row level security;

drop policy if exists usuarios_cliente_select_own on public.usuarios_cliente;
create policy usuarios_cliente_select_own
  on public.usuarios_cliente for select to authenticated
  using (user_id = auth.uid());

drop policy if exists clientes_select_linked on public.clientes;
create policy clientes_select_linked
  on public.clientes for select to authenticated
  using (exists (
    select 1 from public.usuarios_cliente uc
    where uc.cliente_id = clientes.id and uc.user_id = auth.uid()
  ));

drop policy if exists processos_select_linked on public.processos;
create policy processos_select_linked
  on public.processos for select to authenticated
  using (exists (
    select 1 from public.usuarios_cliente uc
    where uc.cliente_id = processos.cliente_id and uc.user_id = auth.uid()
  ));

drop policy if exists anexos_select_linked on public.anexos;
create policy anexos_select_linked
  on public.anexos for select to authenticated
  using (exists (
    select 1 from public.usuarios_cliente uc
    where uc.cliente_id = anexos.cliente_id and uc.user_id = auth.uid()
  ));

drop policy if exists anexos_insert_linked on public.anexos;
create policy anexos_insert_linked
  on public.anexos for insert to authenticated
  with check (exists (
    select 1 from public.usuarios_cliente uc
    where uc.cliente_id = anexos.cliente_id and uc.user_id = auth.uid()
  ));

drop policy if exists storage_anexos_select_linked on storage.objects;
create policy storage_anexos_select_linked
  on storage.objects for select to authenticated
  using (
    bucket_id = 'anexos-processos' and exists (
      select 1
      from public.processos p
      join public.usuarios_cliente uc on uc.cliente_id = p.cliente_id
      where p.id::text = split_part(name, '/', 1)
        and uc.user_id = auth.uid()
    )
  );

drop policy if exists storage_anexos_insert_linked on storage.objects;
create policy storage_anexos_insert_linked
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'anexos-processos' and exists (
      select 1
      from public.processos p
      join public.usuarios_cliente uc on uc.cliente_id = p.cliente_id
      where p.id::text = split_part(name, '/', 1)
        and uc.user_id = auth.uid()
    )
  );