-- Enforce unique, case-insensitive display names at signup and profile update.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username_key text not null unique,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;

-- Backfill one owner per existing name. Older duplicate names remain usable
-- until changed, but cannot be newly claimed or saved again.
with ranked_names as (
  select id, btrim(raw_user_meta_data ->> 'display_name') as display_name,
    lower(btrim(raw_user_meta_data ->> 'display_name')) as username_key,
    row_number() over (partition by lower(btrim(raw_user_meta_data ->> 'display_name')) order by created_at, id) as name_rank
  from auth.users
  where nullif(btrim(raw_user_meta_data ->> 'display_name'), '') is not null
)
insert into public.profiles (user_id, display_name, username_key)
select id, display_name, username_key from ranked_names where name_rank = 1
on conflict (user_id) do update set display_name = excluded.display_name, username_key = excluded.username_key, updated_at = now();

create or replace function public.is_display_name_available(p_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select nullif(btrim(coalesce(p_name, '')), '') is not null
    and not exists (select 1 from auth.users u where lower(btrim(u.raw_user_meta_data ->> 'display_name')) = lower(btrim(p_name)) and (auth.uid() is null or u.id <> auth.uid()))
    and not exists (select 1 from public.profiles p where p.username_key = lower(btrim(p_name)) and (auth.uid() is null or p.user_id <> auth.uid()));
$$;
revoke all on function public.is_display_name_available(text) from public;
grant execute on function public.is_display_name_available(text) to anon, authenticated;

create or replace function public.check_unique_display_name()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  candidate text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  candidate_key text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')));
begin
  if tg_op = 'UPDATE' and new.raw_user_meta_data is not distinct from old.raw_user_meta_data then
    return new;
  end if;
  if candidate = '' then return new; end if;
  if exists (select 1 from auth.users u where u.id <> new.id and lower(btrim(u.raw_user_meta_data ->> 'display_name')) = candidate_key)
    or exists (select 1 from public.profiles p where p.username_key = candidate_key and p.user_id <> new.id) then
    raise exception 'DISPLAY_NAME_TAKEN' using errcode = '23505';
  end if;
  return new;
end;
$$;

create or replace function public.sync_user_display_name()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare candidate text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if tg_op = 'UPDATE' and new.raw_user_meta_data is not distinct from old.raw_user_meta_data then
    return new;
  end if;
  if candidate <> '' then
    insert into public.profiles (user_id, display_name, username_key, updated_at)
    values (new.id, candidate, lower(candidate), now())
    on conflict (user_id) do update set display_name = excluded.display_name, username_key = excluded.username_key, updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists auth_users_unique_display_name on auth.users;
create trigger auth_users_unique_display_name before insert or update on auth.users
for each row execute function public.check_unique_display_name();
drop trigger if exists auth_users_sync_display_name on auth.users;
create trigger auth_users_sync_display_name after insert or update on auth.users
for each row execute function public.sync_user_display_name();
