import { authenticatedActor } from '../_shared/auth.ts'
import {
  adminClient,
  errorResponse,
  json,
  originAllowed,
  readJson,
  requestId,
} from '../_shared/http.ts'
import { digestToken, isUuid, generateToken } from '../_shared/security.ts'

Deno.serve(async (req) => {
  const id = requestId()
  const origin = req.headers.get('origin') ?? undefined
  if (req.method === 'OPTIONS') return json({}, 204, id, origin)
  if (req.method !== 'POST' || !originAllowed(req))
    return errorResponse(405, 'method_not_allowed', id, origin)
  const actor = await authenticatedActor(req)
  if (!actor) return errorResponse(401, 'unauthorized', id, origin)
  try {
    const body = (await readJson(req)) as {
      action?: unknown
      companyId?: unknown
      requestId?: unknown
    }
    if (body.action === 'revoke') {
      if (!isUuid(body.requestId)) return errorResponse(400, 'invalid_input', id, origin)
      const result = await adminClient().rpc('revoke_form_request_transaction', {
        p_request_id: body.requestId,
        p_actor: actor.id,
      })
      if (result.error) {
        const code = result.error.message.includes('forbidden') ? 'forbidden' : 'safe_failure'
        return errorResponse(code === 'forbidden' ? 403 : 500, code, id, origin)
      }
      const status = result.data
      if (status === 'NOT_FOUND') return errorResponse(404, 'request_not_found', id, origin)
      if (status !== 'REVOKED') return errorResponse(409, 'request_not_pending', id, origin)
      return json({ requestId: body.requestId, status, requestIdForLogs: id }, 200, id, origin)
    }
    if (!isUuid(body.companyId)) return errorResponse(400, 'invalid_input', id, origin)
    const base = (Deno.env.get('PUBLIC_APP_URL') ?? '').replace(/\/$/, '')
    if (!base) return errorResponse(500, 'safe_failure', id, origin)
    const token = generateToken()
    const digest = await digestToken(token)
    const admin = adminClient()
    const result = await admin.rpc('create_form_request_transaction', {
      p_company_id: body.companyId,
      p_token_digest: digest,
      p_actor: actor.id,
    })
    if (result.error || !result.data?.[0]) {
      const code = result.error?.message.includes('no_selected_expenses')
        ? 'no_selected_expenses'
        : result.error?.message.includes('company_not_found')
          ? 'company_not_found'
          : 'safe_failure'
      return errorResponse(
        code === 'company_not_found' ? 404 : code === 'no_selected_expenses' ? 409 : 500,
        code,
        id,
        origin,
      )
    }
    return json(
      {
        requestId: result.data[0].request_id,
        publicUrl: `${base}/f#${token}`,
        expiresAt: result.data[0].expires_at,
        requestIdForLogs: id,
      },
      200,
      id,
      origin,
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'body_too_large')
      return errorResponse(413, 'body_too_large', id, origin)
    console.error(JSON.stringify({ requestId: id, error: 'safe_failure' }))
    return errorResponse(500, 'safe_failure', id, origin)
  }
})
