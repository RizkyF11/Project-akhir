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

const startError = ref("");
const endError = ref("");
const startLocation = ref("");
const startCoords = ref([null, null]); // [lng, lat]
const endLocation = ref("");
const endCoords = ref([null, null]); // [lng, lat]

const panelMode = ref("start"); // "start" atau "end"
const activePanel = ref(false);
const suggestions = ref([]);

// Batas wilayah Cianjur (bounding box)
const CIANJUR_BBOX = "106.83,-7.55,107.45,-6.71";

// ================================
// BOTTOM SHEET LOGIC
// ================================
const panelHeight = ref("50%");
const startY = ref(0);
const currentHeight = ref(0);
const snapPoints = [0.25, 0.5, 0.75];

const startDrag = (e) => {
  startY.value = e.touches[0].clientY;
  currentHeight.value = parseInt(panelHeight.value);
};

const onDrag = (e) => {
  const delta = startY.value - e.touches[0].clientY;
  const vh = window.innerHeight;
  const percent = (((currentHeight.value * vh) / 100 + delta) / vh) * 100;
  const clamped = Math.min(Math.max(percent, 20), 90);
  panelHeight.value = `${clamped}%`;
};

const endDrag = () => {
  const percent = parseInt(panelHeight.value);
  let closest = snapPoints.reduce((a, b) =>
    Math.abs(b * 100 - percent) < Math.abs(a * 100 - percent) ? b : a
  );
  panelHeight.value = `${closest * 100}%`;
};

watch(activePanel, (val) => {
  document.body.style.overflow = val ? "hidden" : "auto";
});

// ================================
// REVERSE GEOCODING (MAPTILER + OSM FALLBACK)
// ================================

// 1. Fungsi Cadangan: OpenStreetMap (Nominatim)
const reverseGeocodeOSM = async (lng, lat) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, {
      headers: {
        // Ganti dengan email/nama project Anda agar tidak kena blokir
        "User-Agent": "AngkotinApp/1.0 (project-angkotin@example.com)",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.display_name) {
      // Ambil 3 bagian pertama (Nama Jalan, Desa/Kel, Kec)
      return data.display_name.split(",").slice(0, 3).join(",");
    }
    return null;
  } catch (e) {
    console.error("OSM Fallback error:", e);
    return null;
  }
};

// 2. Fungsi Utama: MapTiler dengan Fallback
const reverseGeocode = async (lng, lat) => {
  const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("MapTiler error");

    const data = await res.json();
    const hasData = data.features && data.features.length > 0;
    const firstFeature = hasData ? data.features[0].place_name : "";

    // JIKA MAPTILER GAGAL / UNKNOWN, GUNAKAN OSM
    if (!hasData || firstFeature.toLowerCase().includes("unknown")) {
      console.log("MapTiler minim data, mencoba OSM...");
      const osmResult = await reverseGeocodeOSM(lng, lat);
      if (osmResult) return osmResult;
    }

    // Prioritaskan POI dari MapTiler jika ada
    const poi = data.features?.find((f) =>
      (f.place_type ?? []).includes("poi")
    );
    return poi?.place_name || firstFeature || "Lokasi tidak diketahui";
  } catch (e) {
    console.error("Reverse geocode error, trying OSM:", e);
    return (
      (await reverseGeocodeOSM(lng, lat)) || "Lokasi Terdeteksi (Gunakan Pin)"
    );
  }
};

// ================================
// GPS & SEARCH LOGIC
// ================================
const getMyLocation = () => {
  if (!navigator.geolocation) {
    alert("Browser Anda tidak mendukung GPS");
    return;
  }

  startLocation.value = "Mencari alamat...";

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      startCoords.value = [longitude, latitude];

      const place = await reverseGeocode(longitude, latitude);
      startLocation.value = place;
    },
    () => {
      startLocation.value = "";
      alert("Gagal mendapatkan lokasi. Pastikan GPS aktif.");
    },
    { enableHighAccuracy: true }
  );
};

