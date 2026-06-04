<template>
  <el-dialog
    v-model="visible"
    title="批量导出检测报告"
    width="580px"
    :close-on-click-modal="!isExporting"
    append-to-body
    destroy-on-close
    class="export-dialog"
  >
    <template #header>
      <div class="custom-dialog-header">
        <div class="header-left">
          <span class="title-text">批量导出检测报告</span>
        </div>
      </div>
    </template>
    <div v-if="!isExporting" class="export-config">
      <div class="section-title">1. 选择导出范围</div>
      <div class="mode-options">
        <div 
          class="option-card" 
          :class="{ active: exportMode === 'all' }"
          @click="exportMode = 'all'"
        >
          <div class="card-content">
            <div class="main-text">全量结果</div>
            <div class="sub-text">导出符合筛选条件的 <strong>{{ totalFiltered }}</strong> 篇</div>
          </div>
          <el-icon v-if="exportMode === 'all'" class="check-icon"><CircleCheckFilled /></el-icon>
        </div>
        <div 
          class="option-card" 
          :class="{ active: exportMode === 'selected' }"
          @click="exportMode = 'selected'"
        >
          <div class="card-content">
            <div class="main-text">已选文章</div>
            <div class="sub-text">仅导出手动勾选的 <strong>{{ selectedIds.length }}</strong> 篇</div>
          </div>
          <el-icon v-if="exportMode === 'selected'" class="check-icon"><CircleCheckFilled /></el-icon>
        </div>
      </div>

      <div class="section-title" style="margin-top: 24px;">2. 选择导出格式</div>
      <div class="format-grid">
        <div
          v-for="item in formats"
          :key="item.value"
          class="format-item"
          :class="{ active: fileFormat === item.value }"
          @click="fileFormat = item.value"
        >
          <div class="format-icon" :style="{ color: item.color }">
            <el-icon :size="32"><component :is="item.icon" /></el-icon>
          </div>
          <div class="format-info">
            <span class="name">{{ item.label }}</span>
            <span class="ext">.{{ item.value }}</span>
          </div>
        </div>
      </div>

      <div class="section-title" style="margin-top: 24px;">3. 导出内容</div>
      <div class="config-section">
        <div class="config-item">
          <span class="label">同时导出公众号原文：</span>
          <el-switch
            v-model="includeArticleContent"
            active-text="是"
            inactive-text="否"
          />
        </div>
      </div>

      <div class="export-tips">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ exportTipText }}</span>
      </div>
    </div>

    <div v-else class="exporting-status">
      <div class="loading-wrapper">
        <el-icon class="is-loading" :size="40" color="#409eff"><Loading /></el-icon>
      </div>
      <h3>正在准备导出文件...</h3>
      <p>正在根据您的要求生成 {{ fileFormat.toUpperCase() }} 报告，请稍候</p>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false" :disabled="isExporting">取消</el-button>
        <el-button 
          type="primary" 
          :loading="isExporting"
          @click="handleExport"
        >
          {{ isExporting ? '生成中...' : '开始导出' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  CircleCheckFilled, 
  Document, 
  Files, 
  Memo, 
  Loading, 
  InfoFilled 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  selectedIds: string[]
  totalFiltered: number
  filters: any
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const exportMode = ref<'selected' | 'all'>('all')
const fileFormat = ref('pdf')
const includeArticleContent = ref(false)
const isExporting = ref(false)

const exportTipText = computed(() => {
  return includeArticleContent.value
    ? '报告将包含文章标题、作者、校对状态、详细错误列表及公众号文章原文。'
    : '报告将包含文章标题、作者、校对状态及详细错误列表。'
})

// 格式定义
const formats = [
  { label: 'PDF文档', value: 'pdf', icon: Document, color: '#F56C6C' },
  { label: 'Excel报表', value: 'xlsx', icon: Files, color: '#67C23A' },
  { label: 'JSON数据', value: 'json', icon: Memo, color: '#E6A23C' },
  { label: 'TXT文本', value: 'txt', icon: Document, color: '#909399' },
]

const handleExport = async () => {
  // 校验
  if (exportMode.value === 'selected' && props.selectedIds.length === 0) {
    return ElMessage.warning('请先在列表中勾选要导出的文章')
  }

  isExporting.value = true

  try {
    const auth_token = localStorage.getItem('user-token')
    
    // 构造请求参数
    const payload = {
      mode: exportMode.value,
      format: fileFormat.value,
      ids: props.selectedIds,
      filters: props.filters,
      include_article_content: includeArticleContent.value
    }

    // --- 预留的后端接口调用 ---
    const response = await fetch('/api/wechat/proofread/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth_token}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) throw new Error('导出失败')

    // 处理二进制流下载
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 文件命名逻辑
    const dateStr = new Date().toISOString().split('T')[0]
    const contentSuffix = includeArticleContent.value ? '_含原文' : ''
    link.setAttribute('download', `微信校对报告${contentSuffix}_${dateStr}.${fileFormat.value}`)
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
    emit('success')
    visible.value = false
  } catch (err) {
    console.error(err)
    ElMessage.error('导出过程中发生错误')
  } finally {
    isExporting.value = false
  }
}
</script>

<style scoped lang="scss">
.custom-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 标题左侧样式 */
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: 1px;
}
.section-title {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 12px;
}

.config-section {
  padding: 14px 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fdfdfd;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-item .label {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

/* 模式选择卡片 */
.mode-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.option-card {
  position: relative;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  background: #fdfdfd;

  &:hover {
    border-color: #409eff;
    background: #f5faff;
  }

  &.active {
    border-color: #409eff;
    background: #ecf5ff;
    border-width: 1.5px;
  }

  .main-text {
    font-size: 15px;
    font-weight: bold;
    color: #303133;
    margin-bottom: 4px;
  }

  .sub-text {
    font-size: 12px;
    color: #909399;
    strong { color: #409eff; }
  }

  .check-icon {
    position: absolute;
    top: -8px;
    right: -8px;
    font-size: 20px;
    color: #409eff;
    background: #fff;
    border-radius: 50%;
  }
}

/* 格式网格 */
.format-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.format-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  .format-info {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    .name { font-size: 12px; font-weight: 500; }
    .ext { font-size: 11px; color: #999; }
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  &.active {
    border-color: #409eff;
    background: #f0f7ff;
    .name { color: #409eff; }
  }
}

.export-tips {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  padding: 10px;
  background: #f8f9fb;
  border-radius: 6px;
}

/* 导出状态 */
.exporting-status {
  text-align: center;
  padding: 40px 0;
  .loading-wrapper {
    margin-bottom: 20px;
  }
  h3 { margin: 10px 0; color: #303133; }
  p { font-size: 14px; color: #909399; }
}

.dialog-footer {
  padding-top: 10px;
}
</style>