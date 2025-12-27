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

const CACHE_KEY = "routeData";
const CACHE_DURATION_MS = 5 * 60 * 1000;

const isPanelVisible = ref(false);
const routeResult = ref(null);

// map state
const mapContainer = ref(null);
const map = ref(null);
const markers = ref([]);

// default lokasi cianjur
const cianjurCoords = [107.1422, -6.812];

// API Keys
const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
const apiBaseUrl = import.meta.env.VITE_API_NGROK;

const goToCariRute = () => {
  router.push("/carirute");
};

const clearMap = () => {
  const routeLayers = ["single-route", "route-1", "route-2", "r1", "r2", "r3"];
  routeLayers.forEach((id) => {
    if (map.value.getLayer(`${id}-arrows`))
      map.value.removeLayer(`${id}-arrows`);

    if (map.value.getLayer(id)) map.value.removeLayer(id);
    if (map.value.getSource(id)) map.value.removeSource(id);
  });

  markers.value.forEach((marker) => marker.remove());
  markers.value = [];
};

/* =====================================================
      FUNGSI UNTUK MENAMPILKAN JALUR (DRAW ONLY)
===================================================== */

const drawPolyline = (coords, color = "#2ecc71", id = "route-line") => {
  if (!coords || coords.length === 0) return;

  const geojson = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: coords,
    },
  };

  if (map.value.getSource(id)) {
    map.value.getSource(id).setData(geojson);
  } else {
    map.value.addSource(id, {
      type: "geojson",
      data: geojson,
    });
  }

  if (!map.value.getLayer(id)) {
    map.value.addLayer({
      id: id,
      type: "line",
      source: id,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": color,
        "line-width": 5,
      },
    });
  } else {
    map.value.setPaintProperty(id, "line-color", color);
  }

  const arrowLayerId = `${id}-arrows`;
  if (!map.value.getLayer(arrowLayerId)) {
    map.value.addLayer({
      id: arrowLayerId,
      type: "symbol",
      source: id,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 70,
        "text-field": "▶",
        "text-size": 12,
        "text-keep-upright": false,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-rotation-alignment": "map",
      },
      paint: {
        "text-color": color,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1,
      },
    });
  }
};

const addMarker = (lng, lat, color = "red") => {
  const newMarker = new maptilersdk.Marker({ color })
    .setLngLat([lng, lat])
    .addTo(map.value);
  markers.value.push(newMarker);
  return newMarker;
};

/* =====================================================
      FUNGSI RENDER (MENGGUNAKAN DATA MATANG BACKEND)
===================================================== */

const renderSingleRoute = (data) => {
  const coords = data.routes[0].coordinates.map((c) => [c.lng, c.lat]);
  drawPolyline(
    coords,
    data.routes[0].angkot.warna ?? "#2ecc71",
    "single-route"
  );
};

const renderDoubleRoute = (data) => {
  const r1 = data.routes[0];
  const r2 = data.routes[1];

  // Render Jalur Angkot 1 (Sudah di-slice Backend)
  const coords1 = r1.coordinates.map((c) => [c.lng, c.lat]);
  drawPolyline(coords1, r1.angkot.warna ?? "#3498db", "route-1");

  // Render Jalur Angkot 2 (Sudah di-slice Backend)
  const coords2 = r2.coordinates.map((c) => [c.lng, c.lat]);
  drawPolyline(coords2, r2.angkot.warna ?? "#9b59b6", "route-2");

  // Titik Transfer (Ambil dari data transfer_point_on_b yang dikirim backend)
  const tLoc = r2.transfer_point_on_b.coordinates;
  addMarker(tLoc[0], tLoc[1], "yellow");
};

const renderTripleRoute = (data) => {
  // Triple route biasanya dikirim dalam format polyline string dari backend
  const r1 = JSON.parse(data.r1_polyline);
  const r2 = JSON.parse(data.r2_polyline);
  const r3 = JSON.parse(data.r3_polyline);

  drawPolyline(r1, "#e74c3c", "r1");
  drawPolyline(r2, "#f1c40f", "r2");
  drawPolyline(r3, "#2ecc71", "r3");

  // Marker Transfer Kuning di setiap ujung sambungan
  addMarker(r1[r1.length - 1][0], r1[r1.length - 1][1], "yellow");
  addMarker(r2[r2.length - 1][0], r2[r2.length - 1][1], "yellow");
};

const loadRecommendedRoutes = async () => {
  clearMap();

  let dataToRender = null;
  let isExpired = false;

  const lsData = localStorage.getItem(CACHE_KEY);

  if (lsData) {
    try {
      const parsed = JSON.parse(lsData);
      const timeElapsed = Date.now() - parsed.timestamp;

      if (timeElapsed > CACHE_DURATION_MS) {
        localStorage.removeItem(CACHE_KEY);
        isExpired = true;
        alert("Sesi rute telah berakhir.");
        routeResult.value = null;
        isPanelVisible.value = false;
        return;
      } else {
        dataToRender = parsed.data;
      }
    } catch (e) {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  // Jika data tidak ada di cache, coba ambil dari URL
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

  if (dataToRender && dataToRender.status === "success") {
    routeResult.value = dataToRender;
    isPanelVisible.value = true;

    if (dataToRender.type === "single") renderSingleRoute(dataToRender);
    else if (dataToRender.type === "double") renderDoubleRoute(dataToRender);
    else if (dataToRender.type === "triple") renderTripleRoute(dataToRender);

    // Marker Start (Merah) & End (Hijau)
    const sLat = route.query.start_lat;
    const sLng = route.query.start_lng;
    const eLat = route.query.end_lat;
    const eLng = route.query.end_lng;

    if (sLat && sLng) addMarker(parseFloat(sLng), parseFloat(sLat), "red");
    if (eLat && eLng) addMarker(parseFloat(eLng), parseFloat(eLat), "green");

    if (sLat && eLat) {
      const bounds = new maptilersdk.LngLatBounds();
      bounds.extend([parseFloat(sLng), parseFloat(sLat)]);
      bounds.extend([parseFloat(eLng), parseFloat(eLat)]);
      map.value.fitBounds(bounds, { padding: 50, duration: 1500 });
    }
  } else {
    routeResult.value = null;
    isPanelVisible.value = false;
  }
};

onMounted(() => {
  maptilersdk.config.apiKey = apiKey;

  map.value = new maptilersdk.Map({
    container: mapContainer.value,
    style: maptilersdk.MapStyle.STREETS,
    center: cianjurCoords,
    zoom: 15,
  });

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
          Tidak ada jalur ditampilkan
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
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
}
</style>
