import { createRouter, createWebHistory } from 'vue-router'
import GetStarted from '../pages/Started/GetStarted.vue'
import Homepage from '../pages/Home/HomePage.vue'
import RutePage from '../pages/Rute/RutePage.vue'
import MapsPage from '../pages/Maps/MapsPage.vue'


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
    name: 'HomePage',
    component: Homepage
  },
  {
    path: '/rute',
    name: 'RutePage',
    component: RutePage
  },
  {
    path: '/maps',
    name: 'MapsPage',
    component: MapsPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
