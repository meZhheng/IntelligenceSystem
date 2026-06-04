<template>
<div class="container">
  <div class="model-detail-container">
    <!-- 顶部基础信息 -->
    <div class="model-header">
      <div class="model-meta">
        <h1 class="model-title">{{ model.base_model.alias + '/' + model.author + '/' + model.label }}</h1>
        <div class="author-info">
        <div class="author-details">
          <div class="author-name">{{ model.author }}</div>
            <div class="update-time">
              创建于 {{ formatDateTime(model.created_at) }}
            </div>
          </div>
        </div>
      </div>
      <div class="meta-tags">
        <el-tag 
          :type="model.shared ? 'success' : 'info'" 
          effect="dark"
          class="shared-tag"
        >
          {{ model.shared ? '公共模型' : '私有模型' }}
        </el-tag>
        <el-tag type="warning" v-if="formatParamSize(model.size).unit === 'GB'">
          大规模模型 {{ formatParamSize(model.size).size + formatParamSize(model.size).unit }}
        </el-tag>
        <el-tag type="info" v-else>
          轻量化模型 {{ formatParamSize(model.size).size + formatParamSize(model.size).unit }}
        </el-tag>
      </div>
    </div>

    <!-- 核心信息卡片 -->
    <div class="info-cards">
      <div class="card-wrapper">
        <el-card class="info-card">
          <template #header>
            <span class="card-title">基础模型</span>
          </template>
          <div class="card-content">
            <div class="model-info">
              <div class="info-item">
                <span class="label">名称</span>
                <span class="value">{{ model.base_model.alias }}</span>
              </div>
              <div class="info-item">
                <span class="label">任务类型</span>
                <span class="value">{{ model.base_model.task_type }}</span>
              </div>
            </div>
          </div>
        </el-card>
        <el-card class="info-card">
          <template #header>
            <span class="card-title">超参数配置</span>
          </template>
          <el-descriptions :column="4" border>
            <el-descriptions-item label="优化器">
              {{ model?.hyperparameters?.optimizer }}
            </el-descriptions-item>
            <el-descriptions-item label="学习率">
              {{ model?.hyperparameters?.learning_rate }}
            </el-descriptions-item>
            <el-descriptions-item label="训练轮数">
              {{ model?.hyperparameters?.epochs }}
            </el-descriptions-item>
            <el-descriptions-item label="Batch Size">
              {{ model?.hyperparameters?.batch_size }}
            </el-descriptions-item>
            <el-descriptions-item label="设备">
              {{ model?.hyperparameters?.device }}
            </el-descriptions-item>
            <el-descriptions-item label="混合精度">
              {{ model?.hyperparameters?.mixedPrecision ? '启用' : '禁用' }}
            </el-descriptions-item>
            <el-descriptions-item label="损失函数">
              {{ model?.hyperparameters?.loss_function }}
            </el-descriptions-item>
            <el-descriptions-item label="预训练参数">
              {{ model?.hyperparameters?.use_pretrained ? '启用' : '禁用' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>
    </div>
  </div>
  <div class="training-process">
    <el-card>
      <template #header>
        <div class="status-header">
          <span class="status-label">任务状态：</span>
          <span class="status-value" :class="statusClass">{{ formatModelStatus(model_status.status) }}</span>
        </div>
        <el-tooltip content="此处会展示模型训练的进度" placement="top">
          <el-icon><QuestionFilled /></el-icon>
        </el-tooltip>
      </template>
      <!-- 当前任务状态展示 -->
      <div class="task-status">
        <!-- 如果任务失败，则显示错误信息 -->
        <div v-if="model_status.status === 'failed'" class="error-message">
          错误信息：{{ model_status.error_message }}
        </div>
        <!-- 其他状态则显示进度条 -->
        <div v-else class="progress-bar">
          <div class="progress-bar-inner" :style="{ width: model_status.progress + '%' }"></div>
          <span class="progress-percent">{{ model_status.progress }}%</span>
        </div>
      </div>
      <!-- 损失曲线图 -->
      <div class="loss-chart">
        <TaskChart :task_id="model_status.id" :content="model_status?.result?.loss" />
      </div>
    </el-card>
  </div>
  <div class="evaluation-container" v-if="model_status.status === 'complete'">
    <div class="metric-overview">
      <el-card v-for="(value, key) in overviewMetrics" :key="key" class="metric-card">
        <div class="metric-header">{{ key }}</div>
        <div class="metric-value">{{ value }}</div>
      </el-card>
    </div>

    <div class="main-content">
      <div class="left-panel">

        <el-card class="report-card">
          <template #header>
            <span>分类报告</span>
            <el-tooltip content="不同分类的指标" placement="top">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <el-table 
            ref="classificationTable"
            :data="classificationReport" 
            border 
            stripe
            max-height="240"
            :cell-style="{ height: '100px', padding: '12px 0' }"
          >
            <el-table-column prop="class" label="类别" width="120"/>
            <el-table-column prop="precision" label="精确率"/>
            <el-table-column prop="recall" label="召回率"/>
            <el-table-column prop="f1_score" label="F1值"/>
            <el-table-column prop="support" label="样本数"/>
          </el-table>
        </el-card>
      </div>
      <div class="right-panel">
        <el-card class="matrix-card">
          <template #header>
          <span>混淆矩阵</span>
          <el-tooltip content="混淆矩阵" placement="top">
              <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
          </template>
          <div ref="matrixChartRef" class="matrix-chart">
          </div>
        </el-card>
      </div>
    </div>
  </div>
  <div class="evaluation-container" v-if="model_status.status === 'complete'">
    <el-card>
      <template #header>
        <div class="status-header">
          <span class="status-label">模型测试</span>
        </div>
        <el-tooltip content="在下方选择数据集测试训练完成的模型性能" placement="top">
          <el-icon><QuestionFilled /></el-icon>
        </el-tooltip>
      </template>
      <div class="test-operation">
        <el-select 
          v-model="datasetToTest" 
          clearable
          placeholder="请选择测试的数据集"
          popper-class="custom-header"
          style="width: 100%"
        >   
          <el-option 
            v-for="item in datasetSelectable"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-button type="primary" @click="testCheckpoint" :disabled="analyzing">测试模型性能</el-button>
      </div>
      <DatasetTable 
        ref="dataTableRef"
        :dataset_id="datasetToTest" 
        :checkpoint_id="$route.params.model_id">
      </DatasetTable>
    </el-card>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import axios from '@/api/axios'
import { formatDateTime } from '@/utils/date'
import TaskChart from '@/components/TaskChart.vue'
import DatasetTable from '@/views/models/datasetTable.vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

// Refs and reactive state
const route = useRoute()
const dataTableRef = ref<InstanceType<typeof DatasetTable> | null>(null)
const matrixChartRef = ref<HTMLElement | null>(null)

const analyzing = ref(false)
const datasetSelectable = ref<any[]>([])
const datasetToTest = ref<any>(null)

const tableHeight = ref(0)
const overviewMetrics = ref<any>({})
const classificationReport = ref<{ class: string }[]>([])
const confusion = ref<[number, number, number][]>([])

const model = ref({
  author: '',
  base_model: { alias: '', label: '', model_type: '', status: '', task_type: '', value: 0 },
  created_at: '',
  description: '',
  label: '',
  shared: false,
  size: 0,
  updated_at: '',
  value: 0,
  hyperparameters: {
    autoAssign: true,
    batch_size: 1,
    device: '',
    distributed: false,
    epochs: 1,
    learning_rate: 0,
    loss_function: '',
    mixedPrecision: false,
    optimizer: '',
    use_pretrained: false,
  },
  trainset: {},
})

const model_status = reactive({
  id: 'model_detail',
  status: 'queued',
  progress: 0,
  error_message: '',
  complete: false,
  result: { loss: [] as number[] },
})

// Computed
const statusClass = computed(() => {
  switch (model_status.status) {
    case 'failed': return 'status-failed'
    case 'queued': return 'status-queued'
    case 'started': return 'status-started'
    case 'finished':
    case 'complete': return 'status-finished'
    default: return ''
  }
})

// Helpers
function formatParamSize(size: number) {
  if (size >= 1024 ** 3) return { size: (size / 1024 ** 3).toFixed(1), unit: 'GB' }
  if (size >= 1024 ** 2) return { size: (size / 1024 ** 2).toFixed(1), unit: 'MB' }
  if (size >= 1024) return { size: (size / 1024).toFixed(1), unit: 'KB' }
  return { size, unit: 'Bytes' }
}

function formatModelStatus(status: string) {
  switch (status) {
    case 'complete': return '训练已完成'
    case 'failed':   return '训练任务失败'
    case 'queued':   return '训练任务排队中'
    case 'started':  return '训练中'
    case 'finished': return '训练已完成'
    default:         return status
  }
}

async function testCheckpoint() {
  if (!datasetToTest.value) {
    ElMessage.warning('请先选择要测试的数据集')
    return
  }
  const child = dataTableRef.value
  if (child?.analyzeTable) {
    try {
      analyzing.value = true
      await child.analyzeTable()
    } catch (error) {
      console.error('Error analyze data:', error)
    } finally {
      analyzing.value = false
    }
  }
}

async function fetchDatasetSelectable() {
  try {
    const link = `/models/test_checkpoint/available_datasets`
    const payload = { checkpoint_id: route.params.model_id }
    const { data } = await axios.post(link, payload)
    datasetSelectable.value = data
  } catch (error) {
    console.error(error)
  }
}

async function fetchModelDetail() {
  try {
    const link = `/models/${route.params.model_id}/detail`
    const { data } = await axios.get(link, {
      timeout: 10000,
    })
    model.value = data
    overviewMetrics.value = data.metrics.overview
    classificationReport.value = data.metrics.classification
    confusion.value = data.metrics.confusion
    datasetToTest.value = data.trainset.value

    await nextTick()
    drawMatrixChart()
  } catch (e) {
    console.error(e)
  }
}

async function fetchModelStatus() {
  try {
    const link = `/models/${route.params.model_id}/status`
    const { data } = await axios.get(link, {
      timeout: 10000,
    })
    Object.assign(model_status, data)
    await fetchModelDetail()
    if (data.status !== 'complete' && data.status !== 'finished') {
      setTimeout(fetchModelStatus, 1000)
    }
  } catch (error) {
    console.error(error)
  }
}

function drawMatrixChart() {
  if (!matrixChartRef.value) return
  const chart = echarts.init(matrixChartRef.value)
  const labels = classificationReport.value.map(r => r.class)
  const maxCount = Math.max(...confusion.value.map(c => c[2]), 0)
  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: params => {
        const [i, j, cnt] = params.data as [number, number, number]
        return `<div><strong>实际：</strong>${labels[i]}<br/><strong>预测：</strong>${labels[j]}<br/><strong>数量：</strong>${cnt}</div>`
      },
      backgroundColor: 'rgba(50,50,50,0.7)',
      textStyle: { color: '#fff' },
      extraCssText: 'padding:10px; border-radius:4px;',
    },
    xAxis: { type: 'category', data: labels, nameLocation: 'middle', nameGap: 30 },
    yAxis: { type: 'category', data: labels, nameLocation: 'middle', nameGap: 40, inverse: true },
    grid: { left: 0, right: 0, top: '10%', bottom: '25%', containLabel: true },
    visualMap: { min: 0, max: maxCount, calculable: true, orient: 'horizontal', left: 'center', bottom: 0 },
    series: [{ name: '混淆矩阵', type: 'heatmap', data: confusion.value, label: { show: true, formatter: ({ value }) => (value as number[])[2] } }],
  })
}

