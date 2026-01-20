<script setup>
import Header from "../../components/Header.vue";
import { ref, onMounted, onUnmounted } from "vue";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useRouter, useRoute } from "vue-router";
import { Icon } from "@iconify/vue";
import RouteDetailPanel from "../../components/RouteDetailPanel.vue";
import { calculateDistance } from "../../services/geo";
import LocationAlert from "../../components/LocationAlert.vue";

const router = useRouter();
const route = useRoute();
const CACHE_KEY = "routeData";
const CACHE_DURATION_MS = 5 * 60 * 1000;

const isPanelVisible = ref(false);
const routeResult = ref(null);
const mapContainer = ref(null);
const map = ref(null);
const markers = ref([]);
const userMarker = ref(null);
const watchId = ref(null);
const isFollowingUser = ref(false);

const alertConfig = ref({ show: false, title: "", message: "", type: "info" });
const hasNotifiedTransfer = ref(false);
const hasNotifiedDestination = ref(false);

const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

// Fungsi untuk menutup rute dan membersihkan peta
const handleClosePanel = () => {
  isPanelVisible.value = false;
  routeResult.value = null;

  // 1. Hapus rute dari storage agar tidak muncul lagi
  localStorage.removeItem(CACHE_KEY);

  // 2. Bersihkan layer garis dan marker rute
  clearRouteLayers();

  // 3. Reset notifikasi
  hasNotifiedTransfer.value = false;
  hasNotifiedDestination.value = false;

  // 4. (Opsional) Kembalikan kamera ke posisi default atau user
  if (userMarker.value) {
    map.value.flyTo({ center: userMarker.value.getLngLat(), zoom: 14 });
  }
};

const goToCariRute = () => {
  router.push("/carirute");
};

const clearRouteLayers = () => {
  const ids = ["single-route", "route-1", "route-2"];
  ids.forEach((id) => {
    if (map.value.getLayer(id)) map.value.removeLayer(id);
    if (map.value.getLayer(`${id}-arrows`))
      map.value.removeLayer(`${id}-arrows`);
    if (map.value.getSource(id)) map.value.removeSource(id);
  });
  markers.value.forEach((m) => m.remove());
  markers.value = [];
};

const drawPolyline = (coords, color = "#2ecc71", id = "route-line") => {
  if (!coords || coords.length === 0) return;
  map.value.addSource(id, {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
    },
  });

  const layers = map.value.getStyle().layers;
  let firstSymbolId = layers.find((l) => l.type === "symbol")?.id;

  map.value.addLayer(
    {
      id,
      type: "line",
      source: id,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": color, "line-width": 6, "line-opacity": 0.85 },
    },
    firstSymbolId,
  );

  map.value.addLayer({
    id: `${id}-arrows`,
    type: "symbol",
    source: id,
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 60,
      "text-field": "▶",
      "text-size": 12,
      "text-keep-upright": false, // TAMBAHKAN INI agar panah tidak mencoba memutar balik dirinya sendiri
      "text-rotation-alignment": "map", // TAMBAHKAN INI agar sejajar dengan rotasi peta
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "white",
      "text-halo-color": "black",
      "text-halo-width": 2,
    },
  });
};

const addMarker = (lng, lat, color = "#FF0000") => {
  const m = new maptilersdk.Marker({ color })
    .setLngLat([lng, lat])
    .addTo(map.value);
  markers.value.push(m);
};

