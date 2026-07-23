create type public.dossier_status as enum (
  'draft',
  'in_review',
  'approved',
  'rejected',
  'archived'
);

create type public.document_status as enum (
  'draft',
  'submitted',
  'verified',
  'expired',
  'archived'
);

create type public.workflow_status as enum (
  'pending',
  'active',
  'completed',
  'cancelled'
);

create table if not exists public.dossiers (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  category text,
  status public.dossier_status not null default 'draft',
  owner_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enterprise_id, code)
);

create table if not exists public.dossier_documents (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  name text not null,
  document_type text,
  storage_path text,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  version integer not null default 1 check (version > 0),
  status public.document_status not null default 'draft',
  issued_at date,
  expires_at date,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or issued_at is null or expires_at >= issued_at)
);

create table if not exists public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  workflow_key text not null,
  current_step text,
  status public.workflow_status not null default 'pending',
  assigned_to uuid references auth.users(id) on delete set null,
  started_by uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz,
  completed_at timestamptz,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or started_at is null or completed_at >= started_at)
);

create index if not exists dossiers_enterprise_id_idx
  on public.dossiers(enterprise_id);
create index if not exists dossiers_status_idx
  on public.dossiers(enterprise_id, status);
create index if not exists dossier_documents_dossier_id_idx
  on public.dossier_documents(dossier_id);
create index if not exists dossier_documents_enterprise_id_idx
  on public.dossier_documents(enterprise_id);
create index if not exists workflow_instances_dossier_id_idx
  on public.workflow_instances(dossier_id);
create index if not exists workflow_instances_assigned_to_idx
  on public.workflow_instances(assigned_to)
  where assigned_to is not null;

create trigger dossiers_set_updated_at
before update on public.dossiers
for each row execute function public.set_updated_at();

create trigger dossier_documents_set_updated_at
before update on public.dossier_documents
for each row execute function public.set_updated_at();

create trigger workflow_instances_set_updated_at
before update on public.workflow_instances
for each row execute function public.set_updated_at();

create or replace function public.same_enterprise_as_dossier(
  target_dossier_id uuid,
  target_enterprise_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dossiers
    where id = target_dossier_id
      and enterprise_id = target_enterprise_id
  );
$$;

alter table public.dossiers enable row level security;
alter table public.dossier_documents enable row level security;
alter table public.workflow_instances enable row level security;

create policy "dossiers_select_enterprise_members"
on public.dossiers
for select
to authenticated
using (public.is_enterprise_member(enterprise_id));

create policy "dossiers_insert_enterprise_members"
on public.dossiers
for insert
to authenticated
with check (
  public.is_enterprise_member(enterprise_id)
  and created_by = auth.uid()
);

create policy "dossiers_update_owner_or_admin"
on public.dossiers
for update
to authenticated
using (
  public.is_enterprise_admin(enterprise_id)
  or owner_id = auth.uid()
  or created_by = auth.uid()
)
with check (public.is_enterprise_member(enterprise_id));

create policy "dossiers_delete_enterprise_admin"
on public.dossiers
for delete
to authenticated
using (public.is_enterprise_admin(enterprise_id));

create policy "documents_select_enterprise_members"
on public.dossier_documents
for select
to authenticated
using (public.is_enterprise_member(enterprise_id));

create policy "documents_insert_enterprise_members"
on public.dossier_documents
for insert
to authenticated
with check (
  public.is_enterprise_member(enterprise_id)
  and uploaded_by = auth.uid()
  and public.same_enterprise_as_dossier(dossier_id, enterprise_id)
);

create policy "documents_update_uploader_or_admin"
on public.dossier_documents
for update
to authenticated
using (
  public.is_enterprise_admin(enterprise_id)
  or uploaded_by = auth.uid()
)
with check (
  public.is_enterprise_member(enterprise_id)
  and public.same_enterprise_as_dossier(dossier_id, enterprise_id)
);

create policy "documents_delete_uploader_or_admin"
on public.dossier_documents
for delete
to authenticated
using (
  public.is_enterprise_admin(enterprise_id)
  or uploaded_by = auth.uid()
);

create policy "workflows_select_enterprise_members"
on public.workflow_instances
for select
to authenticated
using (public.is_enterprise_member(enterprise_id));

create policy "workflows_insert_enterprise_members"
on public.workflow_instances
for insert
to authenticated
with check (
  public.is_enterprise_member(enterprise_id)
  and started_by = auth.uid()
  and public.same_enterprise_as_dossier(dossier_id, enterprise_id)
);

create policy "workflows_update_assignee_starter_or_admin"
on public.workflow_instances
for update
to authenticated
using (
  public.is_enterprise_admin(enterprise_id)
  or assigned_to = auth.uid()
  or started_by = auth.uid()
)
with check (
  public.is_enterprise_member(enterprise_id)
  and public.same_enterprise_as_dossier(dossier_id, enterprise_id)
);

create policy "workflows_delete_enterprise_admin"
on public.workflow_instances
for delete
to authenticated
using (public.is_enterprise_admin(enterprise_id));

grant select, insert, update, delete on public.dossiers to authenticated;
grant select, insert, update, delete on public.dossier_documents to authenticated;
grant select, insert, update, delete on public.workflow_instances to authenticated;

alter publication supabase_realtime add table public.dossiers;
alter publication supabase_realtime add table public.dossier_documents;
alter publication supabase_realtime add table public.workflow_instances;
