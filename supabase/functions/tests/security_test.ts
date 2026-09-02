import { assert, assertEquals, assertMatch, assertNotEquals } from 'jsr:@std/assert@1'
import {
  DEFAULT_INTERNAL_AUTH_DOMAIN,
  digestToken,
  generateToken,
  internalAuthDomain,
  isAmount,
  isPassword,
  isUuid,
} from '../_shared/security.ts'
import { json } from '../_shared/http.ts'

Deno.test('public token is random url-safe material and digest is one-way representation', async () => {
  const first = generateToken(); const second = generateToken()
  assertMatch(first, /^[A-Za-z0-9_-]{43}$/); assertMatch(second, /^[A-Za-z0-9_-]{43}$/); assertNotEquals(first, second)
  assertMatch(await digestToken(first), /^[a-f0-9]{64}$/); assert((await digestToken(first)) !== first)
})
Deno.test('public payload amount accepts canonical decimals only', () => {
  assert(isAmount(null)); assert(isAmount('0')); assert(isAmount('1234.50')); assertEquals(isAmount('1.234,50'), false); assertEquals(isAmount('-1'), false)
})
Deno.test('password validation accepts six characters and rejects shorter values', () => {
  assert(isPassword('123456'))
  assertEquals(isPassword('12345'), false)
  assertEquals(isPassword('1234'), false)
})
Deno.test('UUID validation rejects arbitrary identifiers', () => { assert(isUuid('00000000-0000-4000-8000-000000000000')); assertEquals(isUuid('company-name'), false) })
Deno.test('technical Auth domain falls back from reserved test domains', () => {
  assertEquals(internalAuthDomain('auth.contabiehl.invalid'), DEFAULT_INTERNAL_AUTH_DOMAIN)
  assertEquals(internalAuthDomain(' auth.contabiehl.com.br '), 'auth.contabiehl.com.br')
})
Deno.test('CORS preflight can return an empty 204 response', () => {
  const response = json({}, 204, crypto.randomUUID())
  assertEquals(response.status, 204)
  assertEquals(response.body, null)
})
