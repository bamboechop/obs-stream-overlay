<template>
  <section class="items-center flex h-full justify-center">
    <Schedule :active />
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import Schedule from '@/components/schedule/Schedule.vue';
import { useApplicationStore } from '@/stores/application.store';

const applicationStore = useApplicationStore();
const { activeProgramId } = storeToRefs(applicationStore);

const active = computed(() => activeProgramId.value === 'schedule');
</script>

<style scoped>
@reference 'tailwindcss';

:global(body) {
  @apply h-screen;
}

:global(#app) {
  @apply h-full;
}
</style>
