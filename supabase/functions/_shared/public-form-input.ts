import { z } from 'npm:zod@3.25.76'
import { isAmount, isUuid } from './security.ts'

export const publicFormInputSchema = z.object({
  action: z.enum(['load', 'submit']),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  items: z
    .array(
      z.object({
        expenseItemId: z.string().refine(isUuid),
        amount: z.string().nullable().refine(isAmount),
        note: z.string().max(1000).nullable(),
        baseUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
      }),
    )
    .max(100)
    .optional(),
  confirmed: z.literal(true).optional(),
})
