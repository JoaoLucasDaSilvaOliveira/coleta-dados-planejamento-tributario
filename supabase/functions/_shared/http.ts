import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.55.0'
import { corsHeadersFor } from './cors.ts'

export const MAX_BODY_BYTES = 64 * 1024
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
export function requestId(): string {
  return crypto.randomUUID()
}
export function json(data: unknown, status = 200, request = requestId(), origin?: string) {
  const headers = {
    ...corsHeadersFor(origin),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  }
  if (status === 204 || status === 304) return new Response(null, { status, headers })
  return new Response(
    JSON.stringify({
      ...(typeof data === 'object' && data !== null ? data : { data }),
      requestId: request,
    }),
    { status, headers },
  )
}
export function errorResponse(status: number, code: string, request: string, origin?: string) {
  return json({ error: code }, status, request, origin)
}
export async function readJson(req: Request): Promise<unknown> {
  const length = Number(req.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) throw new Error('body_too_large')
  const bytes = await req.arrayBuffer()
  if (bytes.byteLength > MAX_BODY_BYTES) throw new Error('body_too_large')
  return JSON.parse(new TextDecoder().decode(bytes))
}
export function originAllowed(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return !origin || allowed.includes(origin)
}
