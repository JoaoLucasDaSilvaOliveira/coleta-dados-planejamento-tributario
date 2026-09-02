import { assert, assertEquals } from 'jsr:@std/assert@1'
import { isNonZeroAmount, shouldShowCompanyExpense } from '../_shared/internal-submission.ts'

Deno.test('inactive company expenses are shown only with a non-zero amount', () => {
  assertEquals(isNonZeroAmount(null), false)
  assertEquals(isNonZeroAmount(''), false)
  assertEquals(isNonZeroAmount('0'), false)
  assertEquals(isNonZeroAmount('0.00'), false)
  assertEquals(isNonZeroAmount('000.00'), false)
  assertEquals(isNonZeroAmount('0.10'), true)
  assertEquals(isNonZeroAmount('10.00'), true)
})

Deno.test('active expenses are always shown and inactive zero expenses are hidden', () => {
  assert(shouldShowCompanyExpense({ is_active: true, current_amount: null }))
  assert(shouldShowCompanyExpense({ is_active: true, current_amount: '0' }))
  assertEquals(shouldShowCompanyExpense({ is_active: false, current_amount: null }), false)
  assertEquals(shouldShowCompanyExpense({ is_active: false, current_amount: '0.00' }), false)
  assert(shouldShowCompanyExpense({ is_active: false, current_amount: '1.00' }))
})
