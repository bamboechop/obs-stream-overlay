<template>
  <Splide
    :options="splideOptions"
    class="bg-[#1a1a1d] overflow-hidden transition-all duration-400 ease-in-out"
    :style="{ height: `${currentHeight}px` }"
    @splide:moved="onSlideChange">
    <SplideSlide
      v-for="(img, idx) in images"
      :key="img + idx"
      class="text-center">
      <img
        :ref="el => imageRefs[idx] = el as HTMLImageElement"
        :src="img"
        alt=""
        class="max-w-full h-auto block mx-auto"
        @load="onImageLoad(idx)" />
    </SplideSlide>
  </Splide>
</template>

<script lang="ts" setup>
// @ts-expect-error @splidejs/vue-splide typing definition couldn't be found
import { Splide, SplideSlide } from '@splidejs/vue-splide';
// @ts-expect-error @splidejs/vue-splide typing definition couldn't be found
import type { Options } from '@splidejs/vue-splide';
import { computed, nextTick, onMounted, ref } from 'vue';
import '@splidejs/vue-splide/css/core';

defineProps<{ images: string[] }>();
const imageRefs = ref<(HTMLImageElement | null)[]>([]);
const currentHeight = ref(0);
const currentSlideIndex = ref(0);
const imageHeights = ref<number[]>([]);

const splideOptions = computed<Options>(() => ({
  type: 'fade',
  arrows: false,
  pagination: false,
  autoplay: true,
  interval: 5000,
  rewind: true,
  pauseOnHover: false,
  pauseOnFocus: false,
  speed: 400,
  perPage: 1,
  perMove: 1,
  drag: true,
  lazyLoad: 'nearby',
}));

function onImageLoad(index: number) {
  if (imageRefs.value[index]) {
    imageHeights.value[index] = imageRefs.value[index]!.offsetHeight;
    if (index === currentSlideIndex.value) {
      currentHeight.value = imageHeights.value[index];
    }
  }
}

function onSlideChange(_splide: any, newIndex: number) {
  currentSlideIndex.value = newIndex;
  if (imageHeights.value[newIndex]) {
    currentHeight.value = imageHeights.value[newIndex];
  }
}

onMounted(async () => {
  await nextTick();
  if (imageRefs.value[0]) {
    currentHeight.value = imageRefs.value[0].offsetHeight;
  }
});
</script>
