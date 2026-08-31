alter table public.clientes
  add column if not exists logo_url text;

update public.clientes
set logo_url = '/santander-logo.svg'
where lower(trim(nome)) = 'santander'
  and (logo_url is null or logo_url = '');