<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchHistoryData, createComparisonTask } from '@/api/historicalData'

// 响应式状态
const loading = ref(false)
const historyList = ref([])
const currentData = ref(null)
const baselineData = ref(null)
const error = ref(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const isSubmitting = ref(false)
const listContainerRef = ref(null)
const selectedItems = ref(new Set())

// 格式化日期时间
const formatDateTime = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取历史数据
const loadHistoryData = async (reset = false) => {
  if (reset) {
    page.value = 1
    historyList.value = []
  }
  
  loading.value = true
  error.value = null
  
  try {
    const result = await fetchHistoryData({ page: page.value, pageSize: pageSize.value })
    if (reset) {
      historyList.value = result.data
    } else {
      historyList.value = [...historyList.value, ...result.data]
    }
    total.value = result.total
    
    // 设置默认选中第一项为当前数据
    if (reset && historyList.value.length > 0 && !currentData.value) {
      const firstItem = historyList.value[0]
      currentData.value = firstItem
      selectedItems.value.add(firstItem.id)
    }
  } catch (err) {
    error.value = err.message || '加载历史数据失败'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

// 加载更多数据
const loadMore = () => {
  if (loading.value || historyList.value.length >= total.value) return
  page.value++
  loadHistoryData(false)
}

// 选择基线数据
const selectBaselineData = (record) => {
  if (record.id === currentData.value?.id) {
    ElMessage.warning('基线数据不能与当前数据相同，请选择其他记录')
    return
  }
  baselineData.value = record
  selectedItems.value.add(record.id)
}

// 验证选择
const validateSelection = computed(() => {
  return currentData.value && 
         baselineData.value && 
         currentData.value.id !== baselineData.value.id
})

// 检查记录是否被选中
const isSelected = (record) => {
  return selectedItems.value.has(record.id)
}

// 检查记录是否为当前数据
const isCurrentData = (record) => {
  return currentData.value?.id === record.id
}

// 检查记录是否可选择为基线
const canSelectAsBaseline = (record) => {
  return record.id !== currentData.value?.id
}

// 重置选择
const resetSelection = () => {
  baselineData.value = null
  selectedItems.value.clear()
  if (historyList.value.length > 0) {
    selectedItems.value.add(historyList.value[0].id)
  }
}

// 创建对比任务
const createTask = async () => {
  if (!validateSelection.value) {
    ElMessage.warning('请选择有效的当前数据和基线数据')
    return
  }
  
  try {
    isSubmitting.value = true
    const result = await createComparisonTask(currentData.value.id, baselineData.value.id)
    ElMessage.success(result.message)
    
    // 重置状态
    resetSelection()
  } catch (err) {
    ElMessage.error(err.message || '创建任务失败')
  } finally {
    isSubmitting.value = false
  }
}

// 键盘导航
const handleKeydown = (event, record, index) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (canSelectAsBaseline(record)) {
      selectBaselineData(record)
    }
  }
}

// 打开build_url
const openBuildUrl = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

// 初始化加载
onMounted(() => {
  loadHistoryData(true)
})
</script>

<template>
  <div class="data-comparison-create">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>创建数据对比任务</h2>
      <p class="subtitle">选择当前数据和基线数据进行对比分析</p>
    </div>

    <!-- 选择器区域 - 双栏平行布局 -->
    <div class="selection-area">
      <!-- 当前数据选择器 -->
      <div class="selector-panel current-data">
        <div class="panel-header">
          <el-icon><Document /></el-icon>
          <span>当前数据</span>
          <el-tag type="success" size="small" class="lock-tag">已锁定</el-tag>
        </div>
        <div class="panel-content">
          <div v-if="currentData" class="selected-info">
            <div class="info-item">
              <label>创建时间：</label>
              <span>{{ formatDateTime(currentData.create_at) }}</span>
            </div>
            <div class="info-item">
              <label>类型：</label>
              <el-tag size="small">{{ currentData.kind }}</el-tag>
            </div>
            <div class="info-item">
              <label>构建编号：</label>
              <span>{{ currentData.build_no }}</span>
            </div>
            <el-tooltip
              :content="`备注: ${currentData.remark}`"
              placement="top"
              :show-after="300"
            >
              <div class="info-item info-item-expandable">
                <label>备注：</label>
                <span class="expandable-text">{{ currentData.remark }}</span>
              </div>
            </el-tooltip>
          </div>
          <el-empty v-else description="暂无数据" />
        </div>
      </div>

      <!-- 分隔箭头 -->
      <div class="comparison-arrow">
        <el-icon><Right /></el-icon>
        <el-icon><Right /></el-icon>
      </div>

      <!-- 基线数据选择器 -->
      <div class="selector-panel baseline-data">
        <div class="panel-header">
          <el-icon><DocumentCopy /></el-icon>
          <span>基线数据</span>
          <el-tag type="warning" size="small" v-if="baselineData">已选择</el-tag>
          <el-tag type="info" size="small" v-else>待选择</el-tag>
        </div>
        <div class="panel-content">
          <div v-if="baselineData" class="selected-info">
            <div class="info-item">
              <label>创建时间：</label>
              <span>{{ formatDateTime(baselineData.create_at) }}</span>
            </div>
            <div class="info-item">
              <label>类型：</label>
              <el-tag size="small">{{ baselineData.kind }}</el-tag>
            </div>
            <div class="info-item">
              <label>构建编号：</label>
              <span>{{ baselineData.build_no }}</span>
            </div>
            <el-tooltip
              :content="`备注: ${baselineData.remark}`"
              placement="top"
              :show-after="300"
            >
              <div class="info-item info-item-expandable">
                <label>备注：</label>
                <span class="expandable-text">{{ baselineData.remark }}</span>
              </div>
            </el-tooltip>
          </div>
          <el-empty v-else description="请从下方列表选择基线数据" :image-size="60" />
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button 
        type="primary" 
        :disabled="!validateSelection"
        :loading="isSubmitting"
        @click="createTask"
      >
        创建对比任务
      </el-button>
      <el-button @click="resetSelection">
        重置选择
      </el-button>
    </div>

    <!-- 历史数据列表 -->
    <div class="history-list-section">
      <h3>历史数据列表</h3>
      
      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        class="error-alert"
      />

      <!-- 列表容器 -->
      <div 
        ref="listContainerRef"
        class="history-list"
        :class="{ 'has-error': !!error }"
      >
        <!-- 加载状态 -->
        <div v-if="loading && historyList.length === 0" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- 空状态 -->
        <el-empty 
          v-else-if="!loading && historyList.length === 0" 
          description="暂无历史数据" 
        />

        <!-- 数据列表 -->
        <div v-else class="list-content">
          <div
            v-for="(record, index) in historyList"
            :key="record.id"
            class="list-item"
            :class="{
              'is-current': isCurrentData(record),
              'is-selected': isSelected(record),
              'is-baseline': baselineData?.id === record.id,
              'disabled': !canSelectAsBaseline(record)
            }"
            :tabindex="0"
            @click="canSelectAsBaseline(record) && selectBaselineData(record)"
            @keydown="handleKeydown($event, record, index)"
          >
            <!-- 第一个元素标识 -->
            <div v-if="index === 0" class="current-badge">
              <el-icon><Top /></el-icon>
              <span>当前最新历史记录</span>
            </div>

            <!-- 主要信息 -->
            <div class="item-main">
              <div class="item-info">
                <span class="info-time">{{ formatDateTime(record.create_at) }}</span>
                <el-tag size="small" :type="record.kind === 'build' ? 'primary' : record.kind === 'test' ? 'success' : 'warning'">
                  {{ record.kind }}
                </el-tag>
                <span class="info-build-no">{{ record.build_no }}</span>
              </div>
              
              <!-- 扩展信息 - 悬停显示 -->
              <div class="item-extended">
                <el-tooltip
                  :content="`版本: ${record.b_version}`"
                  placement="top"
                  :show-after="300"
                >
                  <span class="extended-tag">{{ record.b_version }}</span>
                </el-tooltip>
                
                <el-tooltip
                  :content="`Commit: ${record.commit_id}`"
                  placement="top"
                  :show-after="300"
                >
                  <span class="extended-tag commit-id">{{ record.commit_id.substring(0, 10) }}...</span>
                </el-tooltip>

                <el-tooltip
                  :content="`备注: ${record.remark}`"
                  placement="top"
                  :show-after="300"
                >
                  <span class="extended-tag remark">{{ record.remark }}</span>
                </el-tooltip>

                <el-tooltip
                  :content="`点击打开构建页面`"
                  placement="top"
                  :show-after="300"
                >
                  <el-button 
                    type="primary" 
                    link 
                    size="small"
                    @click.stop="openBuildUrl(record.build_url)"
                  >
                    <el-icon><Link /></el-icon>
                  </el-button>
                </el-tooltip>
              </div>
            </div>

            <!-- 选中状态指示 -->
            <div class="item-status">
              <el-icon v-if="isCurrentData(record)" class="status-icon current-icon">
                <Check />
              </el-icon>
              <el-icon v-else-if="baselineData?.id === record.id" class="status-icon baseline-icon">
                <Star />
              </el-icon>
            </div>
          </div>

          <!-- 加载更多 -->
          <div v-if="historyList.length < total" class="load-more">
            <el-button 
              type="primary" 
              link 
              :loading="loading"
              @click="loadMore"
            >
              加载更多 ({{ historyList.length }}/{{ total }})
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-comparison-create {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.subtitle {
  color: #909399;
  margin: 0;
}

/* 选择器区域 */
.selection-area {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.selector-panel {
  flex: 1;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  font-weight: 500;
}

.current-data .panel-header {
  background: #f0f9eb;
  color: #67c23a;
}

.baseline-data .panel-header {
  background: #fdf6ec;
  color: #e6a23c;
}

.panel-content {
  padding: 16px;
  min-height: 120px;
}

.selected-info .info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.selected-info .info-item label {
  color: #909399;
  min-width: 70px;
}

.info-item-expandable {
  cursor: help;
}

.expandable-text {
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.comparison-arrow {
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: #409eff;
  font-size: 24px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

/* 历史数据列表 */
.history-list-section h3 {
  margin: 0 0 16px 0;
  color: #303133;
}

.error-alert {
  margin-bottom: 16px;
}

.history-list {
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  max-height: 500px;
  overflow-y: auto;
}

.history-list.has-error {
  border-color: #f56c6c;
}

.loading-container {
  padding: 16px;
}

.list-content {
  padding: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.list-item:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
}

.list-item:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 当前最新记录标识 */
.current-badge {
  position: absolute;
  top: -8px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #67c23a;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
}

/* 选中状态 */
.list-item.is-current {
  background: #f0f9eb;
  border-color: #67c23a;
}

.list-item.is-selected {
  border-color: #409eff;
}

.list-item.is-baseline {
  background: #fdf6ec;
  border-color: #e6a23c;
}

.list-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.list-item.disabled:hover {
  background: #fafafa;
  border-color: #ebeef5;
}

.item-main {
  flex: 1;
  position: relative;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.info-time {
  color: #606266;
  font-weight: 500;
}

.info-build-no {
  color: #909399;
}

.item-extended {
  display: flex;
  align-items: center;
  gap: 8px;
}

.extended-tag {
  display: inline-block;
  padding: 2px 8px;
  background: #ebeef5;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.extended-tag.commit-id {
  font-family: monospace;
  background: #f4f4f5;
}

.extended-tag.remark {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-status {
  margin-left: 16px;
}

.status-icon {
  font-size: 20px;
}

.current-icon {
  color: #67c23a;
}

.baseline-icon {
  color: #e6a23c;
}

.load-more {
  text-align: center;
  padding: 16px;
}

@media (max-width: 768px) {
  .selection-area {
    flex-direction: column;
  }
  
  .comparison-arrow {
    flex-direction: row;
    justify-content: center;
    padding: 8px 0;
  }
  
  .item-info {
    flex-wrap: wrap;
  }
  
  .item-extended {
    flex-wrap: wrap;
  }
}
</style>
