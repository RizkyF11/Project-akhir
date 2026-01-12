<script setup>
import { Icon } from "@iconify/vue";

defineProps({
  show: Boolean,
  title: { type: String, default: "Terjadi Kesalahan" },
  message: { type: String, default: "Gagal memuat data, silakan coba lagi." },
  icon: { type: String, default: "mdi:alert-circle-outline" },
  retryText: { type: String, default: "Coba Lagi" },
});

defineEmits(["retry", "close"]);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md"
    >
      <div class="w-full max-w-sm text-center">
        <div
          class="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500 shadow-sm"
        >
          <Icon :icon="icon" width="48" />
        </div>

        <h3 class="font-poppins font-bold text-2xl text-gray-800 mb-3">
          {{ title }}
        </h3>
        <p class="font-poppins text-gray-500 leading-relaxed mb-8 px-4">
          {{ message }}
        </p>

        <div class="flex flex-col gap-3">
          <button
            @click="$emit('retry')"
            class="w-full py-4 bg-[#72BD43] hover:bg-[#5da334] text-white rounded-2xl font-poppins font-bold transition-all active:scale-95 shadow-lg shadow-green-100"
          >
            {{ retryText }}
          </button>

          <button
            @click="$emit('close')"
            class="w-full py-3 text-gray-400 font-poppins font-medium transition-colors hover:text-gray-600"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
