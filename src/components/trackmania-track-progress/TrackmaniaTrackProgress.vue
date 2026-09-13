<template>
  <div
    v-if="bridgeConnected && state.progress"
    ref="trackElement"
    class="relative flex justify-between items-end h-16.5 px-8 ml-18 mr-9.25 bg-black/25">
    <div class="h-3/5 w-0.5 shrink-0 bg-transparent" />

    <template v-for="lap in totalLaps" :key="`lap-${lap}`">
      <div
          v-for="checkpoint in state.raceData?.cpCount ?? 0"
          :key="`checkpoint-${checkpoint}`"
          class="h-3/5 w-0.5 mb-1 shrink-0 transition-colors duration-300 ease-out delay-150"
          :class="(lap - 1) * checkpointsPerLap + checkpoint <= passedGates
      ? 'bg-black/50'
      : 'bg-transparent'" />

      <div
          v-if="lap === totalLaps"
          class="grid h-full aspect-[1/4] shrink-0 grid-cols-2 grid-rows-8">
        <div
            v-for="cell in 16"
            :key="cell"
            :class="(Math.floor((cell - 1) / 2) + (cell - 1) % 2) % 2 === 0 ? 'bg-black' : 'bg-white'" />
      </div>
      <div v-else class="h-full w-1 shrink-0 bg-black" />
    </template>
    <img
        v-if="carSprite"
        alt=""
        class="absolute xtop-1/2 -translate-x-1/2 transition-[left] duration-300 ease-out z-1"
        :class="{ 'animate-pulse [animation-duration:200ms]!': switchingCar }"
        :style="{ left: carLeft }"
        :src="carSprite" />
  </div>
</template>

<script lang="ts" setup>
import { useDataSender } from '@/composables/datasender.composable.ts'
import { useElementSize } from '@vueuse/core'
import { computed, ref, useTemplateRef, watch } from 'vue'

const { bridgeConnected, state } = useDataSender()
const trackElement = useTemplateRef('trackElement')
const { height: trackHeight } = useElementSize(trackElement)

const carSprite = ref<string | null>(null)
const switchingCar = ref(false)

const checkpointsPerLap = computed(() => state.value.progress?.gatesPerLap ?? 0)
const totalGates = computed(() => totalLaps.value * checkpointsPerLap.value)

const passedGates = computed(() => {
  return state.value.playerCpInfo?.isFinished
      ? totalGates.value
      : Math.max(0, Math.min(state.value.playerCpInfo?.cpCount ?? 0, totalGates.value))
})

const carLeft = computed(() => {
  if (!totalGates.value) return '32px'

  const widths = Array.from({ length: totalGates.value + 1 }, (_, i) => {
    if (i === totalGates.value) return trackHeight.value / 4
    return i > 0 && i % checkpointsPerLap.value === 0 ? 4 : 2
  })

  const totalWidth = widths.reduce((sum, width) => sum + width, 0)
  const precedingWidth = widths
      .slice(0, passedGates.value)
      .reduce((sum, width) => sum + width, 0)

  const fraction = passedGates.value / totalGates.value
  const offset =
      precedingWidth
      + widths[passedGates.value]! / 2
      - fraction * totalWidth
      + (1 - 2 * fraction) * 32

  return `calc(${fraction * 100}% + ${offset}px)`
})

watch([() => state.value.vehicleType, () => state.value.playerCpInfo?.isFinished], () => {
  if (state.value.playerCpInfo?.isFinished) return
  switchingCar.value = true
  window.setTimeout(() => switchingCar.value = false, 500)
  switch (state.value.vehicleType) {
    case 'CarDesert':
      carSprite.value = '/tm-track-progress/desert-car.png'
      return
    case 'CarRally':
      carSprite.value = '/tm-track-progress/rally-car.png'
      return
    case 'CarSnow':
      carSprite.value = '/tm-track-progress/snow-car.png'
      return
    case 'CarSport':
      carSprite.value = '/tm-track-progress/stadium-car.png'
      return
    default:
      carSprite.value = null
  }
})
const totalLaps = computed(() => state.value.raceData?.lapsNb ?? 0)
</script>
