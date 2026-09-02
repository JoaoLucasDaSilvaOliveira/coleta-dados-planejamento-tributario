<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeading from '@/components/PageHeading.vue'
import StateMessage from '@/components/StateMessage.vue'
import { getSubmission } from '@/features/audit/audit.service'
import {
  createSubmissionRevision,
  importSubmission,
  listExpenseItems,
  type InternalSubmissionItem,
} from '@/features/expenses/expenses.service'
import { formatMoney, noteSchema, parseMoney } from '@/lib/validation'

type SubmissionItem = {
  expense_item_id: string
  amount: string | null
  note: string | null
}
type SubmissionRevision = {
  id: string
  revision_number: number
  created_by: string | null
  created_at: string
  submission_revision_items: SubmissionItem[]
}
type Submission = {
  id: string
  submitted_at: string
  source: 'PUBLIC_LINK' | 'INTERNAL'
  created_by: string | null
  submission_items: SubmissionItem[]
  submission_revisions: SubmissionRevision[]
}
type EditableItem = SubmissionItem

const route = useRoute()
const submission = ref<Submission | null>(null)
const names = ref<Record<string, string>>({})
const loading = ref(true)
const error = ref<string | null>(null)
const actionError = ref<string | null>(null)
const editing = ref(false)
const saving = ref(false)
const importing = ref(false)
const draftItems = ref<EditableItem[]>([])

const latestRevision = computed(() => {
  if (!submission.value?.submission_revisions.length) return null
  return [...submission.value.submission_revisions].sort(
    (first, second) => second.revision_number - first.revision_number,
  )[0]
})
const effectiveItems = computed<SubmissionItem[]>(() =>
  latestRevision.value?.submission_revision_items ?? submission.value?.submission_items ?? [],
)
const sourceLabel = computed(() =>
  submission.value?.source === 'INTERNAL' ? 'Envio interno' : 'Link público',
)
const actionAlertType = computed(() =>
  actionError.value?.startsWith('Valores importados') ? 'success' : 'error',
)

function itemName(id: string) {
  return names.value[id] || 'Item removido do catálogo'
}

function beginEdit() {
  actionError.value = null
  draftItems.value = effectiveItems.value.map((item) => ({
    expense_item_id: item.expense_item_id,
    amount: item.amount ?? '',
    note: item.note ?? '',
  }))
  editing.value = true
}

function discardEdit() {
  editing.value = false
  actionError.value = null
  draftItems.value = []
}

async function saveEdit() {
  actionError.value = null
  const payload: InternalSubmissionItem[] = []
  for (const item of draftItems.value) {
    const amount = parseMoney(item.amount ?? '')
    if (amount.error) {
      actionError.value = `Revise o valor de ${itemName(item.expense_item_id)}: ${amount.error}`
      return
    }
    const note = noteSchema.safeParse(item.note ?? '')
    if (!note.success) {
      actionError.value = `A observação de ${itemName(item.expense_item_id)} deve ter no máximo 1000 caracteres.`
      return
    }
    payload.push({
      expenseItemId: item.expense_item_id,
      amount: amount.value,
      note: note.data || null,
    })
  }
  saving.value = true
  const result = await createSubmissionRevision(String(route.params.submissionId), payload)
  saving.value = false
  if (result.error || !result.data) {
    actionError.value = 'Não foi possível salvar a revisão. Tente novamente.'
    return
  }
  editing.value = false
  draftItems.value = []
  await load()
}

async function importCurrentValues() {
  if (!submission.value) return
  actionError.value = null
  if (!window.confirm('Usar estes valores para preencher as despesas atuais da empresa?')) return
  importing.value = true
  const result = await importSubmission(submission.value.id, latestRevision.value?.id ?? null)
  importing.value = false
  if (result.error) {
    actionError.value = 'Não foi possível importar os valores para a empresa. Tente novamente.'
    return
  }
  actionError.value = 'Valores importados para as despesas atuais da empresa.'
}

async function load() {
  loading.value = true
  error.value = null
  const [result, items] = await Promise.all([
    getSubmission(String(route.params.submissionId)),
    listExpenseItems(true),
  ])
  if (result.error || !result.data) {
    error.value = 'Envio não encontrado.'
  } else {
    submission.value = result.data as unknown as Submission
    names.value = Object.fromEntries(
      ((items.data ?? []) as Array<{ id: string; name: string }>).map((item) => [item.id, item.name]),
    )
  }
  loading.value = false
}

