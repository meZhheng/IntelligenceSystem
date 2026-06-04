<template>
  <el-dialog
    v-model="modalVisible"
    title="检测用户博客"
    width="960px"
    :top="'80px'"
    @close="onClose"
    :close-on-click-modal="false"
    :show-close="false"
    :close-on-press-escape="false"
  >
    <!-- 1. 原博文内容 -->
    <div class="original-post">
      <p class="content">{{ post.content }}</p>
    </div>

    <!-- 2. 检测操作按钮 -->
    <div class="actions">
      <el-button
        class="action-btn"
        :class="{ active: currentAction === 'all' }"
        :loading="detecting.all"
        :disabled="detecting.all"
        @click="runAllDetections"
      >
        <i class="el-icon-loading" v-if="detecting.all" style="margin-right:8px;"></i>
        一键检测（立场+情感+风险内容）
      </el-button>

      <el-button
        class="action-btn"
        :class="{ active: currentAction === 'stance' }"
        :loading="detecting.stance"
        :disabled="detecting.stance"
        @click="() => runDetection('stance')"
      >
        <i class="el-icon-loading" v-if="detecting.stance" style="margin-right:8px;"></i>
        单独检测立场
      </el-button>

      <el-button
        class="action-btn"
        :class="{ active: currentAction === 'sentiment' }"
        :loading="detecting.sentiment"
        :disabled="detecting.sentiment"
        @click="() => runDetection('sentiment')"
      >
        <i class="el-icon-loading" v-if="detecting.sentiment" style="margin-right:8px;"></i>
        单独检测情感
      </el-button>

      <el-button
        class="action-btn"
        :class="{ active: currentAction === 'violations' }"
        :loading="detecting.violations"
        :disabled="detecting.violations"
        @click="() => runDetection('violations')"
      >
        <i class="el-icon-loading" v-if="detecting.violations" style="margin-right:8px;"></i>
        单独检测风险内容
      </el-button>
    </div>

    <!-- 小提示或进度 -->
    <div class="status-line" v-if="currentAction && (detecting.all || detecting.stance || detecting.sentiment || detecting.violations)">
      <el-tag type="info" plain>正在检测：{{ actionLabel(currentAction) }}</el-tag>
    </div>

    <!-- 3. 大模型输出结果区域 -->
    <div class="results">
      <DetectionResultViewer
        v-if="output.stance != null"
        :title="'用户立场检测结果'"
        :results="output.stance"
      />
      <DetectionResultViewer
        v-if="output.sentiment != null"
        :title="'用户情感识别结果'"
        :results="output.sentiment"
      />
      <ViolationResultViewer
        v-if="output.violations != null"
        :results="output.violations"
      />
    </div>

    <span slot="footer" class="dialog-footer">
      <el-button @click="onClose" :disabled="isAnyDetecting">取消</el-button>
      <el-button type="primary" @click="onClose" :disabled="isAnyDetecting">完成</el-button>
    </span>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '@/api/axios'
import DetectionResultViewer from './DetectResultViewer.vue'
import ViolationResultViewer from './ViolationOutput.vue'

interface InferenceItem {
  text: string
  target: string
  stance: string
  sentiment: string
  reason: string
  image_description: string
}

interface Post {
  id: string
  content: string
  article_url: string
  publish_place: string
  publish_time: string
  up_num: number
  retweet_num: number
  comment_num: number
  publish_tool: string
  detected?: boolean
  stance?: InferenceItem[]
  sentiment?: InferenceItem[]
  violations?: {
    data: string[][]
  }
}

const modalVisible = ref(true)
const props = defineProps<{ visible: boolean; post: Post }>()
const emits = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'detection-complete', payload: { postId: string; type: 'stance' | 'sentiment' | 'violations' | 'all'; result: any }): void
}>()

// 输出结果
const output = ref<{ stance?: InferenceItem[]; sentiment?: InferenceItem[]; violations?: any }>({})

