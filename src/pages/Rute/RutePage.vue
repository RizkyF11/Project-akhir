<script setup>
import Header from "../../components/Header.vue";
import { ref } from "vue";
import { Icon } from "@iconify/vue";

const searchQuery = ref("");
const angkotRoutes = ref([
  {
    id: 1,
    code: "01",
    start: "Cikidang",
    end: "Pasir Hayam",
    colorTop: "bg-red-600",
    colorBottom: "bg-green-500",
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
      class="relative left-1/2 transform -translate-x-1/2 w-[90%] bg-white rounded-lg flex items-center px-4 py-2 z-10 mb-5 mt-3 box-border"
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

    <div class="flex-1 overflow-y-auto pb-10 space-y-3 px-0 mt-2 no-scrollbar">
    <div
      v-for="route in angkotRoutes"
      :key="route.id"
      class="relative flex w-[90%] mx-auto rounded-lg overflow-hidden"
      style="
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(0, 0, 0, 0.3);
      "
    >
      <!-- bagian warna kiri (full tinggi kartu) -->
      <div class="w-25 flex flex-col">
        <div :class="['flex-2', route.colorTop]"></div>
        <div :class="['flex-1', route.colorBottom]"></div>
      </div>

      <!-- isi kartu -->
      <div class="flex justify-between items-center flex-1 bg-white px-4 py-3">
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
  </div>
</template>
