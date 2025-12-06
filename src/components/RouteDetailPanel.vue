<script setup>
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  isVisible: Boolean,
});

const emit = defineEmits(["close"]);

// Dummy Data
const fares = [
  { label: "SD", price: "Rp 2.000" },
  { label: "SMP", price: "Rp 3.000" },
  { label: "SMA/SMK", price: "Rp 4.000" },
  { label: "Umum", price: "Rp 5.000" },
];

const angkotRoutes = [
  { code: "05", color: "#3498db", name: "Angkot 05 (Rawabango)" },
  { code: "03", color: "#e67e22", name: "Angkot 02 (Cikidang)" },
];

// Drag Logic area
const PARTIAL_OFFSET = 450; // Pixels to hide initially (hides fare section) 
const startY = ref(0);
const startTranslateY = ref(0);
const currentTranslateY = ref(PARTIAL_OFFSET); // Start at partial
const isDragging = ref(false);
const panelRef = ref(null);

const handleStart = (e) => {
  isDragging.value = true;
  startY.value = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;
  startTranslateY.value = currentTranslateY.value; // Record where we started
};

const handleMove = (e) => {
  if (!isDragging.value) return;
  const clientY = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;
  const deltaY = clientY - startY.value;

  // Calculate new position based on start position + delta
  let newY = startTranslateY.value + deltaY;

  // Limit dragging up (minY = 0 -> Full open)
  if (newY < 0) newY = 0; // Elasticity could be added here

  currentTranslateY.value = newY;
};

const handleEnd = () => {
  isDragging.value = false;

  // Snap Logic
  if (currentTranslateY.value > PARTIAL_OFFSET + 100) {
    // If dragged way down below partial -> Close
    emit("close");
    // Reset to partial for next open (optional, depends on UX preference)
    setTimeout(() => {
      currentTranslateY.value = PARTIAL_OFFSET;
    }, 300);
  } else if (currentTranslateY.value > PARTIAL_OFFSET / 2) {
    // Closer to partial -> Snap to Partial
    currentTranslateY.value = PARTIAL_OFFSET;
  } else {
    // Closer to top -> Snap to Full
    currentTranslateY.value = 0;
  }
};

const panelStyle = computed(() => ({
  transform: `translateY(${currentTranslateY.value}px)`,
  transition: isDragging.value
    ? "none"
    : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
  touchAction: "none",
}));

// Reset state when visibility changes (optional, ensures it opens partially)
// Watch props.isVisible if needed, but current init is fine.
</script>

<template>
  <div
    v-if="isVisible"
    ref="panelRef"
    class="fixed bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-50 overflow-hidden flex flex-col max-h-[90vh]"
    :style="panelStyle"
  >
    <!-- Drag Handle Area -->
    <div
      class="w-full pt-4 pb-2 flex justify-center cursor-grab active:cursor-grabbing touch-none"
      @mousedown="handleStart"
      @mousemove="handleMove"
      @mouseup="handleEnd"
      @mouseleave="handleEnd"
      @touchstart="handleStart"
      @touchmove="handleMove"
      @touchend="handleEnd"
    >
      <div class="w-12 h-1.5 bg-gray-300 rounded-full"></div>
    </div>

    <!-- Content -->
    <div class="px-6 pb-8 overflow-y-auto">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Detail Perjalanan</h2>

      <!-- Urutan Angkot -->
      <div class="mb-6">
        <h3
          class="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider"
        >
          Rute Angkot
        </h3>
        <div class="flex flex-col space-y-4 relative">
          <!-- Timeline Line -->
          <div
            class="absolute left-3.5 top-3 bottom-3 w-0.5 bg-gray-200 -z-10"
          ></div>

          <div
            v-for="(angkot, index) in angkotRoutes"
            :key="index"
            class="flex items-center gap-4 bg-white"
          >
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0"
              :style="{ backgroundColor: angkot.color }"
            >
              {{ index + 1 }}
            </div>
            <div
              class="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-gray-800">{{ angkot.code }}</span>
                <span
                  class="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600"
                  >Angkot</span
                >
              </div>
              <p class="text-sm text-gray-600 mt-0.5">{{ angkot.name }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tarif -->
      <div class="pb-10">
        <!-- Extra padding for bounce -->
        <h3
          class="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider"
        >
          Estimasi Tarif
        </h3>
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="(fare, index) in fares"
            :key="index"
            class="p-3 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center justify-center text-center"
          >
            <span class="text-xs text-green-600 font-medium mb-1">{{
              fare.label
            }}</span>
            <span class="text-lg font-bold text-green-700">{{
              fare.price
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
