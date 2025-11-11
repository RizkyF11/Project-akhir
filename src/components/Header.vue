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
  isClosing.value = true;
  setTimeout(() => {
    isOpen.value = false;
    isClosing.value = false;
    router.push(path);
  }, 200);
};

const isActive = (path) => route.path === path;
</script>

<template>
  <header
    class="relative z-50 bg-white shadow-md px-3 py-2 flex items-center justify-between"
  >
    <div class="flex items-center gap-2">
      <!-- logo kiri -->
      <img
        src="/src/assets/logo-angkot.png"
        alt="logo-angkot"
        class="max-w-[40px] h-auto mx-auto"
      />
      <!-- logo tengah -->
      <div class="absolute left-1/2 transform -translate-x-1/2">
        <img
          src="/src/assets/Logotxt.png"
          alt="Angkot Cianjur"
          class="max-w-[150px] h-auto mx-auto"
        />
      </div>
    </div>

    <!-- tombol burger / close -->
    <button @click="toogleMenu" class="text-3xl transition">
      <transition name="icon-fade" mode="out-in">
        <Icon
          v-if="!isOpen"
          key="menu"
          icon="material-symbols:menu"
          width="29"
          height="29"
        />
        <Icon
          v-else
          key="close"
          icon="material-symbols:close"
          width="29"
          height="29"
        />
      </transition>
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
        class="absolute top-16 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-4xl w-70 py-1 flex flex-col items-center gap-3 mt-5"
      >
        <!-- HOME -->
        <button
          @click="handleClick('/home')"
          :class="[isActive('/home')
            ? 'bg-[#72BD43] text-white shadow-md w-33 text-center font-semibold text-base rounded-full mt-1 font-poppins'
            : 'text-gray-800 hover:bg-[#72BD43] hover:text-white w-33 text-center font-semibold text-base rounded-full mt-1 font-poppins']"
        >
          HOME
        </button>

        <hr class="w-4/4 border-t border-gray-200" />

        <!-- RUTE -->
        <button
          @click="handleClick('/rute')"
          :class="[isActive('/rute')
            ? 'bg-[#72BD43] text-white shadow-md w-33 text-center font-semibold text-base rounded-full font-poppins'
            : 'text-gray-800 hover:bg-[#72BD43] hover:text-white w-33 text-center font-semibold text-base rounded-full font-poppins']"
        >
          RUTE ANGKOT
        </button>

        <hr class="w-4/4 border-t border-gray-200" />

        <!-- MAPS -->
        <button
          @click="handleClick('/jalurmaps')"
          :class="[isActive('/jalurmaps')
            ? 'bg-[#72BD43] text-white shadow-md w-33 text-center font-semibold text-base rounded-full mb-1 font-poppins'
            : 'text-gray-800 hover:bg-[#72BD43] hover:text-white w-33 text-center font-semibold text-base rounded-full mb-1 font-poppins']"
        >
          MAPS
        </button>
      </div>
    </transition>
  </header>
</template>

<style scoped>
.icon-fade-enter-active,
.icon-fade-leave-active {
  transition: all 0.25s ease-in-out;
}
.icon-fade-enter-from,
.icon-fade-leave-to {
  opacity: 0;
  transform: scale(0.5);
  filter: drop-shadow(0 0 4px #72BD43);
}
</style>
