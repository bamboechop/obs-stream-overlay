<template>
  <Ad />
</template>

<script lang="ts" setup>
import Ad from '@/components/ad-view/Ad.vue';
import { useEventStreamComposable } from '@/composables/event-stream.composable';
import { useTwitchStreamInfoComposable } from '@/composables/twitch-stream-info.composable';

useEventStreamComposable();
useTwitchStreamInfoComposable(false);
</script>
