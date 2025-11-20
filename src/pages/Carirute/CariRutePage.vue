<script setup>
import { Icon } from "@iconify/vue";
import Header from "../../components/Header.vue";
import { ref, onMounted, watch } from "vue";

// ================================
// STATE
// ================================
const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

const startLocation = ref("");
const startCoords = ref([null, null]); // [lng, lat]
const activePanel = ref(false);
const suggestions = ref([]);

// prioritaskan area cianjur
// batas wilayah cianjur (perkiraan akurat)
const CIANJUR_BBOX = "106.83,-7.55,107.45,-6.71";

// ================================
// BOTTOM SHEET DRAGGABLE
// ================================
const panelHeight = ref("50%"); // posisi default
const startY = ref(0);
const currentHeight = ref(0);
const snapPoints = [0.25, 0.5, 0.75]; // 25%, 50%, 75%

const startDrag = (e) => {
  startY.value = e.touches[0].clientY;
  currentHeight.value = parseInt(panelHeight.value);
};

const onDrag = (e) => {
  const delta = startY.value - e.touches[0].clientY;
  const vh = window.innerHeight;

  const percent = ((currentHeight.value * vh / 100 + delta) / vh) * 100;
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

watch(activePanel, (val)  => {
  if (val) {
    document.body.style.overflow = "hidden"; //disable scroll
  } else {
    document.body.style.overflow = "auto"; //enable scroll
  }
});


// ================================
// POP UP IZIN LOKASI
// ================================
onMounted(() => {
  const izin = confirm("Aktifkan lokasi untuk mendeteksi lokasi anda?");
  if (izin) getMyLocation();
});

// ================================
// REVERSE GEOCODING MAPTILER
// (format benar + diutamakan area cianjur)
// ================================
const reverseGeocode = async (lng, lat) => {
   console.log("Reverse input:", lng, lat); // debug
  const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return "Lokasi tidak diketahui";
    } 

    const data = await res.json();
    if (!data.features?.length) return "Lokasi tidak diketahui";

    // prioritaskan tempat cianjur
    const poi = data.features.find((f) => (f.place_type ?? []).includes("poi"));

    return poi?.place_name || data.features[0].place_name;
  } catch (e) {
    console.error("Reverse geocode error:", e);
    return "Lokasi Tidak Diketahui";
  }
};



// ================================
// GPS OTOMATIS (ISI INPUT OTOMATIS)
// ================================
const getMyLocation = () => {
  if (!navigator.geolocation) {
    alert("Browser Anda tidak mendukung GPS");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;

      startCoords.value = [longitude, latitude];

      const place = await reverseGeocode(longitude, latitude);

      startLocation.value = place || "Lokasi saya saat ini";
    },
    () => alert("Gagal mendapatkan lokasi. Pastikan GPS aktif."),
    { enableHighAccuracy: true }
  );
};

// ================================
// SEARCH LOKASI MAPTILER
// ================================
const fetchGeocode = async (query) => {
  if (!query?.trim()) {
    suggestions.value = [];
    return;
  }

  // prefill “cianjur” untuk memaksa hasil lebih relevan
  let q = query.trim();
  if (q.split(" ").length <= 2 && !q.toLowerCase().includes("cianjur")) {
    q = `${q} cianjur`;
  }

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    q
  )}.json?key=${apiKey}&country=ID&bbox=${CIANJUR_BBOX}&fuzzyMatc=true&autocomplete=true&types=poi,address,street,place`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const distanceToCianjur = (coords) => {
      const [lng, lat] = coords;
      const dx = lng - 107.139038;
      const dy = lat + 6.817977;
      return Math.sqrt(dx * dx + dy * dy);
    }

    suggestions.value =
      data.features?.map((item) => ({
        name: item.place_name,
        coords: item.geometry.coordinates,
      })) 
      .sort((a, b) => distanceToCianjur(a.coords) - distanceToCianjur(b.coords))
      || [];
      
  } catch {
    suggestions.value = [];
  }
};

// ================================
// PILIH LOKASI DARI SUGGESTION
// ================================
const pickSuggestion = (item) => {
  startLocation.value = item.name;
  startCoords.value = item.coords;

  console.log("📍 Lokasi hasil search dipilih:", item.name);
  console.log("📌 Koordinat hasil search:", item.coords);

  activePanel.value = false;
};
</script>

<template>
  <div class="flex flex-col h-screen">
    <Header />

    <!-- INPUT LOKASI -->
    <div class="mb-4 mt-10">
      <div
        class="absolute left-1/2 transform -translate-x-1/2 w-[90%] bg-white rounded-full shadow-md flex items-center px-4 py-3 z-10"
      >
        <Icon
          icon="mdi:my-location"
          class="text-[#959595] mr-2"
          width="24"
          height="24"
        />
        <input
          v-model="startLocation"
          @focus="() => activePanel = true"
          class="flex-1 bg-transparent text-[#959595] focus:outline-none font-poppins"
          placeholder="Pilih Lokasi Awal"
        />
      </div>
    </div>

    <!-- =============================================== -->
    <!-- BOTTOM SHEET ala GOJEK -->
    <!-- =============================================== -->
    <div
      v-if="activePanel"
      class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[425px] h-full 
         bg-black/40 flex justify-center items-end z-50"
      @click.self="activePanel = false"
    >
      <div
        class="w-full max-w-[425px] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.2)] rounded-t-2xl p-5 overflow-y-auto transition-all duration-200 fixed bottom-0 left-1/2 -translate-x-1/2"
        :style="{ height: panelHeight }"
      >
        <!-- DRAG HANDLE -->
        <div
          class="w-14 h-1.5 bg-gray-500 rounded-full mx-auto mb-4"
          @touchstart="startDrag"
          @touchmove="onDrag"
          @touchend="endDrag"
        ></div>

        <!-- SEARCH INPUT -->
        <div class="flex items-center mb-4">
          <Icon
            icon="mdi:arrow-left"
            width="24"
            class="text-[#959595] mr-3"
            @click="activePanel = false"
          />
          <input
            class="flex-1 bg-white shadow-md rounded-full px-4 py-3 text-[#959595] focus:outline-none font-poppins"
            placeholder="Cari Lokasi..."
            @input="fetchGeocode($event.target.value)"
          />
        </div>

        <!-- RESULT LIST -->
        <div v-if="suggestions.length">
          <div
            v-for="item in suggestions"
            :key="item.name"
            class="p-3 border-b text-[#cdc8c8] cursor-pointer"
            @click="pickSuggestion(item)"
          >
            <div class="text-[#4c4a4a]">{{ item.name }}</div>
          </div>
        </div>

        <div v-else class="text-[#959595] text-center mt-5">
          Ketik untuk mencari lokasi...
        </div>
      </div>
    </div>
  </div>
</template>

