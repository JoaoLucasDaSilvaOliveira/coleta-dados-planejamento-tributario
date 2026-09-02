<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import StateMessage from '@/components/StateMessage.vue'
import {
  loadPublicForm,
  publicTokenFromLocation,
  submitPublicForm,
  type PublicFormView,
} from '@/features/form-requests/form-requests.service'
import { parseMoney } from '@/lib/validation'
type FormItem = PublicFormView['items'][number] & { amountInput: string; noteInput: string }
const view = ref<PublicFormView | null>(null)
const items = ref<FormItem[]>([])
const token = ref('')
const loading = ref(true)
const sending = ref(false)
const success = ref(false)
const confirmed = ref(false)
const error = ref<string | null>(null)
const submitError = ref<string | null>(null)
const incompleteDialog = ref(false)
const availableItems = computed(() => items.value.filter((item) => item.available))
const canSubmit = computed(() => confirmed.value && availableItems.value.length > 0)
const incompleteItems = computed(() =>
  availableItems.value.filter((item) => !item.amountInput.trim()),
)
async function load() {
  token.value = publicTokenFromLocation()
  if (!token.value) {
    loading.value = false
    return
  }
  const result = await loadPublicForm(token.value)
  if (result.error || !result.data) error.value = 'Este link está indisponível.'
  else {
    view.value = result.data
    items.value = result.data.items.map((item) => ({
      ...item,
      amountInput: item.amount === null ? '' : String(item.amount),
      noteInput: item.note === null ? '' : String(item.note),
    }))
  }
  loading.value = false
}
async function send() {
  for (const item of availableItems.value) {
    const parsed = parseMoney(item.amountInput)
    if (parsed.error) {
      submitError.value = parsed.error
      return
    }
  }
  sending.value = true
  const result = await submitPublicForm({
    token: token.value,
    confirmed: true,
    items: availableItems.value.map((item) => ({
      expenseItemId: item.expenseItemId,
      amount: parseMoney(item.amountInput).value,
      note: item.noteInput.trim() || null,
      baseUpdatedAt: item.baseUpdatedAt,
    })),
  })
  sending.value = false
  if (result.error || !result.data)
    submitError.value =
      'Não foi possível confirmar agora. Se o link ainda estiver disponível, tente novamente.'
  else success.value = true
}
async function submit() {
  submitError.value = null
  if (!canSubmit.value) {
    submitError.value = 'Revise os dados e confirme as informações antes de enviar.'
    return
  }
  if (incompleteItems.value.length) {
    incompleteDialog.value = true
    return
  }
  await send()
}
async function sendWithIncompleteValues() {
  incompleteDialog.value = false
  await send()
}
function returnToFill() {
  const firstIncomplete = incompleteItems.value[0]
  incompleteDialog.value = false
  if (!firstIncomplete) return
  void nextTick(() => {
    const field = window.document.getElementById(`amount-${firstIncomplete.expenseItemId}`)
    if (field instanceof window.HTMLElement) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field.focus()
    }
  })
}
onMounted(() => void load())
</script>
<template>
  <main class="page-shell pa-4 pa-md-10">
    <v-container max-width="800"
      ><div class="text-center mb-8">
        <div class="text-h5 text-primary font-weight-bold">Contabiehl</div>
        <div class="text-body-2 text-medium-emphasis">
          Solicitação de preenchimento · planejamento 2027
        </div>
      </div>
      <v-progress-linear v-if="loading" indeterminate color="primary" /><v-card
        v-else-if="error || !view"
        ><StateMessage
          title="Link indisponível"
          text="Este link é inválido, expirou, foi revogado ou já foi utilizado. Solicite um novo link ao escritório."
          icon="mdi-link-off" /></v-card
      ><v-card v-else-if="success" class="pa-6 pa-md-10 text-center"
        ><v-icon icon="mdi-check-circle-outline" color="primary" size="64" class="mb-4" />
        <h1 class="text-h5 text-primary">
          {{ view.content.successMessage || 'Informações recebidas com sucesso.' }}
        </h1>
        <p class="text-body-1 text-medium-emphasis mt-3">
          O escritório dará continuidade à análise.
        </p></v-card
      ><template v-else
        ><v-card class="pa-5 pa-md-8 mb-5"
          ><div class="text-overline text-primary">Confira os dados</div>
          <h1 class="text-h5 mt-1">{{ view.company.legalName }}</h1>
          <div class="text-body-2 text-medium-emphasis mt-1">
            {{ view.company.nickname || 'Sem apelido' }} · {{ view.company.cnpjFormatted }}
          </div>
          <v-divider class="my-6" />
          <h2 class="text-h6 mb-3">{{ view.content.title }}</h2>
          <div class="text-body-1 text-pre-wrap">{{ view.content.introduction }}</div></v-card
        ><v-card class="pa-5 pa-md-8 mb-5"
          ><h2 class="text-h6 mb-5">Despesas médias mensais</h2>
          <div v-for="item in items" :key="item.expenseItemId" class="mb-5">
            <div class="d-flex align-center justify-space-between mb-2">
              <label class="text-body-1 font-weight-medium" :for="`amount-${item.expenseItemId}`">{{
                item.name
              }}</label
              ><v-chip v-if="!item.available" size="small" variant="tonal" color="secondary"
                >Indisponível</v-chip
              >
            </div>
            <div v-if="item.available" class="public-form-fields">
              <v-text-field
                :id="`amount-${item.expenseItemId}`"
                v-model="item.amountInput"
                label="Média mensal"
                placeholder="0,00"
                prefix="R$"
                inputmode="decimal"
                hide-details="auto"
                class="flex-grow-1"
              /><v-text-field
                v-model="item.noteInput"
                label="Observação (opcional)"
                hide-details="auto"
                class="flex-grow-1"
              />
            </div>
            <div v-else class="text-body-2 text-medium-emphasis">
              Este item foi desativado pelo escritório após a criação do link e não será enviado.
            </div>
          </div></v-card
        ><v-card class="pa-5 pa-md-8 mb-5"
          ><h2 class="text-h6 mb-4">Orientações</h2>
          <div class="text-body-1 text-pre-wrap mb-6">{{ view.content.ibsCbsGuidance }}</div>
          <v-alert type="warning" variant="tonal"
            ><div class="text-body-2 text-pre-wrap">{{ view.content.taxNotice }}</div></v-alert
          ></v-card
        ><v-card class="pa-5 pa-md-8"
          ><v-checkbox
            v-model="confirmed"
            label="Confirmo que revisei os valores e autorizo o envio destas informações ao escritório."
            color="primary"
            hide-details
          /><v-alert v-if="submitError" type="error" variant="tonal" class="mt-4">{{
            submitError
          }}</v-alert
          ><v-btn
            block
            color="primary"
            size="large"
            class="mt-5"
            :loading="sending"
            :disabled="!canSubmit"
            @click="submit"
            >Confirmar e enviar</v-btn
          >
          <div class="text-caption text-medium-emphasis text-center mt-3">
            O link é de uso único e expira em
            {{ new Date(view.expiresAt).toLocaleDateString('pt-BR') }}.
          </div></v-card
        ></template
      ></v-container
    >
    <v-dialog v-model="incompleteDialog" max-width="520" persistent>
      <v-card>
        <v-card-title>Há valores não preenchidos</v-card-title>
        <v-card-text>
          Você ainda não informou a média mensal de uma ou mais despesas. Deseja enviar assim mesmo?
        </v-card-text>
        <v-card-actions class="flex-wrap ga-2 justify-end">
          <v-btn variant="text" @click="returnToFill">Voltar a preencher</v-btn>
          <v-btn color="primary" :loading="sending" @click="sendWithIncompleteValues"
            >Enviar mesmo assim</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </main>
</template>
