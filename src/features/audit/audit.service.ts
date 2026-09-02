import { supabase } from '@/lib/supabase'

export type AuditFilters = {
  fromDate?: string
  toDate?: string
  actorType?: string
  action?: string
  entityType?: string
}

function nextDate(date: string) {
  const value = new Date(`${date}T00:00:00-03:00`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString()
}

export async function listAuditEvents(page = 0, pageSize = 50, filters: AuditFilters = {}) {
  const from = page * pageSize
  let query = supabase
    .from('audit_events')
    .select(
      'id, actor_type, actor_app_user_id, action, entity_type, entity_id, correlation_id, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)
  if (filters.fromDate) query = query.gte('created_at', `${filters.fromDate}T00:00:00-03:00`)
  if (filters.toDate) query = query.lt('created_at', nextDate(filters.toDate))
  if (filters.actorType) query = query.eq('actor_type', filters.actorType)
  if (filters.action?.trim()) query = query.ilike('action', `%${filters.action.trim()}%`)
  if (filters.entityType?.trim())
    query = query.ilike('entity_type', `%${filters.entityType.trim()}%`)
  return query
}
export async function listSubmissions(companyId: string) {
  return supabase
    .from('form_submissions')
    .select('id, form_request_id, submitted_at, content_snapshot, source, created_by')
    .eq('company_id', companyId)
    .order('submitted_at', { ascending: false })
    .limit(25)
}
export async function getSubmission(submissionId: string) {
  return supabase
    .from('form_submissions')
    .select(
      'id, form_request_id, company_id, submitted_at, content_snapshot, source, created_by, submission_items(expense_item_id, amount, note), submission_revisions(id, revision_number, created_by, created_at, submission_revision_items(expense_item_id, amount, note))',
    )
    .eq('id', submissionId)
    .maybeSingle()
}
