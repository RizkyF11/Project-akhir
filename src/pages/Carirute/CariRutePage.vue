<script setup>
import { Icon } from "@iconify/vue";
import Header from "../../components/Header.vue";
import { ref, onMounted, onUnmounted } from "vue";
import ButtonPrimary from "../../components/ButtonPrimary.vue";
import { useRouter } from "vue-router";
import { getRekomendasiAngkot } from "../../services/angkotService";

// ================================
// STATE & CONFIG
// ================================
const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
const CACHE_KEY = "routeData";
const CACHE_DURATION_MS = 5 * 60 * 60 * 1000;

const router = useRouter();

const isLoading = ref(false);
const startError = ref("");
const endError = ref("");
const startLocation = ref("");
const startCoords = ref([null, null]); // [lng, lat]
const endLocation = ref("");
const endCoords = ref([null, null]); // [lng, lat]

const activeField = ref(null); // "start" atau "end"
const suggestions = ref([]);
const isSearching = ref(false);
const isLocating = ref(false);

const CIANJUR_BBOX = "106.83,-7.55,107.45,-6.71";

const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

// ================================
// LOGIKA "PILIH LEWAT MAPS"
// ================================

const openMapPicker = () => {
  // Jika user tidak sedang fokus ke input tertentu, default ke 'start'
  const mode = activeField.value || "start";
  router.push({
    path: "/pilih-lokasi",
    query: { mode: mode },
  });
};

const checkReturnedLocation = () => {
  const saved = localStorage.getItem("selected_map_location");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.mode === "start") {
        startLocation.value = data.name;
        startCoords.value = data.coords;
        startError.value = "";
      } else {
        endLocation.value = data.name;
        endCoords.value = data.coords;
        endError.value = "";
      }
      // Hapus agar tidak terpicu lagi saat refresh
      localStorage.removeItem("selected_map_location");
    } catch (e) {
      console.error("Error parsing location data", e);
    }
  }
};

// ================================
// GEOCODING & SEARCH LOGIC
// ================================

const reverseGeocodeOSM = async (lng, lat) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AngkotinApp/1.0" },
    });
    const data = await res.json();
    return data.display_name
      ? data.display_name.split(",").slice(0, 3).join(",")
      : null;
  } catch (e) {
    return null;
  }
};

const reverseGeocode = async (lng, lat) => {
  const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const hasData = data.features && data.features.length > 0;
    const firstFeature = hasData ? data.features[0].place_name : "";
    if (!hasData || firstFeature.toLowerCase().includes("unknown")) {
      return (await reverseGeocodeOSM(lng, lat)) || "Lokasi tidak diketahui";
    }
    return firstFeature;
  } catch (e) {
    return "Lokasi Terdeteksi";
  }
};

const getMyLocation = (manual = false) => {
  if (!navigator.geolocation) return;
  isLocating.value = true;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      startCoords.value = [longitude, latitude];
      startLocation.value = await reverseGeocode(longitude, latitude);
      isLocating.value = false;
    },
    () => {
      isLocating.value = false;
    },
    { enableHighAccuracy: true }
  );
};

