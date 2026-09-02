export type PublicSubmissionItem = {
  expenseItemId: string
  amount: string | null
  note: string | null
  baseUpdatedAt?: string | null
}

export function toTransactionItems(items: PublicSubmissionItem[]) {
  return items.map((item) => ({
    expense_item_id: item.expenseItemId,
    amount: item.amount,
    note: item.note,
    base_updated_at: item.baseUpdatedAt ?? null,
  }))
}
