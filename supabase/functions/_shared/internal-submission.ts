export type CompanyExpenseVisibility = {
  is_active: boolean
  current_amount: string | null
}

export function isNonZeroAmount(value: string | null) {
  if (!value) return false
  const digits = value.replace('.', '')
  return digits.replace(/^0+/, '').length > 0
}

export function shouldShowCompanyExpense(expense: CompanyExpenseVisibility) {
  return expense.is_active || isNonZeroAmount(expense.current_amount)
}
