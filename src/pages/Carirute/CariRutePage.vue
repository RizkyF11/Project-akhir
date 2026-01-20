<script setup>
import { Icon } from "@iconify/vue";
import Header from "../../components/Header.vue";
import { ref, onMounted, onUnmounted } from "vue";
import ButtonPrimary from "../../components/ButtonPrimary.vue";
import { useRouter } from "vue-router";
import { getRekomendasiAngkot } from "../../services/angkotService";
import ErrorState from "../../components/ErrorState.vue";

// ================================
// STATE & CONFIG
// ================================
const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
const CACHE_KEY = "routeData";
const DRAFT_KEY = "draft_route_input";
const RECENT_KEY = "recent_searches";
const AUTO_LOCATE_KEY = "hasAutoLocated";
const CIANJUR_BBOX = "106.83,-7.55,107.45,-6.71";

const router = useRouter();

const isLoading = ref(false);
const startError = ref("");
const endError = ref("");
const startLocation = ref("");
const startCoords = ref([null, null]);
const endLocation = ref("");
const endCoords = ref([null, null]);

const activeField = ref(null);
const suggestions = ref([]);
const recentSearches = ref([]);
const isSearching = ref(false);
const isLocating = ref(false);
const isAutoLocated = ref(false); // State untuk deteksi lokasi otomatis

const errorConfig = ref({
  show: false,
  title: "",
  message: "",
  icon: "",
});

// ================================
// PERSISTENCE & RECENT SEARCH LOGIC
// ================================

const syncToSession = () => {
  const sessionData = {
    startLocation: startLocation.value,
    startCoords: startCoords.value,
    endLocation: endLocation.value,
    endCoords: endCoords.value,
    isAutoLocated: isAutoLocated.value,
  };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(sessionData));
};

const loadFromSession = () => {
  const saved = sessionStorage.getItem(DRAFT_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    startLocation.value = data.startLocation || "";
    startCoords.value = data.startCoords || [null, null];
    endLocation.value = data.endLocation || "";
    endCoords.value = data.endCoords || [null, null];
    isAutoLocated.value = data.isAutoLocated || false;
  }

  const recent = localStorage.getItem(RECENT_KEY);
  if (recent) recentSearches.value = JSON.parse(recent);
};

const saveToRecent = (item) => {
  let list = [...recentSearches.value];
  list = list.filter((s) => s.name !== item.name);
  list.unshift(item);
  list = list.slice(0, 5);
  recentSearches.value = list;
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
};

const swapLocations = () => {
  const tempLoc = startLocation.value;
  const tempCoords = [...startCoords.value];

  startLocation.value = endLocation.value;
  startCoords.value = [...endCoords.value];

  endLocation.value = tempLoc;
  endCoords.value = tempCoords;

  isAutoLocated.value = false; // Reset status auto saat di swap manual
  syncToSession();
};

// ================================
// GEOCODING & LOCATION
// ================================

const reverseGeocode = async (lng, lat) => {
  const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${apiKey}&bbox=${CIANJUR_BBOX}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.features?.[0]?.place_name || "Lokasi Terdeteksi";
  } catch {
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
      isAutoLocated.value = true;
      syncToSession();
      isLocating.value = false;
      if (!manual) sessionStorage.setItem(AUTO_LOCATE_KEY, "true");
      if (navigator.vibrate) navigator.vibrate(50);
    },
    () => {
      isLocating.value = false;
      if (!manual) sessionStorage.setItem(AUTO_LOCATE_KEY, "true");
    },
    { enableHighAccuracy: true },
  );
};

// ================================
// SEARCH & SUGGESTIONS
// ================================

