export function isUsername(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9._-]{3,40}$/.test(value)
}
export { DEFAULT_INTERNAL_AUTH_DOMAIN, internalAuthDomain } from './auth-domain.ts'
export function isPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 6
}
export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}
export function isAmount(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === 'string' && /^(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$/.test(value))
  )
}
export async function digestToken(token: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')
}
export function generateToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}
