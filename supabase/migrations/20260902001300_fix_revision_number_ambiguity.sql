create or replace function public.create_submission_revision_transaction(
  p_submission_id uuid,
  p_actor uuid,
  p_payload jsonb
)
returns uuid
language plpgsql security definer set search_path = public, app_private, extensions as $$
declare
  submission_row public.form_submissions%rowtype;
  revision_id uuid;
  next_revision_number integer;
  invalid_count integer;
  duplicate_count integer;
begin
  if not exists (
    select 1 from public.app_users
    where id = p_actor and status = 'ACTIVE' and deleted_at is null
  ) then raise exception 'forbidden'; end if;
  select * into submission_row from public.form_submissions where id = p_submission_id for update;
  if not found then raise exception 'submission_not_found'; end if;
  if jsonb_typeof(p_payload->'items') is distinct from 'array'
    or coalesce(jsonb_array_length(p_payload->'items'), 0) = 0
    or coalesce(jsonb_array_length(p_payload->'items'), 0) > 100 then raise exception 'invalid_items'; end if;
  select count(*) - count(distinct expense_item_id) into duplicate_count
  from jsonb_to_recordset(p_payload->'items') as x(expense_item_id uuid, amount text, note text);
  if duplicate_count > 0 then raise exception 'duplicate_item'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_payload->'items') as x(expense_item_id uuid, amount text, note text)
    where x.amount is not null and (
      x.amount !~ '^(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$'
      or x.amount::numeric > 999999999999.99
    )
  ) then raise exception 'invalid_amount'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_payload->'items') as x(expense_item_id uuid, amount text, note text)
    where x.note is not null and char_length(x.note) > 1000
  ) then raise exception 'invalid_note'; end if;
  select count(*) into invalid_count
  from jsonb_to_recordset(p_payload->'items') as x(expense_item_id uuid, amount text, note text)
  left join public.submission_items si
    on si.submission_id = p_submission_id and si.expense_item_id = x.expense_item_id
  where si.expense_item_id is null;
  if invalid_count > 0 then raise exception 'invalid_item'; end if;

  select coalesce(max(sr.revision_number), 0) + 1 into next_revision_number
  from public.submission_revisions sr
  where sr.submission_id = p_submission_id;
  insert into public.submission_revisions(submission_id, revision_number, created_by)
    values (p_submission_id, next_revision_number, p_actor) returning id into revision_id;
  insert into public.submission_revision_items(revision_id, expense_item_id, amount, note)
    select revision_id, x.expense_item_id, nullif(x.amount, '')::numeric, nullif(x.note, '')
    from jsonb_to_recordset(p_payload->'items') as x(expense_item_id uuid, amount text, note text);
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes)
  values ('INTERNAL_USER', p_actor, 'revise', 'form_submission', p_submission_id,
    jsonb_build_object('revisionId', revision_id, 'revisionNumber', next_revision_number));
  return revision_id;
end $$;
