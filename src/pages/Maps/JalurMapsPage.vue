<script setup>
import Header from "../../components/Header.vue";
import { ref, onMounted, onUnmounted } from "vue";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useRouter, useRoute } from "vue-router";
import { Icon } from "@iconify/vue";
import RouteDetailPanel from "../../components/RouteDetailPanel.vue";
import { calculateDistance } from "../../services/geo";
// --- TAMBAHAN IMPORT ---
import LocationAlert from "../../components/LocationAlert.vue";

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

// Tracking State
const userMarker = ref(null);
const watchId = ref(null);
const isFollowingUser = ref(false);
const userHeading = ref(0);

// --- TAMBAHAN STATE ALERT ---
const alertConfig = ref({
  show: false,
  title: "",
  message: "",
  type: "info",
});
const hasNotifiedTransfer = ref(false);
const hasNotifiedDestination = ref(false);

// default lokasi cianjur
const cianjurCoords = [107.1422, -6.812];

const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

const goToCariRute = () => {
  router.push("/carirute");
};

/* =====================================================
      LOGIKA TRACKING LOKASI & ALERT GEOFENCING
===================================================== */

// --- TAMBAHAN FUNGSI CEK JARAK ---
const checkAlertProximity = (lat, lng) => {
  if (!routeResult.value) return;

  const triggerDistance = 150; // Jarak pemicu alert (150 meter)

  // 1. Cek Jarak ke Titik Transfer (Jika rute double)
  if (routeResult.value.type === "double" && !hasNotifiedTransfer.value) {
    const tLoc = routeResult.value.routes[1].transfer_point_on_b.coordinates;
    const distToTransfer = calculateDistance(lat, lng, tLoc[1], tLoc[0]);

    if (distToTransfer < triggerDistance) {
      alertConfig.value = {
        show: true,
        title: "Siap-siap Turun!",
        message: `Kamu sudah dekat lokasi transit. Jangan lupa bersiap pindah ke Angkot ${routeResult.value.routes[1].angkot.nama}.`,
        type: "warning",
      };
      hasNotifiedTransfer.value = true;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }

  // 2. Cek Jarak ke Titik Tujuan
  if (!hasNotifiedDestination.value) {
    const { end_lat, end_lng } = route.query;
    if (end_lat && end_lng) {
      const distToTarget = calculateDistance(
        lat,
        lng,
        parseFloat(end_lat),
        parseFloat(end_lng)
      );

      if (distToTarget < triggerDistance) {
        alertConfig.value = {
          show: true,
          title: "Hampir Sampai!",
          message:
            "Kamu sudah dekat dengan lokasi tujuan. Periksa kembali barang bawaanmu sebelum turun.",
          type: "success",
        };
        hasNotifiedDestination.value = true;
        if (navigator.vibrate) navigator.vibrate(500);
      }
    }
  }
};

const startLocationTracking = () => {
  if (!navigator.geolocation) return;

  const el = document.createElement("div");
  el.className = "user-location-container";
  el.innerHTML = `
    <div class="user-heading-arrow"></div>
    <div class="user-blue-dot"></div>
  `;

  watchId.value = navigator.geolocation.watchPosition(
    (pos) => {
      const { longitude, latitude, heading } = pos.coords;
      const newPos = [longitude, latitude];

      if (heading !== null) {
        userHeading.value = heading;
        const arrow = el.querySelector(".user-heading-arrow");
        if (arrow)
          arrow.style.transform = `translateX(-50%) rotate(${heading}deg)`;
      }

      if (!userMarker.value) {
        userMarker.value = new maptilersdk.Marker({ element: el })
          .setLngLat(newPos)
          .addTo(map.value);
      } else {
        userMarker.value.setLngLat(newPos);
      }

      // --- INTEGRASI ALERT DI SINI ---
      checkAlertProximity(latitude, longitude);

      if (isFollowingUser.value) {
        map.value.flyTo({
          center: newPos,
          speed: 0.8,
          curve: 1,
          zoom: 16,
          essential: true,
        });
      }
    },
    (err) => console.error("Tracking error:", err),
    { enableHighAccuracy: true }
  );
};

const toggleFollowUser = () => {
  isFollowingUser.value = !isFollowingUser.value;
  if (isFollowingUser.value && userMarker.value) {
    map.value.flyTo({ center: userMarker.value.getLngLat(), zoom: 16 });
  }
};

/* =====================================================
      FUNGSI MAP & RUTE (LAYER ORDER FIXED)
===================================================== */

const getFirstSymbolLayerId = () => {
  const layers = map.value.getStyle().layers;
  for (const layer of layers) {
    if (layer.type === "symbol") return layer.id;
  }
  return null;
};

const drawPolyline = (coords, color = "#2ecc71", id = "route-line") => {
  if (!coords || coords.length === 0) return;

  const geojson = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
  };

  if (map.value.getSource(id)) {
    map.value.getSource(id).setData(geojson);
  } else {
    map.value.addSource(id, { type: "geojson", data: geojson });
  }

  const firstSymbolId = getFirstSymbolLayerId();

  if (!map.value.getLayer(id)) {
    map.value.addLayer(
      {
        id: id,
        type: "line",
        source: id,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": color,
          "line-width": 5,
          "line-opacity": 0.85,
        },
      },
      firstSymbolId
    );
  }

  const arrowLayerId = `${id}-arrows`;
  if (!map.value.getLayer(arrowLayerId)) {
    map.value.addLayer(
      {
        id: arrowLayerId,
        type: "symbol",
        source: id,
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 60,
          "text-field": "▶",
          "text-size": 12,
          "text-rotation-alignment": "map",
          "text-keep-upright": false,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": color,
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      },
      null
    );
  }
};

