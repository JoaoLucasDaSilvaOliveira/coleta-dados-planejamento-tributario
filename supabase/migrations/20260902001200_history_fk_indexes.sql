create index form_submissions_created_by_idx
  on public.form_submissions (created_by)
  where created_by is not null;

create index submission_revisions_created_by_idx
  on public.submission_revisions (created_by);
