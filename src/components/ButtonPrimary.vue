<script setup>
import { computed } from 'vue';

const emit = defineEmits(['click'])
const onClick = () => {
    emit('click')
}

const props = defineProps({
    size: {
        type: String,
        default: 'small', //opsi medium | small
    },
})

//ukuran dinamis
const sizeClasses = computed(() => {
    switch (props.size) {
        case 'small' : default:
            return 'py-2 px-8 text-lg ' //tombol pendek

        case 'medium' :return 'py-3 px-10 text-base' //tombol panjang
    }
})
</script>

<template>
   <button @click="onClick" :class="['angkot-bg font-semibold rounded-full transition-all duration-200 hover:bg-[#5e983a]',
    sizeClasses
   ]">
    <slot/>
   </button>
</template>