const fetchGeocode = async (query) => {
  if (!query?.trim()) {
    suggestions.value = [];
    return;
  }
  isSearching.value = true;
  let q = query.trim();
  if (!q.toLowerCase().includes("cianjur")) q = `${q} cianjur`;

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${apiKey}&country=ID&bbox=${CIANJUR_BBOX}&types=poi,address,street,place`;

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

const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

const debouncedSearch = debounce((query) => fetchGeocode(query), 300);

const handleInput = (e) => {
  const val = e.target.value;
  if (activeField.value === "start") {
    startLocation.value = val;
    isAutoLocated.value = false;
  } else {
    endLocation.value = val;
  }
  syncToSession();
  debouncedSearch(val);
};

const pickSuggestion = (item) => {
  if (activeField.value === "start") {
    startLocation.value = item.name;
    startCoords.value = item.coords;
  } else {
    endLocation.value = item.name;
    endCoords.value = item.coords;
    saveToRecent(item);
  }
  suggestions.value = [];
  activeField.value = null;
  syncToSession();
};

// ================================
// NAVIGATION & PICKER
// ================================

const openMapPicker = () => {
  const mode = activeField.value || "start";
  syncToSession();
  router.push({ path: "/pilih-lokasi", query: { mode } });
};

const checkReturnedLocation = () => {
  loadFromSession();

  const saved = localStorage.getItem("selected_map_location");
  if (saved) {
    const data = JSON.parse(saved);
    if (data.mode === "start") {
      startLocation.value = data.name;
      startCoords.value = data.coords;
      startError.value = "";
      isAutoLocated.value = false;
    } else {
      endLocation.value = data.name;
      endCoords.value = data.coords;
      endError.value = "";
    }
    syncToSession();
    localStorage.removeItem("selected_map_location");
  }
};

const goToMap = async () => {
  startError.value = startLocation.value ? "" : "Lokasi awal wajib diisi";
  endError.value = endLocation.value ? "" : "Tujuan wajib diisi";

  if (!startLocation.value || !endLocation.value) return;

  isLoading.value = true;
  try {
    const [startLng, startLat] = startCoords.value;
    const [endLng, endLat] = endCoords.value;

    const response = await getRekomendasiAngkot(
      startLat,
      startLng,
      endLat,
      endLng,
    );

    if (response.data.status !== "success") throw { status: 404 };

    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(AUTO_LOCATE_KEY);

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data: response.data,
      }),
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
    handleError(err);
  } finally {
    isLoading.value = false;
  }
};

const handleError = (error) => {
  errorConfig.value.show = true;
  if (error.status === 404) {
    errorConfig.value.title = "Rute Tidak Ditemukan";
    errorConfig.value.message =
      "Maaf, belum ada jalur angkot yang menghubungkan lokasi tersebut.";
    errorConfig.value.icon = "mdi:map-marker-off";
  } else {
    errorConfig.value.title = "Gagal Mencari Rute";
    errorConfig.value.message = "Terjadi kesalahan sistem. Silakan coba lagi.";
    errorConfig.value.icon = "mdi:alert-circle-outline";
  }
};

onMounted(() => {
  checkReturnedLocation();
  window.addEventListener("focus", checkReturnedLocation);

  const alreadyLocated = sessionStorage.getItem(AUTO_LOCATE_KEY);
  if (!alreadyLocated && !startLocation.value) {
    const izin = confirm("Aktifkan lokasi untuk mendeteksi lokasi anda?");
    if (izin) getMyLocation(false);
    else sessionStorage.setItem(AUTO_LOCATE_KEY, "true");
  }
});

onUnmounted(() => {
  window.removeEventListener("focus", checkReturnedLocation);
});
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-50">
    <Header />

    <div class="relative w-[90%] mx-auto mt-10 flex flex-col gap-4">
      <div
        class="absolute left-6 top-12 bottom-12 w-[2px] border-l-2 border-dotted border-gray-300 z-0"
      ></div>

      <div class="relative z-10">
        <div
          class="bg-white rounded-full shadow-md flex items-center px-4 py-3 border-2 transition-all"
          :class="[
            activeField === 'start' ? 'border-[#72BD43]' : 'border-transparent',
            startError ? 'border-red-500' : '',
          ]"
        >
          <Icon
            icon="mdi:my-location"
            class="mr-2 cursor-pointer transition-all active:scale-90"
            :class="[
              isAutoLocated ? 'text-blue-500' : 'text-[#959595]',
              !startLocation && !isLocating
                ? 'animate-pulse-green text-[#72BD43]'
                : '',
            ]"
            width="24"
            @click="getMyLocation(true)"
          />
          <input
            :value="startLocation"
            @input="handleInput"
            @focus="activeField = 'start'"
            class="flex-1 bg-transparent focus:outline-none font-poppins text-sm"
            :class="isAutoLocated ? 'text-blue-600 font-bold' : 'text-gray-700'"
            :placeholder="
              isLocating ? 'Mencari alamat...' : 'Pilih Lokasi Awal'
            "
          />
        </div>
        <p
          v-if="startError"
          class="absolute text-red-500 text-[10px] left-4 -bottom-5 font-poppins"
        >
          {{ startError }}
        </p>
      </div>

      <div class="absolute right-6 top-1/2 -translate-y-1/2 z-20">
        <button
          @click="swapLocations"
          class="bg-[#72BD43] text-white p-2 rounded-full shadow-lg active:scale-90 transition-transform border-2 border-white"
        >
          <Icon icon="mdi:swap-vertical" width="20" />
        </button>
      </div>

      <div class="relative z-10">
        <div
          class="bg-white rounded-full shadow-md flex items-center px-4 py-3 border-2 transition-all"
          :class="[
            activeField === 'end' ? 'border-[#72BD43]' : 'border-transparent',
            endError ? 'border-red-500' : '',
          ]"
        >
          <Icon icon="mdi:magnify" class="text-[#959595] mr-2" width="24" />
          <input
            :value="endLocation"
            @input="handleInput"
            @focus="activeField = 'end'"
            class="flex-1 bg-transparent text-gray-700 focus:outline-none font-poppins text-sm"
            placeholder="Tujuan Akhir"
          />
        </div>
        <p
          v-if="endError"
          class="absolute text-red-500 text-[10px] left-4 -bottom-5 font-poppins"
        >
          {{ endError }}
        </p>
      </div>
    </div>

    <div class="w-[90%] mx-auto mt-8 mb-4">
      <button
        @click="openMapPicker"
        class="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-100 text-xs font-poppins font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
      >
        <Icon icon="mdi:map-marker-radius" class="text-[#72BD43]" width="18" />
        Pilih Lewat Maps
      </button>
    </div>

    <div class="flex-1 overflow-y-auto w-full px-5 pb-32 no-scrollbar mt-2">
      <div v-if="isSearching" class="space-y-3">
        <div
          v-for="i in 3"
          :key="i"
          class="bg-white p-4 rounded-2xl animate-pulse flex gap-3"
        >
          <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-1/3"></div>
            <div class="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>

      <div
        v-else-if="
          activeField === 'end' && !endLocation && recentSearches.length > 0
        "
        class="mb-4"
      >
        <p
          class="text-[11px] font-bold text-gray-400 uppercase ml-2 mb-2 tracking-widest"
        >
          Pencarian Terakhir
        </p>
        <div
          class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div
            v-for="(item, index) in recentSearches"
            :key="index"
            class="p-4 border-b border-gray-50 last:border-0 flex items-center gap-3 active:bg-gray-50 cursor-pointer"
            @click="pickSuggestion(item)"
          >
            <Icon icon="mdi:history" class="text-gray-300" width="20" />
            <div class="flex-1 overflow-hidden">
              <p class="text-gray-800 font-semibold text-sm truncate">
                {{ item.name }}
              </p>
              <p class="text-gray-400 text-[11px] truncate">
                {{ item.address }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="activeField === 'start' && !startLocation && !isLocating"
        @click="getMyLocation(true)"
        class="mb-4 p-4 bg-blue-50 text-blue-700 rounded-2xl flex items-center gap-3 border border-blue-100 active:scale-95 transition-all cursor-pointer"
      >
        <Icon icon="mdi:crosshairs-gps" width="20" />
        <span class="text-sm font-bold font-poppins"
          >Gunakan Lokasi Saya Saat Ini</span
        >
      </div>

      <div
        v-if="suggestions.length > 0"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div
          v-for="(item, index) in suggestions"
          :key="index"
          class="p-4 border-b border-gray-50 last:border-0 hover:bg-green-50/50 cursor-pointer flex items-start gap-3"
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
          class="mt-6 font-poppins text-sm font-bold text-gray-800 animate-pulse"
        >
          Mencari Rute Terbaik...
        </p>
      </div>
    </Transition>

    <ErrorState
      :show="errorConfig.show"
      :title="errorConfig.title"
      :message="errorConfig.message"
      :icon="errorConfig.icon"
      @retry="
        errorConfig.show = false;
        goToMap();
      "
      @close="errorConfig.show = false"
    />
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
.animate-spin {
  animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

/* Animasi Pulse Green untuk Icon GPS */
@keyframes pulse-green {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(114, 189, 67, 0.4));
  }
  70% {
    transform: scale(1.2);
    filter: drop-shadow(0 0 8px rgba(114, 189, 67, 0));
  }
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(114, 189, 67, 0));
  }
}
.animate-pulse-green {
  animation: pulse-green 2s infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
