import { createRouter, createWebHistory } from 'vue-router'
import DataComparisonCreate from '@/views/DataComparisonCreate.vue'
import TaskQuery from '@/views/TaskQuery.vue'

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
    },
    {
      path: '/task/query',
      name: 'task-query',
      component: TaskQuery
    }
  ],
})

export default router
