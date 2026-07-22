-- HTL HỒ SƠ CHUẨN
-- Enterprise multi-tenant foundation for Supabase/PostgreSQL

create extension if not exists "pgcrypto";

create type public.enterprise_role as enum (
  'Quản trị hệ thống',
  'Lãnh đạo',
  'Chuyên viên',
  'Kiểm soát',
  'Chỉ xem'
);

create type public.organization_status as enum ('Hoạt động', 'Tạm dừng');
create type public.member_status as enum ('Đang hoạt động', 'Đã khóa');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status public.organization_status not null default 'Hoạt động',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null,
  role public.enterprise_role not null default 'Chuyên viên',
  status public.member_status not null default 'Đang hoạt động',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.dossiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  company text not null default '',
  category text not null default '',
  owner_user_id uuid references auth.users(id),
  status text not null default 'Mới tiếp nhận',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.dossier_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  name text not null,
  required boolean not null default true,
  status text not null default 'Chưa có',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dossier_workflows (
  dossier_id uuid primary key references public.dossiers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stage text not null default 'Tiếp nhận',
  priority text not null default 'Bình thường',
  due_date date,
  next_action text not null default '',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  note text not null default '',
  actor_user_id uuid references auth.users(id),
  actor_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.verification_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  file_names jsonb not null default '[]'::jsonb,
  context text not null default '',
  status text not null,
  confidence integer not null default 0 check (confidence between 0 and 100),
  summary text not null default '',
  cross_checks jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  actor_name text not null default '',
  actor_role public.enterprise_role not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index dossiers_organization_idx on public.dossiers(organization_id);
create index checklist_dossier_idx on public.dossier_checklist_items(dossier_id);
create index verification_dossier_created_idx on public.verification_history(dossier_id, created_at desc);
create index workflow_events_dossier_created_idx on public.workflow_events(dossier_id, created_at desc);
create index audit_organization_created_idx on public.audit_events(organization_id, created_at desc);
create index members_user_idx on public.organization_members(user_id);

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

create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger members_set_updated_at before update on public.organization_members
for each row execute function public.set_updated_at();
create trigger dossiers_set_updated_at before update on public.dossiers
for each row execute function public.set_updated_at();
create trigger checklist_set_updated_at before update on public.dossier_checklist_items
for each row execute function public.set_updated_at();

create or replace function public.current_member_role(target_organization_id uuid)
returns public.enterprise_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.organization_members
  where organization_id = target_organization_id
    and user_id = auth.uid()
    and status = 'Đang hoạt động'
  limit 1;
$$;

create or replace function public.is_active_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and status = 'Đang hoạt động'
  );
$$;

create or replace function public.can_manage_members(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_member_role(target_organization_id) = 'Quản trị hệ thống', false);
$$;

create or replace function public.can_edit_dossier(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_member_role(target_organization_id) in (
    'Quản trị hệ thống', 'Lãnh đạo', 'Chuyên viên'
  ), false);
$$;

create or replace function public.can_approve_dossier(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_member_role(target_organization_id) in (
    'Quản trị hệ thống', 'Lãnh đạo', 'Kiểm soát'
  ), false);
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.dossiers enable row level security;
alter table public.dossier_checklist_items enable row level security;
alter table public.dossier_workflows enable row level security;
alter table public.workflow_events enable row level security;
alter table public.verification_history enable row level security;
alter table public.audit_events enable row level security;

create policy organizations_select_member on public.organizations
for select using (public.is_active_member(id));

create policy organizations_update_admin on public.organizations
for update using (public.current_member_role(id) = 'Quản trị hệ thống')
with check (public.current_member_role(id) = 'Quản trị hệ thống');

create policy members_select_same_org on public.organization_members
for select using (public.is_active_member(organization_id));

create policy members_insert_admin on public.organization_members
for insert with check (public.can_manage_members(organization_id));

create policy members_update_admin on public.organization_members
for update using (public.can_manage_members(organization_id))
with check (public.can_manage_members(organization_id));

create policy dossiers_select_member on public.dossiers
for select using (public.is_active_member(organization_id));

create policy dossiers_insert_editor on public.dossiers
for insert with check (public.can_edit_dossier(organization_id));

create policy dossiers_update_editor on public.dossiers
for update using (public.can_edit_dossier(organization_id))
with check (public.can_edit_dossier(organization_id));

create policy checklist_select_member on public.dossier_checklist_items
for select using (public.is_active_member(organization_id));
create policy checklist_write_editor on public.dossier_checklist_items
for all using (public.can_edit_dossier(organization_id))
with check (public.can_edit_dossier(organization_id));

create policy workflow_select_member on public.dossier_workflows
for select using (public.is_active_member(organization_id));
create policy workflow_write_editor on public.dossier_workflows
for all using (public.can_edit_dossier(organization_id))
with check (public.can_edit_dossier(organization_id));

create policy workflow_events_select_member on public.workflow_events
for select using (public.is_active_member(organization_id));
create policy workflow_events_insert_editor on public.workflow_events
for insert with check (public.can_edit_dossier(organization_id));

create policy verification_select_member on public.verification_history
for select using (public.is_active_member(organization_id));
create policy verification_insert_reviewer on public.verification_history
for insert with check (
  public.current_member_role(organization_id) in (
    'Quản trị hệ thống', 'Lãnh đạo', 'Chuyên viên', 'Kiểm soát'
  )
);

create policy audit_select_authorized on public.audit_events
for select using (
  public.current_member_role(organization_id) in (
    'Quản trị hệ thống', 'Lãnh đạo', 'Kiểm soát'
  )
);

-- Audit events should normally be inserted from trusted server-side code or database triggers.
-- The service role bypasses RLS and can write immutable audit records.

revoke update, delete on public.audit_events from authenticated;
