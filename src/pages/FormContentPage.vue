<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import {
  formContentSchema,
  getFormContent,
  updateFormContent,
  type FormContent,
} from '@/features/form-content/form-content.service'
import { useAuthStore } from '@/features/auth/auth.store'
const auth = useAuthStore()
const content = reactive<FormContent>({
  title: '',
  introduction: '',
  ibsCbsGuidance: '',
  taxNotice: '',
  successMessage: '',
})
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const pageError = ref<string | null>(null)
const formError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})
async function load() {
  const result = await getFormContent()
  if (result.error || !result.data) pageError.value = 'Não foi possível carregar o conteúdo.'
  else
    Object.assign(content, {
      title: result.data.title,
      introduction: result.data.introduction,
      ibsCbsGuidance: result.data.ibs_cbs_guidance,
      taxNotice: result.data.tax_notice,
      successMessage: result.data.success_message,
    })
  loading.value = false
}
async function save() {
  formError.value = null
  fieldErrors.value = {}
  saved.value = false
  const parsed = formContentSchema.safeParse(content)
  if (!parsed.success) {
    const nextFieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues)
      nextFieldErrors[String(issue.path[0])] = issue.message || 'Preencha este campo.'
    fieldErrors.value = nextFieldErrors
    return
  }
  if (!auth.user) return
  saving.value = true
  const result = await updateFormContent(parsed.data, auth.user.id)
  saving.value = false
  if (result.error) formError.value = 'Não foi possível salvar o conteúdo.'
  else saved.value = true
}
onMounted(() => void load())
</script>
<template>
  <PageHeading
    title="Conteúdo do formulário"
    subtitle="Texto simples, editável pelo escritório e nunca interpretado como HTML."
    ><v-btn color="primary" :loading="saving" prepend-icon="mdi-content-save-outline" @click="save"
      >Salvar conteúdo</v-btn
    ></PageHeading
  >
  <v-progress-linear v-if="loading" indeterminate color="primary" /><template v-else
    ><v-alert v-if="pageError" type="error" variant="tonal" class="mb-5">{{ pageError }}</v-alert
    ><v-alert v-if="saved" type="success" variant="tonal" class="mb-5"
      >Conteúdo salvo. A próxima solicitação usará esta versão.</v-alert
    ><v-row
      ><v-col cols="12" md="7"
        ><v-card class="pa-4 pa-md-6"
          ><v-text-field v-model="content.title" label="Título" maxlength="10000" :error-messages="fieldErrors.title ? [fieldErrors.title] : []" /><v-textarea
            v-model="content.introduction"
            label="Introdução"
            rows="4"
            maxlength="10000"
            :error-messages="fieldErrors.introduction ? [fieldErrors.introduction] : []" /><v-textarea
            v-model="content.ibsCbsGuidance"
            label="Orientações IBS/CBS"
            rows="8"
            maxlength="10000"
            :error-messages="fieldErrors.ibsCbsGuidance ? [fieldErrors.ibsCbsGuidance] : []" /><v-textarea
            v-model="content.taxNotice"
            label="Aviso fiscal"
            rows="5"
            maxlength="10000"
            :error-messages="fieldErrors.taxNotice ? [fieldErrors.taxNotice] : []" /><v-textarea
            v-model="content.successMessage"
            label="Mensagem final"
            rows="3"
            maxlength="10000"
            :error-messages="fieldErrors.successMessage ? [fieldErrors.successMessage] : []" /><v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mt-4">{{ formError }}</v-alert></v-card></v-col
      ><v-col cols="12" md="5"
        ><v-card variant="tonal" color="primary" class="pa-5"
          ><div class="text-overline mb-2">Pré-visualização segura</div>
          <div class="text-h6 mb-4">{{ content.title }}</div>
          <div class="text-body-2 text-pre-wrap mb-5">{{ content.introduction }}</div>
          <v-divider class="mb-5" />
          <div class="text-subtitle-2 mb-2">Orientações</div>
          <div class="text-body-2 text-pre-wrap mb-5">{{ content.ibsCbsGuidance }}</div>
          <div class="text-subtitle-2 mb-2">Aviso fiscal</div>
          <div class="text-body-2 text-pre-wrap">{{ content.taxNotice }}</div></v-card
        ></v-col
      ></v-row
    ></template
  >
</template>
