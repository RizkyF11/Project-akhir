import { createRouter, createWebHistory } from 'vue-router'
import GetStarted from '../pages/Started/GetStarted.vue'
import Homepage from '../pages/Home/HomePage.vue'
import RutePage from '../pages/Rute/RutePage.vue'
import JalurMapsPage from '../pages/Maps/JalurMapsPage.vue'
import CariRutePage from '../pages/Carirute/CariRutePage.vue'


const routes = [
  {
    path: '/',
    redirect: '/jalurmaps'
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
    path: '/jalurmaps',
    name: 'JalurMapsPage',
    component: JalurMapsPage
  },
  {
    path: '/carirute',
    name: 'CariRutePage',
    component: CariRutePage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
