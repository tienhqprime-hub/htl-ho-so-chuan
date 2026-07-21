create extension if not exists pgcrypto;

create table if not exists verification_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  question text,
  status text not null default 'DRAFT' check (status in ('DRAFT','PROCESSING','NEEDS_REVIEW','REVIEWED','REPORT_READY','ARCHIVED')),
  confidence numeric(5,2),
  conclusion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists verification_documents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references verification_sessions(id) on delete cascade,
  original_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists verification_findings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references verification_sessions(id) on delete cascade,
  severity text not null check (severity in ('THẤP','TRUNG BÌNH','CAO')),
  title text not null,
  evidence text not null,
  recommendation text not null,
  reviewer_status text not null default 'PENDING' check (reviewer_status in ('PENDING','CONFIRMED','REJECTED')),
  created_at timestamptz not null default now()
);

alter table verification_sessions enable row level security;
alter table verification_documents enable row level security;
alter table verification_findings enable row level security;

create policy "owners manage sessions" on verification_sessions
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "owners manage documents" on verification_documents
for all using (exists (select 1 from verification_sessions s where s.id = session_id and s.owner_id = auth.uid()))
with check (exists (select 1 from verification_sessions s where s.id = session_id and s.owner_id = auth.uid()));

create policy "owners manage findings" on verification_findings
for all using (exists (select 1 from verification_sessions s where s.id = session_id and s.owner_id = auth.uid()))
with check (exists (select 1 from verification_sessions s where s.id = session_id and s.owner_id = auth.uid()));
