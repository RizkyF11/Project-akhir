<script setup>
import { ref, onMounted } from "vue";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useRouter, useRoute } from "vue-router";
import { Icon } from "@iconify/vue";
import ButtonPrimary from "../../components/ButtonPrimary.vue";

const router = useRouter();
const route = useRoute();

const mapContainer = ref(null);
const map = ref(null);
const address = ref("Menggeser peta...");
const currentCoords = ref([107.1422, -6.812]); // Default Cianjur

const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
const mode = route.query.mode; // 'start' atau 'end'

// Fungsi Reverse Geocode untuk mendapatkan nama tempat dari titik tengah
const updateAddress = async (lng, lat) => {
  try {
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${apiKey}`
    );
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      address.ref = data.features[0].place_name;
    } else {
      address.value = "Lokasi tidak dikenal";
    }
  } catch (e) {
    address.value = "Gagal memuat alamat";
  }
};

onMounted(() => {
  maptilersdk.config.apiKey = apiKey;

  map.value = new maptilersdk.Map({
    container: mapContainer.value,
    style: maptilersdk.MapStyle.STREETS,
    center: currentCoords.value,
    zoom: 15,
  });

  // Setiap kali peta digeser (idle), ambil titik tengahnya
  map.value.on("moveend", () => {
    const center = map.value.getCenter();
    currentCoords.value = [center.lng, center.lat];
    updateAddress(center.lng, center.lat);
  });
});

const confirmLocation = () => {
  // Simpan hasil ke localStorage agar bisa dibaca halaman CariRute
  const locationData = {
    name: address.value,
    coords: currentCoords.value,
    mode: mode,
  };

  localStorage.setItem("selected_map_location", JSON.stringify(locationData));
  router.back(); // Kembali ke halaman CariRute
};
</script>

<template>
  <div class="flex flex-col w-full h-screen overflow-hidden relative">
    <div
      class="absolute top-0 left-0 w-full z-50 p-4 flex items-center bg-white/90 backdrop-blur-md shadow-sm"
    >
      <button @click="router.back()" class="mr-3">
        <Icon icon="mdi:arrow-left" width="24" class="text-gray-700" />
      </button>
      <h1 class="font-poppins font-bold text-gray-800">Pilih Titik di Peta</h1>
    </div>

    <div ref="mapContainer" class="w-full h-full"></div>

    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] z-40 pointer-events-none flex flex-col items-center"
    >
      <div
        class="bg-black/80 text-white text-[10px] px-2 py-1 rounded mb-1 whitespace-nowrap font-poppins"
      >
        Lepas untuk pilih
      </div>
      <Icon
        icon="mdi:map-marker"
        width="45"
        height="45"
        class="text-red-600 drop-shadow-lg"
      />
      <div class="w-2 h-2 bg-black/20 rounded-full blur-[2px]"></div>
    </div>

    <div
      class="absolute bottom-0 left-0 w-full z-50 p-6 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)]"
    >
      <div class="flex items-start gap-3 mb-6">
        <Icon
          icon="mdi:map-marker-radius"
          class="text-[#72BD43] mt-1"
          width="24"
        />
        <div>
          <p
            class="text-xs text-gray-500 font-poppins uppercase font-bold tracking-widest"
          >
            Lokasi Terpilih ({{ mode === "start" ? "Awal" : "Tujuan" }})
          </p>
          <p class="text-sm text-gray-800 font-poppins line-clamp-2">
            {{ address }}
          </p>
        </div>
      </div>

      <ButtonPrimary @click="confirmLocation" class="w-full">
        Pasang Lokasi
      </ButtonPrimary>
    </div>
  </div>
</template>

<style scoped>
/* Pastikan maptiler control tidak menutupi UI kita */
:deep(.maplibregl-ctrl-bottom-right),
:deep(.maplibregl-ctrl-bottom-left) {
  bottom: 180px !important;
}
</style>
