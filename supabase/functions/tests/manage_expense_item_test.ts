import { assertEquals, assertThrows } from 'jsr:@std/assert@1'
import { resolveExpenseItemAction } from '../_shared/expense-item.ts'

Deno.test('deletes only when the locked item has no references', () => {
  assertEquals(resolveExpenseItemAction(0), 'DELETED')
  assertEquals(resolveExpenseItemAction(2), 'DEACTIVATED')
})

Deno.test('rejects a stale confirmation decision', () => {
  assertThrows(() => resolveExpenseItemAction(1, 'DELETED'), Error, 'action_changed')
  assertThrows(() => resolveExpenseItemAction(0, 'DEACTIVATED'), Error, 'action_changed')
})
