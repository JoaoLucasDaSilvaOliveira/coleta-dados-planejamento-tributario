import { adminClient } from './http.ts'
export type Actor = {
  id: string
  role: 'ADMIN' | 'USER'
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED'
}
export async function authenticatedActor(req: Request) {
  const header = req.headers.get('authorization') ?? ''
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return null
  const admin = adminClient()
  const { data: auth, error } = await admin.auth.getUser(token)
  if (error || !auth.user) return null
  const { data: profile } = await admin
    .from('app_users')
    .select('id, role, status')
    .eq('auth_user_id', auth.user.id)
    .maybeSingle()
  if (!profile || profile.status !== 'ACTIVE') return null
  return profile as Actor
}
