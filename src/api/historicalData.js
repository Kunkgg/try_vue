// Mock历史数据API服务
const mockHistoryData = Array.from({ length: 50 }, (_, index) => ({
  id: `record_${index + 1}`,
  create_at: new Date(Date.now() - index * 86400000).toISOString(),
  kind: ['build', 'test', 'deploy'][index % 3],
  build_no: `B${String(1000 - index).padStart(4, '0')}`,
  remark: index % 3 === 0 ? '自动化构建记录' : index % 3 === 1 ? '手动触发构建' : '定时任务构建',
  b_version: `v1.${index}.${index % 10}`,
  commit_id: `abc${String(1000 + index).padStart(6, '0')}def`,
  build_url: `https://build.example.com/job/${index + 1}`
}))

// 模拟API调用，返回分页数据
export function fetchHistoryData(params = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const { page = 1, pageSize = 20 } = params
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const records = mockHistoryData.slice(start, end)
      
      resolve({
        data: records,
        total: mockHistoryData.length,
        page,
        pageSize
      })
    }, 500) // 模拟网络延迟
  })
}

// 创建数据对比任务
export function createComparisonTask(currentDataId, baselineDataId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (currentDataId === baselineDataId) {
        reject(new Error('当前数据和基线数据不能相同'))
        return
      }
      resolve({
        taskId: `task_${Date.now()}`,
        status: 'created',
        message: '数据对比任务创建成功'
      })
    }, 300)
  })
}
