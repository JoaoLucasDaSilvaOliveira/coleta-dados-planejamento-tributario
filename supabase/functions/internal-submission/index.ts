import { z } from 'npm:zod@3.25.76'
import { authenticatedActor } from '../_shared/auth.ts'
import {
  adminClient,
  errorResponse,
  json,
  originAllowed,
  readJson,
  requestId,
} from '../_shared/http.ts'
import { isAmount, isUuid } from '../_shared/security.ts'

const itemSchema = z.object({
  expenseItemId: z.string().refine(isUuid),
  amount: z.string().nullable().refine(isAmount),
  note: z.string().max(1000).nullable(),
})
const inputSchema = z.object({
  action: z.enum(['create', 'revise', 'import']),
  companyId: z.string().refine(isUuid).optional(),
  submissionId: z.string().refine(isUuid).optional(),
  revisionId: z.string().refine(isUuid).nullable().optional(),
  items: z.array(itemSchema).max(100).optional(),
})

function transactionItems(items: z.infer<typeof itemSchema>[]) {
  return items.map((item) => ({
    expense_item_id: item.expenseItemId,
    amount: item.amount,
    note: item.note,
  }))
}

function errorCode(message: string) {
  if (message.includes('forbidden')) return { status: 403, code: 'forbidden' }
  if (message.includes('company_not_found')) return { status: 404, code: 'company_not_found' }
  if (message.includes('submission_not_found')) return { status: 404, code: 'submission_not_found' }
  if (message.includes('revision_not_found')) return { status: 404, code: 'revision_not_found' }
  if (message.includes('invalid_item')) return { status: 400, code: 'invalid_item' }
  if (message.includes('invalid_amount')) return { status: 400, code: 'invalid_amount' }
  if (message.includes('invalid_note')) return { status: 400, code: 'invalid_note' }
  if (message.includes('duplicate_item')) return { status: 400, code: 'duplicate_item' }
  return { status: 500, code: 'safe_failure' }
}

Deno.serve(async (req) => {
  const id = requestId()
  const origin = req.headers.get('origin') ?? undefined
  if (req.method === 'OPTIONS') return json({}, 204, id, origin)
  if (req.method !== 'POST' || !originAllowed(req))
    return errorResponse(405, 'method_not_allowed', id, origin)
  const actor = await authenticatedActor(req)
  if (!actor) return errorResponse(401, 'unauthorized', id, origin)
  try {
    const parsed = inputSchema.safeParse(await readJson(req))
    if (!parsed.success) return errorResponse(400, 'invalid_input', id, origin)
    const input = parsed.data
    if (input.action === 'create' && (!input.companyId || !input.items?.length))
      return errorResponse(400, 'invalid_input', id, origin)
    if (input.action === 'revise' && (!input.submissionId || !input.items?.length))
      return errorResponse(400, 'invalid_input', id, origin)
    if (input.action === 'import' && !input.submissionId)
      return errorResponse(400, 'invalid_input', id, origin)

    const admin = adminClient()
    if (input.action === 'create') {
      const result = await admin.rpc('create_internal_submission_transaction', {
        p_company_id: input.companyId,
        p_actor: actor.id,
        p_payload: { items: transactionItems(input.items) },
      })
      if (result.error || !result.data) {
        const failure = errorCode(result.error?.message ?? '')
        return errorResponse(failure.status, failure.code, id, origin)
      }
      return json({ submissionId: result.data }, 200, id, origin)
    }
    if (input.action === 'revise') {
      const result = await admin.rpc('create_submission_revision_transaction', {
        p_submission_id: input.submissionId,
        p_actor: actor.id,
        p_payload: { items: transactionItems(input.items) },
      })
      if (result.error || !result.data) {
        const failure = errorCode(result.error?.message ?? '')
        return errorResponse(failure.status, failure.code, id, origin)
      }
      return json({ revisionId: result.data }, 200, id, origin)
    }
    const result = await admin.rpc('import_submission_transaction', {
      p_submission_id: input.submissionId,
      p_revision_id: input.revisionId ?? null,
      p_actor: actor.id,
    })
    if (result.error || result.data !== 'IMPORTED') {
      const failure = errorCode(result.error?.message ?? '')
      return errorResponse(failure.status, failure.code, id, origin)
    }
    return json({ status: 'IMPORTED' }, 200, id, origin)
  } catch (error) {
    if (error instanceof Error && error.message === 'body_too_large')
      return errorResponse(413, 'body_too_large', id, origin)
    console.error(JSON.stringify({ requestId: id, error: 'safe_failure' }))
    return errorResponse(500, 'safe_failure', id, origin)
  }
})
