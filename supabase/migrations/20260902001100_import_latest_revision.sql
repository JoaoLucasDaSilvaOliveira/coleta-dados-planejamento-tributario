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
  effective_revision_id uuid;
begin
  if not exists (
    select 1 from public.app_users
    where id = p_actor and status = 'ACTIVE' and deleted_at is null
  ) then raise exception 'forbidden'; end if;
  select * into submission_row from public.form_submissions where id = p_submission_id for update;
  if not found then raise exception 'submission_not_found'; end if;

  effective_revision_id := p_revision_id;
  if effective_revision_id is not null then
    select submission_id into revision_submission_id
    from public.submission_revisions where id = effective_revision_id;
    if revision_submission_id is distinct from p_submission_id then raise exception 'revision_not_found'; end if;
  else
    select id into effective_revision_id
    from public.submission_revisions
    where submission_id = p_submission_id
    order by revision_number desc
    limit 1;
  end if;

  perform 1 from public.companies where id = submission_row.company_id for update;
  if effective_revision_id is null then
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
      where sri.revision_id = effective_revision_id
        and ce.company_id = submission_row.company_id
        and ce.expense_item_id = sri.expense_item_id;
  end if;
  insert into public.audit_events(actor_type, actor_app_user_id, action, entity_type, entity_id, changes)
  values ('INTERNAL_USER', p_actor, 'import', 'form_submission', p_submission_id,
    jsonb_build_object('revisionId', effective_revision_id));
  return 'IMPORTED';
end $$;
