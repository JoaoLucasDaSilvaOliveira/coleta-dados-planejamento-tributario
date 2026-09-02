import { supabase } from '@/lib/supabase'
export async function listCompanyRequests(companyId: string) {
  return supabase
    .from('form_requests')
    .select('id, status, expires_at, created_at, submitted_at, revoked_at, created_by')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(25)
}
export type PublicFormView = {
  company: { legalName: string; nickname: string | null; cnpjFormatted: string }
  expiresAt: string
  content: {
    title: string
    introduction: string
    ibsCbsGuidance: string
    taxNotice: string
    successMessage?: string
  }
  items: Array<{
    expenseItemId: string
    name: string
    amount: string | null
    note: string | null
    baseUpdatedAt: string | null
    available: boolean
  }>
}
export async function createFormRequest(companyId: string) {
  return supabase.functions.invoke<{
    requestId: string
    publicUrl: string
    expiresAt: string
    requestIdForLogs: string
  }>('create-form-request', { body: { companyId } })
}
export async function revokeFormRequest(requestId: string) {
  return supabase.functions.invoke<{
    requestId: string
    status: 'REVOKED'
    requestIdForLogs: string
  }>('create-form-request', { body: { action: 'revoke', requestId } })
}
export async function loadPublicForm(token: string) {
  return supabase.functions.invoke<PublicFormView>('public-form', {
    body: { action: 'load', token },
  })
}
export async function submitPublicForm(payload: {
  token: string
  items: Array<{
    expenseItemId: string
    amount: string | null
    note: string | null
    baseUpdatedAt: string | null
  }>
  confirmed: true
}) {
  return supabase.functions.invoke<{ status: 'SUBMITTED'; message: string; requestId: string }>(
    'public-form',
    { body: { action: 'submit', ...payload } },
  )
}
export function publicTokenFromLocation() {
  return window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
}
export function whatsappShareUrl(publicUrl: string) {
  return `https://wa.me/?text=${encodeURIComponent(`Olá! Por favor, preencha as informações solicitadas: ${publicUrl}`)}`
}
