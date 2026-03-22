<template>
  <section class="items-center flex h-full justify-center">
    <Schedule :active />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useApplicationStore } from '@/stores/application.store';
import Schedule from '@/components/schedule/Schedule.vue';

const applicationStore = useApplicationStore();
const { activeProgramId } = storeToRefs(applicationStore);

const active = computed(() => activeProgramId.value === 'schedule');
</script>
