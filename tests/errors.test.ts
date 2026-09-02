import { describe, expect, it } from 'vitest'
import { formRequestErrorMessage, userManagementErrorMessage } from '../src/lib/errors'

describe('form request errors', () => {
  it('explains when the local origin is not allowed', () => {
    expect(formRequestErrorMessage({ context: { status: 405 } })).toContain(
      'ALLOWED_ORIGINS',
    )
  })

  it('explains when the public URL configuration is missing', () => {
    expect(formRequestErrorMessage({ context: { status: 500 } })).toContain(
      'PUBLIC_APP_URL',
    )
  })

  it('keeps an actionable fallback for unknown failures', () => {
    expect(formRequestErrorMessage(new Error('unexpected'))).toBe(
      'Não foi possível gerar o link. Tente novamente.',
    )
  })
})

describe('user management errors', () => {
  it('explains invalid user data instead of showing a generic failure', () => {
    expect(userManagementErrorMessage({ context: { status: 400 } })).toContain(
      'usuário, nome e senha',
    )
  })

  it('explains duplicate usernames', () => {
    expect(userManagementErrorMessage({ context: { status: 409 } })).toContain(
      'já está em uso',
    )
  })
})
