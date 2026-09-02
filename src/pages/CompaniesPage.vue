<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import StateMessage from '@/components/StateMessage.vue'
import { listCompanies, type Company } from '@/features/companies/companies.service'
import { formatCnpj } from '@/lib/validation'

const companies = ref<Company[]>([])
const search = ref('')
const loading = ref(true)
const error = ref<string | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
async function load() {
  loading.value = true
  error.value = null
  const result = await listCompanies(search.value)
  if (result.error) error.value = 'Não foi possível carregar as empresas. Tente novamente.'
  companies.value = (result.data ?? []) as Company[]
  loading.value = false
}
watch(search, () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void load(), 250)
})
onMounted(() => void load())
</script>

<template>
  <PageHeading
    title="Empresas"
    subtitle="Organize as despesas e coletas do planejamento tributário."
  >
    <v-btn color="primary" prepend-icon="mdi-plus" to="/empresas/nova">Cadastrar empresa</v-btn>
  </PageHeading>
  <v-card class="pa-4 pa-md-6">
    <v-text-field
      v-model="search"
      label="Buscar por razão social, apelido ou CNPJ"
      prepend-inner-icon="mdi-magnify"
      clearable
      hide-details="auto"
    />
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mt-2" />
    <v-alert v-else-if="error" type="error" variant="tonal" class="mt-4" closable>{{
      error
    }}</v-alert>
    <StateMessage
      v-else-if="!companies.length"
      title="Nenhuma empresa encontrada"
      text="Cadastre a primeira empresa para começar a configurar suas despesas."
      icon="mdi-domain-plus"
      ><v-btn to="/empresas/nova" color="primary" class="mt-4"
        >Cadastrar empresa</v-btn
      ></StateMessage
    >
    <div v-else class="mt-4">
      <v-list lines="two" class="d-md-none">
        <v-list-item
          v-for="company in companies"
          :key="company.id"
          :to="`/empresas/${company.id}`"
          rounded="lg"
          class="mb-2 border"
        >
          <v-list-item-title class="font-weight-medium">{{ company.legal_name }}</v-list-item-title>
          <v-list-item-subtitle
            >{{ company.nickname || 'Sem apelido' }} ·
            {{ formatCnpj(company.cnpj) }}</v-list-item-subtitle
          >
          <template #append><v-icon icon="mdi-chevron-right" /></template>
        </v-list-item>
      </v-list>
      <v-table class="d-none d-md-table"
        ><thead>
          <tr>
            <th>Razão social</th>
            <th>Apelido</th>
            <th>CNPJ</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="company in companies" :key="company.id">
            <td>{{ company.legal_name }}</td>
            <td>{{ company.nickname || '—' }}</td>
            <td>{{ formatCnpj(company.cnpj) }}</td>
            <td class="text-right">
              <v-btn :to="`/empresas/${company.id}`" variant="text" color="primary"
                >Abrir ficha</v-btn
              >
            </td>
          </tr>
        </tbody></v-table
      >
    </div>
  </v-card>
</template>
