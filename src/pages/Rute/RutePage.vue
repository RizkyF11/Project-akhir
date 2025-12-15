<script setup>
import Header from "../../components/Header.vue";
import { ref, onMounted, computed, nextTick } from "vue"; // Tambahkan nextTick
import { Icon } from "@iconify/vue";
import * as maptilersdk from "@maptiler/sdk"; // Import MapTiler SDK
import "@maptiler/sdk/dist/maptiler-sdk.css"; // Import CSS MapTiler

const searchQuery = ref("");
const apiBaseUrl = import.meta.env.VITE_API_URL;
const apiKey = import.meta.env.VITE_MAPTILER_API_KEY; // API Key MapTiler

// === STATE DATA ===
const angkotRoutes = ref([]);
const isLoading = ref(true);

// === MODAL & MAP STATE ===
const showModal = ref(false);
const selectedRoute = ref(null);
const detailMapContainer = ref(null); // Ref untuk div peta di modal
const detailMap = ref(null); // Instance peta

// ... (Bagian import dan deklarasi tetap sama) ...

// Fungsi Fallback Reverse Geocoding (Poin 3)
const fetchStreetNamesFallback = async (coordinates) => {
  const N = coordinates.length;
  let routeList = new Set();

  // Ambil sampel setiap 50 koordinat untuk menghemat kuota API
  for (let i = 0; i < N; i += 50) {
    const coord = coordinates[i];
    const geoUrl = `https://api.maptiler.com/geocoding/${coord.lng},${coord.lat}.json?key=${apiKey}&limit=1`;

    try {
      const response = await fetch(geoUrl);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        // Ambil komponen pertama (nama jalan)
        const place = data.features[0].place_name;
        const streetName = place.split(",")[0].trim();

        if (streetName && streetName !== "" && streetName !== "Unnamed Road") {
          routeList.add(streetName);
        }
      }
    } catch (e) {
      continue; // Lanjutkan ke titik berikutnya jika gagal
    }
  }

  if (routeList.size > 0) {
    return (
      "Jalur Angkot Melalui (Perkiraan): \n- " +
      Array.from(routeList).join("\n- ")
    );
  }
  return "Tidak dapat memetakan jalur angkot.";
};

// Fungsi Utama: Coba Routing (Poin 1), jika Gagal 404, panggil Fallback
const fetchRouteName = async (coordinates) => {
  // 1. Tentukan Waypoints untuk Rute Memutar (Menggunakan 4 Titik untuk Rute Panjang)
  const N = coordinates.length;
  if (N < 100) {
    // Jika koordinat terlalu sedikit, coba Fallback langsung
    console.warn(
      "Rute terlalu pendek, langsung menggunakan Fallback Geocoding."
    );
    return await fetchStreetNamesFallback(coordinates);
  }

  const p1 = coordinates[0];
  const p2 = coordinates[Math.floor(N * 0.25)];
  const p3 = coordinates[Math.floor(N * 0.5)];
  const p4 = coordinates[Math.floor(N * 0.75)];

  // Waypoints: P1 -> P2 -> P3 -> P4
  const waypoints = `${p1.lng},${p1.lat};${p2.lng},${p2.lat};${p3.lng},${p3.lat};${p4.lng},${p4.lat}`;
  const routeUrl = `https://api.maptiler.com/v3/routes/driving/${waypoints}.json?key=${apiKey}&alternatives=false&geometries=geojson&steps=true`;

  try {
    const response = await fetch(routeUrl);

    if (!response.ok) {
      // **Jika gagal 404/400 (karena rute ditolak), gunakan Fallback**
      console.error(
        `Routing API Gagal [Status ${response.status}]. Beralih ke Fallback Geocoding.`
      );
      return await fetchStreetNamesFallback(coordinates);
    }

    // 2. Jika OK, proses JSON Routing
    const data = await response.json();

    if (data.code === "Ok" && data.routes && data.routes[0].legs) {
      let routeList = new Set();
      data.routes[0].legs.forEach((leg) => {
        leg.steps.forEach((step) => {
          if (step.name && step.name.trim() !== "") {
            routeList.add(step.name.trim());
          }
        });
      });

      if (routeList.size > 0) {
        return (
          "Jalur Angkot Melalui: \n- " + Array.from(routeList).join("\n- ")
        );
      }
    }
    return "Routing berhasil, tetapi tidak ada nama jalan yang diekstrak.";
  } catch (error) {
    console.error(
      "Terjadi kesalahan koneksi saat Routing, menggunakan Fallback:",
      error
    );
    return await fetchStreetNamesFallback(coordinates);
  }
};

