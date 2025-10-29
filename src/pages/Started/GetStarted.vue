<script setup>
import ButtonPrimary from "../../components/ButtonPrimary.vue";
import { useRouter } from "vue-router";

const router = useRouter();

const goToMap = () => {
  router.push("/maps");
};
</script>

<template>
  
  <div class="h-screen flex flex-col justify-between items-center overflow-hidden ">
    <!-- judul dan deskripsi pendek -->
    <div class="flex flex-col items-center text-center mt-43">
    <img src="/src/assets/hero.png" alt="ANGKOTCJR" class="max-w-[230px] h-auto mx-auto">
      <h1 class="text-4xl font-bold">
        <span class="text-[#263582]">ANGKOT</span>
        <span class="text-[#7CC049]">CJR</span>
      </h1>
      <p class="text-[#7CC049] text-sm mt-1 font-semibold">
        Angkotnya Wargi Cianjur!
      </p>
    </div>

    <!-- button bawah -->
      <div class="mb-100 mt-5">
        <ButtonPrimary @click="goToMap">Get Started</ButtonPrimary>
      </div>
  </div>
</template>
