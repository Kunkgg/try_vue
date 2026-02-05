<template>
  <div class="task-query-container">
    <!-- 页面标题和操作区域 -->
    <div class="page-header">
      <h2 class="page-title">任务信息查询</h2>
      <div class="header-actions">
        <el-button type="primary" icon="Refresh" @click="handleRefresh">刷新</el-button>
      </div>
    </div>

    <!-- 筛选条件区域 -->
    <div class="filter-section">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="任务状态">
          <el-select 
            v-model="filterForm.state" 
            placeholder="请选择状态"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="全部状态" value="" />
            <el-option 
              v-for="(label, value) in TASK_STATE_ENUM" 
              :key="value" 
              :label="label" 
              :value="value" 
            />
          </el-select>
        </el-form-item>

        <el-form-item label="任务类型">
          <el-select 
            v-model="filterForm.taskType" 
            placeholder="请选择类型"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="全部类型" value="" />
            <el-option 
              v-for="(label, value) in TASK_TYPE_ENUM" 
              :key="value" 
              :label="label" 
              :value="value" 
            />
          </el-select>
        </el-form-item>

        <el-form-item label="提交用户">
          <el-input 
            v-model="filterForm.user" 
            placeholder="请输入用户名"
            clearable
            @input="handleUserInput"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleFilterChange">查询</el-button>
          <el-button @click="handleResetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据表格区域 -->
    <div class="table-section">
      <el-table 
        :data="tableData" 
        style="width: 100%"
        stripe
        highlight-current-row
        @current-change="handleCurrentChange"
        :default-sort="{ prop: 'create_at', order: 'descending' }"
        @sort-change="handleSortChange"
        class="task-table"
      >
        <!-- 任务 ID 列 -->
        <el-table-column prop="id" label="任务 ID" width="120" sortable="custom">
          <template #default="{ row }">
            <el-link type="primary" @click="handleCopyId(row.id)">
              {{ row.id }}
            </el-link>
          </template>
        </el-table-column>

        <!-- 任务类型列 -->
        <el-table-column prop="task_type" label="任务类型" width="120" sortable="custom">
          <template #default="{ row }">
            <el-tag :type="getTaskTypeTagType(row.task_type)">
              <el-icon><component :is="getTaskTypeIcon(row.task_type)" /></el-icon>
              {{ TASK_TYPE_ENUM[row.task_type] || row.task_type }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 提交用户列 -->
        <el-table-column prop="user" label="提交用户" width="150" sortable="custom">
          <template #default="{ row }">
            <el-tooltip :content="row.user" placement="top" :show-after="500">
              <span class="user-name">{{ row.user }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 任务状态列 -->
        <el-table-column prop="state" label="任务状态" width="120" sortable="custom">
          <template #default="{ row }">
            <el-tag :type="getStateTagType(row.state)">
              {{ TASK_STATE_ENUM[row.state] || row.state }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 创建时间列 -->
        <el-table-column prop="create_at" label="创建时间" width="180" sortable="custom">
          <template #default="{ row }">
            {{ formatDateTime(row.create_at) }}
          </template>
        </el-table-column>

        <!-- 开始执行时间列 -->
        <el-table-column prop="start_at" label="开始执行时间" width="180" sortable="custom">
          <template #default="{ row }">
            {{ row.start_at ? formatDateTime(row.start_at) : '-' }}
          </template>
        </el-table-column>

        <!-- 完成时间列 -->
        <el-table-column prop="finish_at" label="完成时间" width="180" sortable="custom">
          <template #default="{ row }">
            {{ row.finish_at ? formatDateTime(row.finish_at) : '-' }}
          </template>
        </el-table-column>

        <!-- 任务结果列 -->
        <el-table-column label="任务结果" width="120" align="center">
          <template #default="{ row }">
            <el-button 
              v-if="row.result" 
              type="success" 
              size="small"
              @click="handleViewResult(row)"
            >
              查看结果
            </el-button>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>

        <!-- 错误信息列 -->
        <el-table-column label="错误信息" width="120" align="center">
          <template #default="{ row }">
            <el-button 
              v-if="row.error_message" 
              type="danger" 
              size="small"
              @click="handleViewError(row)"
            >
              错误详情
            </el-button>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="pagination-section">
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentPageChange"
      >
        <template #total>
          <span>共 {{ pagination.total }} 条记录</span>
        </template>
      </el-pagination>
    </div>

    <!-- 任务结果查看对话框 -->
    <el-dialog
      v-model="resultDialogVisible"
      :title="'任务结果 - ' + currentResultTaskId"
      width="70%"
      top="5vh"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      destroy-on-close
      class="result-dialog"
    >
      <div class="result-dialog-content">
        <div class="json-toolbar">
          <el-button-group>
            <el-button size="small" @click="formatJson">格式化 JSON</el-button>
            <el-button size="small" @click="toggleJsonExpand">
              {{ jsonExpanded ? '折叠全部' : '展开全部' }}
            </el-button>
          </el-button-group>
          <el-button type="primary" size="small" @click="handleCopyJson">
            复制 JSON
          </el-button>
        </div>
        <div class="json-content" ref="jsonContentRef">
          <pre v-html="formattedJson"></pre>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleDownloadJson">下载 JSON 文件</el-button>
          <el-button @click="resultDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 错误详情查看对话框 -->
    <el-dialog
      v-model="errorDialogVisible"
      :title="'错误详情 - ' + currentErrorTaskId"
      width="70%"
      top="5vh"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      destroy-on-close
      class="error-dialog"
    >
      <div class="error-dialog-content">
        <div class="error-toolbar">
          <el-button type="primary" size="small" @click="handleCopyError">
            复制错误信息
          </el-button>
          <el-button type="warning" size="small" @click="handleDownloadError">
            下载错误日志
          </el-button>
        </div>
        <div class="error-content">
          <pre>{{ currentErrorContent }}</pre>
        </div>
      </div>
    </el-dialog>

    <!-- 全局加载状态 -->
    <el-loading
      v-if="loading"
      :fullscreen="false"
      :lock="false"
      text="加载中..."
      spinner="el-icon-loading"
    />
  </div>
</template>

<script>
/**
 * 任务信息查询页面组件
 * 使用 Options API 风格开发
 */
export default {
  name: 'TaskQuery',

  // Props 定义
  props: {
    // 可选的 API 地址
    apiUrl: {
      type: String,
      default: '/api/tasks'
    }
  },

  data() {
    return {
      // 筛选表单数据
      filterForm: {
        state: '',
        taskType: '',
        user: ''
      },

      // 表格数据
      tableData: [],

      // 分页配置
      pagination: {
        currentPage: 1,
        pageSize: 20,
        total: 0
      },

      // 排序配置
      sortConfig: {
        prop: 'create_at',
        order: 'descending'
      },

      // 加载状态
      loading: false,

      // 用户输入防抖定时器
      userInputTimer: null,

      // 当前选中行
      currentRow: null,

      // 结果对话框相关
      resultDialogVisible: false,
      currentResultTaskId: '',
      rawJsonContent: '',
      formattedJson: '',
      jsonExpanded: true,

      // 错误对话框相关
      errorDialogVisible: false,
      currentErrorTaskId: '',
      currentErrorContent: ''
    };
  },

  computed: {
    // 任务状态枚举
    TASK_STATE_ENUM() {
      return {
        pending: '待执行',
        running: '执行中',
        completed: '已完成',
        failed: '失败'
      };
    },

    // 任务类型枚举（示例，可根据实际需求扩展）
    TASK_TYPE_ENUM() {
      return {
        data_import: '数据导入',
        data_export: '数据导出',
        data_processing: '数据处理',
        report_generation: '报表生成',
        task_scheduling: '任务调度',
        system_backup: '系统备份'
      };
    }
  },

  watch: {
    // 监听筛选变化
    'filterForm.state'() {
      this.handleFilterChange();
    },
    'filterForm.taskType'() {
      this.handleFilterChange();
    }
  },

  mounted() {
    // 初始化加载数据
    this.loadTableData();
    
    // 监听键盘事件
    this.setupKeyboardListeners();
  },

  beforeDestroy() {
    // 清理定时器
    if (this.userInputTimer) {
      clearTimeout(this.userInputTimer);
    }
    // 移除键盘监听
    this.removeKeyboardListeners();
  },

  methods: {
    /**
     * 加载表格数据
     */
    async loadTableData() {
      this.loading = true;
      
      try {
        // 构建请求参数
        const params = {
          page: this.pagination.currentPage,
          pageSize: this.pagination.pageSize,
          sortProp: this.sortConfig.prop,
          sortOrder: this.sortConfig.order.replace('-ending', ''),
          filters: {
            state: this.filterForm.state || undefined,
            task_type: this.filterForm.taskType || undefined,
            user: this.filterForm.user || undefined
          }
        };

        // 调用 API（这里使用模拟数据，实际项目中替换为真实 API 调用）
        const response = await this.fetchTableData(params);
        
        // 更新表格数据
        this.tableData = response.data || [];
        this.pagination.total = response.total || 0;
      } catch (error) {
        this.$message.error('加载数据失败，请重试');
        console.error('加载数据错误:', error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * 模拟 API 调用（实际项目中替换为真实 API）
     */
    async fetchTableData(params) {
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 生成模拟数据
      const mockData = this.generateMockData(params);
      return mockData;
    },

    /**
     * 生成模拟数据
     */
    generateMockData(params) {
      const { page, pageSize } = params;
      const total = 156; // 模拟总记录数
      
      const data = [];
      const states = ['pending', 'running', 'completed', 'failed'];
      const types = ['data_import', 'data_export', 'data_processing', 'report_generation'];
      const users = ['张三', '李四', '王五', '赵六', '钱七'];
      
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, total);
      
      for (let i = startIndex; i < endIndex; i++) {
        const state = states[Math.floor(Math.random() * states.length)];
        const hasResult = state === 'completed';
        const hasError = state === 'failed';
        
        data.push({
          id: `TASK${String(100000 + i).padStart(6, '0')}`,
          task_type: types[Math.floor(Math.random() * types.length)],
          user: users[Math.floor(Math.random() * users.length)],
          state: state,
          create_at: new Date(Date.now() - i * 3600000).toISOString(),
          start_at: state !== 'pending' ? new Date(Date.now() - i * 3600000 + 60000).toISOString() : null,
          finish_at: (state === 'completed' || state === 'failed') 
            ? new Date(Date.now() - i * 3600000 + 120000).toISOString() : null,
          result: hasResult ? JSON.stringify({
            code: 200,
            message: '处理成功',
            data: {
              total: Math.floor(Math.random() * 1000),
              success: Math.floor(Math.random() * 500),
              failed: Math.floor(Math.random() * 100)
            }
          }) : null,
          error_message: hasError ? `Error: Task execution failed at line ${i + 1}\nStack trace:\n  at Function.execute (task.js:${i + 10})\n  at Module._compile (module.js:1000})\n  at Object.<anonymous> (module.js:1100)` : null
        });
      }
      
      return {
        data: data,
        total: total,
        currentPage: page,
        pageSize: pageSize
      };
    },

    /**
     * 处理筛选条件变更
     */
    handleFilterChange() {
      this.pagination.currentPage = 1; // 重置到第一页
      this.loadTableData();
    },

    /**
     * 处理用户输入（带防抖）
     */
    handleUserInput() {
      if (this.userInputTimer) {
        clearTimeout(this.userInputTimer);
      }
      this.userInputTimer = setTimeout(() => {
        this.handleFilterChange();
      }, 300);
    },

    /**
     * 重置筛选条件
     */
    handleResetFilter() {
      this.filterForm = {
        state: '',
        taskType: '',
        user: ''
      };
      this.handleFilterChange();
    },

    /**
     * 处理排序变更
     */
    handleSortChange({ prop, order }) {
      this.sortConfig = {
        prop: prop,
        order: order
      };
      this.loadTableData();
    },

    /**
     * 处理当前行变更
     */
    handleCurrentChange(row) {
      this.currentRow = row;
    },

    /**
     * 处理每页数量变更
     */
    handleSizeChange(size) {
      this.pagination.pageSize = size;
      this.pagination.currentPage = 1;
      this.loadTableData();
    },

    /**
     * 处理页码变更
     */
    handleCurrentPageChange(page) {
      this.pagination.currentPage = page;
      this.loadTableData();
    },

    /**
     * 处理刷新
     */
    handleRefresh() {
      this.loadTableData();
      this.$message.success('数据已刷新');
    },

    /**
     * 复制任务 ID
     */
    handleCopyId(id) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(() => {
          this.$message.success(`任务 ID ${id} 已复制到剪贴板`);
        }).catch(() => {
          this.fallbackCopy(id);
        });
      } else {
        this.fallbackCopy(id);
      }
    },

    /**
     * 备用复制方法
     */
    fallbackCopy(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.$message.success('已复制到剪贴板');
      } catch (err) {
        this.$message.error('复制失败');
      }
      document.body.removeChild(textArea);
    },

    /**
     * 获取状态标签类型
     */
    getStateTagType(state) {
      const typeMap = {
        pending: 'info',
        running: 'primary',
        completed: 'success',
        failed: 'danger'
      };
      return typeMap[state] || 'info';
    },

    /**
     * 获取任务类型标签类型
     */
    getTaskTypeTagType(type) {
      const typeMap = {
        data_import: 'success',
        data_export: 'warning',
        data_processing: 'primary',
        report_generation: 'info',
        task_scheduling: '',
        system_backup: 'danger'
      };
      return typeMap[type] || '';
    },

    /**
     * 获取任务类型图标
     */
    getTaskTypeIcon(type) {
      const iconMap = {
        data_import: 'Upload',
        data_export: 'Download',
        data_processing: 'DataLine',
        report_generation: 'Document',
        task_scheduling: 'Clock',
        system_backup: 'Folder'
      };
      return iconMap[type] || 'Document';
    },

    /**
     * 格式化日期时间
     */
    formatDateTime(dateString) {
      if (!dateString) return '-';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    /**
     * 查看任务结果
     */
    handleViewResult(row) {
      this.currentResultTaskId = row.id;
      this.rawJsonContent = row.result || '{}';
      this.resultDialogVisible = true;
      
      // 格式化 JSON
      this.$nextTick(() => {
        this.formatJson();
      });
    },

    /**
     * 格式化 JSON
     */
    formatJson() {
      try {
        const parsed = JSON.parse(this.rawJsonContent);
        this.formattedJson = this.highlightJson(JSON.stringify(parsed, null, 2));
      } catch (e) {
        this.formattedJson = this.highlightJson(this.rawJsonContent);
      }
    },

    /**
     * JSON 高亮显示
     */
    highlightJson(json) {
      const jsonStr = json.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
      const result = jsonStr.replace(/(".*?"):(.*?)([,\n])/g, (match, key, value, separator) => {
        let coloredValue = value;
        if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
          coloredValue = `<span class="json-bracket">${value}</span>`;
        } else if (/^".*"$/.test(value.trim())) {
          coloredValue = `<span class="json-string">${value}</span>`;
        } else if (/^-?\d+(\.\d+)?$/.test(value.trim())) {
          coloredValue = `<span class="json-number">${value}</span>`;
        } else if (value.trim() === 'true' || value.trim() === 'false') {
          coloredValue = `<span class="json-boolean">${value}</span>`;
        } else if (value.trim() === 'null') {
          coloredValue = `<span class="json-null">${value}</span>`;
        }
        return `<span class="json-key">${key}</span>:${coloredValue}${separator}`;
      });
      return result;
    },

    /**
     * 切换 JSON 展开/折叠
     */
    toggleJsonExpand() {
      this.jsonExpanded = !this.jsonExpanded;
      // 重新格式化以应用折叠/展开
      this.formatJson();
    },

    /**
     * 复制 JSON
     */
    handleCopyJson() {
      const content = this.stripHtml(this.formattedJson);
      this.copyToClipboard(content);
    },

    /**
     * 下载 JSON 文件
     */
    handleDownloadJson() {
      const content = this.stripHtml(this.formattedJson);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.currentResultTaskId}_result.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.$message.success('JSON 文件下载成功');
    },

    /**
     * 查看错误详情
     */
    handleViewError(row) {
      this.currentErrorTaskId = row.id;
      this.currentErrorContent = row.error_message || '';
      this.errorDialogVisible = true;
    },

    /**
     * 复制错误信息
     */
    handleCopyError() {
      this.copyToClipboard(this.currentErrorContent);
    },

    /**
     * 下载错误日志
     */
    handleDownloadError() {
      const content = `[${new Date().toISOString()}] Task: ${this.currentErrorTaskId}\n${this.currentErrorContent}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.currentErrorTaskId}_error.log`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.$message.success('错误日志下载成功');
    },

    /**
     * 复制到剪贴板
     */
    copyToClipboard(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success('已复制到剪贴板');
        }).catch(() => {
          this.fallbackCopy(text);
        });
      } else {
        this.fallbackCopy(text);
      }
    },

    /**
     * 去除 HTML 标签
     */
    stripHtml(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    },

    /**
     * 设置键盘监听
     */
    setupKeyboardListeners() {
      document.addEventListener('keydown', this.handleKeydown);
    },

    /**
     * 移除键盘监听
     */
    removeKeyboardListeners() {
      document.removeEventListener('keydown', this.handleKeydown);
    },

    /**
     * 处理键盘事件
     */
    handleKeydown(event) {
      // ESC 关闭对话框
      if (event.key === 'Escape') {
        if (this.resultDialogVisible) {
          this.resultDialogVisible = false;
        }
        if (this.errorDialogVisible) {
          this.errorDialogVisible = false;
        }
      }
      // Enter 键触发确认操作
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
        // 如果有对话框打开，不阻止默认行为
        if (!this.resultDialogVisible && !this.errorDialogVisible) {
          // 其他地方的处理
        }
      }
    }
  }
};
</script>

