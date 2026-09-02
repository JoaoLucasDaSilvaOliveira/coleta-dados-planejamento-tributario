<script setup lang="ts">
defineProps({ title: { type: String, required: true }, text: String, icon: String })
</script>

<template>
  <div class="text-center py-12 px-4">
    <v-icon :icon="icon ?? 'mdi-information-outline'" size="48" color="primary" class="mb-3" />
    <div class="text-h6">{{ title }}</div>
    <p v-if="text" class="text-body-2 text-medium-emphasis mt-2">{{ text }}</p>
    <slot />
  </div>
</template>