onMounted(() => void load())
</script>

<template>
  <PageHeading
    title="Detalhe do envio"
    :subtitle="submission ? `${sourceLabel} · histórico imutável` : 'Histórico de envios'"
  />
  <v-progress-linear v-if="loading" indeterminate color="primary" />
  <v-card v-else-if="submission" class="pa-4 pa-md-6">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
      <div>
        <div class="text-body-2 text-medium-emphasis">
          Recebido em {{ new Date(submission.submitted_at).toLocaleString('pt-BR') }}
        </div>
        <v-chip size="small" variant="tonal" class="mt-2">{{ sourceLabel }}</v-chip>
        <v-chip v-if="latestRevision" size="small" variant="tonal" color="secondary" class="mt-2 ml-2">
          Revisão {{ latestRevision.revision_number }}
        </v-chip>
      </div>
      <div class="d-flex flex-wrap ga-2">
        <v-btn
          v-if="!editing"
          aria-label="Editar valores"
          variant="tonal"
          prepend-icon="mdi-pencil-outline"
          @click="beginEdit"
        >
          Editar valores
        </v-btn>
        <template v-else>
          <v-btn variant="text" @click="discardEdit">Descartar</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveEdit">Salvar alterações</v-btn>
        </template>
        <v-btn
          v-if="!editing"
          aria-label="Usar estes valores"
          variant="outlined"
          prepend-icon="mdi-import"
          :loading="importing"
          @click="importCurrentValues"
        >
          Usar estes valores
        </v-btn>
      </div>
    </div>

    <v-alert v-if="actionError && !editing" :type="actionAlertType" variant="tonal" class="mb-4">
      {{ actionError }}
    </v-alert>

    <v-alert v-if="editing" type="info" variant="tonal" class="mb-4">
      As alterações serão salvas como uma nova revisão. O envio original continuará preservado.
    </v-alert>

    <div v-if="!editing" class="text-caption text-medium-emphasis mb-3">Valores efetivos deste histórico</div>
    <v-list v-if="!editing" lines="two">
      <v-list-item
        v-for="item in effectiveItems"
        :key="item.expense_item_id"
        :title="itemName(item.expense_item_id)"
        :subtitle="item.note || 'Sem observação'"
      >
        <template #append><span class="font-weight-medium">{{ formatMoney(item.amount) }}</span></template>
      </v-list-item>
    </v-list>
    <div v-else class="d-flex flex-column ga-4">
      <div v-for="item in draftItems" :key="item.expense_item_id" class="submission-edit-item">
        <div class="text-body-1 font-weight-medium mb-2">{{ itemName(item.expense_item_id) }}</div>
        <div class="submission-edit-item__fields">
          <v-text-field
            v-model="item.amount"
            :aria-label="`Valor de ${itemName(item.expense_item_id)}`"
            label="Valor"
            placeholder="0,00"
            prefix="R$"
            inputmode="decimal"
            hide-details="auto"
          />
          <v-text-field v-model="item.note" label="Observação" hide-details="auto" />
        </div>
      </div>
      <v-alert v-if="actionError" type="error" variant="tonal" density="compact">{{ actionError }}</v-alert>
    </div>

    <template v-if="submission.submission_revisions.length">
      <v-divider class="my-5" />
      <div class="text-body-2 font-weight-medium mb-2">Histórico de revisões</div>
      <v-list density="compact">
        <v-list-item
          v-for="revision in [...submission.submission_revisions].sort((a, b) => b.revision_number - a.revision_number)"
          :key="revision.id"
          :title="`Revisão ${revision.revision_number}`"
          :subtitle="new Date(revision.created_at).toLocaleString('pt-BR')"
        />
      </v-list>
    </template>
    <div class="text-caption text-medium-emphasis mt-5">Envio original preservado para auditoria.</div>
  </v-card>
  <v-card v-else>
    <StateMessage
      title="Envio não encontrado"
      :text="error || 'Não foi possível carregar este histórico.'"
      icon="mdi-file-document-alert-outline"
    />
  </v-card>
</template>
