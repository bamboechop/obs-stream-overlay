<template>
  <TrackmaniaTrackProgress v-if="category === 'Trackmania'" />
</template>

<script lang="ts" setup>
import { useTwitchStore } from '@/stores/twitch.store.ts'
import { storeToRefs } from 'pinia'
import TrackmaniaTrackProgress from '@/components/trackmania-track-progress/TrackmaniaTrackProgress.vue'
import { useTwitchStreamInfoComposable } from '@/composables/twitch-stream-info.composable'

const twitchStore = useTwitchStore()
const { category } = storeToRefs(twitchStore)
useTwitchStreamInfoComposable(false)
</script>
