<script setup>
import Header from "../../components/Header.vue";
import { ref, onMounted } from "vue";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useRouter, useRoute } from "vue-router";
import RouteDetailPanel from "../../components/RouteDetailPanel.vue";

// router
const router = useRouter();
const route = useRoute();

// KONFIGURASI TIMEOUT
const CACHE_KEY = "routeData";
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 Menit

const isPanelVisible = ref(false); // Default open for UI focus
const routeResult = ref(null);

// map state
const mapContainer = ref(null);
const map = ref(null);
const markers = ref([]); //melacak marker

// default lokasi cianjur
const cianjurCoords = [107.1422, -6.812];

// API Keys
const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
const apiBaseUrl = import.meta.env.VITE_API_URL;

// Navigasi ke cari rute
const goToCariRute = () => {
  router.push("/carirute");
};

const clearMap = () => {
  const routeLayers = ["single-route", "route-1", "route-2", "r1", "r2", "r3"];
  routeLayers.forEach((id) => {
    if (map.value.getLayer(id)) map.value.removeLayer(id);
    if (map.value.getSource(id)) map.value.removeSource(id);
  });

  markers.value.forEach((marker) => marker.remove());
  markers.value = [];
};

/* =====================================================
      FUNGSI TAMBAHAN UNTUK MENAMPILKAN JALUR ANGKOT
===================================================== */

// Menambah polyline (single)
const drawPolyline = (coords, color = "#2ecc71", id = "route-line") => {
  const geojson = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: coords,
    },
  };

  if (map.value.getSource(id)) {
    map.value.getSource(id).setData(geojson);
    if (map.value.getLayer(id)) {
      map.value.setPaintProperty(id, "line-color", color);
    }
  } else {
    map.value.addSource(id, {
      type: "geojson",
      data: geojson,
    });

    map.value.addLayer({
      id: id,
      type: "line",
      source: id,
      paint: {
        "line-color": color,
        "line-width": 5,
      },
    });
  }
};

// menambah marker lokasi
const addMarker = (lng, lat, color = "red") => {
  const newMarker = new maptilersdk.Marker({ color })
    .setLngLat([lng, lat])
    .addTo(map.value);
  markers.value.push(newMarker);
  return newMarker;
};

const addDropMarker = (lng, lat) => {
  const el = document.createElement("div");
  el.className = "drop-marker";
  el.style.width = "30px";
  el.style.height = "30px";
  el.style.backgroundImage = "url('/src/assets/gps.png')";
  el.style.backgroundSize = "cover";

  const newMarker = new maptilersdk.Marker({ element: el })
    .setLngLat([lng, lat])
    .addTo(map.value);
  markers.value.push(newMarker);
  return newMarker;
};

// Render SINGLE route
const renderSingleRoute = (data) => {
  // Map data to [lng, lat] format
  const coords = data.routes[0].coordinates.map((c) => [c.lng, c.lat]);

  drawPolyline(
    coords,
    data.routes[0].angkot.warna ?? "#2ecc71",
    "single-route"
  );
};

// Render DOUBLE route
const renderDoubleRoute = (data) => {
  const r1 = data.routes[0];
  const r2 = data.routes[1];

  // ubah [{lat,lng}] menjadi [[lng,lat]]
  const coords1 = r1.coordinates.map((c) => [c.lng, c.lat]);
  const coords2 = r2.coordinates.map((c) => [c.lng, c.lat]);

  drawPolyline(coords1, r1.angkot.warna ?? "#3498db", "route-1");
  drawPolyline(coords2, r2.angkot.warna ?? "#9b59b6", "route-2");

  // Tambahkan MARKER KUNING untuk TITIK TRANSFER (Pickup Angkot 2)
  if (r2.transfer_point_on_b) {
    const [lng, lat] = r2.transfer_point_on_b.coordinates;
    addMarker(lng, lat, "orange");
  }
};

// Render TRIPLE route
const renderTripleRoute = (data) => {
  const r1 = JSON.parse(data.r1_polyline);
  const r2 = JSON.parse(data.r2_polyline);
  const r3 = JSON.parse(data.r3_polyline);

  drawPolyline(r1, "#e74c3c", "r1");
  drawPolyline(r2, "#f1c40f", "r2");
  drawPolyline(r3, "#2ecc71", "r3");

  addMarker(r1[r1.length - 1][0], r1[r1.length - 1][1], "yellow");
  addMarker(r2[r2.length - 1][0], r2[r2.length - 1][1], "yellow");
};

