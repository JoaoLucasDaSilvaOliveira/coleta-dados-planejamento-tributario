export type ExpenseItemAction = 'DELETED' | 'DEACTIVATED'

export function resolveExpenseItemAction(referenceCount: number, expected?: ExpenseItemAction) {
  const action: ExpenseItemAction = referenceCount === 0 ? 'DELETED' : 'DEACTIVATED'
  if (expected && expected !== action) throw new Error('action_changed')
  return action
}
