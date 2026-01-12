<script setup>
import { Icon } from "@iconify/vue";

defineProps({
  show: Boolean,
  title: String,
  message: String,
  type: {
    type: String,
    default: "info", // 'info', 'warning', 'success'
  },
});

defineEmits(["close"]);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
    >
      <Transition name="scale">
        <div
          v-if="show"
          class="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl"
        >
          <div class="p-8 flex flex-col items-center text-center">
            <div
              :class="{
                'bg-blue-100 text-blue-600': type === 'info',
                'bg-orange-100 text-orange-600': type === 'warning',
                'bg-green-100 text-green-600': type === 'success',
              }"
              class="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            >
              <Icon
                :icon="
                  type === 'success' ? 'mdi:check-circle' : 'mdi:bell-ring'
                "
                width="40"
              />
            </div>

            <h3 class="font-poppins font-bold text-xl text-gray-800 mb-2">
              {{ title }}
            </h3>
            <p class="font-poppins text-gray-500 leading-relaxed mb-8">
              {{ message }}
            </p>

            <button
              @click="$emit('close')"
              class="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-poppins font-bold transition-all active:scale-95 shadow-lg shadow-gray-200"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.scale-leave-active {
  transition: all 0.2s ease-in;
}
.scale-enter-from {
  transform: scale(0.8);
  opacity: 0;
}
.scale-leave-to {
  transform: scale(0.9);
  opacity: 0;
}
</style>
