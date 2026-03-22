<template>
  <NextGame :active />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import NextGame from '@/components/next-game/NextGame.vue';
import { useApplicationStore } from '@/stores/application.store';

const applicationStore = useApplicationStore();
const { activeProgramId } = storeToRefs(applicationStore);

const active = computed(() => activeProgramId.value === 'next-game');
</script>
