drop policy if exists audit_events_select_internal on public.audit_events;

create policy audit_events_select_admin on public.audit_events
for select to authenticated
using (app_private.is_primary_admin());
