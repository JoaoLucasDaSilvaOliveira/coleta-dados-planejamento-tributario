<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import PageHeading from '@/components/PageHeading.vue'
import StateMessage from '@/components/StateMessage.vue'
import { getCompany } from '@/features/companies/companies.service'
import {
  createInternalSubmission,
  importSubmission,
  listCompanyExpenses,
  listExpenseItems,
  saveCompanyExpense,
  type InternalSubmissionItem,
} from '@/features/expenses/expenses.service'
import {
  createFormRequest,
  listCompanyRequests,
  revokeFormRequest,
  whatsappShareUrl,
} from '@/features/form-requests/form-requests.service'
import { listSubmissions } from '@/features/audit/audit.service'
import { formRequestErrorMessage } from '@/lib/errors'
import { formatCnpj, isNonZeroMoney, noteSchema, parseMoney } from '@/lib/validation'
import { useAuthStore } from '@/features/auth/auth.store'

type Item = { id: string; name: string; sort_order: number; is_active: boolean }
type Draft = { selected: boolean; amount: string; note: string }
const persistedDraftSchema = z.object({
  version: z.literal(1),
  drafts: z.record(z.object({ selected: z.boolean(), amount: z.string(), note: z.string() })),
  baseUpdatedAtByItem: z.record(z.string().nullable()),
})
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const company = ref<{
  id: string
  legal_name: string
  nickname: string | null
  cnpj: string
} | null>(null)
const items = ref<Item[]>([])
const drafts = ref<Record<string, Draft>>({})
const requests = ref<
  Array<{
    id: string
    status: string
    expires_at: string
    created_at: string
    submitted_at: string | null
  }>
>([])
const loading = ref(true)
const saving = ref<string | null>(null)
const savingAll = ref(false)
const pageError = ref<string | null>(null)
const expenseErrors = ref<Record<string, string>>({})
const expenseSaveErrors = ref<Record<string, string>>({})
const expenseSaveMessage = ref<string | null>(null)
const baseUpdatedAtByItem = ref<Record<string, string | null>>({})
const baseNonZeroByItem = ref<Record<string, boolean>>({})
const linkError = ref<string | null>(null)
const requestError = ref<string | null>(null)
const link = ref<{ url: string; expiresAt: string } | null>(null)
const submissions = ref<
  Array<{
    id: string
    submitted_at: string
    source: 'PUBLIC_LINK' | 'INTERNAL'
    created_by: string | null
  }>
