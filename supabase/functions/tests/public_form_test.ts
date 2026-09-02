import { assertEquals } from 'jsr:@std/assert@1'
import { toTransactionItems } from '../_shared/public-submission.ts'

Deno.test('converts public camelCase item IDs to the SQL transaction contract', () => {
  assertEquals(
    toTransactionItems([
      { expenseItemId: '00000000-0000-4000-8000-000000000000', amount: '123.45', note: null },
    ]),
    [
      {
        expense_item_id: '00000000-0000-4000-8000-000000000000',
        amount: '123.45',
        note: null,
        base_updated_at: null,
      },
    ],
  )
})
