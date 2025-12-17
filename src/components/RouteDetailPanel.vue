<script setup>
import { ref, computed, onMounted, watch } from "vue";

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

  // Ambil data tarif dari rute pertama (Asumsi: Tarif angkot sama di Cianjur)
  const angkot = props.routeData.routes[0].angkot;
  if (!angkot) return [];

  // Karena bisa Single atau Double, kita ambil tarif dari Angkot pertama
  return [
    { label: "SD", price: formatRupiah(angkot.tarif_sd) },
    { label: "SMP", price: formatRupiah(angkot.tarif_smp || angkot.tarif_smp) },
    { label: "SMA/SMK", price: formatRupiah(angkot.tarif_sma) },
    { label: "Umum", price: formatRupiah(angkot.tarif_umum) },
  ].filter((fare) => fare.price !== "Rp 0"); // Hapus jika tarif 0
});

// Drag Logic area
const PARTIAL_OFFSET = 0; // Pixels to hide initially (hides fare section)
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

// Logika untuk memastikan panel kembali ke PARTIAL_OFFSET saat dibuka (setelah ditutup)
watch(
  () => props.isVisible,
  (newVal) => {
    if (newVal) {
      // Tunda sedikit agar transisi 'v-if' selesai
      setTimeout(() => {
        currentTranslateY.value = PARTIAL_OFFSET;
      }, 10);
    }
  }
);

// Reset state when visibility changes (optional, ensures it opens partially)
// Watch props.isVisible if needed, but current init is fine.
</script>

<template>
  <div
    v-if="true"
    ref="panelRef"
    class="fixed bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-50 overflow-hidden flex flex-col max-h-[90vh]"
    :style="panelStyle"
  >
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

    <div class="px-6 pb-8 overflow-y-auto">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Detail Perjalanan</h2>

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
                <span x
                  class="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600"
                  >Angkot {{ index + 1 }}</span
                >
              </div>
              <p
                v-if="index === 0 && angkotRoutes.length > 1"
                class="text-xs text-gray-500 mt-1"
              >
                Naik dari titik penjemputan awal, Turun di titik transfer.
              </p>
              <p
                v-else-if="index === 1 && angkotRoutes.length > 1"
                class="text-xs text-gray-500 mt-1"
              >
                Naik dari titik transfer, Turun di tujuan akhir.
              </p>
              <p v-else class="text-xs text-gray-500 mt-1">
                Naik dari titik penjemputan, Turun di tujuan akhir.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="pb-10">
        <h3
          class="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider"
        >
          Estimasi Tarif (Per Angkot)
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
