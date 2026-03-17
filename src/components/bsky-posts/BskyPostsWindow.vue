<template>
  <template v-if="posts.length > 0">
    <WindowFrame
      :active
      class="w-full opacity-100 transition-opacity duration-500 ease-in-out"
      :class="{ 
        'opacity-0': intermissionVideoPlaying
      }">
      <div
        class="bg-white grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden min-w-0"
        :class="{
          'grid-rows-[0fr]': isCollapsed,
          'grid-rows-[1fr]': !isCollapsed,
        }">
        <div
          :key="currentIndex"
          class="overflow-hidden">
          <BskyPost :post="currentPost">
            <template #carousel="{ images }">
              <ImageCarousel :images="images" />
            </template>
          </BskyPost>
        </div>
      </div>
      <div
        v-if="authorHandle"
        class="bg-[#1887f2] rounded-b-sm text-white text-base font-semibold tracking-wide p-3 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        :class="{ 'rounded-t-sm': isCollapsed }">
        Folge @{{ authorHandle }} auf Bluesky
      </div>
    </WindowFrame>
  </template>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BskyPost from './BskyPost.vue';
import ImageCarousel from './ImageCarousel.vue';
import WindowFrame from '@/components/desktop/WindowFrame.vue';
import { type BlueskyPost, fetchLatestPosts, filterPosts } from '@/composables/bluesky.composable';
import { useApplicationStore } from '@/stores/application.store';

defineProps<{ active?: boolean }>();

const applicationStore = useApplicationStore();
const { intermissionVideoPlaying } = storeToRefs(applicationStore);

const posts = ref<BlueskyPost[]>([]);
const currentIndex = ref(0);
let cycleTimer: number | null = null;
const isCollapsed = ref(true);
const TRANSITION_DURATION = 500; // ms, should match CSS - TODO ask AI if we can use v-bind in CSS

const currentPost = computed(() => posts.value[currentIndex.value]);
const authorHandle = computed(() => {
  return import.meta.env.VITE_BSKY_TARGET_HANDLE || '';
});

async function loadPosts() {
  const handle = import.meta.env.VITE_BSKY_TARGET_HANDLE;
  if (!handle) {
    posts.value = [];
    return;
  }
  const fetchedPosts = await fetchLatestPosts(handle, 10);
  posts.value = filterPosts(fetchedPosts, 'Der Garten kommt zur Ruhe.');
  currentIndex.value = 0;
}

function startCycling() {
  if (cycleTimer) {
    clearInterval(cycleTimer);
  }
  if (posts.value.length <= 1) {
    return;
  }
  cycleTimer = window.setInterval(() => {
    isCollapsed.value = true;
    setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % posts.value.length;
      setTimeout(() => {
        isCollapsed.value = false;
      }, 1500);
    }, TRANSITION_DURATION);
  }, 30 * 1000);
}

function stopCycling() {
  if (cycleTimer) {
    clearInterval(cycleTimer);
    cycleTimer = null;
  }
}

onMounted(async () => {
  await loadPosts();
  startCycling();
  setTimeout(() => {
    isCollapsed.value = false;
  }, 1500);
});

watch(posts, () => {
  stopCycling();
  startCycling();
});
</script>