<style scoped>
.task-query-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 40px);
}

/* 页面标题样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 筛选区域样式 */
.filter-section {
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-form .el-form-item {
  margin-bottom: 0;
  margin-right: 0;
}

/* 表格区域样式 */
.table-section {
  margin-bottom: 20px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.task-table {
  width: 100%;
}

.task-table .el-table {
  width: 100%;
}

.task-table .el-table__header th {
  background: #fafafa;
  color: #606266;
  font-weight: 600;
}

.task-table .el-table__row:hover {
  background: #f5f7fa;
}

.task-table .el-table__row.current-row {
  background: #ecf5ff;
}

.user-name {
  display: inline-block;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-data {
  color: #c0c4cc;
}

/* 分页区域样式 */
.pagination-section {
  display: flex;
  justify-content: flex-end;
  padding: 20px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* 对话框样式 */
.result-dialog .el-dialog__body,
.error-dialog .el-dialog__body {
  padding: 20px;
}

/* JSON 工具栏样式 */
.json-toolbar,
.error-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

/* JSON 内容样式 */
.json-content,
.error-content {
  max-height: 60vh;
  overflow: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 15px;
}

.json-content pre,
.error-content pre {
  margin: 0;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* JSON 语法高亮样式 */
.json-key {
  color: #9cdcfe;
}

.json-string {
  color: #ce9178;
}

.json-number {
  color: #b5cea8;
}

.json-boolean {
  color: #569cd6;
}

.json-null {
  color: #569cd6;
}

.json-bracket {
  color: #ffd700;
}

/* 错误内容样式 */
.error-content {
  background: #2d2d2d;
  color: #f8f8f2;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-query-container {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .filter-section {
    padding: 15px;
  }

  .filter-form {
    flex-direction: column;
  }

  .filter-form .el-form-item {
    width: 100%;
  }

  .filter-form .el-select,
  .filter-form .el-input {
    width: 100%;
  }

  .pagination-section {
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .table-section {
    overflow-x: auto;
  }

  .task-table {
    min-width: 1200px;
  }

  .result-dialog,
  .error-dialog {
    width: 95% !important;
    margin: 0 auto;
  }

  .json-toolbar,
  .error-toolbar {
    flex-direction: column;
    gap: 10px;
  }
}

/* 动画效果 */
.task-query-container .el-table {
  transition: all 0.3s ease;
}

.task-query-container .el-button {
  transition: all 0.3s ease;
}

.task-query-container .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
