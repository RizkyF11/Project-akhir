import { createRouter, createWebHistory } from 'vue-router'
import GetStarted from '../pages/Started/GetStarted.vue'
import Homepage from '../pages/Home/HomePage.vue'


const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/started',
    name: 'GetStarted',
    component: GetStarted
  },
  {
    path: '/home',
    name: 'Home',
    component: Homepage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
