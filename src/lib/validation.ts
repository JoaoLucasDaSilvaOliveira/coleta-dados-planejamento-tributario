import { z } from 'zod'

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9._-]{3,40}$/,
    'Use de 3 a 40 caracteres: letras, números, ponto, hífen ou sublinhado.',
  )
export const displayNameSchema = z.string().trim().min(2).max(100)
export const noteSchema = z.string().max(1000)
export const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.')
export const amountSchema = z
  .string()
  .regex(/^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/, 'Informe um valor decimal válido.')

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function cnpjDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function validateCnpj(value: string) {
  const digits = cnpjDigits(value)
  if (digits.length !== 14 || /^([0-9])\1{13}$/.test(digits)) return false
  const calculate = (length: number) => {
    let sum = 0
    let weight = length - 7
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * weight
      weight -= 1
      if (weight < 2) weight = 9
    }
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  return calculate(12) === Number(digits[12]) && calculate(13) === Number(digits[13])
}

export function formatCnpj(value: string) {
  const digits = cnpjDigits(value).slice(0, 14)
  if (digits.length !== 14) return value
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

type MoneyResult = { value: string | null; error: string | null }

export function parseMoney(input: string): MoneyResult {
  const text = input
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '')
  if (!text) return { value: null, error: null }
  if (text.startsWith('-') || !/^[0-9.,]+$/.test(text))
    return { value: null, error: 'Informe um valor entre R$ 0,00 e R$ 999.999.999.999,99.' }
  const comma = text.indexOf(',')
  const dotCount = (text.match(/\./g) ?? []).length
  let canonical: string
  if (comma >= 0) {
    if (
      text.indexOf(',', comma + 1) >= 0 ||
      !/^\d{1,3}(?:\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(text)
    )
      return { value: null, error: 'Use no máximo duas casas decimais.' }
    canonical = text.replace(/\./g, '').replace(',', '.')
  } else if (dotCount > 1) {
    if (!/^\d{1,3}(?:\.\d{3})+$/.test(text))
      return { value: null, error: 'Use um valor monetário válido.' }
    canonical = text.replace(/\./g, '')
  } else {
    canonical = text
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(canonical))
    return { value: null, error: 'Use no máximo duas casas decimais.' }
  const [integer, decimals = ''] = canonical.split('.')
  const normalized = `${integer.replace(/^0+(?=\d)/, '')}.${decimals.padEnd(2, '0')}`
  if (
    BigInt(integer) > 999999999999n ||
    (BigInt(integer) === 999999999999n && Number(decimals || 0) > 99)
  )
    return { value: null, error: 'O valor excede o limite permitido.' }
  return { value: normalized.replace(/\.00$/, ''), error: null }
}

export function isNonZeroMoney(value: string | null | undefined) {
  if (!value) return false
  const parsed = parseMoney(value)
  return parsed.error === null && parsed.value !== null && BigInt(parsed.value.replace('.', '')) !== 0n
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Não informado'
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number)
    : 'Não informado'
}
