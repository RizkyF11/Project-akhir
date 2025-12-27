<script setup>
import Header from "../../components/Header.vue";
import { ref, onMounted, computed, nextTick } from "vue";
import { Icon } from "@iconify/vue";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

const searchQuery = ref("");
const apiBaseUrl = import.meta.env.VITE_API_NGROK;
const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

// === STATE DATA ===
const angkotRoutes = ref([]);
const isLoading = ref(true);

// === MODAL & MAP STATE ===
const showModal = ref(false);
const selectedRoute = ref(null);
const detailMapContainer = ref(null); // Container untuk peta
const detailMap = ref(null); // Instance peta

// 1. Fetch Data List Angkot (Halaman Utama)
onMounted(async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/angkot`);
    const result = await response.json();

    if (result.status === "success") {
      angkotRoutes.value = result.data.map((item) => {
        let start = item.nama_trayek;
        let end = "";

        // Logic memecah nama trayek (Start - End)
        if (item.nama_trayek.includes("->")) {
          const parts = item.nama_trayek.split("->");
          start = parts[0].trim();
          end = parts[1].trim();
        } else if (item.nama_trayek.includes("-")) {
          const parts = item.nama_trayek.split("-");
          start = parts[0].trim();
          end = parts[1].trim();
        }

        return {
          id: item.id,
          code: item.kode_trayek,
          start: start,
          end: end,
          warna_angkot: item.warna_angkot || "blue",
          full_name: item.nama_trayek,
        };
      });
    }
  } catch (error) {
    console.error("Gagal memuat data list:", error);
  } finally {
    isLoading.value = false;
  }
});

// 2. Filter Pencarian
const filteredRoutes = computed(() => {
  if (!searchQuery.value) return angkotRoutes.value;
  const lower = searchQuery.value.toLowerCase();
  return angkotRoutes.value.filter(
    (r) =>
      r.code.toLowerCase().includes(lower) ||
      r.full_name.toLowerCase().includes(lower)
  );
});

// 3. Buka Modal & Tampilkan Peta + Deskripsi
const openModal = async (summaryRoute) => {
  // Reset state modal
  selectedRoute.value = {
    ...summaryRoute,
    deskripsi: "Memuat detail rute...",
    rutes: [], // Reset data map
  };
  showModal.value = true;

  try {
    const response = await fetch(`${apiBaseUrl}/angkot/${summaryRoute.id}`);
    const result = await response.json();

    if (result.status === "success") {
      const detail = result.data;
      const rutes = detail.rutes || [];

      // A. SET DESKRIPSI (Dari Database)
      const deskripsiText = detail.rute_deskripsi
        ? detail.rute_deskripsi
        : "Detail jalur belum tersedia di database.";

      // B. SET DATA UNTUK MODAL
      selectedRoute.value = {
        ...selectedRoute.value,
        deskripsi: deskripsiText,
        rutes: rutes, // PENTING: Data ini dipakai untuk menggambar peta
      };

      // C. RENDER PETA (Tunggu DOM siap)
      await nextTick();
      initDetailMap(rutes);
    }
  } catch (error) {
    console.error(error);
    selectedRoute.value.deskripsi = "Gagal memuat detail informasi.";
  }
};

const closeModal = () => {
  showModal.value = false;
  // Hapus instance map agar tidak berat
  if (detailMap.value) {
    detailMap.value.remove();
    detailMap.value = null;
  }
};

// === FUNGSI RENDER PETA (VISUALISASI JALUR) ===
// Fungsi ini Tetap ADA untuk menggambar garis di peta
const initDetailMap = (rutes) => {
  // Cek apakah container dan data tersedia
  if (!detailMapContainer.value) return;
  if (!rutes || rutes.length === 0) return;

  maptilersdk.config.apiKey = apiKey;

  // Format data koordinat dari API ke format MapTiler [lng, lat]
  // Pastikan mengambil dari rute pertama (index 0)
  const routeCoords = rutes[0].coordinates.map((c) => [c.lng, c.lat]);

  if (routeCoords.length === 0) return;

  const startPoint = routeCoords[0];

  // Buat Peta
  detailMap.value = new maptilersdk.Map({
    container: detailMapContainer.value,
    style: maptilersdk.MapStyle.STREETS,
    center: startPoint,
    zoom: 14,
    navigationControl: false,
    geolocateControl: false,
  });

  // Saat peta siap, gambar garisnya
  detailMap.value.on("load", () => {
    // 1. Tambahkan Sumber Data (GeoJSON)
    detailMap.value.addSource("route-detail", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routeCoords,
        },
      },
    });

    // 2. Tambahkan Layer Garis (Visualisasi)
    detailMap.value.addLayer({
      id: "route-detail-line",
      type: "line",
      source: "route-detail",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": selectedRoute.value.warna_angkot || "#ff0000",
        "line-width": 4,
      },
    });

    // 3. Fit Zoom agar seluruh jalur terlihat
    const bounds = new maptilersdk.LngLatBounds();
    routeCoords.forEach((coord) => bounds.extend(coord));
    detailMap.value.fitBounds(bounds, { padding: 40 });
  });
};
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <Header />

    <div
      class="relative left-1/2 transform -translate-x-1/2 w-[90%] bg-white rounded-lg flex items-center px-4 py-2 z-10 mb-2 mt-4 box-border"
      style="border: 2px solid rgba(0, 0, 0, 0.2)"
    >
      <Icon
        icon="material-symbols:search"
        width="24"
        height="24"
        class="text-[#959595] mr-2"
      />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari Kode Angkot"
        class="font-poppins flex-1 bg-transparent focus:outline-none text-[#959595]"
      />
    </div>

    <div class="flex-1 overflow-y-auto pb-10 space-y-3 no-scrollbar">
      <div v-if="isLoading" class="text-center mt-4 text-gray-500">
        Memuat data...
      </div>

      <div
        v-else
        v-for="route in filteredRoutes"
        :key="route.id"
        class="relative flex w-[90%] mx-auto rounded-lg overflow-hidden cursor-pointer"
        @click="openModal(route)"
        style="
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(0, 0, 0, 0.3);
        "
      >
        <div class="w-25 flex flex-col">
          <div class="flex-2 bg-red-600"></div>
          <div
            class="flex-1"
            :style="{ backgroundColor: route.warna_angkot }"
          ></div>
        </div>

        <div
          class="flex justify-between items-center flex-1 bg-white px-4 py-3"
        >
          <div>
            <p class="text-lg font-bold text-black">{{ route.code }}</p>
            <p class="text-sm text-gray-600">
              {{ route.end ? `${route.start} ↔ ${route.end}` : route.start }}
            </p>
          </div>
          <Icon
            icon="material-symbols:chevron-right-rounded"
            width="28"
            height="28"
            class="text-gray-600"
          />
        </div>
      </div>
    </div>

    <div
      v-if="showModal"
      @click.self="closeModal"
      class="absolute inset-0 bg-black/50 flex justify-center items-center z-50"
    >
      <div
        v-if="selectedRoute"
        class="w-[90%] bg-white rounded-2xl shadow-xl overflow-hidden animate-slideUp max-h-[90vh] flex flex-col"
      >
        <div class="overflow-y-auto w-full no-scrollbar">
          <div class="relative w-full">
            <div class="flex flex-col w-full">
              <div class="h-12 bg-red-600"></div>
              <div
                class="h-6"
                :style="{ backgroundColor: selectedRoute.warna_angkot }"
              ></div>
            </div>

            <div class="absolute inset-0 flex justify-center items-center">
              <div class="bg-white px-2 py-2 shadow text-center">
                <p class="text-3xl font-bold">{{ selectedRoute.code }}</p>
                <p class="text-gray-700 text-sm">
                  {{
                    selectedRoute.end
                      ? `${selectedRoute.start} ↔ ${selectedRoute.end}`
                      : selectedRoute.start
                  }}
                </p>
              </div>
            </div>
          </div>

          <div class="p-4 w-full">
            <div
              ref="detailMapContainer"
              class="rounded-xl w-full h-56 bg-gray-200"
            ></div>
            <p
              v-if="!selectedRoute.rutes || selectedRoute.rutes.length === 0"
              class="text-xs text-center text-gray-400 mt-2"
            >
              Memuat peta atau data jalur tidak tersedia...
            </p>
          </div>

          <div class="px-5 mb-4">
            <h3 class="font-bold text-gray-800 mb-1">Rute Lintasan:</h3>
            <p
              class="text-gray-600 text-sm text-left leading-relaxed whitespace-pre-line"
            >
              {{ selectedRoute.deskripsi }}
            </p>
          </div>

          <div class="flex justify-center pb-4">
            <button
              class="px-6 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
              @click="closeModal"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* ANIMASI SLIDE UP */
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slideUp {
  animation: slideUp 0.25s ease-out;
}
</style>
