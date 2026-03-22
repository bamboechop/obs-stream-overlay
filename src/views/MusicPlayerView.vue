<template>
  <section class="h-screen w-screen relative overflow-hidden">
    <MusicPlayer />
  </section>
</template>

<script setup lang="ts">
import MusicPlayer from '@/components/music-player/MusicPlayer.vue';
</script>

<style lang="scss" scoped>
.music-player-view {
  height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
}
</style>