>([])
const internalSubmissionError = ref<string | null>(null)
const importingSubmissionId = ref<string | null>(null)
const internalSubmissionSaving = ref(false)
const activeItems = computed(() => items.value.filter((item) => item.is_active))
const collectionItems = computed(() =>
  items.value.filter(
    (item) =>
      item.is_active ||
      baseNonZeroByItem.value[item.id] ||
      isNonZeroMoney(drafts.value[item.id]?.amount),
  ),
)
const selectedCount = computed(
  () => activeItems.value.filter((item) => drafts.value[item.id]?.selected).length,
)
const internalSubmissionItems = computed<InternalSubmissionItem[]>(() =>
  collectionItems.value
    .filter((item) => {
      const draft = drafts.value[item.id]
      return item.is_active ? draft?.selected : isNonZeroMoney(draft?.amount)
    })
    .map((item) => {
      const draft = drafts.value[item.id]
      const amount = parseMoney(draft?.amount ?? '')
      return {
        expenseItemId: item.id,
        amount: amount.error ? null : amount.value,
        note: draft?.note.trim() || null,
      }
    }),
)
const statuses: Record<string, string> = {
  PENDING: 'Pendente',
  SUBMITTED: 'Enviado',
  EXPIRED: 'Expirado',
  REVOKED: 'Revogado',
}
function initDrafts(
  expenses: Array<{
    expense_item_id: string
    is_selected: boolean
    current_amount: string | number | null
    current_note: string | null
    updated_at?: string | null
  }>,
) {
  const map = Object.fromEntries(
    expenses.map((expense) => [
      expense.expense_item_id,
      {
        selected: expense.is_selected,
        amount: expense.current_amount === null ? '' : String(expense.current_amount),
        note: expense.current_note ?? '',
      },
    ]),
  )
  drafts.value = Object.fromEntries(
    items.value.map((item) => [item.id, map[item.id] ?? { selected: false, amount: '', note: '' }]),
  )
  baseUpdatedAtByItem.value = Object.fromEntries(
    items.value.map((item) => [
      item.id,
      expenses.find((expense) => expense.expense_item_id === item.id)?.updated_at ?? null,
    ]),
  )
  baseNonZeroByItem.value = Object.fromEntries(
    items.value.map((item) => {
      const amount = expenses.find((expense) => expense.expense_item_id === item.id)?.current_amount
      return [item.id, amount !== null && amount !== undefined && isNonZeroMoney(String(amount))]
    }),
  )
  restoreDrafts()
}
function draftStorageKey() {
  return `contabiehl:company-draft:${auth.user?.id ?? 'anonymous'}:${String(route.params.companyId)}`
}
function restoreDrafts() {
  if (!auth.user) return
  try {
    const raw = globalThis.localStorage.getItem(draftStorageKey())
    if (!raw) return
    const parsed = persistedDraftSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return
    const restored = { ...drafts.value }
    for (const [itemId, draft] of Object.entries(parsed.data.drafts)) {
      if (!(itemId in restored)) continue
      if (parsed.data.baseUpdatedAtByItem[itemId] !== baseUpdatedAtByItem.value[itemId]) continue
      restored[itemId] = draft
    }
    drafts.value = restored
  } catch {
    // Local draft storage is best-effort and must never prevent the page from loading.
  }
}
function persistDrafts() {
  if (!auth.user) return
  try {
    globalThis.localStorage.setItem(
      draftStorageKey(),
      JSON.stringify({
        version: 1,
        drafts: drafts.value,
        baseUpdatedAtByItem: baseUpdatedAtByItem.value,
      }),
    )
  } catch {
    // Private browsing and storage quotas must not block editing.
  }
}
function clearDraftStorage() {
  try {
    globalThis.localStorage.removeItem(draftStorageKey())
  } catch {
    // Local draft storage is best-effort.
  }
}
async function load() {
  loading.value = true
  pageError.value = null
  const id = String(route.params.companyId)
  company.value = null
  try {
    const [companyResult, itemsResult, expensesResult, requestsResult, submissionsResult] =
      await Promise.all([
        getCompany(id),
        listExpenseItems(true),
        listCompanyExpenses(id),
        listCompanyRequests(id),
        listSubmissions(id),
      ])
    if (companyResult.error || !companyResult.data) {
      pageError.value = 'Empresa não encontrada.'
      return
    }
    if (itemsResult.error || expensesResult.error || requestsResult.error || submissionsResult.error)
      throw new Error('company detail data request failed')
    company.value = companyResult.data
    items.value = (itemsResult.data ?? []) as Item[]
    initDrafts(
      (expensesResult.data ?? []) as Array<{
        expense_item_id: string
        is_selected: boolean
        current_amount: string | number | null
        current_note: string | null
        updated_at?: string | null
      }>,
    )
    requests.value = (requestsResult.data ?? []) as typeof requests.value
    submissions.value = (submissionsResult.data ?? []) as typeof submissions.value
  } catch {
    pageError.value = 'Não foi possível carregar os dados da empresa.'
  } finally {
    loading.value = false
  }
}
watch(drafts, persistDrafts, { deep: true })
async function save(item: Item) {
  const draft = drafts.value[item.id]
  if (!draft || !auth.user) return false
  const clearExpenseSaveError = { ...expenseSaveErrors.value }
  delete clearExpenseSaveError[item.id]
  expenseSaveErrors.value = clearExpenseSaveError
  const amount = parseMoney(draft.amount)
  if (amount.error) {
    expenseErrors.value = { ...expenseErrors.value, [item.id]: amount.error }
    return false
  }
  const note = noteSchema.safeParse(draft.note.trim())
  if (!note.success) {
    expenseSaveErrors.value = {
      ...expenseSaveErrors.value,
      [item.id]: 'A observação deve ter no máximo 1000 caracteres.',
    }
    return false
  }
  const clearExpenseError = { ...expenseErrors.value }
  delete clearExpenseError[item.id]
  expenseErrors.value = clearExpenseError
  saving.value = item.id
  const result = await saveCompanyExpense(
    String(route.params.companyId),
    item.id,
    { isSelected: draft.selected, amount: amount.value, note: note.data || null },
    auth.user.id,
  )
  saving.value = null
  if (result.error)
    expenseSaveErrors.value = {
      ...expenseSaveErrors.value,
      [item.id]: 'Não foi possível salvar esta despesa. Tente novamente.',
    }
  return !result.error
}
async function saveAll() {
  if (savingAll.value) return false
  expenseSaveMessage.value = null
  savingAll.value = true
  let success = true
  for (const item of collectionItems.value) {
    if (!(await save(item))) success = false
  }
  savingAll.value = false
  if (!success) {
    expenseSaveMessage.value = 'Revise os campos com erro antes de salvar as despesas.'
    return false
  }
  clearDraftStorage()
  expenseSaveMessage.value = 'Despesas salvas nesta empresa.'
  return true
}
function setAll(selected: boolean) {
  const removing =
    !selected &&
    activeItems.value.some(
      (item) =>
        drafts.value[item.id]?.selected &&
        (drafts.value[item.id]?.amount || drafts.value[item.id]?.note),
    )
  if (
    removing &&
    !window.confirm(
      'Desmarcar itens com valores preserva os dados, mas eles não serão incluídos na próxima solicitação. Continuar?',
    )
  )
    return
  for (const item of activeItems.value) drafts.value[item.id].selected = selected
}
async function generateLink() {
  linkError.value = null
  if (!company.value || !selectedCount.value) {
    linkError.value = 'Selecione ao menos uma despesa ativa antes de gerar o link.'
    return
  }
  if (!(await saveAll())) {
    linkError.value = 'Salve as despesas antes de gerar o link.'
    return
  }
  const result = await createFormRequest(company.value.id)
  if (result.error || !result.data) {
    linkError.value = formRequestErrorMessage(result.error)
    return
  }
  link.value = { url: result.data.publicUrl, expiresAt: result.data.expiresAt }
  const refreshedRequests = await listCompanyRequests(company.value.id)
  if (!refreshedRequests.error)
    requests.value = (refreshedRequests.data ?? []) as typeof requests.value
}
async function createInternalSubmissionRecord() {
  internalSubmissionError.value = null
  if (!company.value || !internalSubmissionItems.value.length) {
    internalSubmissionError.value =
      'Selecione ou informe ao menos uma despesa antes de registrar o envio.'
    return
  }
  if (!window.confirm('Registrar estes valores como um novo envio interno no histórico?')) return
  internalSubmissionSaving.value = true
  const result = await createInternalSubmission(company.value.id, internalSubmissionItems.value)
  internalSubmissionSaving.value = false
  if (result.error || !result.data) {
    internalSubmissionError.value = 'Não foi possível registrar o envio interno. Tente novamente.'
    return
  }
  const refreshed = await listSubmissions(company.value.id)
  if (!refreshed.error) submissions.value = (refreshed.data ?? []) as typeof submissions.value
}
async function importHistoricalSubmission(submissionId: string) {
  internalSubmissionError.value = null
  if (!window.confirm('Usar os valores deste envio para preencher as despesas atuais da empresa?'))
    return
  importingSubmissionId.value = submissionId
  const result = await importSubmission(submissionId)
  importingSubmissionId.value = null
  if (result.error) {
    internalSubmissionError.value = 'Não foi possível importar este envio. Tente novamente.'
    return
  }
  clearDraftStorage()
  await load()
}
async function revoke(requestId: string) {
  requestError.value = null
  if (!window.confirm('Revogar este link? O Respondente não poderá mais utilizá-lo.')) return
  const result = await revokeFormRequest(requestId)
  if (result.error) {
    requestError.value = 'Não foi possível revogar este link. Ele pode já ter sido utilizado.'
    return
  }
  await load()
}
async function copyLink() {
  if (link.value) await navigator.clipboard.writeText(link.value.url)
}
async function shareLink() {
  if (!link.value) return
  if (navigator.share)
    await navigator.share({
      title: 'Solicitação de despesas',
      text: 'Preencha as despesas da empresa.',
      url: link.value.url,
    })
  else await copyLink()
}
onMounted(() => void load())
</script>

