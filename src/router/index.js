import { createRouter, createWebHistory } from 'vue-router'
import GetStarted from '../pages/Started/GetStarted.vue'


const routes = [
  {
    path: '/',
    redirect: '/started'
  },
  {
    path: '/started',
    name: 'GetStarted',
    component: GetStarted
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
