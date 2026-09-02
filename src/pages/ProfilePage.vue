<script setup lang="ts">
import { ref } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import { useAuthStore } from '@/features/auth/auth.store'
import { passwordSchema } from '@/lib/validation'
const auth = useAuthStore()
const password = ref('')
const confirmation = ref('')
const saving = ref(false)
const saved = ref(false)
const formError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})
async function changePassword() {
  saved.value = false
  formError.value = null
  fieldErrors.value = {}
  const nextFieldErrors: Record<string, string> = {}
  const passwordResult = passwordSchema.safeParse(password.value)
  if (!passwordResult.success) nextFieldErrors.password = passwordResult.error.issues[0].message
  if (password.value !== confirmation.value)
    nextFieldErrors.confirmation = 'As senhas devem ser iguais.'
  if (Object.keys(nextFieldErrors).length) {
    fieldErrors.value = nextFieldErrors
    return
  }
  saving.value = true
  const result = await auth.changePassword(password.value)
  saving.value = false
  if (result)
    formError.value = 'Não foi possível alterar a senha. Tente novamente em uma sessão recente.'
  else {
    password.value = ''
    confirmation.value = ''
    saved.value = true
  }
}
</script>
<template>
  <PageHeading title="Meu perfil" subtitle="Confira seus dados e mantenha sua senha atualizada." />
  <v-row
    ><v-col cols="12" md="5"
      ><v-card class="pa-5"
        ><div class="d-flex align-center ga-4">
          <v-avatar color="primary" size="56">{{
            auth.user?.display_name.slice(0, 1).toUpperCase()
          }}</v-avatar>
          <div>
            <div class="text-h6">{{ auth.user?.display_name }}</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ auth.user?.username }} ·
              {{ auth.user?.role === 'ADMIN' ? 'Administrador principal' : 'Usuário interno' }}
            </div>
          </div>
        </div></v-card
      ></v-col
    ><v-col cols="12" md="7"
      ><v-card class="pa-5"
        ><div class="text-h6 mb-1">Alterar senha</div>
        <p class="text-body-2 text-medium-emphasis mb-5">
          Use uma senha com pelo menos 6 caracteres. Nunca reutilize a senha temporária.
        </p>
        ><v-alert v-if="saved" type="success" variant="tonal" class="mb-4"
          >Senha alterada com sucesso.</v-alert
        ><v-form @submit.prevent="changePassword"
          ><v-text-field
            v-model="password"
            label="Nova senha"
            type="password"
            autocomplete="new-password"
            :error-messages="fieldErrors.password ? [fieldErrors.password] : []"
          /><v-text-field
            v-model="confirmation"
            label="Confirme a nova senha"
            type="password"
            autocomplete="new-password"
            :error-messages="fieldErrors.confirmation ? [fieldErrors.confirmation] : []"
          /><v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mb-4">{{ formError }}</v-alert
          ><v-btn type="submit" color="primary" :loading="saving">Alterar senha</v-btn></v-form
        ></v-card
      ></v-col
    ></v-row
  >
</template>
