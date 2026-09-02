import { describe, expect, it } from 'vitest'
import {
  formatCnpj,
  normalizeUsername,
  parseMoney,
  passwordSchema,
  usernameSchema,
  validateCnpj,
} from '../src/lib/validation'

describe('CNPJ validation', () => {
  it('accepts a valid masked CNPJ and stores digits only', () => {
    expect(validateCnpj('11.222.333/0001-81')).toBe(true)
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81')
  })
  it('rejects repeated or invalid check digits', () => {
    expect(validateCnpj('11.111.111/1111-11')).toBe(false)
    expect(validateCnpj('11.222.333/0001-80')).toBe(false)
  })
})

describe('input normalization', () => {
  it('normalizes usernames and converts Brazilian money without floats', () => {
    expect(normalizeUsername('  JOAO.SILVA ')).toBe('joao.silva')
    expect(parseMoney('1.234,56')).toEqual({ value: '1234.56', error: null })
    expect(parseMoney('1,999')).toMatchObject({ error: expect.any(String) })
    expect(parseMoney('')).toEqual({ value: null, error: null })
    expect(parseMoney('0,00')).toEqual({ value: '0', error: null })
    expect(parseMoney('-1,00')).toMatchObject({ error: expect.any(String) })
    expect(parseMoney('10.000.000.000.000,00')).toMatchObject({ error: expect.any(String) })
  })

  it('accepts passwords with six or more characters and rejects shorter ones', () => {
    expect(passwordSchema.safeParse('123456').success).toBe(true)
    expect(passwordSchema.safeParse('12345').success).toBe(false)
    expect(passwordSchema.safeParse('1234').success).toBe(false)
  })

  it('matches the server username rules before submitting', () => {
    expect(usernameSchema.safeParse('joao.silva').success).toBe(true)
    expect(usernameSchema.safeParse('João Silva').success).toBe(false)
  })
})
