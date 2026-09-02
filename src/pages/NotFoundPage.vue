<script setup lang="ts">
import StateMessage from '@/components/StateMessage.vue'
</script>
<template>
  <main class="page-shell d-flex align-center justify-center pa-6">
    <StateMessage
      title="Página não encontrada"
      text="O endereço informado não existe ou foi removido."
      icon="mdi-map-marker-question-outline"
    >
      <v-btn to="/" color="primary" class="mt-4"> Voltar ao início </v-btn>
    </StateMessage>
  </main>
</template>