// Fungsi Format Rupiah
const formatRupiah = (angka) => {
  if (!angka) return "Rp 0";
  const raw = String(angka).replace(".00", "");
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(raw);
};

// 1. Fetch Data List
onMounted(async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/angkot`);
    const result = await response.json();

    if (result.status === "success") {
      angkotRoutes.value = result.data.map((item) => {
        let start = item.nama_trayek;
        let end = "";

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
    console.error("Gagal memuat data:", error);
  } finally {
    isLoading.value = false;
  }
});

// 2. Computed Search
const filteredRoutes = computed(() => {
  if (!searchQuery.value) return angkotRoutes.value;
  const lower = searchQuery.value.toLowerCase();
  return angkotRoutes.value.filter(
    (r) =>
      r.code.toLowerCase().includes(lower) ||
      r.full_name.toLowerCase().includes(lower)
  );
});

// 3. Open Modal & Render Map
const openModal = async (summaryRoute) => {
  // Reset data lama
  selectedRoute.value = {
    ...summaryRoute,
    deskripsi: "Memuat detail tarif dan peta...",
    coordinates: [],
  };
  showModal.value = true;

  try {
    const response = await fetch(`${apiBaseUrl}/angkot/${summaryRoute.id}`);
    const result = await response.json();

    if (result.status === "success") {
      const detail = result.data;
      const rutes = detail.rutes || [];

      const deskripsiAwal = `
        Status Angkot: ${
          detail.aktif == 1 ? "Aktif Beroperasi" : "Tidak Aktif"
        }. 
        Daftar Tarif Resmi: 
        Umum (${formatRupiah(detail.tarif_umum)}), 
        Pelajar SMA (${formatRupiah(detail.tarif_sma)}), 
        Pelajar SMP (${formatRupiah(detail.tarif_smp)}), 
        Pelajar SD (${formatRupiah(detail.tarif_sd)}).
      `;

      if (rutes.length > 0 && rutes[0].coordinates.length > 1) {
        const routeNamesText = await fetchRouteName(rutes[0].coordinates);

        selectedRoute.value.deskripsi = deskripsiAwal + "\n\n" + routeNamesText;
      } else {
        selectedRoute.value.deskripsi =
          deskripsiAwal + "\n\nData koordinat jalur tidak ditemukan.";
      }

      selectedRoute.value = {
        ...selectedRoute.value,
        // deskripsi: deskripsiText,
        // Ambil semua rute dan koordinatnya
        rutes: rutes,
      };

      // === INISIALISASI PETA ===
      // Kita harus menunggu DOM render modal selesai dulu
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
  // Hapus map instance untuk mencegah memory leak / error saat dibuka lagi
  if (detailMap.value) {
    detailMap.value.remove();
    detailMap.value = null;
  }
};

// Fungsi Render Peta Detail
const initDetailMap = (rutes) => {
  if (!detailMapContainer.value) return;
  if (!rutes || rutes.length === 0) return; // Jika tidak ada koordinat, jangan load map

  maptilersdk.config.apiKey = apiKey;

  // 1. Ambil koordinat dari rute pertama (sebagai default center)
  // Format API: [{lat, lng}, {lat, lng}] -> Maptiler butuh: [[lng, lat], [lng, lat]]
  const routeCoords = rutes[0].coordinates.map((c) => [c.lng, c.lat]);

  if (routeCoords.length === 0) return;

  const startPoint = routeCoords[0];

  // 2. Buat Peta
  detailMap.value = new maptilersdk.Map({
    container: detailMapContainer.value,
    style: maptilersdk.MapStyle.STREETS,
    center: startPoint,
    zoom: 14,
    navigationControl: false, // Opsi: sembunyikan kontrol zoom agar bersih
    geolocateControl: false,
  });

  // 3. Tambahkan Jalur saat load
  detailMap.value.on("load", () => {
    // Tambahkan Source
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

    // Tambahkan Layer Garis
    detailMap.value.addLayer({
      id: "route-detail-line",
      type: "line",
      source: "route-detail",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": selectedRoute.value.warna_angkot || "#ff0000", // Warna sesuai angkot
        "line-width": 4,
      },
    });

    // Fit Bounds (Agar seluruh rute terlihat)
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
        <div class="overflow-y-auto w-full">
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
              Tidak ada data jalur peta tersedia.
            </p>
          </div>

          <p
            class="text-gray-600 text-sm text-justify leading-relaxed px-5 mb-4 whitespace-pre-line"
          >
            {{ selectedRoute.deskripsi }}
          </p>

          <div class="flex justify-center pb-4">
            <button
              class="px-6 py-2 bg-red-500 text-white rounded-lg shadow"
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
