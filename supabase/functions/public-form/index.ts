import { z } from 'npm:zod@3.25.76'
import {
  adminClient,
  errorResponse,
  json,
  originAllowed,
  readJson,
  requestId,
} from '../_shared/http.ts'
import { digestToken, isAmount, isUuid } from '../_shared/security.ts'
import { toTransactionItems } from '../_shared/public-submission.ts'

const neutral = (id: string, origin?: string) => errorResponse(410, 'link_unavailable', id, origin)
const inputSchema = z.object({
  action: z.enum(['load', 'submit']),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  items: z
    .array(
      z.object({
        expenseItemId: z.string().refine(isUuid),
        amount: z.string().nullable().refine(isAmount),
        note: z.string().max(1000).nullable(),
        baseUpdatedAt: z.string().datetime().nullable().optional(),
      }),
    )
    .max(100)
    .optional(),
  confirmed: z.literal(true).optional(),
})

Deno.serve(async (req) => {
  const id = requestId()
  const origin = req.headers.get('origin') ?? undefined
  if (req.method === 'OPTIONS') return json({}, 204, id, origin)
  if (req.method !== 'POST' || !originAllowed(req))
    return errorResponse(405, 'method_not_allowed', id, origin)
  try {
    const parsed = inputSchema.safeParse(await readJson(req))
    if (!parsed.success) return errorResponse(400, 'invalid_input', id, origin)
    const input = parsed.data
    if (input.action === 'submit' && (input.confirmed !== true || !input.items))
      return errorResponse(400, 'confirmation_required', id, origin)
    const digest = await digestToken(input.token)
    const admin = adminClient()
    const request = await admin
      .from('form_requests')
      .select('id, company_id, status, expires_at')
      .eq('token_digest', digest)
      .maybeSingle()
    if (
      request.error ||
      !request.data ||
      request.data.status !== 'PENDING' ||
      new Date(request.data.expires_at).getTime() <= Date.now()
    ) {
      if (request.data?.status === 'PENDING')
        await admin.from('form_requests').update({ status: 'EXPIRED' }).eq('id', request.data.id)
      return neutral(id, origin)
    }
    if (input.action === 'submit') {
      const result = await admin.rpc('submit_form_transaction', {
        p_token_digest: digest,
        p_payload: { items: toTransactionItems(input.items) },
      })
      if (result.error) {
        console.error(JSON.stringify({ requestId: id, error: 'submit_rejected' }))
        return errorResponse(400, 'invalid_submission', id, origin)
      }
      if (result.data !== 'SUBMITTED') return neutral(id, origin)
      const content = await admin
        .from('form_content')
        .select('success_message')
        .eq('id', true)
        .single()
      return json(
        {
          status: 'SUBMITTED',
          message: content.data?.success_message ?? 'Informações recebidas com sucesso.',
          requestId: id,
        },
        200,
        id,
        origin,
      )
    }
    const [company, content, items, currentExpenses] = await Promise.all([
      admin
        .from('companies')
        .select('legal_name, nickname, cnpj')
        .eq('id', request.data.company_id)
        .single(),
      admin
        .from('form_content')
        .select('title, introduction, ibs_cbs_guidance, tax_notice, success_message')
        .eq('id', true)
        .single(),
      admin
        .from('form_request_items')
        .select(
          'expense_item_id, initial_amount, initial_note, initial_updated_at, sort_order, expense_items(name, is_active)',
        )
        .eq('form_request_id', request.data.id)
        .order('sort_order'),
      admin
        .from('company_expenses')
        .select('expense_item_id, current_amount, current_note, updated_at')
        .eq('company_id', request.data.company_id),
    ])
    if (
      company.error ||
      content.error ||
      items.error ||
      currentExpenses.error ||
      !company.data ||
      !content.data
    )
      return neutral(id, origin)
    const currentByItem = new Map(
      (currentExpenses.data ?? []).map((expense) => [expense.expense_item_id, expense]),
    )
    const cnpj = company.data.cnpj
    const formatted = `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
    return json(
      {
        company: {
          legalName: company.data.legal_name,
          nickname: company.data.nickname,
          cnpjFormatted: formatted,
        },
        expiresAt: request.data.expires_at,
        content: {
          title: content.data.title,
          introduction: content.data.introduction,
          ibsCbsGuidance: content.data.ibs_cbs_guidance,
          taxNotice: content.data.tax_notice,
          successMessage: content.data.success_message,
        },
        items: (items.data ?? []).map((item) => ({
          expenseItemId: item.expense_item_id,
          name: (item.expense_items as unknown as { name: string }).name,
          amount: currentByItem.has(item.expense_item_id)
            ? currentByItem.get(item.expense_item_id)?.current_amount ?? null
            : item.initial_amount,
          note: currentByItem.has(item.expense_item_id)
            ? currentByItem.get(item.expense_item_id)?.current_note ?? null
            : item.initial_note,
          baseUpdatedAt: currentByItem.has(item.expense_item_id)
            ? currentByItem.get(item.expense_item_id)?.updated_at ?? null
            : item.initial_updated_at,
          available: (item.expense_items as unknown as { is_active: boolean }).is_active,
        })),
      },
      200,
      id,
      origin,
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'body_too_large')
      return errorResponse(413, 'body_too_large', id, origin)
    console.error(JSON.stringify({ requestId: id, error: 'safe_failure' }))
    return neutral(id, origin)
  }
})
