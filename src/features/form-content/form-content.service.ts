import { z } from 'zod'
import { supabase } from '@/lib/supabase'
export const formContentSchema = z.object({
  title: z.string().trim().min(1).max(10000),
  introduction: z.string().min(1).max(10000),
  ibsCbsGuidance: z.string().min(1).max(10000),
  taxNotice: z.string().min(1).max(10000),
  successMessage: z.string().min(1).max(10000),
})
export type FormContent = z.infer<typeof formContentSchema>
export async function getFormContent() {
  return supabase.from('form_content').select('*').eq('id', true).single()
}
export async function updateFormContent(value: FormContent, actorId: string) {
  return supabase
    .from('form_content')
    .update({
      title: value.title,
      introduction: value.introduction,
      ibs_cbs_guidance: value.ibsCbsGuidance,
      tax_notice: value.taxNotice,
      success_message: value.successMessage,
      updated_by: actorId,
    })
    .eq('id', true)
    .select()
    .single()
}
