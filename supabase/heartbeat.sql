create table if not exists public.kpo_heartbeat (
  id text primary key,
  touched_at timestamptz not null default now()
);

insert into public.kpo_heartbeat (id, touched_at)
values ('main', now())
on conflict (id) do update
set touched_at = excluded.touched_at;
