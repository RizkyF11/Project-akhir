<script setup>
import { ref, computed, watch } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps({
  isVisible: Boolean,
  routeData: Object,
});

const emit = defineEmits(["close"]);

const formatRupiah = (number) => {
  if (!number) return "Rp 0";
  const cleanedNumber = String(number).replace(/\.00$/, "");
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(cleanedNumber);
};

const angkotRoutes = computed(() => {
  if (!props.routeData || !props.routeData.routes) return [];
  return props.routeData.routes.map((r, index) => ({
    code: r.angkot?.kode_trayek || "N/A",
    color: r.angkot?.warna || (index === 0 ? "#3498db" : "#9b59b6"),
    name: r.angkot?.trayek || "Rute Angkot",
  }));
});

const fares = computed(() => {
  if (
    !props.routeData ||
    !props.routeData.routes ||
    props.routeData.routes.length === 0
  )
    return [];
  const angkot = props.routeData.routes[0].angkot;
  if (!angkot) return [];
  return [
    { label: "SD", price: formatRupiah(angkot.tarif_sd) },
    { label: "SMP", price: formatRupiah(angkot.tarif_smp) },
    { label: "SMA/SMK", price: formatRupiah(angkot.tarif_sma) },
    { label: "Umum", price: formatRupiah(angkot.tarif_umum) },
  ].filter((fare) => fare.price !== "Rp 0");
});

// Drag Logic
const PARTIAL_OFFSET = 500;
const startY = ref(0);
const startTranslateY = ref(0);
const currentTranslateY = ref(PARTIAL_OFFSET);
const isDragging = ref(false);

const handleStart = (e) => {
  isDragging.value = true;
  startY.value = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;
  startTranslateY.value = currentTranslateY.value;
};

const handleMove = (e) => {
  if (!isDragging.value) return;
  const clientY = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;
  let newY = startTranslateY.value + (clientY - startY.value);
  if (newY < 0) newY = 0;
  if (newY > PARTIAL_OFFSET) newY = PARTIAL_OFFSET;
  currentTranslateY.value = newY;
};

const handleEnd = () => {
  isDragging.value = false;
  currentTranslateY.value =
    currentTranslateY.value < PARTIAL_OFFSET / 2 ? 0 : PARTIAL_OFFSET;
};

const panelStyle = computed(() => ({
  transform: `translateY(${currentTranslateY.value}px)`,
  transition: isDragging.value
    ? "none"
    : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
  touchAction: "none",
}));

watch(
  () => props.isVisible,
  (newVal) => {
    if (newVal)
      setTimeout(() => {
        currentTranslateY.value = PARTIAL_OFFSET;
      }, 10);
  },
);

// Fungsi Close
const handleClose = () => {
  emit("close");
};
</script>

<template>
  <div
    v-if="isVisible && angkotRoutes.length > 0"
    class="fixed bottom-0 left-1/2 w-full max-w-[425px] -translate-x-1/2 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-50 overflow-hidden flex flex-col max-h-[90vh]"
    :style="panelStyle"
  >
    <div
      class="w-full pt-4 pb-2 flex justify-center cursor-grab active:cursor-grabbing touch-none"
      @mousedown="handleStart"
      @touchstart="handleStart"
      @mousemove="handleMove"
      @touchmove="handleMove"
      @mouseup="handleEnd"
      @touchend="handleEnd"
    >
      <div class="w-12 h-1.5 bg-gray-300 rounded-full"></div>
    </div>

    <div class="px-6 pb-8 overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-800">Detail Perjalanan</h2>
        <button
          @click="handleClose"
          class="p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors"
        >
          <Icon icon="mdi:close" width="20" />
        </button>
      </div>

      <div class="mb-6">
        <h3
          class="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider"
        >
          Rute Angkot
        </h3>
        <div class="flex flex-col space-y-4 relative">
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
              {{ angkot.code }}
            </div>
            <div
              class="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-gray-800">{{ angkot.name }}</span>
                <span
                  class="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600"
                  >Angkot {{ index + 1 }}</span
                >
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{
                  index === 0 && angkotRoutes.length > 1
                    ? "Naik dari titik penjemputan awal, Turun di titik transfer."
                    : index === 1 && angkotRoutes.length > 1
                      ? "Naik dari titik transfer, Turun di tujuan akhir."
                      : "Naik dari titik penjemputan, Turun di tujuan akhir."
                }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-6">
        <h3
          class="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider"
        >
          Keterangan Peta
        </h3>
        <div
          class="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-3"
        >
          <div class="flex items-center gap-3">
            <div class="relative w-6 h-6 flex items-center justify-center">
              <div
                class="absolute w-full h-full bg-red-100 rounded-full animate-ping opacity-75"
              ></div>
              <Icon
                icon="mdi:map-marker"
                class="text-red-500 text-2xl relative z-10"
              />
            </div>
            <span class="text-sm font-medium text-gray-700"
              >Titik Sekarang</span
            >
          </div>
          <div v-if="angkotRoutes.length > 1" class="flex items-center gap-3">
            <Icon icon="mdi:map-marker" class="text-yellow-400 text-2xl" />
            <span class="text-sm font-medium text-gray-700"
              >Titik Transfer</span
            >
          </div>
          <div class="flex items-center gap-3">
            <Icon icon="mdi:map-marker" class="text-green-500 text-2xl" />
            <span class="text-sm font-medium text-gray-700">Titik Tujuan</span>
          </div>
        </div>
      </div>

      <div class="pb-10">
        <h3
          class="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider"
        >
          Estimasi Tarif
        </h3>
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="(fare, index) in fares"
            :key="index"
            class="p-3 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center"
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
