import { z } from 'zod'
import { cnpjDigits, validateCnpj } from '@/lib/validation'
import { supabase } from '@/lib/supabase'

export const companyInputSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  nickname: z.string().trim().max(100).optional(),
  cnpj: z.string().refine(validateCnpj, 'Informe um CNPJ válido.'),
})
export type CompanyInput = z.infer<typeof companyInputSchema>
export type Company = {
  id: string
  legal_name: string
  nickname: string | null
  cnpj: string
  created_at: string
  updated_at: string
}

export async function listCompanies(search = '') {
  let query = supabase
    .from('companies')
    .select('id, legal_name, nickname, cnpj, created_at, updated_at')
    .order('legal_name')
    .limit(100)
  if (search.trim())
    query = query.or(
      `legal_name.ilike.%${search.trim()}%,nickname.ilike.%${search.trim()}%,cnpj.ilike.%${cnpjDigits(search)}%`,
    )
  return query
}
export async function getCompany(id: string) {
  return supabase.from('companies').select('*').eq('id', id).maybeSingle()
}
export async function createCompany(input: CompanyInput, actorId: string) {
  return supabase
    .from('companies')
    .insert({
      legal_name: input.legalName.trim(),
      nickname: input.nickname?.trim() || null,
      cnpj: cnpjDigits(input.cnpj),
      created_by: actorId,
      updated_by: actorId,
    })
    .select()
    .single()
}
export async function updateCompany(id: string, input: CompanyInput, actorId: string) {
  return supabase
    .from('companies')
    .update({
      legal_name: input.legalName.trim(),
      nickname: input.nickname?.trim() || null,
      cnpj: cnpjDigits(input.cnpj),
      updated_by: actorId,
    })
    .eq('id', id)
    .select()
    .single()
}
