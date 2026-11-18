-- Row level security tests. Run by scripts/test-rls.sh on a throwaway server.
\set ON_ERROR_STOP 1
create or replace function pg_temp.act(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  if uid is null then set role anon; else set role authenticated; end if;
end $$;
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', what; end if;
  raise notice 'ok   %', what;
end $$;
create or replace function pg_temp.fails(sql text, what text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'ok   % (refused: %)', what, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % was allowed', what;
end $$;

-- Setup as the owner: two hospitals, an admin in A, invites.
insert into public.hospitals (id, name) values ('00000000-0000-0000-0000-00000000000a', 'Hospital A'), ('00000000-0000-0000-0000-00000000000b', 'Hospital B');
insert into auth.users (id, email) values ('10000000-0000-0000-0000-000000000001', 'admin@a.tz');
update public.profiles set hospital_id = '00000000-0000-0000-0000-00000000000a', role = 'admin', approved = true where id = '10000000-0000-0000-0000-000000000001';
insert into auth.users (id, email) values ('20000000-0000-0000-0000-000000000001', 'admin@b.tz');
update public.profiles set hospital_id = '00000000-0000-0000-0000-00000000000b', role = 'admin', approved = true where id = '20000000-0000-0000-0000-000000000001';

-- Admin A invites a nurse.
select pg_temp.act('10000000-0000-0000-0000-000000000001');
insert into public.staff_invites (hospital_id, email, role) values ('00000000-0000-0000-0000-00000000000a', 'nurse@a.tz', 'nurse');
select pg_temp.fails($$insert into public.staff_invites (hospital_id, email, role) values ('00000000-0000-0000-0000-00000000000b', 'x@b.tz', 'admin')$$, 'admin A cannot invite into hospital B');
reset role;

-- Sign-ups: the invited nurse is linked and approved; a stranger is not, even if they ask for admin.
insert into auth.users (id, email, raw_user_meta_data) values ('10000000-0000-0000-0000-000000000002', 'Nurse@A.tz', '{"full_name":"Nurse One"}');
insert into auth.users (id, email, raw_user_meta_data) values ('30000000-0000-0000-0000-000000000001', 'someone@x.tz', '{"role":"admin"}');
select pg_temp.ok((select approved and role = 'nurse' and hospital_id = '00000000-0000-0000-0000-00000000000a' from public.profiles where id = '10000000-0000-0000-0000-000000000002'), 'invited nurse is linked to hospital A and approved');
select pg_temp.ok((select not approved and hospital_id is null and role = 'nurse' from public.profiles where id = '30000000-0000-0000-0000-000000000001'), 'uninvited sign-up has no hospital and is not approved');

-- Nurse A
select pg_temp.act('10000000-0000-0000-0000-000000000002');
select pg_temp.ok((select count(*) from public.hospitals) = 1, 'nurse sees only her hospital');
select pg_temp.ok((select count(*) from public.profiles) = 1, 'nurse sees only her own profile');
update public.profiles set full_name = 'Nurse 1' where id = auth.uid();
select pg_temp.ok((select full_name from public.profiles where id = auth.uid()) = 'Nurse 1', 'nurse can change her own name');
select pg_temp.fails($$update public.profiles set role = 'admin' where id = auth.uid()$$, 'nurse cannot make herself admin');
select pg_temp.fails($$update public.profiles set approved = false, full_name = 'x' where id = auth.uid()$$, 'nurse cannot change her own approval');
select pg_temp.fails($$update public.profiles set hospital_id = '00000000-0000-0000-0000-00000000000b' where id = auth.uid()$$, 'nurse cannot move hospital');
select pg_temp.fails($$insert into public.formulary_versions (hospital_id, version, data) values ('00000000-0000-0000-0000-00000000000a', 1, '{}')$$, 'nurse cannot draft the formulary');
insert into public.checklist_versions (hospital_id, checklist_key, version, data) values ('00000000-0000-0000-0000-00000000000a', 'vap', '1', '{"title":"VAP bundle"}');
select pg_temp.fails($$insert into public.checklist_versions (hospital_id, checklist_key, version, data, status) values ('00000000-0000-0000-0000-00000000000a', 'cauti', '1', '{}', 'approved')$$, 'nurse cannot insert an approved checklist');
update public.checklist_versions set status = 'approved' where checklist_key = 'vap';
select pg_temp.ok((select status from public.checklist_versions where checklist_key = 'vap') = 'draft', 'nurse cannot approve a checklist (still draft)');
insert into public.audit_events (hospital_id, type, summary) values ('00000000-0000-0000-0000-00000000000a', 'calc', 'Infusion 5.25 mL/h');
select pg_temp.fails($$insert into public.audit_events (hospital_id, user_id, type, summary) values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'calc', 'forged')$$, 'nurse cannot write audit as someone else');
select pg_temp.fails($$update public.audit_events set summary = 'changed'$$, 'audit events cannot be edited');
select pg_temp.fails($$delete from public.audit_events$$, 'audit events cannot be deleted');
select pg_temp.fails($$insert into public.staff_invites (hospital_id, email, role) values ('00000000-0000-0000-0000-00000000000a', 'y@a.tz', 'admin')$$, 'nurse cannot invite');
reset role;

-- Admin A approves the checklist and sees hospital audit; cannot see hospital B.
select pg_temp.act('10000000-0000-0000-0000-000000000001');
update public.checklist_versions set status = 'approved', approved_by = auth.uid(), approved_at = now() where checklist_key = 'vap';
select pg_temp.ok((select status from public.checklist_versions where checklist_key = 'vap') = 'approved', 'admin approves the checklist');
select pg_temp.fails($$update public.checklist_versions set data = '{}'$$, 'approved content cannot be edited in place');
select pg_temp.ok((select count(*) from public.audit_events) = 1, 'admin reads the hospital audit log');
select pg_temp.ok((select count(*) from public.profiles) = 2, 'admin sees the 2 staff of hospital A');
insert into public.formulary_versions (hospital_id, version, data) values ('00000000-0000-0000-0000-00000000000a', 1, '{"drugs":[]}');
reset role;

-- Admin B sees nothing of hospital A.
select pg_temp.act('20000000-0000-0000-0000-000000000001');
select pg_temp.ok((select count(*) from public.checklist_versions) = 0, 'hospital B cannot read hospital A checklists');
select pg_temp.ok((select count(*) from public.formulary_versions) = 0, 'hospital B cannot read hospital A formulary');
select pg_temp.ok((select count(*) from public.audit_events) = 0, 'hospital B cannot read hospital A audit');
update public.profiles set approved = false where id = '10000000-0000-0000-0000-000000000002';
reset role;
select pg_temp.ok((select approved from public.profiles where id = '10000000-0000-0000-0000-000000000002'), 'hospital B admin could not change a hospital A nurse');

-- Uninvited user and anonymous: nothing.
select pg_temp.act('30000000-0000-0000-0000-000000000001');
select pg_temp.ok((select count(*) from public.hospitals) = 0 and (select count(*) from public.checklist_versions) = 0, 'unapproved user sees no hospital content');
select pg_temp.fails($$insert into public.audit_events (hospital_id, type, summary) values ('00000000-0000-0000-0000-00000000000a', 'x', 'y')$$, 'unapproved user cannot write audit');
reset role;
select pg_temp.act(null);
select pg_temp.fails($$select * from public.profiles$$, 'anonymous cannot read profiles');
reset role;
\echo All RLS tests passed.
