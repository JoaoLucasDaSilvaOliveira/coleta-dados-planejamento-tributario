create or replace function public.inspect_expense_item_usage(p_item_id uuid, p_actor uuid)
returns table(reference_count bigint, can_delete boolean)
language plpgsql security definer set search_path = public, app_private, extensions as $$
declare refs bigint;
begin
  if not exists (select 1 from public.app_users where id = p_actor and status = 'ACTIVE' and deleted_at is null) then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.expense_items where id = p_item_id) then
    raise exception 'not_found';
  end if;
  select count(*) into refs from (
    select 1 from public.company_expenses where expense_item_id = p_item_id
    union all
    select 1 from public.form_request_items where expense_item_id = p_item_id
    union all
    select 1 from public.submission_items where expense_item_id = p_item_id
  ) used;
  return query select refs, refs = 0;
end $$;

create or replace function public.delete_or_deactivate_expense_item(
  p_item_id uuid,
  p_actor uuid,
  p_expected_action text default null
)
returns text
language plpgsql security definer set search_path = public, app_private, extensions as $$
declare item_row public.expense_items%rowtype; refs bigint; action text; deleted_name text;
begin
  if not exists (select 1 from public.app_users where id = p_actor and status = 'ACTIVE' and deleted_at is null) then
    raise exception 'forbidden';
  end if;
  select * into item_row from public.expense_items where id = p_item_id for update;
  if not found then raise exception 'not_found'; end if;
  select count(*) into refs from (
    select 1 from public.company_expenses where expense_item_id = p_item_id
    union all
    select 1 from public.form_request_items where expense_item_id = p_item_id
    union all
    select 1 from public.submission_items where expense_item_id = p_item_id
  ) used;
  action := case when refs = 0 then 'DELETED' else 'DEACTIVATED' end;
  if p_expected_action is not null and p_expected_action <> action then raise exception 'action_changed'; end if;
  if action = 'DELETED' then
    deleted_name := item_row.name::text;
    delete from public.expense_items where id = p_item_id;
    insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes)
      values ('INTERNAL_USER', p_actor, 'delete', 'expense_item', p_item_id, jsonb_build_object('name', deleted_name, 'mode', 'physical'));
  else
    update public.expense_items
      set is_active = false, deactivated_at = coalesce(deactivated_at, timezone('utc', now())), updated_by = p_actor
      where id = p_item_id;
    insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes)
      values ('INTERNAL_USER', p_actor, 'deactivate', 'expense_item', p_item_id, jsonb_build_object('mode', 'logical', 'referenceCount', refs));
  end if;
  return action;
end $$;

revoke all on function public.inspect_expense_item_usage(uuid, uuid) from public, anon, authenticated;
revoke all on function public.delete_or_deactivate_expense_item(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.inspect_expense_item_usage(uuid, uuid) to service_role;
grant execute on function public.delete_or_deactivate_expense_item(uuid, uuid, text) to service_role;
