import { authenticatedActor } from '../_shared/auth.ts'
import {
  adminClient,
  errorResponse,
  json,
  originAllowed,
  readJson,
  requestId,
} from '../_shared/http.ts'
import { isPassword, isUsername, isUuid } from '../_shared/security.ts'
import { internalAuthDomain } from '../_shared/auth-domain.ts'

const domain = () => internalAuthDomain(Deno.env.get('INTERNAL_AUTH_DOMAIN'))
const emailFor = (username: string) => `${username}@${domain()}`
const validDisplayName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 100
const publicUser = (user: {
  id: string
  username: string
  display_name: string
  status: string
}) => ({
  id: user.id,
  username: user.username,
  displayName: user.display_name,
  status: user.status,
})

Deno.serve(async (req) => {
  const id = requestId()
  const origin = req.headers.get('origin') ?? undefined
  if (req.method === 'OPTIONS') return json({}, 204, id, origin)
  if (req.method !== 'POST' || !originAllowed(req))
    return errorResponse(405, 'method_not_allowed', id, origin)
  const actor = await authenticatedActor(req)
  if (!actor) return errorResponse(401, 'unauthorized', id, origin)
  if (actor.role !== 'ADMIN') return errorResponse(403, 'forbidden', id, origin)
  try {
    const body = (await readJson(req)) as Record<string, unknown>
    const action = body.action
    const admin = adminClient()
    if (action === 'create') {
      const username = String(body.username ?? '')
        .trim()
        .toLowerCase()
      const displayName = String(body.displayName ?? '').trim()
      if (!isUsername(username) || !validDisplayName(displayName) || !isPassword(body.password))
        return errorResponse(400, 'invalid_input', id, origin)
      const existing = await admin
        .from('app_users')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      if (existing.data) return errorResponse(409, 'username_unavailable', id, origin)
      const created = await admin.auth.admin.createUser({
        email: emailFor(username),
        password: body.password,
        email_confirm: true,
      })
      if (created.error || !created.data.user) return errorResponse(500, 'safe_failure', id, origin)
      const inserted = await admin
        .from('app_users')
        .insert({
          auth_user_id: created.data.user.id,
          username,
          display_name: displayName,
          role: 'USER',
          status: 'ACTIVE',
          created_by: actor.id,
        })
        .select('id, username, display_name, status')
        .single()
      if (inserted.error || !inserted.data) {
        await admin.auth.admin.deleteUser(created.data.user.id)
        return errorResponse(500, 'safe_failure', id, origin)
      }
      await admin.from('audit_events').insert({
        actor_type: 'INTERNAL_USER',
        actor_app_user_id: actor.id,
        action: 'create',
        entity_type: 'app_user',
        entity_id: inserted.data.id,
        changes: { username },
      })
      return json({ user: publicUser(inserted.data) }, 200, id, origin)
    }
    const userId = body.userId
    if (!isUuid(userId) || userId === actor.id)
      return errorResponse(403, 'self_protection', id, origin)
    const target = await admin
      .from('app_users')
      .select('id, auth_user_id, username, display_name, role, status')
      .eq('id', userId)
      .maybeSingle()
    if (!target.data || target.data.role === 'ADMIN')
      return errorResponse(404, 'user_not_found', id, origin)
    if (action === 'rename') {
      const username = String(body.username ?? '')
        .trim()
        .toLowerCase()
      const displayName = String(body.displayName ?? '').trim()
      if (!isUsername(username) || !validDisplayName(displayName))
        return errorResponse(400, 'invalid_input', id, origin)
      const conflict = await admin
        .from('app_users')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .maybeSingle()
      if (conflict.data) return errorResponse(409, 'username_unavailable', id, origin)
      const authUpdate = target.data.auth_user_id
        ? await admin.auth.admin.updateUserById(target.data.auth_user_id, {
            email: emailFor(username),
          })
        : { error: null }
      if (authUpdate.error) return errorResponse(500, 'safe_failure', id, origin)
      const update = await admin
        .from('app_users')
        .update({ username, display_name: displayName })
        .eq('id', userId)
        .select('id, username, display_name, status')
        .single()
      if (update.error || !update.data) {
        if (target.data.auth_user_id)
          await admin.auth.admin.updateUserById(target.data.auth_user_id, {
            email: emailFor(target.data.username),
          })
        return errorResponse(500, 'safe_failure', id, origin)
      }
      await admin.from('audit_events').insert({
        actor_type: 'INTERNAL_USER',
        actor_app_user_id: actor.id,
        action: 'rename',
        entity_type: 'app_user',
        entity_id: userId,
        changes: { username },
      })
      return json({ user: publicUser(update.data) }, 200, id, origin)
    }
    if (action === 'reset-password') {
      if (!isPassword(body.password) || !target.data.auth_user_id)
        return errorResponse(400, 'invalid_input', id, origin)
      const result = await admin.auth.admin.updateUserById(target.data.auth_user_id, {
        password: body.password,
      })
      if (result.error) return errorResponse(500, 'safe_failure', id, origin)
      await admin.from('audit_events').insert({
        actor_type: 'INTERNAL_USER',
        actor_app_user_id: actor.id,
        action: 'reset-password',
        entity_type: 'app_user',
        entity_id: userId,
        changes: {},
      })
      return json(
        {
          user: {
            id: target.data.id,
            username: target.data.username,
            displayName: target.data.display_name,
            status: target.data.status,
          },
        },
        200,
        id,
        origin,
      )
    }
    if (!['activate', 'deactivate', 'delete'].includes(String(action)))
      return errorResponse(400, 'invalid_input', id, origin)
    if (action === 'delete') {
      const tombstone = await admin
        .from('app_users')
        .update({ status: 'DELETED', auth_user_id: null, deleted_at: new Date().toISOString() })
        .eq('id', userId)
        .select('id, username, display_name, status')
        .single()
      if (tombstone.error || !tombstone.data)
        return errorResponse(409, 'state_conflict', id, origin)
      if (target.data.auth_user_id) await admin.auth.admin.deleteUser(target.data.auth_user_id)
      await admin.from('audit_events').insert({
        actor_type: 'INTERNAL_USER',
        actor_app_user_id: actor.id,
        action: 'delete',
        entity_type: 'app_user',
        entity_id: userId,
        changes: {},
      })
      return json({ user: publicUser(tombstone.data) }, 200, id, origin)
    }
    const nextStatus = action === 'activate' ? 'ACTIVE' : 'INACTIVE'
    const updated = await admin
      .from('app_users')
      .update({ status: nextStatus })
      .eq('id', userId)
      .select('id, username, display_name, status')
      .single()
    if (updated.error || !updated.data) return errorResponse(409, 'state_conflict', id, origin)
    if (target.data.auth_user_id)
      await admin.auth.admin.updateUserById(target.data.auth_user_id, {
        ban_duration: action === 'deactivate' ? '876000h' : 'none',
      })
    await admin.from('audit_events').insert({
      actor_type: 'INTERNAL_USER',
      actor_app_user_id: actor.id,
      action: String(action),
      entity_type: 'app_user',
      entity_id: userId,
      changes: {},
    })
    return json({ user: publicUser(updated.data) }, 200, id, origin)
  } catch (error) {
    if (error instanceof Error && error.message === 'body_too_large')
      return errorResponse(413, 'body_too_large', id, origin)
    console.error(JSON.stringify({ requestId: id, error: 'safe_failure' }))
    return errorResponse(500, 'safe_failure', id, origin)
  }
})
