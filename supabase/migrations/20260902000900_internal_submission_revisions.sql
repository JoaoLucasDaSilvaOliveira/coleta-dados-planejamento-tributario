create type public.submission_source as enum ('PUBLIC_LINK', 'INTERNAL');

alter table public.form_submissions
  alter column form_request_id drop not null;

alter table public.form_submissions
  add column source public.submission_source not null default 'PUBLIC_LINK',
  add column created_by uuid references public.app_users(id);

alter table public.form_submissions
  add constraint form_submissions_source_consistency check (
    (source = 'PUBLIC_LINK' and form_request_id is not null and created_by is null)
    or (source = 'INTERNAL' and form_request_id is null and created_by is not null)
  );

create table public.submission_revisions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id),
  revision_number integer not null check (revision_number > 0),
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (submission_id, revision_number)
);

create table public.submission_revision_items (
  revision_id uuid not null references public.submission_revisions(id),
  expense_item_id uuid not null references public.expense_items(id),
  amount numeric(14,2),
  note text,
  primary key (revision_id, expense_item_id),
  constraint submission_revision_items_amount_range check (
    amount is null or amount between 0 and 999999999999.99
  ),
  constraint submission_revision_items_note_length check (note is null or char_length(note) <= 1000)
);

create index submission_revisions_submission_idx
  on public.submission_revisions (submission_id, revision_number desc);
create index submission_revision_items_expense_idx
  on public.submission_revision_items (expense_item_id);

create trigger history_submission_revisions_immutable
before update or delete on public.submission_revisions
for each row execute function app_private.block_history_mutation();
create trigger history_submission_revision_items_immutable
before update or delete on public.submission_revision_items
for each row execute function app_private.block_history_mutation();

grant select on public.submission_revisions, public.submission_revision_items to authenticated;

alter table public.submission_revisions enable row level security;
alter table public.submission_revision_items enable row level security;

create policy submission_revisions_select_internal on public.submission_revisions
for select to authenticated using (app_private.current_app_user_id() is not null);
create policy submission_revision_items_select_internal on public.submission_revision_items
for select to authenticated using (app_private.current_app_user_id() is not null);

create or replace function public.create_internal_submission_transaction(
  p_company_id uuid,
  p_actor uuid,
  p_payload jsonb
)
returns uuid
language plpgsql security definer set search_path = public, app_private, extensions as $$
declare
  sub_id uuid;
  content public.form_content%rowtype;
  invalid_count integer;
  duplicate_count integer;
begin
  if not exists (
    select 1 from public.app_users
    where id = p_actor and status = 'ACTIVE' and deleted_at is null
  ) then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'company_not_found';
  end if;
  perform 1 from public.companies where id = p_company_id for update;
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
  left join public.company_expenses ce
    on ce.company_id = p_company_id and ce.expense_item_id = x.expense_item_id
  left join public.expense_items ei on ei.id = x.expense_item_id
  where ce.expense_item_id is null
    or ei.id is null
    or (ei.is_active and not ce.is_selected)
    or (not ei.is_active and coalesce(nullif(x.amount, '')::numeric, 0) = 0);
  if invalid_count > 0 then raise exception 'invalid_item'; end if;

  select * into content from public.form_content where id = true;
  insert into public.form_submissions(company_id, content_snapshot, source, created_by)
  values (
    p_company_id,
    jsonb_build_object(
      'title', content.title,
      'introduction', content.introduction,
      'ibsCbsGuidance', content.ibs_cbs_guidance,
      'taxNotice', content.tax_notice,
      'successMessage', content.success_message
    ),
    'INTERNAL',
    p_actor
  ) returning id into sub_id;
  insert into public.submission_items(submission_id, expense_item_id, amount, note)
    select sub_id, x.expense_item_id, nullif(x.amount, '')::numeric, nullif(x.note, '')
    from jsonb_to_recordset(p_payload->'items') as x(expense_item_id uuid, amount text, note text);
  update public.company_expenses ce
    set current_amount = si.amount,
        current_note = si.note,
        updated_by = p_actor,
        updated_from_submission_id = sub_id
    from public.submission_items si
    where si.submission_id = sub_id
      and ce.company_id = p_company_id
      and ce.expense_item_id = si.expense_item_id;
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes)
  values ('INTERNAL_USER', p_actor, 'create', 'form_submission', sub_id,
    jsonb_build_object('source', 'INTERNAL', 'companyId', p_company_id));
  return sub_id;
end $$;

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
  revision_number integer;
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

  select coalesce(max(revision_number), 0) + 1 into revision_number
  from public.submission_revisions where submission_id = p_submission_id;
  insert into public.submission_revisions(submission_id, revision_number, created_by)
    values (p_submission_id, revision_number, p_actor) returning id into revision_id;
  insert into public.submission_revision_items(revision_id, expense_item_id, amount, note)
    select revision_id, x.expense_item_id, nullif(x.amount, '')::numeric, nullif(x.note, '')
    from jsonb_to_recordset(p_payload->'items') as x(expense_item_id uuid, amount text, note text);
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes)
  values ('INTERNAL_USER', p_actor, 'revise', 'form_submission', p_submission_id,
    jsonb_build_object('revisionId', revision_id, 'revisionNumber', revision_number));
  return revision_id;
end $$;

create or replace function public.import_submission_transaction(
  p_submission_id uuid,
  p_revision_id uuid,
  p_actor uuid
)
returns text
language plpgsql security definer set search_path = public, app_private, extensions as $$
declare
  submission_row public.form_submissions%rowtype;
  revision_submission_id uuid;
begin
  if not exists (
    select 1 from public.app_users
    where id = p_actor and status = 'ACTIVE' and deleted_at is null
  ) then raise exception 'forbidden'; end if;
  select * into submission_row from public.form_submissions where id = p_submission_id for update;
  if not found then raise exception 'submission_not_found'; end if;
  if p_revision_id is not null then
    select submission_id into revision_submission_id
    from public.submission_revisions where id = p_revision_id;
    if revision_submission_id is distinct from p_submission_id then raise exception 'revision_not_found'; end if;
  end if;
  perform 1 from public.companies where id = submission_row.company_id for update;
  if p_revision_id is null then
    update public.company_expenses ce
      set current_amount = si.amount,
          current_note = si.note,
          updated_by = p_actor,
          updated_from_submission_id = p_submission_id
      from public.submission_items si
      where si.submission_id = p_submission_id
        and ce.company_id = submission_row.company_id
        and ce.expense_item_id = si.expense_item_id;
  else
    update public.company_expenses ce
      set current_amount = sri.amount,
          current_note = sri.note,
          updated_by = p_actor,
          updated_from_submission_id = p_submission_id
      from public.submission_revision_items sri
      where sri.revision_id = p_revision_id
        and ce.company_id = submission_row.company_id
        and ce.expense_item_id = sri.expense_item_id;
  end if;
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes)
  values ('INTERNAL_USER', p_actor, 'import', 'form_submission', p_submission_id,
    jsonb_build_object('revisionId', p_revision_id));
  return 'IMPORTED';
end $$;

revoke all on function public.create_internal_submission_transaction(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.create_submission_revision_transaction(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.import_submission_transaction(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_internal_submission_transaction(uuid, uuid, jsonb) to service_role;
grant execute on function public.create_submission_revision_transaction(uuid, uuid, jsonb) to service_role;
grant execute on function public.import_submission_transaction(uuid, uuid, uuid) to service_role;
