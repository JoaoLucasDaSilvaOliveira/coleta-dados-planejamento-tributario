<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import StateMessage from '@/components/StateMessage.vue'
import { listAuditEvents, type AuditFilters } from '@/features/audit/audit.service'

type AuditEvent = {
  id: string
  actor_type: string
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
}

const events = ref<AuditEvent[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const page = ref(0)
const hasMore = ref(false)
const filters = reactive<AuditFilters>({
  fromDate: '',
  toDate: '',
  actorType: '',
  action: '',
  entityType: '',
})
const actorLabels: Record<string, string> = {
  INTERNAL_USER: 'Usuário interno',
  RESPONDENT: 'Respondente',
  SYSTEM: 'Sistema',
}
const actorOptions = [
  { title: 'Todos', value: '' },
  ...Object.entries(actorLabels).map(([value, title]) => ({ title, value })),
]

async function load() {
  loading.value = true
  error.value = null
  const result = await listAuditEvents(page.value, 50, filters)
  events.value = (result.data ?? []) as AuditEvent[]
  hasMore.value = (result.count ?? 0) > (page.value + 1) * 50
  if (result.error) error.value = 'Não foi possível carregar a auditoria.'
  loading.value = false
}

async function applyFilters() {
  page.value = 0
  await load()
}

async function clearFilters() {
  filters.fromDate = ''
  filters.toDate = ''
  filters.actorType = ''
  filters.action = ''
  filters.entityType = ''
  await applyFilters()
}

async function changePage(nextPage: number) {
  page.value = nextPage
  await load()
}

onMounted(() => void load())
</script>

<template>
  <PageHeading title="Auditoria" subtitle="Acompanhe ações internas sensíveis." />
  <v-card class="pa-4 pa-md-6">
    <v-form class="mb-5" @submit.prevent="applyFilters">
      <div class="filter-grid">
        <v-text-field v-model="filters.fromDate" type="date" label="De" clearable />
        <v-text-field v-model="filters.toDate" type="date" label="Até" clearable />
        <v-select v-model="filters.actorType" label="Ator" :items="actorOptions" />
        <v-text-field
          v-model="filters.entityType"
          label="Entidade"
          placeholder="company"
          clearable
        />
        <v-text-field v-model="filters.action" label="Ação" placeholder="create" clearable />
        <div class="d-flex align-center ga-2">
          <v-btn color="primary" type="submit" :loading="loading">Filtrar</v-btn>
          <v-btn variant="text" type="button" @click="clearFilters">Limpar</v-btn>
        </div>
      </div>
    </v-form>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <StateMessage
      v-else-if="!events.length"
      title="Nenhum evento para exibir"
      text="Ajuste os filtros ou aguarde novas ações de negócio."
      icon="mdi-shield-check-outline"
    />
    <template v-else>
      <v-list class="d-md-none" lines="two">
        <v-list-item v-for="event in events" :key="event.id" class="border-b">
          <v-list-item-title>{{ event.action }} · {{ event.entity_type }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ new Date(event.created_at).toLocaleString('pt-BR') }} ·
            {{ actorLabels[event.actor_type] || event.actor_type }}
          </v-list-item-subtitle>
          <div class="text-caption text-medium-emphasis text-break mt-1">
            {{ event.entity_id || 'Sem identificador' }}
          </div>
        </v-list-item>
      </v-list>
      <div class="table-scroll d-none d-md-block">
        <v-table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Ator</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Identificador</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in events" :key="event.id">
              <td>{{ new Date(event.created_at).toLocaleString('pt-BR') }}</td>
              <td>{{ actorLabels[event.actor_type] || event.actor_type }}</td>
              <td>{{ event.action }}</td>
              <td>{{ event.entity_type }}</td>
              <td class="text-caption">{{ event.entity_id || '—' }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </template>
    <div v-if="events.length" class="d-flex justify-end ga-2 mt-4">
      <v-btn variant="text" :disabled="page === 0 || loading" @click="changePage(page - 1)">
        Anterior
      </v-btn>
      <v-btn variant="text" :disabled="!hasMore || loading" @click="changePage(page + 1)">
        Próxima
      </v-btn>
    </div>
  </v-card>
</template>
