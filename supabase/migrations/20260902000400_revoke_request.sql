create or replace function public.revoke_form_request_transaction(p_request_id uuid, p_actor uuid)
returns text
language plpgsql security invoker set search_path = public, app_private, extensions as $$
declare request_status public.form_request_status;
begin
  if not exists (select 1 from public.app_users where id = p_actor and status = 'ACTIVE' and deleted_at is null) then raise exception 'forbidden'; end if;
  select status into request_status from public.form_requests where id = p_request_id for update;
  if not found then return 'NOT_FOUND'; end if;
  if request_status <> 'PENDING' then return request_status::text; end if;
  update public.form_requests set status = 'REVOKED', revoked_at = timezone('utc', now()) where id = p_request_id;
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes) values ('INTERNAL_USER', p_actor, 'revoke', 'form_request', p_request_id, '{}'::jsonb);
  return 'REVOKED';
end $$;
grant execute on function public.revoke_form_request_transaction(uuid, uuid) to service_role;
