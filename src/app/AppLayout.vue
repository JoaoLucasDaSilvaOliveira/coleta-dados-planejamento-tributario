<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/auth.store'

const router = useRouter()
const auth = useAuthStore()
const isDesktop = ref(typeof window === 'undefined' || window.innerWidth >= 960)
const links = [
  { title: 'Empresas', to: '/empresas', icon: 'mdi-domain' },
  { title: 'Catálogo de despesas', to: '/despesas', icon: 'mdi-format-list-bulleted' },
  {
    title: 'Conteúdo do formulário',
    to: '/conteudo-formulario',
    icon: 'mdi-text-box-edit-outline',
  },
  { title: 'Auditoria', to: '/auditoria', icon: 'mdi-history', admin: true },
]
const visibleLinks = computed(() => links.filter((link) => !link.admin || auth.isAdmin))
const mobileLinks = computed(() => [
  ...visibleLinks.value,
  ...(auth.isAdmin
    ? [{ title: 'Usuários internos', to: '/usuarios', icon: 'mdi-account-group-outline' }]
    : []),
])
async function logout() {
  await auth.logout()
  await router.push('/login')
}
function updateViewport() {
  isDesktop.value = window.innerWidth >= 960
}
onMounted(() => window.addEventListener('resize', updateViewport))
onBeforeUnmount(() => window.removeEventListener('resize', updateViewport))
</script>

<template>
  <v-layout class="page-shell">
    <v-navigation-drawer
      v-if="isDesktop"
      permanent
      width="250"
      class="desktop-sidebar d-none d-md-flex"
    >
      <div class="pa-6">
        <div class="text-h6 font-weight-bold text-primary">Contabiehl</div>
        <div class="text-caption">Planejamento tributário 2027</div>
      </div>
      <v-list nav density="comfortable">
        <v-list-item
          v-for="link in visibleLinks"
          :key="link.to"
          :to="link.to"
          :prepend-icon="link.icon"
          :title="link.title"
        /><v-list-item
          v-if="auth.isAdmin"
          to="/usuarios"
          prepend-icon="mdi-account-group-outline"
          title="Usuários internos"
        />
      </v-list>
    </v-navigation-drawer>
    <v-app-bar flat border="b" color="surface" class="internal-app-bar">
      <v-app-bar-title class="text-subtitle-1 font-weight-bold">
        <span class="d-sm-none">Contabiehl</span>
        <span class="d-none d-sm-inline">Coleta de despesas</span>
      </v-app-bar-title
      ><v-spacer /><v-btn
        icon="mdi-account-circle-outline"
        aria-label="Abrir perfil"
        to="/perfil"
      /><v-btn icon="mdi-logout" aria-label="Sair" @click="logout" />
    </v-app-bar>
    <v-main class="internal-main">
      <v-container class="internal-page-container py-6 py-md-10" fluid>
        <RouterView />
      </v-container>
    </v-main>
    <v-bottom-navigation
      class="mobile-bottom-nav d-md-none"
      color="primary"
      grow
      elevation="6"
      aria-label="Navegação principal"
    >
      <v-btn
        v-for="link in mobileLinks"
        :key="link.to"
        :to="link.to"
        :value="link.to"
        :aria-label="link.title"
      >
        <v-icon :icon="link.icon" />
        <span class="mobile-bottom-nav__label">{{ link.title === 'Catálogo de despesas' ? 'Catálogo' : link.title }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-layout>
</template>
