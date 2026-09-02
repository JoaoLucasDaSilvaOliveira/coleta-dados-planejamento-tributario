<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeading from '@/components/PageHeading.vue'
import {
  companyInputSchema,
  createCompany,
  getCompany,
  updateCompany,
} from '@/features/companies/companies.service'
import { formatCnpj } from '@/lib/validation'
import { useAuthStore } from '@/features/auth/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const isNew = computed(
  () => route.params.companyId === undefined || route.params.companyId === 'nova',
)
const legalName = ref('')
const nickname = ref('')
const cnpj = ref('')
const loading = ref(false)
const loadingPage = ref(!isNew.value)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})
onMounted(async () => {
  if (!isNew.value) {
    const result = await getCompany(String(route.params.companyId))
    if (result.error || !result.data) error.value = 'Empresa não encontrada.'
    else {
      legalName.value = result.data.legal_name
      nickname.value = result.data.nickname ?? ''
      cnpj.value = formatCnpj(result.data.cnpj)
    }
  }
  loadingPage.value = false
})
async function submit() {
  fieldErrors.value = {}
  error.value = null
  const parsed = companyInputSchema.safeParse({
    legalName: legalName.value,
    nickname: nickname.value || undefined,
    cnpj: cnpj.value,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues)
      fieldErrors.value[String(issue.path[0])] = issue.message
    return
  }
  if (!auth.user) return
  loading.value = true
  const result = isNew.value
    ? await createCompany(parsed.data, auth.user.id)
    : await updateCompany(String(route.params.companyId), parsed.data, auth.user.id)
  loading.value = false
  if (result.error) {
    error.value =
      result.error.code === '23505'
        ? 'Já existe uma empresa com este CNPJ.'
        : 'Não foi possível salvar. Confira os dados e tente novamente.'
    return
  }
  await router.push(
    isNew.value ? `/empresas/${result.data.id}` : `/empresas/${route.params.companyId}`,
  )
}
</script>

<template>
  <PageHeading
    :title="isNew ? 'Cadastrar empresa' : 'Editar empresa'"
    subtitle="Os dados cadastrais ficam protegidos para uso interno."
  />
  <v-card max-width="760"
    ><v-card-text
      ><v-progress-linear v-if="loadingPage" indeterminate color="primary" /><v-form
        v-else
        @submit.prevent="submit"
        ><v-text-field
          v-model="legalName"
          label="Razão social"
          :error-messages="fieldErrors.legalName"
          required
          autocomplete="organization"
        /><v-text-field
          v-model="nickname"
          label="Apelido (opcional)"
          :error-messages="fieldErrors.nickname"
        /><v-text-field
          v-model="cnpj"
          label="CNPJ"
          :error-messages="fieldErrors.cnpj"
          maxlength="18"
          inputmode="numeric"
          required
          @update:model-value="cnpj = formatCnpj(cnpj)"
        />
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2">{{ error }}</v-alert>
        <div class="form-actions d-flex flex-wrap justify-end ga-3 mt-4">
          <v-btn variant="text" to="/empresas">Cancelar</v-btn
          ><v-btn color="primary" type="submit" :loading="loading">Salvar empresa</v-btn>
        </div></v-form
      ></v-card-text
    ></v-card
  >
</template>
