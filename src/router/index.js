import { createRouter, createWebHistory } from 'vue-router'
import DataComparisonCreate from '@/views/DataComparisonCreate.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/comparison/create'
    },
    {
      path: '/comparison/create',
      name: 'comparison-create',
      component: DataComparisonCreate
    }
  ],
})

export default router
