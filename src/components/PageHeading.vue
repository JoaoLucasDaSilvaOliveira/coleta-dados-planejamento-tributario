<script setup lang="ts">
defineProps({ title: { type: String, required: true }, subtitle: String })
</script>

<template>
  <div class="page-heading d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
    <div class="page-heading__copy">
      <h1 class="text-h4 font-weight-bold text-primary">{{ title }}</h1>
      <p v-if="subtitle" class="text-body-1 text-medium-emphasis mt-1">{{ subtitle }}</p>
    </div>
    <div class="page-heading__actions d-flex flex-wrap align-center ga-2">
      <slot />
    </div>
  </div>
</template>
