<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import StateMessage from '@/components/StateMessage.vue'
import { listUsers, manageUser, type ManagedUser } from '@/features/users/users.service'
import { displayNameSchema, passwordSchema, usernameSchema } from '@/lib/validation'
import { userManagementErrorMessage } from '@/lib/errors'
const users = ref<ManagedUser[]>([])
const loading = ref(true)
const saving = ref(false)
const pageError = ref<string | null>(null)
const formError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})
const actionErrors = ref<Record<string, string>>({})
const dialog = ref(false)
const editing = ref<ManagedUser | null>(null)
const username = ref('')
const displayName = ref('')
const password = ref('')
const showPassword = ref(false)
const labels: Record<string, string> = { ACTIVE: 'Ativo', INACTIVE: 'Inativo', DELETED: 'Excluído' }
async function load() {
  loading.value = true
  const result = await listUsers()
  users.value = (result.data ?? []) as ManagedUser[]
  if (result.error) pageError.value = 'Não foi possível carregar os usuários.'
  loading.value = false
}
function openNew() {
  editing.value = null
  username.value = ''
  displayName.value = ''
  password.value = ''
  formError.value = null
  fieldErrors.value = {}
  dialog.value = true
}
function openEdit(user: ManagedUser) {
  editing.value = user
  username.value = user.username
  displayName.value = user.display_name
  password.value = ''
  formError.value = null
  fieldErrors.value = {}
  dialog.value = true
}
async function save() {
  formError.value = null
  fieldErrors.value = {}
  const nextFieldErrors: Record<string, string> = {}
  const usernameResult = usernameSchema.safeParse(username.value)
  if (!usernameResult.success) nextFieldErrors.username = usernameResult.error.issues[0].message
  const displayNameResult = displayNameSchema.safeParse(displayName.value)
  if (!displayNameResult.success)
    nextFieldErrors.displayName = 'Informe um nome com 2 a 100 caracteres.'
  if (!editing.value) {
    const passwordResult = passwordSchema.safeParse(password.value)
    if (!passwordResult.success) nextFieldErrors.password = passwordResult.error.issues[0].message
  }
  if (Object.keys(nextFieldErrors).length) {
    fieldErrors.value = nextFieldErrors
    return
  }
  const normalizedUsername = usernameResult.success ? usernameResult.data : ''
  const normalizedDisplayName = displayNameResult.success ? displayNameResult.data : ''
  saving.value = true
  const body = editing.value
    ? {
        action: 'rename',
        userId: editing.value.id,
        username: normalizedUsername,
        displayName: normalizedDisplayName,
      }
    : {
        action: 'create',
        username: normalizedUsername,
        displayName: normalizedDisplayName,
        password: password.value,
      }
  const result = await manageUser(body)
  saving.value = false
  if (result.error) formError.value = userManagementErrorMessage(result.error)
  else {
    dialog.value = false
    await load()
  }
}
async function reset(user: ManagedUser) {
  const next = window.prompt('Informe a nova senha temporária (mínimo de 6 caracteres).')
  if (!next || !passwordSchema.safeParse(next).success) {
    actionErrors.value = {
      ...actionErrors.value,
      [user.id]: 'A nova senha deve ter pelo menos 6 caracteres.',
    }
    return
  }
  const result = await manageUser({ action: 'reset-password', userId: user.id, password: next })
  if (result.error)
    actionErrors.value = { ...actionErrors.value, [user.id]: 'Não foi possível redefinir a senha.' }
}
async function toggle(user: ManagedUser) {
  delete actionErrors.value[user.id]
  const action = user.status === 'ACTIVE' ? 'deactivate' : 'activate'
  if (!window.confirm(`${action === 'deactivate' ? 'Desativar' : 'Ativar'} ${user.display_name}?`))
    return
  const result = await manageUser({ action, userId: user.id })
  if (result.error)
    actionErrors.value = { ...actionErrors.value, [user.id]: 'Não foi possível alterar o acesso.' }
  else await load()
}
async function remove(user: ManagedUser) {
  delete actionErrors.value[user.id]
  if (
    !window.confirm(
      `Excluir ${user.display_name}? O acesso e a identidade de autenticação serão removidos. A autoria histórica será preservada somente para auditoria.`,
    )
  )
    return
  const result = await manageUser({ action: 'delete', userId: user.id })
  if (result.error)
    actionErrors.value = { ...actionErrors.value, [user.id]: 'Não foi possível excluir o usuário.' }
  else users.value = users.value.filter((entry) => entry.id !== user.id)
}
onMounted(() => void load())
</script>
<template>
  <PageHeading
    title="Usuários internos"
    subtitle="Administre acessos sem consultar ou expor senhas."
    ><v-btn color="primary" prepend-icon="mdi-account-plus-outline" @click="openNew"
      >Novo usuário</v-btn
    ></PageHeading
  >
  <v-card class="pa-4 pa-md-6"
    ><v-alert v-if="pageError" type="error" variant="tonal" class="mb-4">{{ pageError }}</v-alert
    ><v-progress-linear v-if="loading" indeterminate color="primary" /><StateMessage
      v-else-if="!users.length"
      title="Nenhum usuário adicional"
      text="Crie um acesso para outro Usuário interno."
      icon="mdi-account-group-outline" /><v-list v-else lines="two"
      ><v-list-item v-for="user in users" :key="user.id"
        ><template #prepend
          ><v-avatar color="primary" variant="tonal">{{
            user.display_name.slice(0, 1).toUpperCase()
          }}</v-avatar></template
        ><v-list-item-title
          >{{ user.display_name }}
          <v-chip size="x-small" variant="tonal">{{
            user.role === 'ADMIN' ? 'Administrador principal' : labels[user.status]
          }}</v-chip></v-list-item-title
        ><v-list-item-subtitle>{{ user.username }}</v-list-item-subtitle
        ><v-alert v-if="actionErrors[user.id]" type="error" variant="tonal" density="compact" class="mt-2">{{ actionErrors[user.id] }}</v-alert
        ><div v-if="user.role !== 'ADMIN'" class="user-actions">
            <v-btn
              icon="mdi-pencil-outline"
              size="small"
              variant="text"
              aria-label="Editar usuário"
              @click="openEdit(user)"
            /><v-btn
              icon="mdi-key-outline"
              size="small"
              variant="text"
              aria-label="Redefinir senha"
              @click="reset(user)"
            /><v-btn
              :icon="
                user.status === 'ACTIVE' ? 'mdi-account-off-outline' : 'mdi-account-check-outline'
              "
              size="small"
              variant="text"
              :aria-label="user.status === 'ACTIVE' ? 'Desativar usuário' : 'Ativar usuário'"
              @click="toggle(user)"
            /><v-btn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              color="error"
              aria-label="Excluir usuário"
              @click="remove(user)"
            /></div></v-list-item></v-list
  ></v-card>
  <v-dialog v-model="dialog" max-width="520"
    ><v-card
      ><v-card-title>{{ editing ? 'Editar usuário' : 'Novo usuário interno' }}</v-card-title
      ><v-card-text
        ><v-text-field v-model="displayName" label="Nome de exibição" :error-messages="fieldErrors.displayName ? [fieldErrors.displayName] : []" /><v-text-field
          v-model="username"
          label="Nome de usuário"
          autocomplete="username"
          :error-messages="fieldErrors.username ? [fieldErrors.username] : []"
        /><v-text-field
          v-if="!editing"
          v-model="password"
          label="Senha inicial"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          autocomplete="new-password"
          :error-messages="fieldErrors.password ? [fieldErrors.password] : []"
          @click:append-inner="showPassword = !showPassword"
        />
        <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mb-3">{{ formError }}</v-alert>
        <div class="text-caption text-medium-emphasis">
          A senha deve ter pelo menos 6 caracteres e não será exibida novamente.
        </div></v-card-text
      ><v-card-actions
        ><v-spacer /><v-btn variant="text" @click="dialog = false">Cancelar</v-btn
        ><v-btn color="primary" :loading="saving" @click="save">Salvar</v-btn></v-card-actions
      ></v-card
    ></v-dialog
  >
</template>