<template>
  <PageHeading
    v-if="company"
    :title="company.legal_name"
    :subtitle="`${company.nickname || 'Sem apelido'} · ${formatCnpj(company.cnpj)}`"
    ><v-btn
      variant="text"
      prepend-icon="mdi-pencil-outline"
      @click="router.push(`/empresas/${company.id}/editar`)"
      >Editar cadastro</v-btn
    ></PageHeading
  >
  <v-progress-linear v-if="loading" indeterminate color="primary" />
  <v-alert v-if="pageError" type="error" variant="tonal" class="mb-5" closable>{{ pageError }}</v-alert>
  <template v-if="!loading && company">
    <v-card class="mb-6"
      ><v-card-item
        ><template #prepend
          ><v-avatar color="primary" variant="tonal"
            ><v-icon icon="mdi-cash-multiple" /></v-avatar></template
        ><v-card-title>Despesas da empresa</v-card-title
        ><v-card-subtitle
          >Selecione os itens que devem aparecer na próxima coleta.</v-card-subtitle
        ></v-card-item
      ><v-card-actions class="px-4 expense-toolbar"
        ><v-btn size="small" variant="tonal" @click="setAll(true)">Selecionar todos</v-btn
        ><v-btn size="small" variant="text" @click="setAll(false)">Desmarcar todos</v-btn
        ><v-spacer /><span class="text-caption text-medium-emphasis"
          >{{ selectedCount }} selecionada(s)</span
        ></v-card-actions
      ><v-divider /><v-list lines="two"
        ><v-list-item
          v-for="item in collectionItems"
          :key="item.id"
          :class="{ 'bg-grey-lighten-4': !item.is_active }"
          ><template #prepend
            ><v-checkbox
              v-model="drafts[item.id].selected"
              :disabled="!item.is_active"
                  :aria-label="`Selecionar ${item.name}`"
                  hide-details
                /></template
          ><template #default
            ><div class="expense-item__content">
              <v-list-item-title
                >{{ item.name }}
                <v-chip v-if="!item.is_active" size="x-small" variant="tonal" color="secondary"
                  >Inativo</v-chip
                ></v-list-item-title
              ><v-list-item-subtitle v-if="!item.is_active"
                >Item mantido para histórico e indisponível em novas solicitações.</v-list-item-subtitle
              ><div
                v-if="drafts[item.id].selected || drafts[item.id].amount || drafts[item.id].note"
                class="expense-fields mt-2"
              >
                <v-text-field
                  v-model="drafts[item.id].amount"
                  label="Média mensal"
                  placeholder="0,00"
                  prefix="R$"
                  density="compact"
                  hide-details="auto"
                  inputmode="decimal"
                  :error-messages="expenseErrors[item.id] ? [expenseErrors[item.id]] : []"
                /><v-text-field
                  v-model="drafts[item.id].note"
                  label="Observação"
                  density="compact"
                  hide-details="auto"
                />
              </div>
              <v-alert
                v-if="expenseSaveErrors[item.id]"
                type="error"
                variant="tonal"
                density="compact"
                class="mt-2"
                >{{ expenseSaveErrors[item.id] }}</v-alert
              >
            </div></template
          ><template #append
            ><v-progress-circular
              v-if="saving === item.id"
              indeterminate
              size="20" /></template></v-list-item></v-list
      ><v-card-actions class="expense-save-actions justify-center px-4 pt-4">
        <v-btn
          class="save-company-expenses-button"
          color="primary"
          prepend-icon="mdi-content-save-outline"
          :loading="savingAll"
          @click="saveAll"
          >Salvar despesas</v-btn
        >
      </v-card-actions>
      <v-alert
        v-if="expenseSaveMessage"
        type="success"
        variant="tonal"
        density="compact"
        class="mx-4 mt-2 mb-3 text-center"
        >{{ expenseSaveMessage }}</v-alert
      ><v-card-actions class="internal-submit-actions justify-center px-4 pt-2 pb-5">
        <v-btn
          class="internal-submit-button rounded-pill"
          variant="flat"
          prepend-icon="mdi-content-save-outline"
          :loading="internalSubmissionSaving"
          :disabled="!internalSubmissionItems.length"
          @click="createInternalSubmissionRecord"
          >Registrar envio interno</v-btn
        >
      </v-card-actions>
    ></v-card>
    <v-card class="mb-6"
      ><v-card-item
        ><template #prepend
          ><v-avatar color="secondary" variant="tonal"
            ><v-icon icon="mdi-share-variant-outline" /></v-avatar></template
        ><v-card-title>Solicitação de preenchimento</v-card-title
        ><v-card-subtitle
          >O link expira em 30 dias e pode ser usado uma única vez.</v-card-subtitle
        ></v-card-item
      ><v-card-text
        ><v-alert v-if="link" type="success" variant="tonal" class="mb-4"
          ><div class="font-weight-medium">
            Link criado. Compartilhe agora; ele não poderá ser recuperado depois.
          </div>
          <div class="text-body-2 text-break mt-2">{{ link.url }}</div>
          <div class="d-flex flex-wrap ga-2 mt-4">
            <v-btn size="small" prepend-icon="mdi-content-copy" @click="copyLink">Copiar URL</v-btn
            ><v-btn size="small" prepend-icon="mdi-share-variant" @click="shareLink"
              >Compartilhar</v-btn
            ><v-btn
              size="small"
              prepend-icon="mdi-whatsapp"
              :href="whatsappShareUrl(link.url)"
              target="_blank"
              >Abrir WhatsApp</v-btn
            >
          </div></v-alert
        ><v-btn
          class="link-generate-button"
          color="primary"
          prepend-icon="mdi-link-plus"
          :disabled="!selectedCount"
          @click="generateLink"
          >Gerar novo link</v-btn
        ><v-alert
          v-if="linkError"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-3"
          closable
          @click:close="linkError = null"
          >{{ linkError }}</v-alert
        ></v-card-text
      ><v-divider /><v-list density="compact"
        ><v-list-subheader>Últimas solicitações</v-list-subheader
        ><v-alert
          v-if="requestError"
          type="error"
          variant="tonal"
          density="compact"
          class="mx-4 mb-3"
          closable
          @click:close="requestError = null"
          >{{ requestError }}</v-alert
        ><v-list-item
          v-for="request in requests"
          :key="request.id"
          :title="statuses[request.status] || request.status"
          :subtitle="new Date(request.created_at).toLocaleString('pt-BR')"
          ><template #append
            ><div class="d-flex align-center ga-2">
              <v-chip size="small" variant="tonal">{{
                statuses[request.status] || request.status
              }}</v-chip>
              <v-btn
                v-if="request.status === 'PENDING'"
                icon="mdi-link-off"
                size="small"
                variant="text"
                aria-label="Revogar link"
                @click="revoke(request.id)"
              /></div></template></v-list-item
        ><v-list-item v-if="!requests.length" title="Nenhuma solicitação gerada ainda." /></v-list
    ></v-card>
    <v-card>
      <v-card-item>
        <v-card-title>Histórico de envios</v-card-title>
        <v-card-subtitle>Os registros não podem ser alterados ou excluídos.</v-card-subtitle>
      </v-card-item>
      <v-alert
        v-if="internalSubmissionError"
        type="error"
        variant="tonal"
        class="mx-4 mb-3"
      >{{ internalSubmissionError }}</v-alert>
      <v-list lines="one">
        <v-list-item
          v-for="submission in submissions"
          :key="submission.id"
          :title="`Envio de ${new Date(submission.submitted_at).toLocaleString('pt-BR')}`"
          :to="`/empresas/${company.id}/envios/${submission.id}`"
          ><template #append
            ><div class="d-flex align-center ga-2">
              <v-chip size="small" variant="tonal">{{
                submission.source === 'INTERNAL' ? 'Interno' : 'Link'
              }}</v-chip>
              <v-btn
                icon="mdi-import"
                size="small"
                variant="text"
                aria-label="Importar valores do envio"
                :loading="importingSubmissionId === submission.id"
                @click.prevent="importHistoricalSubmission(submission.id)"
              />
              <v-icon icon="mdi-chevron-right" /></div></template
        ></v-list-item>
        <v-list-item v-if="!submissions.length" title="Nenhum envio recebido ainda." />
      </v-list>
    </v-card>
  </template>
  <v-card v-if="!loading && !company"
    ><StateMessage
      title="Empresa não encontrada"
      text="Volte à lista e escolha uma empresa válida."
      icon="mdi-domain-off"
      ><v-btn to="/empresas" color="primary" class="mt-4">Voltar para empresas</v-btn></StateMessage
    ></v-card
  >
</template>
