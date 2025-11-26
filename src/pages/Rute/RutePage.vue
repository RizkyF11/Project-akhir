<script setup>
import Header from "../../components/Header.vue";
import { ref } from "vue";
import { Icon } from "@iconify/vue";

const searchQuery = ref("");

// === MODAL HANDLER ===
const showModal = ref(false);
const selectedRoute = ref(null);

const openModal = (route) => {
  selectedRoute.value = route;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const angkotRoutes = ref([
  {
    id: 1,
    code: "01",
    start: "Cikidang",
    end: "Pasir Hayam",
    colorTop: "bg-red-600",
    colorBottom: "bg-green-500",
    deskripsi:
      "Terminal Pasirhayam – Cikaret – Jalan Siliwangi (Joglo) – Jalan Siti Jenab – Jalan Otista – Jalan Taifur Yusuf – Jalan Suroso. Lalu ke Jalan Kyai Hasim Ashari-Jalan Mayor Harun Kabir. -Jalan Barisan Banteng – Jalan Arif Rahman Hakim – Jalan Promoya – Jalan P Kemerdekaan lalu kembali ke Terminal Pasirhayam.",
  },
  {
    id: 2,
    code: "02",
    start: "Cikaret",
    end: "Warujajar",
    colorTop: "bg-red-600",
    colorBottom: "bg-yellow-400",
  },
  {
    id: 5,
    code: "BIRU",
    start: "Ramayana",
    end: "Cipanas",
    colorTop: "bg-blue-700",
    colorBottom: "bg-blue-700",
  },
  {
    id: 4,
    code: "04",
    start: "Ramayana",
    end: "BLK",
    colorTop: "bg-red-600",
    colorBottom: "bg-blue-700",
  },
  {
    id: 4,
    code: "04",
    start: "Ramayana",
    end: "BLK",
    colorTop: "bg-red-600",
    colorBottom: "bg-blue-700",
  },
  {
    id: 5,
    code: "BIRU",
    start: "Ramayana",
    end: "Cipanas",
    colorTop: "bg-blue-700",
    colorBottom: "bg-blue-700",
  },
  {
    id: 4,
    code: "04",
    start: "Ramayana",
    end: "BLK",
    colorTop: "bg-red-600",
    colorBottom: "bg-blue-700",
  },
  {
    id: 4,
    code: "04",
    start: "Ramayana",
    end: "BLK",
    colorTop: "bg-red-600",
    colorBottom: "bg-blue-700",
  },
  {
    id: 4,
    code: "04",
    start: "Ramayana",
    end: "BLK",
    colorTop: "bg-red-600",
    colorBottom: "bg-blue-700",
  },
]);
</script>

<template>
  <!-- Daftar Rute Angkot -->
  <div class="flex flex-col h-screen overflow-hidden">
    <Header />

    <!-- Search -->
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

    <!-- List na -->
    <div class="flex-1 overflow-y-auto pb-10 space-y-3 no-scrollbar">
      <div
        v-for="route in angkotRoutes"
        :key="route.id"
        class="relative flex w-[90%] mx-auto rounded-lg overflow-hidden cursor-pointer"
        @click="openModal(route)"
        style="
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(0, 0, 0, 0.3);
        "
      >
        <!-- warna kiri -->
        <div class="w-25 flex flex-col">
          <div :class="['flex-2', route.colorTop]"></div>
          <div :class="['flex-1', route.colorBottom]"></div>
        </div>

        <!-- isi kartu -->
        <div
          class="flex justify-between items-center flex-1 bg-white px-4 py-3"
        >
          <div>
            <p class="text-lg font-bold text-black">{{ route.code }}</p>
            <p class="text-sm text-gray-600">
              {{ route.start }} ↔ {{ route.end }}
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

    <!-- === POPUP MODAL === -->
    <div
      v-if="showModal"
      @click.self="closeModal"
      class="absolute inset-0 bg-black/50 flex justify-center items-center z-50"
    >
      <div
        v-if="selectedRoute"
        class="w-[90%] bg-white rounded-2xl shadow-xl overflow-hidden animate-slideUp"
      >
        <div class="relative w-full">
          <!-- WARNA ANGKOT -->
          <div class="flex flex-col w-full">
            <div :class="[selectedRoute.colorTop, 'h-12']"></div>
            <div :class="[selectedRoute.colorBottom, 'h-6']"></div>
          </div>

          <!-- INFORMASI ANGKOT -->
          <div class="absolute inset-0 flex justify-center items-center">
            <div class="bg-white px-2 py-2 shadow text-center">
              <p class="text-3xl font-bold">{{ selectedRoute.code }}</p>
              <p class="text-gray-700 text-sm">
                {{ selectedRoute.start }} ↔ {{ selectedRoute.end }}
              </p>
            </div>
          </div>
        </div>

        <!-- DIDIE ENGKE JANG API MAPS NA -->
        <div class="p-4">
          <img
            src="/src/assets/maps.png"
            class="rounded-xl w-full"
          />
        </div>

        <!-- DESKRIPSI -->
        <p class="text-gray-600 text-sm text-justify leading-relaxed px-5 mb-4">
          {{ selectedRoute.deskripsi }}
        </p>

        <!-- BUTTON CLOSE -->
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
