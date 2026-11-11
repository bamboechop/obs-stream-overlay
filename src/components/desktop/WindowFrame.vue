<template>
  <div
    class="bg-transparent rounded-lg border-[5px] flex flex-col relative transition-colors duration-500 ease-in-out"
    :class="[active ? 'border-[rgba(170,204,0,0.75)]' : 'border-white/75']">
    <slot></slot>
    <template v-if="title">
      <template v-if="iconPath">
        <div
          class="aspect-square rounded-br-lg rounded-tl-xs border-b-2 border-r-2 left-0 p-1 absolute top-0 transition-colors duration-500 ease-in-out"
          :class="[active ? 'bg-[rgba(170,204,0,0.75)] border-[rgba(170,204,0,0.75)]' : 'bg-white/75 border-white/90']">
          <img
            :alt="title"
            class="aspect-square max-w-14"
            :src="iconPath" />
        </div>
      </template>
      <div
        class="items-center flex shrink-0 font-bold justify-between pt-1 pl-2 transition-colors duration-500 ease-in-out rounded-b-[3px]"
        :class="[active ? 'bg-[rgba(170,204,0,0.75)]' : 'bg-white/75']">
        {{ title }}
        <div class="flex flex-row gap-1.5 p-1">
          <button
            class="appearance-none bg-transparent border-none p-0 mr-0.5"
            title="Minimize"
            type="button">
            <Minimize :size="16" />
          </button>
          <button
            class="appearance-none bg-transparent border-none p-0"
            title="Maximize"
            type="button">
            <Maximize :size="16" />
          </button>
          <button
            class="appearance-none bg-transparent border-none p-0"
            title="Close"
            type="button">
            <X :size="16" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { Maximize, Minimize, X } from '@lucide/vue';

const { active = false, iconPath, title } = defineProps<{ active?: boolean; iconPath?: string; title?: string }>();
</script>