const addMarker = (lng, lat, color = "red") => {
  const newMarker = new maptilersdk.Marker({ color })
    .setLngLat([lng, lat])
    .addTo(map.value);
  markers.value.push(newMarker);
  return newMarker;
};

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
  drawPolyline(
    r1.coordinates.map((c) => [c.lng, c.lat]),
    r1.angkot.warna ?? "#3498db",
    "route-1"
  );
  drawPolyline(
    r2.coordinates.map((c) => [c.lng, c.lat]),
    r2.angkot.warna ?? "#9b59b6",
    "route-2"
  );
  const tLoc = r2.transfer_point_on_b.coordinates;
  addMarker(tLoc[0], tLoc[1], "yellow");
};

const loadRecommendedRoutes = async () => {
  let dataToRender = null;
  const lsData = localStorage.getItem(CACHE_KEY);

  if (lsData) {
    try {
      const parsed = JSON.parse(lsData);
      if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
        dataToRender = parsed.data;
      }
    } catch (e) {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  if (dataToRender && dataToRender.status === "success") {
    routeResult.value = dataToRender;
    isPanelVisible.value = true;

    if (dataToRender.type === "single") renderSingleRoute(dataToRender);
    else if (dataToRender.type === "double") renderDoubleRoute(dataToRender);

    const { start_lat, start_lng, end_lat, end_lng } = route.query;
    if (start_lat)
      addMarker(parseFloat(start_lng), parseFloat(start_lat), "red");
    if (end_lat) addMarker(parseFloat(end_lng), parseFloat(end_lat), "green");

    if (start_lat && end_lat) {
      const bounds = new maptilersdk.LngLatBounds();
      bounds.extend([parseFloat(start_lng), parseFloat(start_lat)]);
      bounds.extend([parseFloat(end_lng), parseFloat(end_lat)]);
      map.value.fitBounds(bounds, { padding: 80, duration: 1500 });
    }
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
    map.value.on("styleimagemissing", (e) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      map.value.addImage(
        e.id,
        canvas.getContext("2d").getImageData(0, 0, 1, 1)
      );
    });

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
        @click="toggleFollowUser"
        class="absolute bottom-45 right-5 bg-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center transition-all active:scale-90 z-40 border border-gray-100"
      >
        <Icon
          :icon="isFollowingUser ? 'mdi:crosshairs-gps' : 'mdi:crosshairs'"
          :class="isFollowingUser ? 'text-blue-500' : 'text-gray-600'"
          width="24"
        />
      </button>

      <button
        @click="goToCariRute"
        class="absolute bottom-27 right-5 bg-[#72BD43] hover:bg-[#467529] rounded-full shadow-md w-12 h-12 flex items-center justify-center transition-transform active:scale-95 z-40"
      >
        <img src="/src/assets/buttonimg.png" alt="carirute" class="w-6 h-6" />
      </button>

      <RouteDetailPanel
        :is-visible="isPanelVisible"
        :route-data="routeResult"
        @close="isPanelVisible = false"
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

<style>
/* ... seluruh CSS Anda tetap sama seperti sebelumnya ... */
.user-location-container {
  position: relative;
  width: 24px;
  height: 24px;
}
.user-blue-dot {
  width: 16px;
  height: 16px;
  background-color: #4285f4;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}
.user-blue-dot::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: #4285f4;
  border-radius: 50%;
  z-index: -1;
  animation: pulse-user 2s infinite;
}
.user-heading-arrow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 14px solid rgba(66, 133, 244, 0.6);
  transform-origin: bottom center;
  transform: translateX(-50%) translateY(-100%);
  z-index: 1;
  transition: transform 0.2s ease-out;
}
@keyframes pulse-user {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(3.5);
    opacity: 0;
  }
}
</style>
