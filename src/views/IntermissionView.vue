<template>
  <Intermission
    :active
    :mode />
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import Intermission from '@/components/intermission/Intermission.vue';
import { useEventStreamComposable } from '@/composables/event-stream.composable';
import { useSearchParamsComposable } from '@/composables/search-params.composable';
import { useTwitchStreamInfoComposable } from '@/composables/twitch-stream-info.composable';
import { useApplicationStore } from '@/stores/application.store';

const { mode } = useSearchParamsComposable();

useEventStreamComposable();
useTwitchStreamInfoComposable(false);

const applicationStore = useApplicationStore();
const { activeProgramId } = storeToRefs(applicationStore);

const modes = ['start', 'end', 'intermission'];

const active = computed(() => {
  const currentActive = activeProgramId.value;
  if (!currentActive) {
    return false;
  }
  return modes.includes(currentActive);
});
</script>
