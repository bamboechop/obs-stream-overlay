<template>
  <div class="items-center animate-[escape-from-duckov-death-counter-scale_90s_infinite_reverse] bg-[#6dc54b] rounded-[21px] text-white flex font-round-corner text-[26px] gap-2 leading-none py-2.5 pr-[18px] pl-3 absolute right-[268px] top-[148px] origin-center will-change-transform">
    <CircleAlert class="drop-shadow-[2px_2px_0_rgba(0,0,0,0.25)]" :size="30" />
    <span class="text-shadow-[2px_2px_0_rgba(0,0,0,0.25)] w-[137px]">
      <span class="relative after:bg-white/80 after:rounded-full after:-bottom-px after:shadow-[2px_2px_0_rgba(0,0,0,0.25)] after:content-[''] after:h-[3px] after:left-0 after:absolute after:w-full">!tot</span> in den Chat
    </span>
  </div>
</template>

<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next';

</script>
