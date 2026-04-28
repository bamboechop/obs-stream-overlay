<template>
  <header class="flex items-center gap-0.5">
    <template v-if="userBadges.length > 0">
      <template
        v-for="(badge, index) of userBadges"
        :key="`badge-${badge.description}-${index}`">
        <img
          :alt="badge.description"
          class="aspect-square h-4 w-4"
          :src="badge.imageUrl" />
      </template>
    </template>
    <span class="message-header-name font-geist-mono text-base font-medium">
      {{ displayName }}
      <template v-if="userName && displayName?.toLowerCase() !== userName.toLowerCase()">
        ({{ userName }})
      </template>
    </span>
  </header>
</template>

<script lang="ts" setup>
import type { Badges } from 'tmi.js';
import type { IBadge } from '@/common/interfaces/index.interface';
import { computed, onMounted, ref } from 'vue';
import { getReadableStrokeColor, parseUserBadges } from '@/common/helpers/twitch-message.helper';

const props = defineProps<{
  availableBadges: Record<string, IBadge[]>;
  color: string;
  displayName?: string;
  msgType?: 'chat' | 'action';
  userBadges?: Badges;
  userName?: string;
}>();

const userBadges = ref<{ description: string; id: string; imageUrl: string; title: string }[]>([]);

const isActionOrChatMessage = computed(() => props.msgType === 'action' || props.msgType === 'chat');

const nameColor = computed(() => {
  if (isActionOrChatMessage.value) {
    return props.color;
  }
  return '#ffffff';
});

const strokeColor = computed(() => {
  if (isActionOrChatMessage.value) {
    return getReadableStrokeColor(props.color);
  }
  return '#000000';
});

onMounted(async () => {
  if (isActionOrChatMessage.value) {
    if (props.userBadges) {
      userBadges.value = parseUserBadges(props.userBadges, props.availableBadges);
    }
  }
});
</script>

<style scoped>
.message-header-name {
  color: v-bind(nameColor);
  paint-order: stroke fill;
  -webkit-text-stroke: 4px v-bind(strokeColor);
}
</style>
