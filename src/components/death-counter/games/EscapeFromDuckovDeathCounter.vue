<template>
  <div class="flex justify-end relative">
    <img alt="" class="rounded-b-[66px] mr-[11px] h-69" src="/death-counter/escape-from-duckov.png" />
    <div class="font-round-corner items-center bg-[#f85566] rounded-[29px] bottom-0 text-white flex text-[37px] gap-3 leading-none py-[13px] pl-[17px] pr-[27px] absolute right-0">
      <Skull class="drop-shadow-[3px_3px_0_rgba(0,0,0,0.25)]" :size="44" />
      <span class="pt-2.5 text-shadow-[3px_3px_0_rgba(0,0,0,0.25)]">
        Guenther starb bislang <span class="relative after:bg-white/80 after:rounded-full after:bottom-0 after:shadow-[3px_3px_0_rgba(0,0,0,0.25)] after:content-[''] after:h-1 after:left-0 after:absolute after:w-full">{{ count }}</span> Mal
      </span>
    </div>
    <DiedAgain />
    <Command />
  </div>
</template>

<script lang="ts" setup>
import { Skull } from 'lucide-vue-next';
import Command from './escape-from-duckov/Command.vue';
import DiedAgain from './escape-from-duckov/DiedAgain.vue';

defineProps<{ count: number }>();
</script>
