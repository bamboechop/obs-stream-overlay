<template>
  <WindowFrame
    :active="active"
    class="w-full"
    :icon-path="programInformation['pdf-viewer'].iconPath"
    title="PDF Viewer">
    <div
      class="rounded-sm h-[calc(100vh-38px)] overflow-auto scrollbar-hidden"
      :class="{ 'bg-[url(/modern/pdf-viewer/placeholder.jpg)] bg-center bg-no-repeat bg-cover': !url }">
      <template v-if="url">
        <PdfEmbed
          :source="decodeURIComponent(url)"
          @error="handleError" />
      </template>
    </div>
  </WindowFrame>
</template>

<script lang="ts" setup>
import PdfEmbed from 'vue-pdf-embed';
import WindowFrame from '@/components/desktop/WindowFrame.vue';
import { useSearchParamsComposable } from '@/composables/search-params.composable';
import { useProgramInformationComposable } from '@/composables/program-information.composable';

defineProps<{ active?: boolean }>();

const { programInformation } = useProgramInformationComposable();

const { url } = useSearchParamsComposable();

function handleError(error: Error) {
  console.error('PDF loading error:', error);
}
</script>

<style scoped>
.scrollbar-hidden {
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}
</style>
