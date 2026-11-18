-- NurseAnaesthesia Pro, Phase 3, first slice: hospitals, staff accounts and
-- roles, hospital formulary and checklists with approval, and an append-only
-- audit log. No patient data is stored on the server in this slice: that waits
-- for the Tanzania Personal Data Protection Act 2022 review (see
-- docs/PLATFORM_PLAN.md).

create type public.staff_role as enum ('nurse', 'anaesthetist', 'icu', 'theatre', 'perfusionist', 'admin', 'educator');
create type public.content_status as enum ('draft', 'approved', 'retired');

create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

-- One row per signed-in staff member. A new account is not approved and has
-- no access to hospital content until a hospital administrator approves it.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  hospital_id uuid references public.hospitals (id),
  full_name text not null default '',
  role public.staff_role not null default 'nurse',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Helpers used by the policies. security definer so a policy on profiles can
-- read profiles without recursing; search_path pinned.
create or replace function public.my_hospital() returns uuid
language sql stable security definer set search_path = '' as $$
  select hospital_id from public.profiles where id = auth.uid() and approved
$$;

create or replace function public.my_role() returns public.staff_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and approved
$$;

-- The caller's own stored role, approval and hospital, approved or not; used to
-- stop staff changing these on their own row.
create or replace function public.own_fields_unchanged(r public.staff_role, a boolean, h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = r and p.approved = a and p.hospital_id is not distinct from h)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and approved), false)
$$;

-- Staff join by invitation: a hospital administrator invites an email address
-- with a role. When that person signs up, the profile is linked to the hospital
-- and approved. Anyone else who signs up gets a profile with no hospital and
-- no access. Role and approval are never taken from the sign-up request.
create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id),
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  role public.staff_role not null,
  created_by uuid not null references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  unique (hospital_id, email)
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv public.staff_invites;
begin
  select * into inv from public.staff_invites
    where email = lower(trim(new.email)) and used_at is null
    order by created_at desc limit 1;
  if found then
    insert into public.profiles (id, full_name, hospital_id, role, approved)
      values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), inv.hospital_id, inv.role, true);
    update public.staff_invites set used_at = now() where id = inv.id;
  else
    insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hospital formulary: concentrations and limits as entered and approved by the
-- hospital. Each save is a new version; nothing is overwritten.
create table public.formulary_versions (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id),
  version integer not null,
  data jsonb not null,
  status public.content_status not null default 'draft',
  created_by uuid not null references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  unique (hospital_id, version)
);

create table public.checklist_versions (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id),
  checklist_key text not null,
  version text not null,
  data jsonb not null,
  status public.content_status not null default 'draft',
  created_by uuid not null references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  unique (hospital_id, checklist_key, version)
);

-- Append-only audit log: inserts only, no updates or deletes for anyone
-- using the API.
create table public.audit_events (
  id bigint generated always as identity primary key,
  hospital_id uuid not null references public.hospitals (id),
  user_id uuid not null references public.profiles (id) default auth.uid(),
  at timestamptz not null default now(),
  type text not null check (length(type) between 1 and 64),
  summary text not null check (length(summary) <= 2000)
);
create index audit_events_hospital_at on public.audit_events (hospital_id, at desc);

alter table public.hospitals enable row level security;
alter table public.profiles enable row level security;
alter table public.formulary_versions enable row level security;
alter table public.checklist_versions enable row level security;
alter table public.audit_events enable row level security;
alter table public.staff_invites enable row level security;

-- hospitals: staff see their own hospital. Hospitals are created by the
-- project owner (service role), not through the app.
create policy "staff read own hospital" on public.hospitals for select to authenticated
  using (id = public.my_hospital());

-- profiles: everyone reads their own row; admins read and manage their hospital's staff.
create policy "read own profile" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "admin reads hospital staff" on public.profiles for select to authenticated
  using (public.is_admin() and hospital_id = public.my_hospital());
create policy "admin manages hospital staff" on public.profiles for update to authenticated
  using (public.is_admin() and hospital_id = public.my_hospital())
  with check (public.is_admin() and hospital_id = public.my_hospital());
-- Permissive policies combine USING and WITH CHECK separately, so every
-- WITH CHECK repeats its policy's role test.
-- Staff may change only their own name; role, hospital and approval are admin-only.
revoke update on public.profiles from authenticated;
grant update (full_name, role, approved, hospital_id) on public.profiles to authenticated;
create policy "edit own name" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and public.own_fields_unchanged(role, approved, hospital_id));


-- invites: admins manage their hospital's invites.
create policy "admin reads invites" on public.staff_invites for select to authenticated
  using (public.is_admin() and hospital_id = public.my_hospital());
create policy "admin creates invites" on public.staff_invites for insert to authenticated
  with check (public.is_admin() and hospital_id = public.my_hospital() and created_by = auth.uid() and used_at is null);
create policy "admin withdraws invites" on public.staff_invites for delete to authenticated
  using (public.is_admin() and hospital_id = public.my_hospital() and used_at is null);
revoke update on public.staff_invites from authenticated;

-- formulary and checklists: approved staff read their hospital's content.
-- Anaesthetists, ICU staff and admins draft; only admins approve or retire.
create policy "staff read formulary" on public.formulary_versions for select to authenticated
  using (hospital_id = public.my_hospital());
create policy "draft formulary" on public.formulary_versions for insert to authenticated
  with check (hospital_id = public.my_hospital() and status = 'draft' and approved_by is null and created_by = auth.uid()
    and public.my_role() in ('admin', 'anaesthetist', 'icu', 'perfusionist'));
create policy "admin approves formulary" on public.formulary_versions for update to authenticated
  using (public.is_admin() and hospital_id = public.my_hospital())
  with check (public.is_admin() and hospital_id = public.my_hospital() and (status = 'draft' or approved_by = auth.uid()));
revoke update on public.formulary_versions from authenticated;
grant update (status, approved_by, approved_at) on public.formulary_versions to authenticated;

create policy "staff read checklists" on public.checklist_versions for select to authenticated
  using (hospital_id = public.my_hospital());
create policy "draft checklists" on public.checklist_versions for insert to authenticated
  with check (hospital_id = public.my_hospital() and status = 'draft' and approved_by is null and created_by = auth.uid()
    and public.my_role() in ('admin', 'anaesthetist', 'icu', 'theatre', 'educator', 'nurse'));
create policy "admin approves checklists" on public.checklist_versions for update to authenticated
  using (public.is_admin() and hospital_id = public.my_hospital())
  with check (public.is_admin() and hospital_id = public.my_hospital() and (status = 'draft' or approved_by = auth.uid()));
revoke update on public.checklist_versions from authenticated;
grant update (status, approved_by, approved_at) on public.checklist_versions to authenticated;

-- audit: staff write their own events; staff read their own; admins and educators read the hospital's.
create policy "write own audit" on public.audit_events for insert to authenticated
  with check (user_id = auth.uid() and hospital_id = public.my_hospital());
create policy "read own audit" on public.audit_events for select to authenticated
  using (user_id = auth.uid());
create policy "admin reads hospital audit" on public.audit_events for select to authenticated
  using (hospital_id = public.my_hospital() and public.my_role() in ('admin', 'educator'));
revoke update, delete, truncate on public.audit_events from authenticated, anon;

-- Nothing is readable without signing in.
revoke all on public.hospitals, public.profiles, public.staff_invites, public.formulary_versions, public.checklist_versions, public.audit_events from anon;
