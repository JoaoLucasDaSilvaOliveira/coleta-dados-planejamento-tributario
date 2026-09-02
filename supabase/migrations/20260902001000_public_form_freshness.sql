alter table public.form_request_items
  add column initial_updated_at timestamptz;

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
  insert into public.form_request_items(form_request_id, expense_item_id, initial_amount, initial_note, initial_updated_at, sort_order)
    select new_request, ce.expense_item_id, ce.current_amount, ce.current_note, ce.updated_at, ei.sort_order
    from public.company_expenses ce
    join public.expense_items ei on ei.id = ce.expense_item_id
    where ce.company_id = p_company_id and ce.is_selected and ei.is_active
    order by ei.sort_order, ei.id;
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes) values ('INTERNAL_USER', p_actor, 'create', 'form_request', new_request, jsonb_build_object('companyId', p_company_id));
  return query select new_request, expiry;
end $$;

create or replace function public.submit_form_transaction(p_token_digest text, p_payload jsonb)
returns text
language plpgsql security invoker set search_path = public, app_private, extensions as $$
declare req public.form_requests%rowtype; sub_id uuid; content public.form_content%rowtype; invalid_count integer; duplicate_count integer;
begin
  select * into req from public.form_requests where token_digest = p_token_digest for update;
  if not found then return 'INVALID'; end if;
  if req.status = 'PENDING' and req.expires_at <= timezone('utc', now()) then update public.form_requests set status = 'EXPIRED' where id = req.id; return 'EXPIRED'; end if;
  if req.status = 'REVOKED' then return 'REVOKED'; end if;
  if req.status = 'SUBMITTED' then return 'USED'; end if;
  if req.status <> 'PENDING' then return 'INVALID'; end if;
  select count(*) - count(distinct expense_item_id) into duplicate_count
  from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text, base_updated_at timestamptz);
  if duplicate_count > 0 then raise exception 'duplicate_item'; end if;
  select count(*) into invalid_count
  from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text, base_updated_at timestamptz)
  left join public.form_request_items fri on fri.form_request_id = req.id and fri.expense_item_id = x.expense_item_id
  left join public.expense_items ei on ei.id = x.expense_item_id
  where fri.expense_item_id is null or ei.is_active is false;
  if invalid_count > 0 then raise exception 'invalid_item'; end if;
  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text, base_updated_at timestamptz)
    where x.amount is not null and (x.amount !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$' or x.amount::numeric < 0 or x.amount::numeric > 999999999999.99)
  ) then raise exception 'invalid_amount'; end if;
  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text, base_updated_at timestamptz)
    where x.note is not null and char_length(x.note) > 1000
  ) then raise exception 'invalid_note'; end if;
  select * into content from public.form_content where id = true;
  insert into public.form_submissions(form_request_id, company_id, content_snapshot)
    values (req.id, req.company_id, jsonb_build_object('title', content.title, 'introduction', content.introduction, 'ibsCbsGuidance', content.ibs_cbs_guidance, 'taxNotice', content.tax_notice, 'successMessage', content.success_message))
    returning id into sub_id;
  insert into public.submission_items(submission_id, expense_item_id, amount, note)
    select sub_id, x.expense_item_id, nullif(x.amount, '')::numeric, nullif(x.note, '')
    from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text, base_updated_at timestamptz);
  perform 1 from public.companies where id = req.company_id for update;
  update public.company_expenses ce
    set current_amount = si.amount, current_note = si.note, updated_by = null, updated_from_submission_id = sub_id
    from public.submission_items si
    join jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text, base_updated_at timestamptz)
      on x.expense_item_id = si.expense_item_id
    where si.submission_id = sub_id
      and ce.company_id = req.company_id
      and ce.expense_item_id = si.expense_item_id
      and (x.base_updated_at is null or ce.updated_at = x.base_updated_at);
  update public.form_requests set status = 'SUBMITTED', submitted_at = timezone('utc', now()) where id = req.id;
  insert into public.audit_events(actor_type, action, entity_type, entity_id, changes) values ('RESPONDENT', 'submit', 'form_submission', sub_id, jsonb_build_object('formRequestId', req.id));
  return 'SUBMITTED';
end $$;

