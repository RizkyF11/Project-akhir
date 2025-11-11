  <script setup>
  import Header from "../../components/Header.vue";
  import { ref, onMounted } from "vue";
  import * as maptilersdk from "@maptiler/sdk";
  import "@maptiler/sdk/dist/maptiler-sdk.css";
  import { useRouter } from "vue-router"; // untuk navigasi page


  const router = useRouter();
  const mapContainer = ref(null);
  const map = ref(null);
  const searchQuery = ref(""); //untuk menyimpan input search
  let geocoder;
  //lokasi default : cianjur
  const cianjurCoords = [107.1422, -6.812];

  //mengambil api key dari env
  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

  //navigasi ke halaman cari rute
  const goToCariRute = () => {
    router.push("/carirute");
  }

  // fungsi pencarian lokasi
  const searchLocation = async () => {
    if (!searchQuery.value) return;

    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
      searchQuery.value
    )}.json?key=${apiKey}&country=id&proximity=${cianjurCoords[0]},${cianjurCoords[1]}`;  //masalah disini jadi tidak presisi lokasi di sekitaran cianjur

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        map.value.flyTo({
          center: [lng, lat],
          zoom: 15,
          essential: true,
        });
      } else {
        alert("lokasi tidak ditemukan");
      }
    } catch (err) {
      console.error(err);
      alert("terjadi kesalahan saat mencari lokasi");
    }
  };


  onMounted(() => {
    maptilersdk.config.apiKey = apiKey;
    //inisialisasi peta

    map.value = new maptilersdk.Map({
      container: mapContainer.value,
      style: maptilersdk.MapStyle.STREETS, // bisa diganti SATELLITE, HYBRID dll
      center: cianjurCoords,
      pitch: 0,
      bearing: 0,
      zoom: 15,
    });

    // Aktifkan rotasi dengan dua jari / klik kanan
    map.value.dragRotate.enable();
    map.value.touchZoomRotate.enableRotation();
  });
  </script>

  <template>
    <div class="flex flex-col w-full h-screen">
      <Header />

      <div class="relative w-full flex-1" style="height: calc(100vh - 64px)">
        <!-- map container -->
        <div class="w-full h-full absolute top-0 left-0" ref="mapContainer"></div>

        <!-- button -->
        <button
          @click="goToCariRute"
          class="absolute bottom-30 right-3 bg-[#72BD43] hover:bg-[#467529] rounded-full shadow-md w-14 h-14 flex items-center justify-center transition-transform active:scale-95"
        >
          <img src="/src/assets/buttonimg.png" alt="carirute" class="w-7 h-7" />
        </button>

        <!-- search -->
        <div class=" absolute bottom-10 left-1/2 transform -translate-x-1/2 w-[90%] bg-white rounded-full shadow-md flex items-center px-4 py-3 z-10">
          <Icon
          icon="material-symbols:search"
          width="24"
          height="24"
          class="text-[#959595] mr-2"
        />

        <input v-model="searchQuery" @keyup.enter="searchLocation" type="text" placeholder="Cari Lokasi" class=" font-poppins flex-1 bg-transparent focus:outline-none text-[#959595]" >
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
