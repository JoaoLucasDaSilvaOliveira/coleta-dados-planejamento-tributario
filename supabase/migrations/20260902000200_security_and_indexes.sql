create index app_users_created_by_idx on public.app_users(created_by) where created_by is not null;
create index companies_created_by_idx on public.companies(created_by);
create index companies_updated_by_idx on public.companies(updated_by);
create index expense_items_created_by_idx on public.expense_items(created_by) where created_by is not null;
create index expense_items_updated_by_idx on public.expense_items(updated_by) where updated_by is not null;
create index company_expenses_expense_item_idx on public.company_expenses(expense_item_id);
create index company_expenses_updated_by_idx on public.company_expenses(updated_by) where updated_by is not null;
create index company_expenses_submission_idx on public.company_expenses(updated_from_submission_id) where updated_from_submission_id is not null;
create index form_content_updated_by_idx on public.form_content(updated_by) where updated_by is not null;
create index form_requests_created_by_idx on public.form_requests(created_by);
create index form_request_items_expense_item_idx on public.form_request_items(expense_item_id);
create index form_submissions_company_idx on public.form_submissions(company_id, submitted_at desc);
create index submission_items_expense_item_idx on public.submission_items(expense_item_id);
create index audit_events_actor_idx on public.audit_events(actor_app_user_id, created_at desc) where actor_app_user_id is not null;

create or replace function app_private.audit_row_change()
returns trigger language plpgsql security definer set search_path = app_private, public, extensions as $$
declare actor uuid := app_private.current_app_user_id(); entity_id_text text := to_jsonb(new)->>'id';
begin
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes)
  values (case when actor is null then 'SYSTEM'::public.audit_actor_type else 'INTERNAL_USER'::public.audit_actor_type end, actor, lower(TG_OP), TG_TABLE_NAME, case when entity_id_text ~ '^[0-9a-fA-F-]{36}$' then entity_id_text::uuid end, jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)));
  return new;
end $$;