// const classificationTable = ref<InstanceType<typeof DatasetTable> | null>(null)
// function adjustTableHeight() {
//   const el = classificationTable.value?.$el?.parentElement
//   if (el) tableHeight.value = el.offsetHeight - 40
// }

// Lifecycle
onMounted(() => {
  fetchDatasetSelectable()
  fetchModelStatus()
  // nextTick().then(adjustTableHeight)
  // window.addEventListener('resize', adjustTableHeight)
})

onBeforeUnmount(() => {
  // window.removeEventListener('resize', adjustTableHeight)
})
</script>


<style lang="scss" scoped>
.evaluation-container {
  padding: 20px;
  max-width: 1760px;
  width: 100%;

  .test-operation {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 20px;

    margin-bottom: 20px;
  }
}

.metric-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.metric-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #e6ebf5 100%);
  border: none;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.metric-card:hover {
  transform: translateY(-4px);
}

.metric-header {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.report-card {
  height: 340px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.el-table__body-wrapper {
  overflow-y: auto;
}

/* 调整行高 */
.el-table__row > td {
  line-height: 28px;
}

.matrix-card {
  height: 340px;
  box-sizing: border-box;
}

.roc-chart, .pr-chart {
  height: 300px;
  box-sizing: border-box;
}

.matrix-chart {
  height: 240px;
  box-sizing: border-box;
}

.right-panel .chart-card {
  margin-bottom: 32px;
}

.left-panel .chart-card {
  margin-bottom: 32px;
}

:deep(.el-card__header) {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  padding: 15px;
  display: flex;
  align-items: center;
}

:deep(.el-icon) {
  margin-left: 8px;
  color: #999;
  cursor: help;
}

.training-process {
  max-width: 1760px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: #fff;
  box-sizing: border-box;
  width: 100%;
}

/* 任务状态部分 */
.task-status {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: bold;
}

.status-label {
  color: #606266;
}

.status-value {
  padding: 4px 8px;
  border-radius: 4px;
  color: #fff;
}

/* 状态对应的背景色 */
.status-failed {
  background-color: #f56c6c;
}

.status-queued {
  background-color: #e6a23c;
}

.status-started {
  background-color: #409eff;
}

.status-finished {
  background-color: #67c23a;
}

.error-message {
  color: #f56c6c;
  font-size: 14px;
}

/* 进度条样式 */
.progress-bar {
  position: relative;
  background-color: #ebeef5;
  height: 20px;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar-inner {
  background-color: #409eff;
  height: 100%;
  transition: width 0.3s ease;
}

.progress-percent {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #fff;
}

.model-detail-container {
  max-width: 1760px;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  gap: 16px;
  
  .model-header {
    
    .model-meta {
      display: flex;
      gap: 24px;
      align-items: center;
      
      .model-title {
        font-size: 2rem;
        font-weight: 600;
        color: #333;
        margin: 0;
      }
    }
    
    .author-info {
      display: flex;
      align-items: center;
      
      .author-details {
        .author-name {
          font-size: 1.25rem;
          color: #666;
        }
        
        .update-time {
          color: #999;
          font-size: 0.875rem;
        }
      }
    }
  }

  .meta-tags {
    display: flex;
    gap: 8px;

  }
  
  .info-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;

    .card-wrapper {
      display: grid;
      grid-template-columns: 335px 1fr;
      width: 100%;
      gap: 1.5rem;

      .info-card {
        min-width: 300px;
      }
    }
    
    .info-card {
      .card-title {
        font-size: 1.125rem;
        font-weight: 500;
        color: #1f2f3d;
      }
      
      .model-info {
        .info-item {
          margin: 0.75rem 0;
          
          .label {
            display: inline-block;
            width: 100px;
            color: #99a9bf;
            font-weight: 400;
          }
          
          .value {
            color: #333;
            font-weight: 500;
          }
        }
      }
    }
  }
  
  .description-card {
    .description-content {
      white-space: pre-wrap;
      line-height: 1.6;
      color: #666;
    }
  }
}

.container {
  display: flex;
  flex-direction: column;
  gap: 50px;
  height: calc(100% - 60px);
  overflow: auto;
  padding: 20px;
  align-items: center;
  width: 100%;
}
</style>

<style>
.report-card .el-card__body {
  flex: 1;
  overflow: hidden;
}
</style>