const loadRecommendedRoutes = async () => {
  const lsData = localStorage.getItem(CACHE_KEY);
  if (!lsData) return;
  const parsed = JSON.parse(lsData);
  if (Date.now() - parsed.timestamp > CACHE_DURATION_MS) return;

  const data = parsed.data;
  if (data?.status === "success" && data.routes) {
    routeResult.value = data;
    isPanelVisible.value = true;
    clearRouteLayers();

    if (data.type === "single") {
      const r = data.routes[0];
      if (r.coordinates)
        drawPolyline(
          r.coordinates.map((c) => [c.lng, c.lat]),
          r.angkot?.warna_angkot || "#2ecc71",
          "single-route",
        );
    } else {
      const [r1, r2] = data.routes;
      if (r1.coordinates)
        drawPolyline(
          r1.coordinates.map((c) => [c.lng, c.lat]),
          r1.angkot?.warna_angkot || "#3498db",
          "route-1",
        );
      if (r2.coordinates) {
        drawPolyline(
          r2.coordinates.map((c) => [c.lng, c.lat]),
          r2.angkot?.warna_angkot || "#9b59b6",
          "route-2",
        );
        const t = r2.transfer_point_on_b?.coordinates;
        if (t) addMarker(t[0], t[1], "yellow");
      }
    }

    const { start_lat, start_lng, end_lat, end_lng } = route.query;
    if (start_lat)
      addMarker(parseFloat(start_lng), parseFloat(start_lat), "#FF0000");
    if (end_lat) addMarker(parseFloat(end_lng), parseFloat(end_lat), "#00FF00");

    const bounds = new maptilersdk.LngLatBounds();
    bounds.extend([parseFloat(start_lng), parseFloat(start_lat)]);
    bounds.extend([parseFloat(end_lng), parseFloat(end_lat)]);
    map.value.fitBounds(bounds, { padding: 80, duration: 1500 });
  }
};

const startLocationTracking = () => {
  if (!navigator.geolocation) return;
  const el = document.createElement("div");
  el.className = "user-location-container";
  el.innerHTML = `<div class="user-heading-arrow"></div><div class="user-blue-dot"></div>`;

  watchId.value = navigator.geolocation.watchPosition(
    (pos) => {
      const { longitude, latitude, heading } = pos.coords;
      if (!userMarker.value) {
        userMarker.value = new maptilersdk.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(map.value);
      } else {
        userMarker.value.setLngLat([longitude, latitude]);
      }
      if (isFollowingUser.value)
        map.value.flyTo({ center: [longitude, latitude], zoom: 16 });
    },
    null,
    { enableHighAccuracy: true },
  );
};

onMounted(() => {
  maptilersdk.config.apiKey = apiKey;
  map.value = new maptilersdk.Map({
    container: mapContainer.value,
    style: maptilersdk.MapStyle.STREETS,
    center: [107.1422, -6.812],
    zoom: 15,
  });
  map.value.on("load", () => {
    loadRecommendedRoutes();
    startLocationTracking();
  });
});

onUnmounted(() => {
  if (watchId.value !== null) navigator.geolocation.clearWatch(watchId.value);
});
</script>

<template>
  <div class="flex flex-col w-full h-screen overflow-hidden">
    <Header />
    <div class="relative w-full flex-1">
      <div class="w-full h-full absolute top-0 left-0" ref="mapContainer"></div>

      <button
        @click="isFollowingUser = !isFollowingUser"
        class="absolute bottom-45 right-5 bg-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center z-40"
      >
        <Icon
          :icon="isFollowingUser ? 'mdi:crosshairs-gps' : 'mdi:crosshairs'"
          :class="isFollowingUser ? 'text-blue-500' : 'text-gray-600'"
          width="24"
        />
      </button>

      <button
        @click="goToCariRute"
        class="absolute bottom-27 right-5 bg-[#72BD43] rounded-full shadow-md w-12 h-12 flex items-center justify-center z-40"
      >
        <img src="/src/assets/buttonimg.png" class="w-6 h-6" />
      </button>

      <RouteDetailPanel
        :is-visible="isPanelVisible"
        :route-data="routeResult"
        @close="handleClosePanel"
      />

      <LocationAlert
        :show="alertConfig.show"
        :title="alertConfig.title"
        :message="alertConfig.message"
        :type="alertConfig.type"
        @close="alertConfig.show = false"
      />
    </div>
  </div>
</template>
