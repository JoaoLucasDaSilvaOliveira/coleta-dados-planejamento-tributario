create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.app_user_role as enum ('ADMIN', 'USER');
create type public.app_user_status as enum ('ACTIVE', 'INACTIVE', 'DELETED');
create type public.form_request_status as enum ('PENDING', 'SUBMITTED', 'EXPIRED', 'REVOKED');
create type public.audit_actor_type as enum ('INTERNAL_USER', 'RESPONDENT', 'SYSTEM');

create schema if not exists app_private;

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  username extensions.citext not null unique,
  display_name text not null,
  role public.app_user_role not null default 'USER',
  status public.app_user_status not null default 'ACTIVE',
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint app_users_username_format check (username::text ~ '^[a-z0-9._-]{3,40}$'),
  constraint app_users_display_name_length check (char_length(btrim(display_name)) between 2 and 100),
  constraint app_users_deleted_consistency check ((status = 'DELETED') = (auth_user_id is null and deleted_at is not null)),
  constraint app_users_active_identity check (status <> 'ACTIVE' or auth_user_id is not null)
);

create unique index app_users_one_primary_admin_idx on public.app_users (role) where role = 'ADMIN' and status <> 'DELETED';

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  nickname text,
  cnpj varchar(14) not null unique,
  created_by uuid not null references public.app_users(id),
  updated_by uuid not null references public.app_users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint companies_legal_name_length check (char_length(btrim(legal_name)) between 2 and 160),
  constraint companies_nickname_length check (nickname is null or char_length(btrim(nickname)) between 1 and 100),
  constraint companies_cnpj_format check (cnpj ~ '^[0-9]{14}$')
);

create table public.expense_items (
  id uuid primary key default gen_random_uuid(),
  name extensions.citext not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deactivated_at timestamptz,
  constraint expense_items_name_length check (char_length(btrim(name::text)) between 2 and 160),
  constraint expense_items_sort_order check (sort_order >= 0),
  constraint expense_items_active_consistency check ((is_active and deactivated_at is null) or (not is_active and deactivated_at is not null))
);
create unique index expense_items_active_name_idx on public.expense_items (lower(btrim(name::text))) where is_active;
create index expense_items_sort_idx on public.expense_items (sort_order, id);

create table public.company_expenses (
  company_id uuid not null references public.companies(id),
  expense_item_id uuid not null references public.expense_items(id),
  is_selected boolean not null default false,
  current_amount numeric(14,2),
  current_note text,
  updated_by uuid references public.app_users(id) on delete set null,
  updated_from_submission_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (company_id, expense_item_id),
  constraint company_expenses_amount_range check (current_amount is null or current_amount between 0 and 999999999999.99),
  constraint company_expenses_note_length check (current_note is null or char_length(current_note) <= 1000)
);
create index company_expenses_company_selected_idx on public.company_expenses (company_id, is_selected);

create table public.form_content (
  id boolean primary key default true check (id),
  title text not null,
  introduction text not null,
  ibs_cbs_guidance text not null,
  tax_notice text not null,
  success_message text not null,
  updated_by uuid references public.app_users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint form_content_text_length check (char_length(title) between 1 and 10000 and char_length(introduction) between 1 and 10000 and char_length(ibs_cbs_guidance) between 1 and 10000 and char_length(tax_notice) between 1 and 10000 and char_length(success_message) between 1 and 10000)
);

create table public.form_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  token_digest char(64) not null unique,
  status public.form_request_status not null default 'PENDING',
  expires_at timestamptz not null,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  revoked_at timestamptz,
  constraint form_requests_digest_format check (token_digest ~ '^[a-f0-9]{64}$'),
  constraint form_requests_expiration check (expires_at = created_at + interval '30 days'),
  constraint form_requests_status_dates check ((status = 'PENDING' and submitted_at is null and revoked_at is null) or (status = 'SUBMITTED' and submitted_at is not null and revoked_at is null) or (status = 'EXPIRED' and submitted_at is null and revoked_at is null) or (status = 'REVOKED' and submitted_at is null and revoked_at is not null))
);
create unique index form_requests_one_pending_per_company_idx on public.form_requests(company_id) where status = 'PENDING';
create index form_requests_company_created_idx on public.form_requests(company_id, created_at desc);

create table public.form_request_items (
  form_request_id uuid not null references public.form_requests(id),
  expense_item_id uuid not null references public.expense_items(id),
  initial_amount numeric(14,2),
  initial_note text,
  sort_order integer not null,
  primary key (form_request_id, expense_item_id),
  constraint form_request_items_amount_range check (initial_amount is null or initial_amount between 0 and 999999999999.99),
  constraint form_request_items_note_length check (initial_note is null or char_length(initial_note) <= 1000)
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_request_id uuid not null unique references public.form_requests(id),
  company_id uuid not null references public.companies(id),
  submitted_at timestamptz not null default timezone('utc', now()),
  content_snapshot jsonb not null
);

