<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import StateMessage from '@/components/StateMessage.vue'
import {
  createExpenseItem,
  deleteExpenseItem,
  inspectExpenseItem,
  listExpenseItems,
  updateExpenseItem,
} from '@/features/expenses/expenses.service'
import { useAuthStore } from '@/features/auth/auth.store'
type Item = {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  deactivated_at: string | null
}
const auth = useAuthStore()
const items = ref<Item[]>([])
const showInactive = ref(false)
const dialog = ref(false)
const editing = ref<Item | null>(null)
const name = ref('')
const pageError = ref<string | null>(null)
const formError = ref<string | null>(null)
const nameError = ref<string | null>(null)
const actionErrors = ref<Record<string, string>>({})
const loading = ref(true)
const saving = ref(false)
const removalDialog = ref(false)
const removalTarget = ref<Item | null>(null)
const removalAction = ref<'DELETED' | 'DEACTIVATED' | null>(null)
const removalError = ref<string | null>(null)
const removing = ref(false)
const movingIds = ref(new Set<string>())
const visibleItems = computed(() =>
  items.value.filter((item) => showInactive.value || item.is_active),
)
async function load() {
  loading.value = true
  const result = await listExpenseItems(true)
  items.value = (result.data ?? []) as Item[]
  if (result.error) pageError.value = 'Não foi possível carregar o catálogo.'
  loading.value = false
}
function openNew() {
  editing.value = null
  name.value = ''
  formError.value = null
  nameError.value = null
  dialog.value = true
}
function openEdit(item: Item) {
  editing.value = item
  name.value = item.name
  formError.value = null
  nameError.value = null
  dialog.value = true
}
async function save() {
  if (!auth.user || name.value.trim().length < 2) {
    nameError.value = 'Informe um nome com pelo menos 2 caracteres.'
    return
  }
  nameError.value = null
  formError.value = null
  saving.value = true
  const result = editing.value
    ? await updateExpenseItem(editing.value.id, { name: name.value.trim() }, auth.user.id)
    : await createExpenseItem(name.value, auth.user.id, items.value.length + 1)
  saving.value = false
  if (result.error) {
    formError.value =
      result.error.code === '23505'
        ? 'Já existe um item ativo com este nome.'
        : 'Não foi possível salvar o item.'
    return
  }
  dialog.value = false
  await load()
}
async function toggle(item: Item) {
  if (!auth.user) return
  delete actionErrors.value[item.id]
  if (
    item.is_active &&
    !window.confirm(
      'Desativar este item? Ele permanecerá visível nos históricos, mas sairá de novas seleções.',
    )
  )
    return
  const result = await updateExpenseItem(item.id, { is_active: !item.is_active }, auth.user.id)
  if (result.error)
    actionErrors.value = {
      ...actionErrors.value,
      [item.id]: 'Não foi possível alterar o estado do item.',
    }
  else await load()
}
async function requestRemoval(item: Item) {
  if (!auth.user) return
  delete actionErrors.value[item.id]
  removalError.value = null
  const result = await inspectExpenseItem(item.id)
  if (result.error || !result.data) {
    actionErrors.value = {
      ...actionErrors.value,
      [item.id]: 'Não foi possível verificar o uso do item.',
    }
    return
  }
  removalTarget.value = item
  removalAction.value = result.data.canDelete ? 'DELETED' : 'DEACTIVATED'
  removalDialog.value = true
}
async function confirmRemoval() {
  if (!auth.user || !removalTarget.value || !removalAction.value) return
  removing.value = true
  removalError.value = null
  const target = removalTarget.value
  const expectedAction = removalAction.value
  const result = await deleteExpenseItem(target.id, auth.user.id, expectedAction)
  removing.value = false
  if (result.error || !result.data) {
    removalError.value = 'Não foi possível concluir a ação. Feche e tente novamente.'
    return
  }
  if (result.data.status === 'DELETED') {
    items.value = items.value.filter((item) => item.id !== target.id)
  } else {
    target.is_active = false
    target.deactivated_at = new Date().toISOString()
  }
  removalDialog.value = false
  removalTarget.value = null
  removalAction.value = null
}
async function move(item: Item, direction: -1 | 1) {
  if (!auth.user) return
  delete actionErrors.value[item.id]
  const visibleIndex = visibleItems.value.findIndex((entry) => entry.id === item.id)
  const other = visibleItems.value[visibleIndex + direction]
  const index = items.value.findIndex((entry) => entry.id === item.id)
  const otherIndex = other ? items.value.findIndex((entry) => entry.id === other.id) : -1
  if (!other || movingIds.value.has(item.id) || movingIds.value.has(other.id)) return
  if (index < 0 || otherIndex < 0) return

  const itemOrder = item.sort_order
  const otherOrder = other.sort_order
  const nextItems = [...items.value]
  ;[nextItems[index], nextItems[otherIndex]] = [nextItems[otherIndex], nextItems[index]]
  item.sort_order = otherOrder
  other.sort_order = itemOrder
  items.value = nextItems

  const nextMovingIds = new Set(movingIds.value)
  nextMovingIds.add(item.id)
  nextMovingIds.add(other.id)
  movingIds.value = nextMovingIds

  const first = await updateExpenseItem(item.id, { sort_order: otherOrder }, auth.user.id)
  const second = await updateExpenseItem(other.id, { sort_order: itemOrder }, auth.user.id)
  const movingFinished = new Set(movingIds.value)
  movingFinished.delete(item.id)
  movingFinished.delete(other.id)
  movingIds.value = movingFinished

  if (first.error || second.error) {
    item.sort_order = itemOrder
    other.sort_order = otherOrder
    const rollbackItems = [...items.value]
    ;[rollbackItems[index], rollbackItems[otherIndex]] = [rollbackItems[otherIndex], rollbackItems[index]]
    items.value = rollbackItems
    actionErrors.value = {
      ...actionErrors.value,
      [item.id]: 'Não foi possível reordenar o catálogo. A posição original foi restaurada.',
    }
  }
}
onMounted(() => void load())
</script>
<template>
  <PageHeading
    title="Catálogo de despesas"
    subtitle="Um catálogo global, com IDs estáveis e exclusão lógica."
    ><v-btn color="primary" prepend-icon="mdi-plus" @click="openNew">Novo item</v-btn></PageHeading
  >
  <v-card class="pa-4 pa-md-6"
    ><div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
      <div class="text-body-2 text-medium-emphasis">
        {{ items.filter((item) => item.is_active).length }} itens ativos
      </div>
      <v-switch
        v-model="showInactive"
        label="Mostrar inativos"
        color="primary"
        hide-details
        inset
      />
    </div>
    <v-alert v-if="pageError" type="error" variant="tonal" class="mb-4">{{ pageError }}</v-alert
    ><v-progress-linear v-if="loading" indeterminate color="primary" /><StateMessage
      v-else-if="!visibleItems.length"
      title="Nenhum item para exibir"
      text="Adicione uma despesa ou ative os itens arquivados."
      icon="mdi-format-list-bulleted-square" /><v-list v-else lines="two"
      ><v-list-item
        v-for="(item, index) in visibleItems"
        :key="item.id"
        :class="{ 'bg-grey-lighten-4': !item.is_active }"
        ><template #prepend
          ><v-avatar :color="item.is_active ? 'primary' : 'grey'" variant="tonal" size="38"
            ><span class="text-caption font-weight-bold">{{ index + 1 }}</span></v-avatar
          ></template
        ><v-list-item-title
          >{{ item.name }}
          <v-chip v-if="!item.is_active" size="x-small" variant="tonal" color="secondary"
            >Inativo</v-chip
          ></v-list-item-title
        ><v-list-item-subtitle>{{
          item.is_active ? 'Disponível para seleção' : 'Mantido para preservar históricos'
        }}</v-list-item-subtitle
        ><v-alert v-if="actionErrors[item.id]" type="error" variant="tonal" density="compact" class="mt-2">{{ actionErrors[item.id] }}</v-alert
        ><div class="catalog-actions">
            <v-btn
              icon="mdi-arrow-up"
              size="small"
              variant="text"
              aria-label="Mover para cima"
              :disabled="index === 0 || movingIds.has(item.id)"
              @click="move(item, -1)"
            /><v-btn
              icon="mdi-arrow-down"
              size="small"
              variant="text"
              aria-label="Mover para baixo"
              :disabled="index === visibleItems.length - 1 || movingIds.has(item.id)"
              @click="move(item, 1)"
            /><v-btn
              icon="mdi-pencil-outline"
              size="small"
              variant="text"
              aria-label="Renomear item"
              @click="openEdit(item)"
            /><v-btn
              v-if="item.is_active"
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              aria-label="Excluir item"
              @click="requestRemoval(item)"
            /><v-btn
              v-if="!item.is_active"
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              aria-label="Excluir item"
              @click="requestRemoval(item)"
            /><v-btn
              v-if="!item.is_active"
              icon="mdi-archive-arrow-up-outline"
              size="small"
              variant="text"
              aria-label="Reativar item"
              @click="toggle(item)"
            /></div></v-list-item></v-list
  ></v-card>
  <v-dialog v-model="dialog" max-width="520"
    ><v-card
      ><v-card-title>{{ editing ? 'Renomear item' : 'Novo item de despesa' }}</v-card-title
      ><v-card-text
        ><v-alert type="info" variant="tonal" class="mb-4"
          >A alteração afeta o catálogo global e todas as empresas.</v-alert
        ><v-text-field
          v-model="name"
          label="Nome do item"
          maxlength="160"
          autofocus
          :error-messages="nameError ? [nameError] : []"
          @keyup.enter="save" /></v-card-text
      ><v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mx-4 mb-3">{{ formError }}</v-alert
      ><v-card-actions
        ><v-spacer /><v-btn variant="text" @click="dialog = false">Cancelar</v-btn
        ><v-btn color="primary" :loading="saving" @click="save">Salvar</v-btn></v-card-actions
      ></v-card
    ></v-dialog
  ><v-dialog v-model="removalDialog" max-width="520" persistent
    ><v-card
      ><v-card-title>{{
        removalAction === 'DELETED' ? 'Excluir item definitivamente' : 'Inativar item'
      }}</v-card-title
      ><v-card-text
        ><p v-if="removalAction === 'DELETED'">
          O item “{{ removalTarget?.name }}” não possui referências e será excluído de fato. Essa ação não poderá ser desfeita.
        </p
        ><p v-else>
          O item “{{ removalTarget?.name }}” possui referências e será inativado. Ele continuará visível nos históricos.
        </p
        ><v-alert v-if="removalError" type="error" variant="tonal" class="mt-4">{{ removalError }}</v-alert></v-card-text
      ><v-card-actions
        ><v-spacer /><v-btn variant="text" :disabled="removing" @click="removalDialog = false">Cancelar</v-btn
        ><v-btn color="primary" :loading="removing" @click="confirmRemoval">{{
          removalAction === 'DELETED' ? 'Excluir definitivamente' : 'Inativar item'
        }}</v-btn></v-card-actions
      ></v-card
    ></v-dialog
  >
</template>
