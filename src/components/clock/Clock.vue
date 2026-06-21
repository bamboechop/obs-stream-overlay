<template>
  <WindowFrame class="rounded-b-none rounded-tr-none w-max">
    <div class="items-center flex flex-col gap-1 px-4 py-2 w-[116px]">
      <span class="text-[22px] font-semibold tabular-nums leading-none">{{ time }}</span>
      <span class="text-base tracking-[-0.5px] leading-none">{{ date }}</span>
    </div>
  </WindowFrame>
</template>

<script lang="ts" setup>
import { useDateFormat, useNow } from '@vueuse/core';
import WindowFrame from '@/components/desktop/WindowFrame.vue';

const date = useDateFormat(useNow(), 'YYYY-MM-DD');
const time = useDateFormat(useNow(), 'HH:mm:ss');
</script>
