export function corsHeadersFor(origin?: string) {
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const requested = origin ?? ''
  return {
    'Access-Control-Allow-Origin': allowed.includes(requested) ? requested : (allowed[0] ?? 'null'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}
