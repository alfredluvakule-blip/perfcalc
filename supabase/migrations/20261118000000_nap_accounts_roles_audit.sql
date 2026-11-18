-- NurseAnaesthesia Pro, Phase 3, first slice: hospitals, staff accounts and
-- roles, hospital formulary and checklists with approval, and an append-only
-- audit log. No patient data is stored on the server in this slice: that waits
-- for the Tanzania Personal Data Protection Act 2022 review (see
-- docs/PLATFORM_PLAN.md).
-- All objects are prefixed nap_ because this project also hosts another app
-- (with its own public.profiles and on_auth_user_created trigger).

create type public.nap_staff_role as enum ('nurse', 'anaesthetist', 'icu', 'theatre', 'perfusionist', 'admin', 'educator');
create type public.nap_content_status as enum ('draft', 'approved', 'retired');

create table public.nap_hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

-- One row per signed-in staff member. A new account is not approved and has
-- no access to hospital content until a hospital administrator approves it.
create table public.nap_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  hospital_id uuid references public.nap_hospitals (id),
  full_name text not null default '',
  role public.nap_staff_role not null default 'nurse',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Helpers used by the policies. security definer so a policy on profiles can
-- read profiles without recursing; search_path pinned.
create or replace function public.nap_my_hospital() returns uuid
language sql stable security definer set search_path = '' as $$
  select hospital_id from public.nap_profiles where id = auth.uid() and approved
$$;

create or replace function public.nap_my_role() returns public.nap_staff_role
language sql stable security definer set search_path = '' as $$
  select role from public.nap_profiles where id = auth.uid() and approved
$$;

-- The caller's own stored role, approval and hospital, approved or not; used to
-- stop staff changing these on their own row.
create or replace function public.nap_own_fields_unchanged(r public.nap_staff_role, a boolean, h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.nap_profiles p where p.id = auth.uid() and p.role = r and p.approved = a and p.hospital_id is not distinct from h)
$$;

create or replace function public.nap_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.nap_profiles where id = auth.uid() and approved), false)
$$;

-- Staff join by invitation: a hospital administrator invites an email address
-- with a role. When that person signs up, the profile is linked to the hospital
-- and approved. Anyone else who signs up gets a profile with no hospital and
-- no access. Role and approval are never taken from the sign-up request.
create table public.nap_staff_invites (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.nap_hospitals (id),
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  role public.nap_staff_role not null,
  created_by uuid not null references public.nap_profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  unique (hospital_id, email)
);

create or replace function public.nap_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv public.nap_staff_invites;
begin
  select * into inv from public.nap_staff_invites
    where email = lower(trim(new.email)) and used_at is null
    order by created_at desc limit 1;
  if found then
    insert into public.nap_profiles (id, full_name, hospital_id, role, approved)
      values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), inv.hospital_id, inv.role, true);
    update public.nap_staff_invites set used_at = now() where id = inv.id;
  else
    insert into public.nap_profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  end if;
  return new;
exception when others then
  -- Never block sign-up for the other app that shares this project.
  raise warning 'nap_handle_new_user: %', sqlerrm;
  return new;
end;
$$;

create trigger nap_on_auth_user_created after insert on auth.users
  for each row execute function public.nap_handle_new_user();

-- Hospital formulary: concentrations and limits as entered and approved by the
-- hospital. Each save is a new version; nothing is overwritten.
create table public.nap_formulary_versions (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.nap_hospitals (id),
  version integer not null,
  data jsonb not null,
  status public.nap_content_status not null default 'draft',
  created_by uuid not null references public.nap_profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  approved_by uuid references public.nap_profiles (id),
  approved_at timestamptz,
  unique (hospital_id, version)
);

create table public.nap_checklist_versions (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.nap_hospitals (id),
  checklist_key text not null,
  version text not null,
  data jsonb not null,
  status public.nap_content_status not null default 'draft',
  created_by uuid not null references public.nap_profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  approved_by uuid references public.nap_profiles (id),
  approved_at timestamptz,
  unique (hospital_id, checklist_key, version)
);

-- Append-only audit log: inserts only, no updates or deletes for anyone
-- using the API.
create table public.nap_audit_events (
  id bigint generated always as identity primary key,
  hospital_id uuid not null references public.nap_hospitals (id),
  user_id uuid not null references public.nap_profiles (id) default auth.uid(),
  at timestamptz not null default now(),
  type text not null check (length(type) between 1 and 64),
  summary text not null check (length(summary) <= 2000)
);
create index nap_audit_events_hospital_at on public.nap_audit_events (hospital_id, at desc);

alter table public.nap_hospitals enable row level security;
alter table public.nap_profiles enable row level security;
alter table public.nap_formulary_versions enable row level security;
alter table public.nap_checklist_versions enable row level security;
alter table public.nap_audit_events enable row level security;
alter table public.nap_staff_invites enable row level security;