create table public.submission_items (
  submission_id uuid not null references public.form_submissions(id),
  expense_item_id uuid not null references public.expense_items(id),
  amount numeric(14,2),
  note text,
  primary key (submission_id, expense_item_id),
  constraint submission_items_amount_range check (amount is null or amount between 0 and 999999999999.99),
  constraint submission_items_note_length check (note is null or char_length(note) <= 1000)
);
alter table public.company_expenses add constraint company_expenses_submission_fk foreign key (updated_from_submission_id) references public.form_submissions(id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type public.audit_actor_type not null,
  actor_app_user_id uuid references public.app_users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes jsonb not null default '{}'::jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now())
);
create index audit_events_created_idx on public.audit_events(created_at desc, id desc);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

create or replace function app_private.set_updated_at()
returns trigger language plpgsql set search_path = app_private, public, extensions as $$
begin new.updated_at = timezone('utc', now()); return new; end $$;

create or replace function app_private.current_app_user_id()
returns uuid language sql stable security definer set search_path = app_private, public, auth, extensions as $$
  select id from public.app_users where auth_user_id = (select auth.uid()) and status = 'ACTIVE' and deleted_at is null limit 1
$$;

create or replace function app_private.is_primary_admin()
returns boolean language sql stable security definer set search_path = app_private, public, auth, extensions as $$
  select exists (select 1 from public.app_users where id = app_private.current_app_user_id() and role = 'ADMIN' and status = 'ACTIVE')
$$;

create or replace function app_private.audit_row_change()
returns trigger language plpgsql security definer set search_path = app_private, public, extensions as $$
declare actor uuid := app_private.current_app_user_id(); entity_id_text text := to_jsonb(new)->>'id';
begin
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes)
  values ('INTERNAL_USER', actor, lower(TG_OP), TG_TABLE_NAME, case when entity_id_text ~ '^[0-9a-fA-F-]{36}$' then entity_id_text::uuid end, jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)));
  return new;
end $$;

create or replace function app_private.block_history_mutation()
returns trigger language plpgsql set search_path = app_private, public as $$
begin raise exception 'immutable_history'; end $$;

create trigger app_users_updated_at before update on public.app_users for each row execute function app_private.set_updated_at();
create trigger companies_updated_at before update on public.companies for each row execute function app_private.set_updated_at();
create trigger expense_items_updated_at before update on public.expense_items for each row execute function app_private.set_updated_at();
create trigger company_expenses_updated_at before update on public.company_expenses for each row execute function app_private.set_updated_at();
create trigger form_content_updated_at before update on public.form_content for each row execute function app_private.set_updated_at();
create trigger audit_companies after insert or update on public.companies for each row execute function app_private.audit_row_change();
create trigger audit_expense_items after insert or update on public.expense_items for each row execute function app_private.audit_row_change();
create trigger audit_company_expenses after insert or update on public.company_expenses for each row execute function app_private.audit_row_change();
create trigger audit_form_content after update on public.form_content for each row execute function app_private.audit_row_change();
create trigger history_form_submissions_immutable before update or delete on public.form_submissions for each row execute function app_private.block_history_mutation();
create trigger history_submission_items_immutable before update or delete on public.submission_items for each row execute function app_private.block_history_mutation();
create trigger history_audit_immutable before update or delete on public.audit_events for each row execute function app_private.block_history_mutation();

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

