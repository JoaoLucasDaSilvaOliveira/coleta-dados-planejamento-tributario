import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { amountSchema, noteSchema } from '@/lib/validation'
export const expenseInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sortOrder: z.number().int().nonnegative(),
})
export const companyExpenseInputSchema = z.object({
  isSelected: z.boolean(),
  amount: amountSchema.nullable(),
  note: noteSchema.nullable(),
})
export async function listExpenseItems(includeInactive = true) {
  let q = supabase.from('expense_items').select('*').order('sort_order').order('id')
  if (!includeInactive) q = q.eq('is_active', true)
  return q
}
export async function listCompanyExpenses(companyId: string) {
  return supabase
    .from('company_expenses')
    .select('*')
    .eq('company_id', companyId)
    .order('expense_item_id')
}
export async function saveCompanyExpense(
  companyId: string,
  expenseItemId: string,
  value: z.infer<typeof companyExpenseInputSchema>,
  actorId: string,
) {
  return supabase
    .from('company_expenses')
    .upsert(
      {
        company_id: companyId,
        expense_item_id: expenseItemId,
        is_selected: value.isSelected,
        current_amount: value.amount,
        current_note: value.note,
        updated_by: actorId,
      },
      { onConflict: 'company_id,expense_item_id' },
    )
    .select()
    .single()
}
export async function createExpenseItem(name: string, actorId: string, sortOrder: number) {
  return supabase
    .from('expense_items')
    .insert({ name: name.trim(), sort_order: sortOrder, created_by: actorId, updated_by: actorId })
    .select()
    .single()
}
export async function updateExpenseItem(
  id: string,
  changes: { name?: string; sort_order?: number; is_active?: boolean },
  actorId: string,
) {
  return supabase
    .from('expense_items')
    .update({
      ...changes,
      updated_by: actorId,
      ...(changes.is_active === false ? { deactivated_at: new Date().toISOString() } : {}),
      ...(changes.is_active === true ? { deactivated_at: null } : {}),
    })
    .eq('id', id)
    .select()
    .single()
}

export type ExpenseItemUsage = { canDelete: boolean; referenceCount: number }
export type ExpenseItemRemovalAction = 'DELETED' | 'DEACTIVATED'

export async function inspectExpenseItem(id: string) {
  return supabase.functions.invoke<ExpenseItemUsage>('manage-expense-item', {
    body: { action: 'inspect', itemId: id },
  })
}

export async function deleteExpenseItem(
  id: string,
  actorId: string,
  expectedAction: ExpenseItemRemovalAction,
) {
  return supabase.functions.invoke<{ status: ExpenseItemRemovalAction }>('manage-expense-item', {
    body: { action: 'delete', itemId: id, expectedAction, actorId },
  })
}

export type InternalSubmissionItem = {
  expenseItemId: string
  amount: string | null
  note: string | null
}

export async function createInternalSubmission(
  companyId: string,
  items: InternalSubmissionItem[],
) {
  return supabase.functions.invoke<{ submissionId: string }>('internal-submission', {
    body: { action: 'create', companyId, items },
  })
}

export async function createSubmissionRevision(
  submissionId: string,
  items: InternalSubmissionItem[],
) {
  return supabase.functions.invoke<{ revisionId: string }>('internal-submission', {
    body: { action: 'revise', submissionId, items },
  })
}

export async function importSubmission(submissionId: string, revisionId: string | null = null) {
  return supabase.functions.invoke<{ status: 'IMPORTED' }>('internal-submission', {
    body: { action: 'import', submissionId, revisionId },
  })
}