-- hospitals: staff see their own hospital. Hospitals are created by the
-- project owner (service role), not through the app.
create policy "staff read own hospital" on public.nap_hospitals for select to authenticated
  using (id = public.nap_my_hospital());

-- profiles: everyone reads their own row; admins read and manage their hospital's staff.
create policy "read own profile" on public.nap_profiles for select to authenticated
  using (id = auth.uid());
create policy "admin reads hospital staff" on public.nap_profiles for select to authenticated
  using (public.nap_is_admin() and hospital_id = public.nap_my_hospital());
create policy "admin manages hospital staff" on public.nap_profiles for update to authenticated
  using (public.nap_is_admin() and hospital_id = public.nap_my_hospital())
  with check (public.nap_is_admin() and hospital_id = public.nap_my_hospital());
-- Permissive policies combine USING and WITH CHECK separately, so every
-- WITH CHECK repeats its policy's role test.
-- Staff may change only their own name; role, hospital and approval are admin-only.
revoke update on public.nap_profiles from authenticated;
grant update (full_name, role, approved, hospital_id) on public.nap_profiles to authenticated;
create policy "edit own name" on public.nap_profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and public.nap_own_fields_unchanged(role, approved, hospital_id));


-- invites: admins manage their hospital's invites.
create policy "admin reads invites" on public.nap_staff_invites for select to authenticated
  using (public.nap_is_admin() and hospital_id = public.nap_my_hospital());
create policy "admin creates invites" on public.nap_staff_invites for insert to authenticated
  with check (public.nap_is_admin() and hospital_id = public.nap_my_hospital() and created_by = auth.uid() and used_at is null);
create policy "admin withdraws invites" on public.nap_staff_invites for delete to authenticated
  using (public.nap_is_admin() and hospital_id = public.nap_my_hospital() and used_at is null);
revoke update on public.nap_staff_invites from authenticated;

-- formulary and checklists: approved staff read their hospital's content.
-- Anaesthetists, ICU staff and admins draft; only admins approve or retire.
create policy "staff read formulary" on public.nap_formulary_versions for select to authenticated
  using (hospital_id = public.nap_my_hospital());
create policy "draft formulary" on public.nap_formulary_versions for insert to authenticated
  with check (hospital_id = public.nap_my_hospital() and status = 'draft' and approved_by is null and created_by = auth.uid()
    and public.nap_my_role() in ('admin', 'anaesthetist', 'icu', 'perfusionist'));
create policy "admin approves formulary" on public.nap_formulary_versions for update to authenticated
  using (public.nap_is_admin() and hospital_id = public.nap_my_hospital())
  with check (public.nap_is_admin() and hospital_id = public.nap_my_hospital() and (status = 'draft' or approved_by = auth.uid()));
revoke update on public.nap_formulary_versions from authenticated;
grant update (status, approved_by, approved_at) on public.nap_formulary_versions to authenticated;

create policy "staff read checklists" on public.nap_checklist_versions for select to authenticated
  using (hospital_id = public.nap_my_hospital());
create policy "draft checklists" on public.nap_checklist_versions for insert to authenticated
  with check (hospital_id = public.nap_my_hospital() and status = 'draft' and approved_by is null and created_by = auth.uid()
    and public.nap_my_role() in ('admin', 'anaesthetist', 'icu', 'theatre', 'educator', 'nurse'));
create policy "admin approves checklists" on public.nap_checklist_versions for update to authenticated
  using (public.nap_is_admin() and hospital_id = public.nap_my_hospital())
  with check (public.nap_is_admin() and hospital_id = public.nap_my_hospital() and (status = 'draft' or approved_by = auth.uid()));
revoke update on public.nap_checklist_versions from authenticated;
grant update (status, approved_by, approved_at) on public.nap_checklist_versions to authenticated;

-- audit: staff write their own events; staff read their own; admins and educators read the hospital's.
create policy "write own audit" on public.nap_audit_events for insert to authenticated
  with check (user_id = auth.uid() and hospital_id = public.nap_my_hospital());
create policy "read own audit" on public.nap_audit_events for select to authenticated
  using (user_id = auth.uid());
create policy "admin reads hospital audit" on public.nap_audit_events for select to authenticated
  using (hospital_id = public.nap_my_hospital() and public.nap_my_role() in ('admin', 'educator'));
revoke update, delete, truncate on public.nap_audit_events from authenticated, anon;

-- Nothing is readable without signing in.
revoke execute on function public.nap_my_hospital(), public.nap_my_role(), public.nap_is_admin(), public.nap_own_fields_unchanged(public.nap_staff_role, boolean, uuid), public.nap_handle_new_user() from anon, public;
revoke all on public.nap_hospitals, public.nap_profiles, public.nap_staff_invites, public.nap_formulary_versions, public.nap_checklist_versions, public.nap_audit_events from anon;