const fetchGeocode = async (query) => {
  if (!query?.trim()) {
    suggestions.value = [];
    return;
  }
  isSearching.value = true;
  let q = query.trim();
  if (!q.toLowerCase().includes("cianjur")) q = `${q} cianjur`;

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    q
  )}.json?key=${apiKey}&country=ID&bbox=${CIANJUR_BBOX}&types=poi,address,street,place`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    suggestions.value =
      data.features?.map((item) => ({
        name: item.text,
        address: item.place_name,
        coords: item.geometry.coordinates,
      })) || [];
  } catch {
    suggestions.value = [];
  } finally {
    isSearching.value = false;
  }
};

const debouncedSearch = debounce((query) => fetchGeocode(query), 300);

const handleInput = (e) => {
  const val = e.target.value;
  if (activeField.value === "start") startLocation.value = val;
  else endLocation.value = val;
  debouncedSearch(val);
};

const pickSuggestion = (item) => {
  if (activeField.value === "start") {
    startLocation.value = item.name;
    startCoords.value = item.coords;
  } else {
    endLocation.value = item.name;
    endCoords.value = item.coords;
  }
  suggestions.value = [];
  activeField.value = null;
};

const setField = (field) => {
  activeField.value = field;
};

const goToMap = async () => {
  startError.value = startLocation.value ? "" : "Lokasi awal wajib diisi";
  endError.value = endLocation.value ? "" : "Tujuan wajib diisi";

  if (!startLocation.value || !endLocation.value) return;
  if (!startCoords.value[0] || !endCoords.value[0]) {
    alert("Pilih lokasi dari daftar atau peta");
    return;
  }

  isLoading.value = true;
  try {
    const [startLng, startLat] = startCoords.value;
    const [endLng, endLat] = endCoords.value;
    const response = await getRekomendasiAngkot(
      startLat,
      startLng,
      endLat,
      endLng
    );

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), data: response.data })
    );
    router.push({
      path: "/jalurmaps",
      query: {
        start_lat: startLat,
        start_lng: startLng,
        end_lat: endLat,
        end_lng: endLng,
      },
    });
  } catch (err) {
    alert("Gagal memuat rute");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  // Cek apakah ada lokasi yang terpilih dari halaman peta
  checkReturnedLocation();

  // Event listener jika user pindah tab lalu balik lagi
  window.addEventListener("focus", checkReturnedLocation);

  const izin = confirm("Aktifkan lokasi untuk mendeteksi lokasi anda?");
  if (izin) getMyLocation(false);
});

onUnmounted(() => {
  window.removeEventListener("focus", checkReturnedLocation);
});
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-50">
    <Header />

    <div class="mb-3 mt-10 relative w-[90%] mx-auto">
      <div
        class="bg-white rounded-full shadow-md flex items-center px-4 py-3 border border-transparent focus-within:border-[#72BD43] transition-all"
      >
        <Icon
          icon="mdi:my-location"
          class="text-[#959595] mr-2 cursor-pointer hover:text-[#72BD43]"
          width="24"
          @click="getMyLocation(true)"
        />
        <input
          :value="startLocation"
          @input="handleInput"
          @focus="setField('start')"
          class="flex-1 bg-transparent text-gray-700 focus:outline-none font-poppins text-sm"
          :placeholder="
            isLocating ? 'Mencari alamat...' : 'Lokasi Saya Saat Ini'
          "
        />
      </div>
      <p
        v-if="startError"
        class="absolute text-red-500 text-[10px] left-4 -bottom-5 font-poppins uppercase tracking-wider"
      >
        {{ startError }}
      </p>
    </div>

    <div class="mb-4 mt-5 relative w-[90%] mx-auto">
      <div
        class="bg-white rounded-full shadow-md flex items-center px-4 py-3 border border-transparent focus-within:border-[#72BD43] transition-all"
      >
        <Icon icon="mdi:magnify" class="text-[#959595] mr-2" width="24" />
        <input
          :value="endLocation"
          @input="handleInput"
          @focus="setField('end')"
          class="flex-1 bg-transparent text-gray-700 focus:outline-none font-poppins text-sm"
          placeholder="Tujuan Akhir"
        />
      </div>
      <p
        v-if="endError"
        class="absolute text-red-500 text-[10px] left-4 -bottom-5 font-poppins uppercase tracking-wider"
      >
        {{ endError }}
      </p>
    </div>

    <div class="w-[90%] mx-auto mb-4 flex justify-start">
      <button
        @click="openMapPicker"
        class="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-100 text-xs font-poppins font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
      >
        <Icon icon="mdi:map-marker-radius" class="text-[#72BD43]" width="18" />
        Pilih Lewat Maps
      </button>
    </div>

    <div
      v-if="activeField && suggestions.length > 0"
      class="flex-1 overflow-y-auto w-full px-5 pb-32 no-scrollbar"
    >
      <div
        class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div
          v-for="(item, index) in suggestions"
          :key="index"
          class="p-4 border-b border-gray-50 last:border-0 hover:bg-green-50/50 cursor-pointer flex items-start gap-3 transition-colors"
          @click="pickSuggestion(item)"
        >
          <div class="mt-1 bg-gray-100 p-2 rounded-full text-gray-500">
            <Icon icon="mdi:map-marker-outline" width="18" />
          </div>
          <div class="flex-1 overflow-hidden">
            <div
              class="text-gray-800 font-semibold text-sm font-poppins truncate"
            >
              {{ item.name }}
            </div>
            <div class="text-gray-400 text-[11px] font-poppins mt-0.5 truncate">
              {{ item.address }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="fixed bottom-10 left-0 w-full z-40 flex justify-center px-6">
      <ButtonPrimary
        @click="goToMap"
        size="medium"
        class="font-poppins w-full shadow-lg shadow-green-200"
      >
        Cari Rute Angkot
      </ButtonPrimary>
    </div>

    <Transition name="fade">
      <div
        v-if="isLoading"
        class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md"
      >
        <div class="relative flex items-center justify-center">
          <div class="w-20 h-20 border-4 border-gray-100 rounded-full"></div>
          <div
            class="absolute w-20 h-20 border-4 border-t-[#72BD43] border-transparent rounded-full animate-spin"
          ></div>
          <Icon
            icon="mdi:bus-side"
            class="absolute text-[#72BD43]"
            width="32"
          />
        </div>
        <p
          class="mt-6 font-poppins text-sm font-bold text-gray-800 animate-pulse tracking-wide"
        >
          Mencari Rute Terbaik...
        </p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.animate-spin {
  animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
</style>
