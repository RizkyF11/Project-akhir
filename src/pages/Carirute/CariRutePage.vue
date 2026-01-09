<script setup>
import { Icon } from "@iconify/vue";
import Header from "../../components/Header.vue";
import { ref, onMounted, watch } from "vue";
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

const isLoading = ref(false); // State Loading Utama
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

// Batas wilayah Cianjur (bounding box)
const CIANJUR_BBOX = "106.83,-7.55,107.45,-6.71";

// Debounce helper
const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

// ================================
// REVERSE GEOCODING (MAPTILER + OSM FALLBACK)
// ================================

const reverseGeocodeOSM = async (lng, lat) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AngkotinApp/1.0",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.display_name) {
      return data.display_name.split(",").slice(0, 3).join(",");
    }
    return null;
  } catch (e) {
    console.error("OSM Fallback error:", e);
    return null;
  }
};

const reverseGeocode = async (lng, lat) => {
  const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("MapTiler error");

    const data = await res.json();
    const hasData = data.features && data.features.length > 0;
    const firstFeature = hasData ? data.features[0].place_name : "";

    if (!hasData || firstFeature.toLowerCase().includes("unknown")) {
      const osmResult = await reverseGeocodeOSM(lng, lat);
      if (osmResult) return osmResult;
    }

    const poi = data.features?.find((f) =>
      (f.place_type ?? []).includes("poi")
    );
    return poi?.place_name || firstFeature || "Lokasi tidak diketahui";
  } catch (e) {
    return (await reverseGeocodeOSM(lng, lat)) || "Lokasi Terdeteksi";
  }
};

// ================================
// GPS & SEARCH LOGIC
// ================================
const getMyLocation = (manual = false) => {
  if (!navigator.geolocation) {
    alert("Browser Anda tidak mendukung GPS");
    return;
  }

  isLocating.value = true;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      // Only update if manual request or field is empty
      if (manual || !startLocation.value) {
        startCoords.value = [longitude, latitude];
        const place = await reverseGeocode(longitude, latitude);
        startLocation.value = place;
      }
      isLocating.value = false;
    },
    () => {
      isLocating.value = false;
      if (manual) alert("Gagal mendapatkan lokasi. Pastikan GPS aktif.");
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

  // Improve accuracy: prioritize Cianjur if not specified
  if (q.split(" ").length <= 2 && !q.toLowerCase().includes("cianjur")) {
    q = `${q} cianjur`;
  }

  // Add proximity if we have user location and searching for destination
  let proximity = "";
  if (activeField.value === "end" && startCoords.value[0]) {
    proximity = `&proximity=${startCoords.value[0]},${startCoords.value[1]}`;
  }

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    q
  )}.json?key=${apiKey}&country=ID&bbox=${CIANJUR_BBOX}&fuzzyMatch=true&autocomplete=true&types=poi,address,street,place${proximity}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    suggestions.value =
      data.features?.map((item) => ({
        name: item.text, // Main name (e.g. "Gang Pataruman")
        address: item.place_name.replace(item.text + ", ", ""), // Full address minus name
        coords: item.geometry.coordinates,
      })) || [];
  } catch {
    suggestions.value = [];
  } finally {
    isSearching.value = false;
  }
};

const debouncedSearch = debounce((query) => {
  fetchGeocode(query);
}, 300);

const handleInput = (e) => {
  const val = e.target.value;
  if (activeField.value === "start") {
    startLocation.value = val;
  } else {
    endLocation.value = val;
  }
  debouncedSearch(val);
};

const highlightMatch = (text) => {
  const query =
    activeField.value === "start" ? startLocation.value : endLocation.value;
  if (!query || !text) return text;
  // Remove " cianjur" if we added it for search but user didn't type it
  const cleanQuery = query.replace(/ cianjur$/i, "").trim();
  if (!cleanQuery) return text;

  const regex = new RegExp(`(${cleanQuery})`, "gi");
  return text.replace(regex, "<b>$1</b>");
};

const pickSuggestion = (item) => {
  if (activeField.value === "start") {
    startLocation.value = item.name; // Use the shorter name or full place_name as desired
    startCoords.value = item.coords;
    console.log("Selected Start Location:", item.name, item.coords);
  } else {
    endLocation.value = item.name;
    endCoords.value = item.coords;
    console.log("Selected End Location:", item.name, item.coords);
  }
  suggestions.value = [];
  activeField.value = null;
};

const setField = (field) => {
  activeField.value = field;
  // Trigger search immediately with current value if exists
  const currentVal =
    field === "start" ? startLocation.value : endLocation.value;
  if (currentVal) fetchGeocode(currentVal);
};

