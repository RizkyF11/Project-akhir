<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();

const isOpen = ref(false);
const isClosing = ref(false);

const toogleMenu = () => {
  isOpen.value = !isOpen.value;
};

const handleClick = (path) => {
  //aktifkan animasi penutupan
 isClosing.value = true;

 //setelah animasi selesai, tutup menu dan navigasi
  setTimeout(() => {
    isOpen.value = false;
    isClosing.value = false;
    router.push(path) //navigasi setelah animasi selesai
  }, 200); //waktu sesuai durasi
}

// fungsi bantu cek route aktif
const isActive = (path) => route.path === path;
</script>

<template>
  <header
    class="relative z-50 bg-white shadow-md px-3 py-2 flex items-center justify-between"
  >
    <div class="flex items-center gap-2">
      <!-- logo kiri -->
      <img
        src="/src/assets/hero.png"
        alt="logo-angkotcjr"
        class="max-w-[50px] h-auto mx-auto"
      />
      <!-- logo tengah -->
      <div class="absolute left-1/2 transform -translate-x-1/2">
        <img
          src="/src/assets/angkotcjr.png"
          alt="angkotcjr"
          class="max-w-[140px] h-auto mx-auto"
        />
      </div>
    </div>

    <!-- tombol burger / close -->
    <button
      @click="toogleMenu"
      class="text-3xl transition"
    >
      <Icon
        v-if="!isOpen"
        icon="material-symbols:menu-rounded"
        width="28"
        height="28"
      />
      <Icon
        v-else
        icon="material-symbols:close-small-rounded"
        width="35"
        height="35"
      />
    </button>

    <!-- menu dropdown -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div
        v-if="isOpen && !isClosing"
        class="absolute top-16 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-4xl w-70 py-1 flex flex-col items-center gap-3 mt-5 "
      >
        <!-- HOME -->
        <button
          @click="handleClick('/home')"
          :class="[
            'w-33 text-center font-semibold text-base rounded-full transition-all duration-200 mt-1',
            isActive('/home')
              ? 'bg-[#72BD43] text-white shadow-md '
              : 'text-gray-800 hover:bg-[#72BD43] hover:text-white',
          ]"
        >
          HOME
          
        </button>

        <hr class="w-4/4 border-t border-gray-200">

        <!-- RUTE -->
        <button
          @click="handleClick('/rute')"
          :class="[
            'w-33 text-center font-semibold text-base rounded-full transition-all duration-200',
            isActive('/rute')
              ? 'bg-[#72BD43] text-white shadow-md'
              : 'text-gray-800 hover:bg-[#72BD43] hover:text-white',
          ]"
        >
          RUTE ANGKOT
        </button>
        <!-- MAPS -->

        <hr class="w-4/4 border-t border-gray-200">

         <button
          @click="handleClick('/maps')"
          :class="[
            'w-33 text-center font-semibold text-base rounded-full transition-all duration-200 mb-1',
            isActive('/maps')
              ? 'bg-[#72BD43] text-white shadow-md'
              : 'text-gray-800 hover:bg-[#72BD43] hover:text-white',
          ]"
        >
          MAPS JALUR
        </button>
      </div>
    </transition>
  </header>
</template>
