<script setup>
import Header from "../../components/Header.vue";
import { ref, onMounted } from "vue";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useRouter, useRoute } from "vue-router";

// router
const router = useRouter();
const route = useRoute();

// map state
const mapContainer = ref(null);
const map = ref(null);
const searchQuery = ref("");

// default lokasi cianjur
const cianjurCoords = [107.1422, -6.812];

// API Keys
const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
const apiBaseUrl = import.meta.env.VITE_API_URL; // contoh: http://127.0.0.1:8000/api

// Navigasi ke cari rute
const goToCariRute = () => {
  router.push("/carirute");
};

// Fungsi pencarian lokasi
const searchLocation = async () => {
  if (!searchQuery.value) return;

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    searchQuery.value
  )}.json?key=${apiKey}&country=id&proximity=${cianjurCoords[0]},${
    cianjurCoords[1]
  }`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.features?.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      map.value.flyTo({
        center: [lng, lat],
        zoom: 15,
        essential: true,
      });
    } else {
      alert("Lokasi tidak ditemukan");
    }
  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan saat mencari lokasi");
  }
};

/* =====================================================
      FUNGSI TAMBAHAN UNTUK MENAMPILKAN JALUR ANGKOT
===================================================== */

// Menambah polyline (single)
const drawPolyline = (coords, color = "#2ecc71", id = "route-line") => {
  if (!map.value.getSource(id)) {
    map.value.addSource(id, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      },
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
  new maptilersdk.Marker({ color }).setLngLat([lng, lat]).addTo(map.value);
};

// Render SINGLE route
const renderSingleRoute = (data) => {
  const coords = data.routes[0].coordinates.map((c) => [c.lng, c.lat]);

  drawPolyline(
    coords,
    data.routes[0].angkot.warna ?? "#2ecc71",
    "single-route"
  );

  addMarker(coords[0][0], coords[0][1], "green");
  addMarker(coords[coords.length - 1][0], coords[coords.length - 1][1], "blue");
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

  // titik awal & akhir
  addMarker(coords1[0][0], coords1[0][1], "green");
  addMarker(
    coords2[coords2.length - 1][0],
    coords2[coords2.length - 1][1],
    "blue"
  );

  // titik transfer A → B
  if (r1.transfer_point_on_a) {
    const [lng, lat] = r1.transfer_point_on_a.coordinates;
    addMarker(lng, lat, "yellow");
  }

  if (r2.transfer_point_on_b) {
    const [lng, lat] = r2.transfer_point_on_b.coordinates;
    addMarker(lng, lat, "yellow");
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
  // 1️⃣ — cek apakah ada data route dari URL
  const rawData = route.query.data;

  if (rawData) {
    let decoded = decodeURIComponent(rawData);
    decoded = decodeURIComponent(decoded);

    const result = JSON.parse(decoded);

    console.log("Parsed Route Data dari URL:", result);

    if (result.type === "single") {
      return renderSingleRoute(result);
    }
    if (result.type === "double") {
      return renderDoubleRoute(result);
    }
    if (result.type === "triple") {
      return renderTripleRoute(result);
    }
  }

  // 2️⃣ — fallback ke API jika tidak ada route di URL
  const start_lat = route.query.start_lat;
  const start_lng = route.query.start_lng;
  const end_lat = route.query.end_lat;
  const end_lng = route.query.end_lng;

  if (!start_lat || !end_lat) return;

  const url = `${apiBaseUrl}/rekomendasi-angkot?start_lat=${start_lat}&start_lng=${start_lng}&end_lat=${end_lat}&end_lng=${end_lng}`;

  try {
    const res = await fetch(url);
    const result = await res.json();

    console.log("API Result:", result);

    if (result.status !== "success") return;

    if (result.type === "single") {
      renderSingleRoute(result);
    } else if (result.type === "double") {
      renderDoubleRoute(result);
    } else if (result.type === "triple") {
      renderTripleRoute(result);
    }
  } catch (e) {
    console.error("API ERROR:", e);
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
      <!-- map container -->
      <div class="w-full h-full absolute top-0 left-0" ref="mapContainer"></div>

      <!-- button cari rute-->
      <button
        @click="goToCariRute"
        class="absolute bottom-27 right-5 bg-[#72BD43] hover:bg-[#467529] rounded-full shadow-md w-13 h-13 flex items-center justify-center transition-transform active:scale-95"
      >
        <img src="/src/assets/buttonimg.png" alt="carirute" class="w-7 h-7" />
      </button>

      <!-- search -->
      <div
        class="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-[90%] bg-white rounded-full shadow-md flex items-center px-4 py-3 z-10"
      >
        <Icon
          icon="material-symbols:search"
          width="24"
          height="24"
          class="text-[#959595] mr-2"
        />

        <input
          v-model="searchQuery"
          @keyup.enter="searchLocation"
          type="text"
          placeholder="Cari Lokasi"
          class="font-poppins flex-1 bg-transparent focus:outline-none text-[#959595]"
        />
      </div>
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
