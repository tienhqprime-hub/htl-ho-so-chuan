create extension if not exists pgcrypto;

create type public.enterprise_member_role as enum (
  'enterprise_admin',
  'user'
);

create table if not exists public.enterprises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  system_role text not null default 'user' check (system_role in ('system_admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enterprise_memberships (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.enterprise_member_role not null default 'user',
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enterprise_id, user_id)
);

create index if not exists enterprise_memberships_user_id_idx
  on public.enterprise_memberships(user_id);

create index if not exists enterprise_memberships_enterprise_id_idx
  on public.enterprise_memberships(enterprise_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger enterprises_set_updated_at
before update on public.enterprises
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger enterprise_memberships_set_updated_at
before update on public.enterprise_memberships
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and system_role = 'system_admin'
  );
$$;

create or replace function public.is_enterprise_member(target_enterprise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_system_admin() or exists (
    select 1
    from public.enterprise_memberships
    where enterprise_id = target_enterprise_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_enterprise_admin(target_enterprise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_system_admin() or exists (
    select 1
    from public.enterprise_memberships
    where enterprise_id = target_enterprise_id
      and user_id = auth.uid()
      and role = 'enterprise_admin'
      and status = 'active'
  );
$$;

alter table public.enterprises enable row level security;
alter table public.profiles enable row level security;
alter table public.enterprise_memberships enable row level security;

create policy "enterprises_select_members"
on public.enterprises
for select
to authenticated
using (public.is_enterprise_member(id));

create policy "enterprises_insert_system_admin"
on public.enterprises
for insert
to authenticated
with check (public.is_system_admin());

create policy "enterprises_update_admin"
on public.enterprises
for update
to authenticated
using (public.is_enterprise_admin(id))
with check (public.is_enterprise_admin(id));

create policy "enterprises_delete_system_admin"
on public.enterprises
for delete
to authenticated
using (public.is_system_admin());

create policy "profiles_select_self_or_shared_enterprise"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_system_admin()
  or exists (
    select 1
    from public.enterprise_memberships mine
    join public.enterprise_memberships theirs
      on theirs.enterprise_id = mine.enterprise_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = profiles.id
      and theirs.status = 'active'
  )
);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_system_admin())
with check (id = auth.uid() or public.is_system_admin());

create policy "memberships_select_enterprise_members"
on public.enterprise_memberships
for select
to authenticated
using (public.is_enterprise_member(enterprise_id));

create policy "memberships_insert_enterprise_admin"
on public.enterprise_memberships
for insert
to authenticated
with check (public.is_enterprise_admin(enterprise_id));

create policy "memberships_update_enterprise_admin"
on public.enterprise_memberships
for update
to authenticated
using (public.is_enterprise_admin(enterprise_id))
with check (public.is_enterprise_admin(enterprise_id));

create policy "memberships_delete_enterprise_admin"
on public.enterprise_memberships
for delete
to authenticated
using (public.is_enterprise_admin(enterprise_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.enterprises to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.enterprise_memberships to authenticated;
