<template>
  <div class="flex gap-1 justify-end relative">
    <div class="flex flex-col gap-2 items-end">
      <div class="crysis-panel bg-black/40 flex items-center h-19 mt-9.25 px-4">
        <p class="font-teko-bold leading-none mt-1.75 text-[37px] text-[#a3532d] uppercase">Nomad starb bisher {{count}} Mal</p>
      </div>
      <p class="font-teko-medium leading-none text-[24px] text-[#a3532d]/80 -mr-4">
        Erneut gestorben? <span class="font-teko-bold">!tot</span> in den Chat
      </p>
    </div>
    <div class="hexagon aspect-[cos(30deg)] bg-[#803630]/80 h-37.5 p-1.5">
      <div class="hexagon overflow-hidden size-full">
        <img
            alt=""
            class="object-cover opacity-60 size-full rotate-y-180"
            src="/death-counter/crysis-remastered.jpg" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ count: number }>();
</script>

<style scoped>
.hexagon {
  clip-path: polygon(-50% 50%, 50% 100%, 150% 50%, 50% 0);
}

.crysis-panel {
  --cut-size: 12px;
  --edge-width: 5px;
  --gax: #736761;
  --edge-color: rgb(128 54 48 / 0.8);

  position: relative;
  clip-path: polygon(
    var(--cut-size) 0,
    100% 0,
    100% 100%,
    var(--cut-size) 100%,
    0 calc(100% - var(--cut-size)),
    0 var(--cut-size)
  );
}

.crysis-panel::before {
  position: absolute;
  right: 0;
  bottom: 0;
  left: var(--cut-size);
  height: var(--edge-width);
  background: var(--edge-color);
  content: "";
  pointer-events: none;
}

.crysis-panel::after {
  position: absolute;
  bottom: calc(var(--cut-size) + var(--edge-width));
  left: calc(0px - var(--edge-width));
  width: calc(var(--cut-size) + var(--cut-size));
  height: var(--edge-width);
  background: var(--edge-color);
  content: "";
  pointer-events: none;
  transform: rotate(45deg);
  transform-origin: left bottom;
}
</style>