// ================================
// NAVIGATION & CACHE
// ================================
const goToMap = async () => {
  startError.value = startLocation.value ? "" : "Lokasi awal wajib diisi";
  endError.value = endLocation.value ? "" : "Tujuan wajib diisi";

  if (!startLocation.value || !endLocation.value) return;
  if (!startCoords.value[0] || !endCoords.value[0]) {
    alert("Lokasi belum dipilih dengan benar dari daftar");
    return;
  }

  const [startLng, startLat] = startCoords.value;
  const [endLng, endLat] = endCoords.value;

  isLoading.value = true; // Aktifkan Loading

  try {
    const response = await getRekomendasiAngkot(
      startLat,
      startLng,
      endLat,
      endLng
    );
    const dataToStore = { timestamp: Date.now(), data: response.data };

    localStorage.setItem(CACHE_KEY, JSON.stringify(dataToStore));
    localStorage.setItem("startLocationName", startLocation.value);
    localStorage.setItem("endLocationName", endLocation.value);

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
    console.error(err);
    alert("Gagal memuat rekomendasi angkot");
  } finally {
    isLoading.value = false; // Matikan Loading
  }
};

onMounted(() => {
  const izin = confirm("Aktifkan lokasi untuk mendeteksi lokasi anda?");
  if (izin) getMyLocation(false);
});
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <Header />

    <div class="mb-3 mt-10 relative w-[90%] mx-auto">
      <div class="bg-white rounded-full shadow-md flex items-center px-4 py-3">
        <Icon
          icon="mdi:my-location"
          class="text-[#959595] mr-2 cursor-pointer"
          width="24"
          height="24"
          @click="getMyLocation(true)"
        />
        <input
          :value="startLocation"
          @input="handleInput"
          @focus="setField('start')"
          class="flex-1 bg-transparent text-[#959595] focus:outline-none font-poppins"
          :placeholder="
            isLocating ? 'Mencari alamat...' : 'Lokasi Saya Saat Ini'
          "
        />
      </div>
      <p
        v-if="startError"
        class="absolute text-red-500 text-sm left-3 -bottom-6"
      >
        {{ startError }}
      </p>
    </div>

    <div class="mb-4 mt-5 relative w-[90%] mx-auto">
      <div class="bg-white rounded-full shadow-md flex items-center px-4 py-3">
        <Icon
          icon="mdi:magnify"
          class="text-[#959595] mr-2"
          width="24"
          height="24"
        />
        <input
          :value="endLocation"
          @input="handleInput"
          @focus="setField('end')"
          class="flex-1 bg-transparent text-[#959595] focus:outline-none font-poppins"
          placeholder="Tujuan Akhir"
        />
      </div>
      <p v-if="endError" class="absolute text-red-500 text-sm left-3 -bottom-6">
        {{ endError }}
      </p>
    </div>

    <!-- Pilih Lewat Maps Button -->
    <div class="w-[90%] mx-auto mb-4">
      <button
        class="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-sm font-poppins text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Icon icon="mdi:map-marker-radius" class="text-green-500" width="20" />
        Pilih Lewat Maps
      </button>
    </div>

    <!-- Search Results List -->
    <div
      v-if="activeField && suggestions.length > 0"
      class="flex-1 overflow-y-auto w-full px-5 pb-20 no-scrollbar mb-24"
    >
      <div
        class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div
          v-for="(item, index) in suggestions"
          :key="index"
          class="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer flex items-start gap-3"
          @click="pickSuggestion(item)"
        >
          <div class="mt-1 bg-gray-100 p-2 rounded-full">
            <Icon
              icon="mdi:map-marker-outline"
              class="text-gray-600"
              width="20"
            />
          </div>
          <div>
            <div
              class="text-[#4c4a4a] font-medium text-sm font-poppins"
              v-html="highlightMatch(item.name)"
            ></div>
            <div
              class="text-gray-400 text-xs font-poppins mt-0.5 truncate max-w-[250px]"
            >
              {{ item.address }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Button (Only show if not searching or if we want it always visible but maybe hidden by keyboard) -->
    <!-- The user said "bottom panel nya dihilangkan jadi diganti dengan hasil pencarian". 
         But also "Cari Rute Angkot" button is in the image. 
         I will keep the button fixed at bottom but maybe hide it if the list is long? 
         The image shows the button at the bottom. -->
    <div
      class="fixed bottom-10 left-1/2 transform -translate-x-1/2 w-full max-w-[425px] z-40 flex justify-center"
    >
      <ButtonPrimary @click="goToMap" size="medium" class="font-poppins w-[83%]"
        >Cari Rute Angkot</ButtonPrimary
      >
    </div>

    <Transition name="fade">
      <div
        v-if="isLoading"
        class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
      >
        <div class="relative flex items-center justify-center">
          <div class="w-16 h-16 border-4 border-gray-100 rounded-full"></div>
          <div
            class="absolute w-16 h-16 border-4 border-t-[#72BD43] border-transparent rounded-full animate-spin"
          ></div>
          <Icon
            icon="mdi:bus-side"
            class="absolute text-[#72BD43]"
            width="24"
          />
        </div>
        <p
          class="mt-4 font-poppins text-sm font-semibold text-gray-700 animate-pulse"
        >
          Mencari rute terbaik...
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

/* ANIMASI LOADING */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
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
  animation: spin 0.8s linear infinite;
}
</style>
