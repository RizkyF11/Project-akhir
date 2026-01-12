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
const address = ref("Mencari lokasi...");
const isDragging = ref(false); // Untuk mendeteksi peta sedang digeser atau tidak
const currentCoords = ref([107.1422, -6.812]);

const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
const mode = route.query.mode || "start";

// FUNGSI REVERSE GEOCODE (Memperbaiki error .ref menjadi .value)
const updateAddress = async (lng, lat) => {
  address.value = "Mencari alamat...";
  try {
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${apiKey}`
    );
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      // PERBAIKAN: Gunakan .value, bukan .ref
      address.value = data.features[0].place_name;
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

  map.value.on("load", () => {
    // Ambil alamat awal saat map pertama kali terbuka
    const center = map.value.getCenter();
    updateAddress(center.lng, center.lat);
  });

  // Saat peta MULAI digeser (Pin Terangkat)
  map.value.on("movestart", () => {
    isDragging.value = true;
  });

  // Saat peta BERHENTI digeser (Pin Jatuh & Update Alamat)
  map.value.on("moveend", () => {
    isDragging.value = false;
    const center = map.value.getCenter();
    currentCoords.value = [center.lng, center.lat];
    updateAddress(center.lng, center.lat);
  });
});

const confirmLocation = () => {
  if (
    address.value === "Mencari alamat..." ||
    address.value === "Gagal memuat alamat"
  ) {
    alert("Tunggu hingga alamat ditemukan atau geser peta sedikit.");
    return;
  }

  const locationData = {
    name: address.value,
    coords: currentCoords.value,
    mode: mode,
  };

  localStorage.setItem("selected_map_location", JSON.stringify(locationData));
  router.back();
};
</script>

<template>
  <div
    class="flex flex-col w-full h-screen overflow-hidden relative bg-gray-50"
  >
    <div
      class="absolute top-0 left-0 w-full z-50 p-4 flex items-center bg-white/90 backdrop-blur-md shadow-sm"
    >
      <button
        @click="router.back()"
        class="mr-3 p-1 active:bg-gray-200 rounded-full transition-colors"
      >
        <Icon icon="mdi:arrow-left" width="24" class="text-gray-700" />
      </button>
      <h1 class="font-poppins font-bold text-gray-800">Geser Pin ke Lokasi</h1>
    </div>

    <div ref="mapContainer" class="w-full h-full"></div>

    <div
      class="absolute top-1/2 left-1/2 z-40 pointer-events-none -translate-x-1/2 -translate-y-1/2"
    >
      <div
        class="flex flex-col items-center"
        :class="isDragging ? 'pin-active' : 'pin-idle'"
      >
        <div
          v-if="!isDragging"
          class="bg-black/80 text-white text-[10px] px-2 py-1 rounded mb-2 whitespace-nowrap font-poppins animate-bounce"
        >
          Pasang di sini
        </div>

        <div class="relative flex flex-col items-center">
          <Icon
            icon="mdi:map-marker"
            width="48"
            height="48"
            class="text-red-600 drop-shadow-xl"
            :class="{ 'opacity-80': isDragging }"
          />

          <div
            class="pin-shadow"
            :class="{ 'shadow-expand': isDragging }"
          ></div>
        </div>
      </div>
    </div>

    <div
      class="absolute bottom-0 left-0 w-full z-50 p-6 bg-white rounded-t-[2.5rem] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-gray-100"
    >
      <div class="flex items-start gap-4 mb-6">
        <div class="bg-green-100 p-2 rounded-full">
          <Icon
            icon="mdi:map-marker-radius"
            class="text-[#72BD43]"
            width="24"
          />
        </div>
        <div class="flex-1">
          <p
            class="text-[10px] text-gray-400 font-poppins uppercase font-bold tracking-[0.15em] mb-1"
          >
            Lokasi {{ mode === "start" ? "Penjemputan" : "Tujuan" }}
          </p>
          <p
            class="text-sm text-gray-800 font-poppins font-semibold leading-relaxed min-h-[40px]"
          >
            {{ address }}
          </p>
        </div>
      </div>

      <ButtonPrimary
        @click="confirmLocation"
        class="w-full py-4 shadow-lg shadow-green-100"
      >
        Pasang Lokasi
      </ButtonPrimary>
    </div>
  </div>
</template>

<style scoped>
/* State saat peta digeser (Pin Terangkat) */
.pin-active {
  /* Pin naik 20px ke atas dari titik pusat */
  transform: translateY(-20px);
  transition: transform 0.2s ease-out;
}

/* State saat pin dilepas (Pin Jatuh) */
.pin-idle {
  /* Pin kembali ke titik pusat (ujung bawah pin pas di tengah layar) */
  transform: translateY(0);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Shadow Bulat di bawah Pin */
.pin-shadow {
  width: 14px;
  height: 5px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 50%;
  position: absolute;
  /* Posisi shadow tepat di ujung bawah pin */
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%) scale(1);
  filter: blur(1.5px);
  transition: all 0.2s ease;
  z-index: -1;
}

/* Saat pin naik, shadow mengecil dan memudar (efek jarak) */
.shadow-expand {
  transform: translateX(-50%) scale(0.6);
  opacity: 0.3;
  bottom: -15px; /* Tetap di tanah saat pin naik */
}

:deep(.maplibregl-ctrl-bottom-right),
:deep(.maplibregl-ctrl-bottom-left) {
  bottom: 200px !important;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}
.animate-bounce {
  animation: bounce 1.5s infinite;
}
</style>
