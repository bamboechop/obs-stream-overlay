<template>
  <div class="bg-white rounded-t-sm fley flex-col">
    <div class="text-base p-2 whitespace-pre-line">
      {{ post.text }}
    </div>

    <template v-if="post.type === 'image'">
      <slot
        name="carousel"
        :images="post.images"></slot>
    </template>

    <template v-else-if="post.type === 'external'">
      <div
        class="relative"
        :class="{ 'object-cover w-full aspect-video': post.external.thumb }">
        <img
          v-if="post.external.thumb"
          :src="post.external.thumb"
          class="object-cover w-full aspect-video"
          :alt="post.external.title" />
        <div class="bg-black/50 bottom-0 text-white flex flex-col gap-1 left-0 p-3 right-0" :class="{ 'absolute': post.external.thumb }">
          <div class="text-base font-semibold">
            {{ post.external.title }}
          </div>
          <template v-if="post.external.description">
            <div class="text-sm">
              {{ post.external.description }}
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { BlueskyPost } from '@/composables/bluesky.composable';

defineProps<{ post: BlueskyPost }>();
</script>
