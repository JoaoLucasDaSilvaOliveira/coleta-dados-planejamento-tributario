import { authenticatedActor } from '../_shared/auth.ts'
import {
  adminClient,
  errorResponse,
  json,
  originAllowed,
  readJson,
  requestId,
} from '../_shared/http.ts'
import { isUuid } from '../_shared/security.ts'

Deno.serve(async (req) => {
  const id = requestId()
  const origin = req.headers.get('origin') ?? undefined
  if (req.method === 'OPTIONS') return json({}, 204, id, origin)
  if (req.method !== 'POST' || !originAllowed(req))
    return errorResponse(405, 'method_not_allowed', id, origin)
  const actor = await authenticatedActor(req)
  if (!actor) return errorResponse(401, 'unauthorized', id, origin)
  try {
    const body = (await readJson(req)) as Record<string, unknown>
    if (!isUuid(body.itemId)) return errorResponse(400, 'invalid_input', id, origin)
    const admin = adminClient()
    if (body.action === 'inspect') {
      const result = await admin.rpc('inspect_expense_item_usage', {
        p_item_id: body.itemId,
        p_actor: actor.id,
      })
      if (result.error || !result.data?.[0])
        return errorResponse(result.error?.message.includes('not_found') ? 404 : 500, 'safe_failure', id, origin)
      return json(
        {
          canDelete: result.data[0].can_delete,
          referenceCount: result.data[0].reference_count,
        },
        200,
        id,
        origin,
      )
    }
    if (body.action !== 'delete' || !['DELETED', 'DEACTIVATED'].includes(String(body.expectedAction)))
      return errorResponse(400, 'invalid_input', id, origin)
    const result = await admin.rpc('delete_or_deactivate_expense_item', {
      p_item_id: body.itemId,
      p_actor: actor.id,
      p_expected_action: body.expectedAction,
    })
    if (result.error) {
      if (result.error.message.includes('action_changed'))
        return errorResponse(409, 'action_changed', id, origin)
      if (result.error.message.includes('not_found'))
        return errorResponse(404, 'item_not_found', id, origin)
      return errorResponse(500, 'safe_failure', id, origin)
    }
    return json({ status: result.data }, 200, id, origin)
  } catch (error) {
    if (error instanceof Error && error.message === 'body_too_large')
      return errorResponse(413, 'body_too_large', id, origin)
    console.error(JSON.stringify({ requestId: id, error: 'safe_failure' }))
    return errorResponse(500, 'safe_failure', id, origin)
  }
})