create or replace function public.submit_form_transaction(p_token_digest text, p_payload jsonb)
returns text
language plpgsql security invoker set search_path = public, app_private, extensions as $$
declare req public.form_requests%rowtype; sub_id uuid; content public.form_content%rowtype; invalid_count integer; duplicate_count integer; locked_company uuid;
begin
  select * into req from public.form_requests where token_digest = p_token_digest for update;
  if not found then return 'INVALID'; end if;
  if req.status = 'PENDING' and req.expires_at <= timezone('utc', now()) then update public.form_requests set status = 'EXPIRED' where id = req.id; return 'EXPIRED'; end if;
  if req.status = 'REVOKED' then return 'REVOKED'; end if;
  if req.status = 'SUBMITTED' then return 'USED'; end if;
  if req.status <> 'PENDING' then return 'INVALID'; end if;
  select count(*) - count(distinct expense_item_id) into duplicate_count from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text);
  if duplicate_count > 0 then raise exception 'duplicate_item'; end if;
  select count(*) into invalid_count from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text) left join public.form_request_items fri on fri.form_request_id = req.id and fri.expense_item_id = x.expense_item_id left join public.expense_items ei on ei.id = x.expense_item_id where fri.expense_item_id is null or ei.is_active is false;
  if invalid_count > 0 then raise exception 'invalid_item'; end if;
  if exists (select 1 from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text) where x.amount is not null and (x.amount !~ '^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$' or x.amount::numeric < 0 or x.amount::numeric > 999999999999.99)) then raise exception 'invalid_amount'; end if;
  if exists (select 1 from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text) where x.note is not null and char_length(x.note) > 1000) then raise exception 'invalid_note'; end if;
  select * into content from public.form_content where id = true;
  insert into public.form_submissions(form_request_id, company_id, content_snapshot) values (req.id, req.company_id, jsonb_build_object('title', content.title, 'introduction', content.introduction, 'ibsCbsGuidance', content.ibs_cbs_guidance, 'taxNotice', content.tax_notice, 'successMessage', content.success_message)) returning id into sub_id;
  insert into public.submission_items(submission_id, expense_item_id, amount, note) select sub_id, x.expense_item_id, nullif(x.amount, '')::numeric, nullif(x.note, '') from jsonb_to_recordset(coalesce(p_payload->'items', '[]'::jsonb)) as x(expense_item_id uuid, amount text, note text);
  update public.company_expenses ce set current_amount = si.amount, current_note = si.note, updated_by = null, updated_from_submission_id = sub_id from public.submission_items si where si.submission_id = sub_id and ce.company_id = req.company_id and ce.expense_item_id = si.expense_item_id;
  update public.form_requests set status = 'SUBMITTED', submitted_at = timezone('utc', now()) where id = req.id;
  insert into public.audit_events(actor_type, action, entity_type, entity_id, changes) values ('RESPONDENT', 'submit', 'form_submission', sub_id, jsonb_build_object('formRequestId', req.id));
  return 'SUBMITTED';
end $$;

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

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;
grant execute on function app_private.current_app_user_id() to authenticated;
grant execute on function app_private.is_primary_admin() to authenticated;
grant execute on function public.create_form_request_transaction(uuid, text, uuid) to service_role;
grant execute on function public.submit_form_transaction(text, jsonb) to service_role;
grant execute on function public.revoke_form_request_transaction(uuid, uuid) to service_role;
grant select on public.app_users, public.companies, public.expense_items, public.company_expenses, public.form_content, public.form_requests, public.form_request_items, public.form_submissions, public.submission_items, public.audit_events to authenticated;
grant insert, update on public.companies, public.expense_items, public.company_expenses, public.form_content to authenticated;

alter table public.app_users enable row level security;
alter table public.companies enable row level security;
alter table public.expense_items enable row level security;
alter table public.company_expenses enable row level security;
alter table public.form_content enable row level security;
alter table public.form_requests enable row level security;
alter table public.form_request_items enable row level security;
alter table public.form_submissions enable row level security;
alter table public.submission_items enable row level security;
alter table public.audit_events enable row level security;

create policy app_users_select_active on public.app_users for select to authenticated using (app_private.current_app_user_id() is not null);
create policy companies_select_internal on public.companies for select to authenticated using (app_private.current_app_user_id() is not null);
create policy companies_insert_internal on public.companies for insert to authenticated with check (app_private.current_app_user_id() = created_by and app_private.current_app_user_id() is not null);
create policy companies_update_internal on public.companies for update to authenticated using (app_private.current_app_user_id() is not null) with check (app_private.current_app_user_id() is not null and app_private.current_app_user_id() = updated_by);
create policy expense_items_select_internal on public.expense_items for select to authenticated using (app_private.current_app_user_id() is not null);
create policy expense_items_insert_internal on public.expense_items for insert to authenticated with check (app_private.current_app_user_id() = created_by and app_private.current_app_user_id() is not null);
create policy expense_items_update_internal on public.expense_items for update to authenticated using (app_private.current_app_user_id() is not null) with check (app_private.current_app_user_id() = updated_by);
create policy company_expenses_select_internal on public.company_expenses for select to authenticated using (app_private.current_app_user_id() is not null);
create policy company_expenses_insert_internal on public.company_expenses for insert to authenticated with check (app_private.current_app_user_id() is not null);
create policy company_expenses_update_internal on public.company_expenses for update to authenticated using (app_private.current_app_user_id() is not null) with check (app_private.current_app_user_id() = updated_by);
create policy form_content_select_internal on public.form_content for select to authenticated using (app_private.current_app_user_id() is not null);
create policy form_content_update_internal on public.form_content for update to authenticated using (app_private.current_app_user_id() is not null) with check (app_private.current_app_user_id() is not null);
create policy form_requests_select_internal on public.form_requests for select to authenticated using (app_private.current_app_user_id() is not null);
create policy form_request_items_select_internal on public.form_request_items for select to authenticated using (app_private.current_app_user_id() is not null);
create policy form_submissions_select_internal on public.form_submissions for select to authenticated using (app_private.current_app_user_id() is not null);
create policy submission_items_select_internal on public.submission_items for select to authenticated using (app_private.current_app_user_id() is not null);
create policy audit_events_select_internal on public.audit_events for select to authenticated using (app_private.current_app_user_id() is not null);
