import { supabase } from '@/lib/supabase'
export type ManagedUser = {
  id: string
  username: string
  display_name: string
  role: 'ADMIN' | 'USER'
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED'
}
export async function listUsers() {
  return supabase
    .from('app_users')
    .select('id, username, display_name, role, status')
    .neq('status', 'DELETED')
    .order('display_name')
}
export async function manageUser(body: Record<string, unknown>) {
  return supabase.functions.invoke<{ user: ManagedUser; requestId: string }>('manage-user', {
    body,
  })
}
