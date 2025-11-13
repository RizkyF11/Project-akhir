<script setup>
</script>

<template>
  <div class="min-h-screen flex justify-center items-center bg-gray-100">
    <!-- area layar hp -->
    <div class="w-full max-w-[425px] h-[700px] bg-white shadow-md border border-gray-300 relative flex flex-col">
      <!-- Header ga bisa di scroll -->
      <Header />
      <!-- Konten scroll -->
      <div class="flex-1 overflow-y-auto">
        <router-view />
      </div>
    </div>
  </div>
</template>
