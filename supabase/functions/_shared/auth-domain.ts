export const DEFAULT_INTERNAL_AUTH_DOMAIN = 'auth.contabiehl.com.br'
export const LEGACY_INTERNAL_AUTH_DOMAIN = 'auth.contabiehl.invalid'

export function internalAuthDomain(value: string | undefined) {
  const candidate = value?.trim().toLowerCase()
  if (!candidate || candidate === LEGACY_INTERNAL_AUTH_DOMAIN || candidate.endsWith('.test'))
    return DEFAULT_INTERNAL_AUTH_DOMAIN
  return candidate
}
