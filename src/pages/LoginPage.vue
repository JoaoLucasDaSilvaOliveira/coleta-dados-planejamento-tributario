<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/auth.store'
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
async function submit() {
  if (await auth.login(username.value, password.value))
    await router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/empresas')
}
</script>
<template>
  <main class="page-shell d-flex align-center justify-center pa-4">
    <v-card max-width="460" width="100%" elevation="4" class="pa-6 pa-md-10">
      <div class="text-center mb-8">
        <v-avatar color="primary" size="64" class="mb-4">
          <v-icon icon="mdi-chart-box-outline" size="32" />
        </v-avatar>
        <div class="text-h5 font-weight-bold text-primary">Contabiehl</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          Coleta de despesas · planejamento 2027
        </div>
      </div>
      <h1 class="text-h6 mb-1">Acesso interno</h1>
      <p class="text-body-2 text-medium-emphasis mb-6">
        Entre para administrar empresas e solicitações.
      </p>
      <v-alert v-if="auth.error" type="error" variant="tonal" class="mb-4" role="alert">
        {{ auth.error }} </v-alert
      ><v-form @submit.prevent="submit">
        <v-text-field
          v-model="username"
          label="Nome de usuário"
          autocomplete="username"
          prepend-inner-icon="mdi-account-outline"
          required
        /><v-text-field
          v-model="password"
          label="Senha"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          prepend-inner-icon="mdi-lock-outline"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          required
          @click:append-inner="showPassword = !showPassword"
        /><v-btn
          type="submit"
          color="primary"
          size="large"
          block
          :loading="auth.loading"
          class="mt-2"
        >
          Entrar
        </v-btn>
      </v-form>
    </v-card>
  </main>
</template>