// Panggil API rekomendasi angkot
const loadRecommendedRoutes = async () => {
  // 🧹 1. BERSIHKAN PETA DAHULU
  clearMap();

  let dataToRender = null;
  let isExpired = false;

  /* ============================
      0️⃣ — AMBIL DARI LOCALSTORAGE
      ============================ */
  const lsData = localStorage.getItem(CACHE_KEY);

  if (lsData) {
    try {
      const parsed = JSON.parse(lsData);

      // Cek Timestamp
      const timeElapsed = Date.now() - parsed.timestamp;

      if (timeElapsed > CACHE_DURATION_MS) {
        // === JIKA KADALUARSA ===
        console.warn("Data rute kadaluarsa. Menghapus data lokal...");
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem("startLocationName");
        localStorage.removeItem("endLocationName");

        isExpired = true;
        alert("Sesi rute telah berakhir. Jalur tidak lagi ditampilkan.");

        // STOP DISINI, JANGAN LANJUT KE RENDER ATAU API FALLBACK
        routeResult.value = null;
        isPanelVisible.value = false;
        return;
      } else {
        // === JIKA DATA MASIH VALID ===
        console.log("Loaded valid data from LocalStorage");
        dataToRender = parsed.data; // Ambil object data aslinya
      }
    } catch (e) {
      console.error("Error parsing localstorage:", e);
      localStorage.removeItem(CACHE_KEY);
    }
  }

  /* ============================
      1️⃣ — (opsional) fallback dari URL 
      (Hanya dijalankan jika TIDAK expired dan dataToRender masih kosong)
      ============================ */
  const rawData = route.query.data;

  if (!isExpired && !dataToRender && rawData) {
    try {
      let decoded = decodeURIComponent(rawData);
      decoded = decodeURIComponent(decoded);
      dataToRender = JSON.parse(decoded);
    } catch (e) {
      console.error("Error decoding URL data:", e);
    }
  }

  /* ============================
      2️⃣ — fallback panggil API
      (Hanya dijalankan jika TIDAK expired dan dataToRender masih kosong)
      ============================ */
  const start_lat = route.query.start_lat;
  const start_lng = route.query.start_lng;
  const end_lat = route.query.end_lat;
  const end_lng = route.query.end_lng;

  if (!isExpired && !dataToRender && start_lat && end_lat) {
    const url = `${apiBaseUrl}/rekomendasi-angkot?start_lat=${start_lat}&start_lng=${start_lng}&end_lat=${end_lat}&end_lng=${end_lng}`;

    try {
      const res = await fetch(url, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      dataToRender = await res.json();
    } catch (e) {
      console.error("API Fallback Error:", e);
    }
  }

  // ----------------------------------------------------
  // 🚀 LOGIKA RENDERING UTAMA (DIJALANKAN DI AKHIR)
  // ----------------------------------------------------
  if (dataToRender && dataToRender.status === "success") {
    routeResult.value = dataToRender;
    isPanelVisible.value = true;

    if (dataToRender.type === "single") renderSingleRoute(dataToRender);
    else if (dataToRender.type === "double") renderDoubleRoute(dataToRender);
    else if (dataToRender.type === "triple") renderTripleRoute(dataToRender);

    // 🚩 TAMBAHKAN MARKER PENGGUNA (START & END)
    // Marker hanya muncul jika rute berhasil dimuat
    if (start_lat && start_lng) {
      addMarker(parseFloat(start_lng), parseFloat(start_lat), "green");
    }

    if (end_lat && end_lng) {
      addDropMarker(parseFloat(end_lng), parseFloat(end_lat));
    }

    // Perluasan batasan peta untuk mencakup Start dan End
    if (start_lat && end_lat) {
      const bounds = new maptilersdk.LngLatBounds();
      bounds.extend([parseFloat(start_lng), parseFloat(start_lat)]);
      bounds.extend([parseFloat(end_lng), parseFloat(end_lat)]);

      map.value.fitBounds(bounds, {
        padding: 50,
        duration: 1500,
      });
    }
  } else {
    routeResult.value = null;
    isPanelVisible.value = false;
    console.warn("No successful route data found or session expired.");
  }
};

/* =========== INISIALISASI MAP ============== */
onMounted(() => {
  maptilersdk.config.apiKey = apiKey;

  map.value = new maptilersdk.Map({
    container: mapContainer.value,
    style: maptilersdk.MapStyle.STREETS,
    center: cianjurCoords,
    zoom: 15,
  });

  map.value.dragRotate.enable();
  map.value.touchZoomRotate.enableRotation();

  map.value.on("load", () => {
    loadRecommendedRoutes();
  });
});
</script>

<template>
  <div class="flex flex-col w-full h-screen">
    <Header />

    <div class="relative w-full flex-1" style="height: calc(100vh - 64px)">
      <div class="w-full h-full absolute top-0 left-0" ref="mapContainer"></div>

      <div
        v-if="!routeResult"
        class="absolute top-5 left-1/2 -translate-x-1/2 z-50 bg-white/90 px-4 py-2 rounded-lg shadow-md border border-red-200"
      >
        <p class="text-xs text-red-500 font-semibold">
          Tidak ada jalur ditampilkan (Sesi berakhir)
        </p>
      </div>

      <button
        @click="goToCariRute"
        class="absolute bottom-27 right-5 bg-[#72BD43] hover:bg-[#467529] rounded-full shadow-md w-13 h-13 flex items-center justify-center transition-transform active:scale-95 z-40"
      >
        <img src="/src/assets/buttonimg.png" alt="carirute" class="w-7 h-7" />
      </button>

      <RouteDetailPanel
        :is-visible="isPanelVisible"
        :route-data="routeResult"
        @close="isPanelVisible = false"
      />
    </div>
  </div>
</template>

<style>
.maplibregl-ctrl-top-right .maplibregl-ctrl {
  /* bg-white */
  background-color: #ffffff;
  /* rounded-lg (0.5rem) */
  border-radius: 0.5rem;
  /* shadow-lg (approximate) */
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1);
  /* p-2 (0.5rem) */
  padding: 0.5rem;
}
</style>
