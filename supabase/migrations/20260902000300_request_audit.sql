create or replace function public.create_form_request_transaction(p_company_id uuid, p_token_digest text, p_actor uuid)
returns table(request_id uuid, expires_at timestamptz)
language plpgsql security invoker set search_path = public, app_private, extensions as $$
declare locked_company uuid; new_request uuid; expiry timestamptz;
begin
  if not exists (select 1 from public.app_users where id = p_actor and status = 'ACTIVE' and deleted_at is null) then raise exception 'forbidden'; end if;
  select id into locked_company from public.companies where id = p_company_id for update;
  if locked_company is null then raise exception 'company_not_found'; end if;
  if not exists (select 1 from public.company_expenses ce join public.expense_items ei on ei.id = ce.expense_item_id where ce.company_id = p_company_id and ce.is_selected and ei.is_active) then raise exception 'no_selected_expenses'; end if;
  with revoked as (update public.form_requests set status = 'REVOKED', revoked_at = timezone('utc', now()) where company_id = p_company_id and status = 'PENDING' returning id)
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes)
    select 'INTERNAL_USER', p_actor, 'revoke', 'form_request', id, jsonb_build_object('companyId', p_company_id) from revoked;
  expiry := timezone('utc', now()) + interval '30 days';
  insert into public.form_requests(company_id, token_digest, expires_at, created_by) values (p_company_id, p_token_digest, expiry, p_actor) returning id into new_request;
  insert into public.form_request_items(form_request_id, expense_item_id, initial_amount, initial_note, sort_order)
    select new_request, ce.expense_item_id, ce.current_amount, ce.current_note, ei.sort_order from public.company_expenses ce join public.expense_items ei on ei.id = ce.expense_item_id where ce.company_id = p_company_id and ce.is_selected and ei.is_active order by ei.sort_order, ei.id;
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes) values ('INTERNAL_USER', p_actor, 'create', 'form_request', new_request, jsonb_build_object('companyId', p_company_id));
  return query select new_request, expiry;
end $$;
