-- Events recorded offline keep the time they happened on the device
-- (occurred_at) and a device-made id, so a retried upload is not stored twice.
-- The server's own receipt time (at) cannot be set by the client.
alter table public.nap_audit_events
  add column occurred_at timestamptz,
  add column client_id uuid;
create unique index nap_audit_events_client on public.nap_audit_events (user_id, client_id) where client_id is not null;
revoke insert on public.nap_audit_events from authenticated;
grant insert (hospital_id, user_id, type, summary, occurred_at, client_id) on public.nap_audit_events to authenticated;
