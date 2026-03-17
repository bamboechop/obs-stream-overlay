<template>
  <div class="font-round-corner animate-[escape-from-duckov-death-counter-scale_60s_infinite] items-center bg-[#21a0c3] rounded-2xl text-white flex text-[22px] gap-[5px] isolate leading-none pt-1.5 pr-3 pb-[7px] pl-2 absolute right-[248px] top-[113px] origin-center will-change-transform z-1">
    <BadgeQuestionMark class="drop-shadow-[1.5px_1.5px_0_rgba(0,0,0,0.25)]" :size="25" />
    <span class="pt-1 text-shadow-[1.5px_1.5px_0_rgba(0,0,0,0.25)] w-[147px]">
      Erneut gestorben?
    </span>
  </div>
</template>

<script setup lang="ts">
import { BadgeQuestionMark } from 'lucide-vue-next';

</script>
