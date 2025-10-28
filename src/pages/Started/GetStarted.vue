<script setup>
import ButtonPrimary from '../../components/ButtonPrimary.vue';
import { useRouter } from 'vue-router';

const router = useRouter()

const goToHome = () => {
    router.push('/home')
}

const goToMap = () => {
    router.push('/maps')
}
</script>

<template>
    <div class="min-h-screen flex justify-center items-center bg-white">
        <div class="translate-y-30">

            <ButtonPrimary @click="goToHome">Get started</ButtonPrimary>
        </div>
    </div>
</template>