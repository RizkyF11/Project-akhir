import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router';
import { Icon } from "@iconify/vue";

const app = createApp(App)

// daftar router dan komponen global
app.use(router) 
app.component('Icon', Icon)

//mount ke elemen #app
app.mount('#app')