const fetchGeocode = async (query) => {
  if (!query?.trim()) {
    suggestions.value = [];
    return;
  }
  let q = query.trim();
  if (q.split(" ").length <= 2 && !q.toLowerCase().includes("cianjur")) {
    q = `${q} cianjur`;
  }

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    q
  )}.json?key=${apiKey}&country=ID&bbox=${CIANJUR_BBOX}&fuzzyMatch=true&autocomplete=true&types=poi,address,street,place`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const distanceToCianjur = (coords) => {
      const [lng, lat] = coords;
      return Math.sqrt(
        Math.pow(lng - 107.139038, 2) + Math.pow(lat + 6.817977, 2)
      );
    };

    suggestions.value =
      data.features
        ?.map((item) => ({
          name: item.place_name,
          coords: item.geometry.coordinates,
        }))
        .sort(
          (a, b) => distanceToCianjur(a.coords) - distanceToCianjur(b.coords)
        ) || [];
  } catch {
    suggestions.value = [];
  }
};

const pickSuggestion = (item) => {
  if (panelMode.value === "start") {
    startLocation.value = item.name;
    startCoords.value = item.coords;
  } else {
    endLocation.value = item.name;
    endCoords.value = item.coords;
  }
  activePanel.value = false;
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
  }
};

onMounted(() => {
  const izin = confirm("Aktifkan lokasi untuk mendeteksi lokasi anda?");
  if (izin) getMyLocation();
});
</script>

<template>
  <div class="flex flex-col h-screen">
    <Header />

    <div class="mb-3 mt-10 relative w-[90%] mx-auto">
      <div class="bg-white rounded-full shadow-md flex items-center px-4 py-3">
        <Icon
          icon="mdi:my-location"
          class="text-[#959595] mr-2"
          width="24"
          height="24"
        />
        <input
          v-model="startLocation"
          readonly
          @click="
            () => {
              panelMode = 'start';
              activePanel = true;
            }
          "
          class="flex-1 bg-transparent text-[#4c4a4a] focus:outline-none font-poppins cursor-pointer"
          placeholder="Pilih Lokasi Awal"
        />
      </div>
      <p
        v-if="startError"
        class="absolute text-red-500 text-sm left-3 -bottom-6"
      >
        {{ startError }}
      </p>
    </div>

    <div class="mb-10 mt-5 relative w-[90%] mx-auto">
      <div class="bg-white rounded-full shadow-md flex items-center px-4 py-3">
        <Icon
          icon="mdi:location"
          class="text-[#959595] mr-2"
          width="24"
          height="24"
        />
        <input
          v-model="endLocation"
          readonly
          @click="
            () => {
              panelMode = 'end';
              activePanel = true;
            }
          "
          class="flex-1 bg-transparent text-[#4c4a4a] focus:outline-none font-poppins cursor-pointer"
          placeholder="Pilih Tujuan"
        />
      </div>
      <p v-if="endError" class="absolute text-red-500 text-sm left-3 -bottom-6">
        {{ endError }}
      </p>
    </div>

    <div
      v-if="activePanel"
      class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[425px] h-full bg-black/40 flex justify-center items-end z-50"
      @click.self="activePanel = false"
    >
      <div
        class="w-full max-w-[425px] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.2)] rounded-t-2xl p-5 transition-all duration-200 fixed bottom-0 left-1/2 -translate-x-1/2"
        :style="{ height: panelHeight }"
      >
        <div
          class="w-14 h-1.5 bg-gray-500 rounded-full mx-auto mb-4"
          @touchstart="startDrag"
          @touchmove="onDrag"
          @touchend="endDrag"
        ></div>

        <div class="flex items-center mb-4">
          <Icon
            icon="mdi:arrow-left"
            width="24"
            class="text-[#959595] mr-3 cursor-pointer"
            @click="activePanel = false"
          />
          <input
            class="flex-1 bg-white shadow-md rounded-full px-4 py-3 text-[#4c4a4a] focus:outline-none font-poppins"
            :placeholder="
              panelMode === 'start' ? 'Cari Lokasi awal...' : 'Cari Tujuan...'
            "
            @input="fetchGeocode($event.target.value)"
          />
        </div>

        <div class="overflow-y-auto h-[calc(100%-120px)] no-scrollbar">
          <div v-if="suggestions.length">
            <div
              v-for="item in suggestions"
              :key="item.name"
              class="p-3 border-b hover:bg-gray-50 cursor-pointer"
              @click="pickSuggestion(item)"
            >
              <div class="text-[#4c4a4a] text-sm">{{ item.name }}</div>
            </div>
          </div>
          <div v-else class="text-[#959595] text-center mt-5">
            Ketik untuk mencari lokasi...
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="!activePanel"
      class="fixed bottom-10 left-1/2 transform -translate-x-1/2 w-full max-w-[425px] z-40 flex justify-center"
    >
      <ButtonPrimary
        @click="goToMap"
        size="medium"
        class="font-poppins w-[83%]"
      >
        Cari Rute Angkot
      </ButtonPrimary>
    </div>
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
</style>
