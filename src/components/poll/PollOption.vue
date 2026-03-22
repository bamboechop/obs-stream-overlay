<template>
  <div
    class="bg-black/15 rounded-xl border-2 border-white/20 shadow-[0_0_24px_4px_rgba(0,0,0,0.15)] flex flex-col justify-between overflow-hidden px-4 py-3 relative transition-all duration-500 z-1"
    :class="{ 'bg-[linear-gradient(90deg,rgba(255,215,90,0.10)_0%,rgba(255,215,90,0.18)_100%),rgba(0,0,0,0.15)] shadow-[0_0_16px_2px_rgba(255,215,90,0.18)] border-[#ffd700]': isWinner }">
    <h2
      class="text-base font-medium leading-5 m-0"
      :class="{ 'text-[#ffd700] text-shadow-[0_1px_4px_rgba(255,215,90,0.25)]': isWinner }">
      {{ choice.title }}
    </h2>
    <div class="items-end flex flex-row justify-between">
      <span>
        {{ displayedVotes }} {{ voteText }}
      </span>
      <span :class="{ 'text-[#ffd700]': isWinner }">
        {{ displayedPercent }}%
      </span>
    </div>
    <div class="bg-white/8 rounded-[10px] bottom-0 left-0 overflow-hidden absolute right-0 top-0 -z-1">
      <div
        class="bg-[#0c0d38] rounded-l-[10px] bottom-0 left-0 opacity-70 absolute top-0 transition-all duration-300 ease-in-out"
        :class="{ 'bg-[rgba(255,215,0,0.15)]': isWinner }"
        :style="{ width: `${displayedPercentBar}%` }"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { TwitchEventSubNotificationChannelPollChoiceDto } from '@/common/interfaces/event-stream.interface';

defineProps<{
  choice: TwitchEventSubNotificationChannelPollChoiceDto;
  displayedVotes: number;
  displayedPercent: number;
  displayedPercentBar: number;
  isWinner: boolean;
  voteText: string;
}>();
</script>