// 单独 loading 状态
const detecting = ref({
  all: false,
  stance: false,
  sentiment: false,
  violations: false
})

// 当前激活操作（用于高亮）
const currentAction = ref<'all' | 'stance' | 'sentiment' | 'violations' | null>(null)

const isAnyDetecting = computed(() =>
  detecting.value.all || detecting.value.stance || detecting.value.sentiment || detecting.value.violations
)

function actionLabel(k: string | null) {
  if (!k) return ''
  if (k === 'all') return '一键检测（全部）'
  if (k === 'stance') return '立场检测'
  if (k === 'sentiment') return '情感检测'
  if (k === 'violations') return '风险内容检测'
  return ''
}

// 单次检测的底层函数（类型安全简化）
async function doDetect(type: 'stance' | 'sentiment' | 'violations') {
  // set state
  (detecting.value as any)[type] = true
  currentAction.value = type
  try {
    const res = await axios.post(`/weibo/blog/detect/${type}`, { postId: props.post.id }, { timeout: 60000 })
    output.value[type] = res.data
    ElMessage.success(`${actionLabel(type)} 完成`)
    emits('detection-complete', { postId: props.post.id, type, result: res.data })
    return res.data
  } catch (err) {
    ElMessage.error(`${actionLabel(type)} 失败，请重试`)
    throw err
  } finally {
    (detecting.value as any)[type] = false
    // 不立即清空 currentAction，让 status-line 在视觉上更稳定；若无任何 detecting 则清空
    if (!isAnyDetecting.value) currentAction.value = null
  }
}

// 对外单独检测（保持 API）
async function runDetection(type: 'stance' | 'sentiment' | 'violations') {
  // 防止重复点
  if ((detecting.value as any)[type]) return
  await doDetect(type)
}

// 一键检测：顺序执行三个检测，并用 detecting.all 表示全局 running
async function runAllDetections() {
  if (detecting.value.all) return
  detecting.value.all = true
  currentAction.value = 'all'
  try {
    // 顺序执行：也可以改为并行执行（Promise.all），但顺序更容易追踪资源/日志
    await doDetect('stance')
    await doDetect('sentiment')
    await doDetect('violations')
    emits('detection-complete', { postId: props.post.id, type: 'all', result: output.value })
    ElMessage.success('一键检测全部完成')
  } catch (err) {
    // 上面 doDetect 内部已弹出错误消息
  } finally {
    detecting.value.all = false
    if (!isAnyDetecting.value) currentAction.value = null
  }
}

async function fetchDetectResult() {
  try {
    const response = await axios.post(`/weibo/blog/detect/result`, { postId: props.post.id })
    output.value = response.data
  } catch (err) {
    // 不强制报错，先忽略
  }
}

onMounted(() => {
  fetchDetectResult()
})

function onClose() {
  emits('update:visible', false)
}
</script>

<style scoped lang="scss">
.original-post {
    margin-bottom: 16px;
    padding: 12px 0;
    .content {
        white-space: pre-wrap;
        line-height: 1.6;
        word-break: break-word;
        color: #333;
        margin: 8px 0;
    }
}

.actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin: 16px 0;
    align-items: center;

    .action-btn {
        min-width: 220px;
        border-radius: 8px;
        /* 统一使用 Element 按钮的外观，但我们用 .active 高亮 */
    }

    .action-btn.active {
        /* 使用 Element Plus 主题色变量，确保与主题一致 */
        background-color: var(--el-color-primary);
        color: #fff;
        border-color: var(--el-color-primary);
        box-shadow: 0 6px 18px rgba(30, 144, 255, 0.12);
    }
}

/* 状态行 */
.status-line {
    margin-bottom: 8px;
}

.results {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 680px;
    overflow-y: auto;
    margin-bottom: 24px;
    margin-top: 8px;
}

/* footer 按钮的禁用样式对齐整体 */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}
</style>
  