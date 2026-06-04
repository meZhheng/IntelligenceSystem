<template>
<el-dialog
    v-model="visible"
    title="批量检测文章"
    width="960px"
    :close-on-click-modal="false"
    :before-close="handleClose"
    destroy-on-close
    append-to-body
    class="custom-batch-dialog"
>
    <template #header>
    <div class="custom-dialog-header">
        <div class="header-left">
        <span class="title-text">批量检测文章</span>
        </div>
    </div>
    </template>

    <div v-if="!isDetecting && !isFinished">
    <div class="config-section">
        <div class="config-item">
        <span class="label">重复检测：</span>
        <el-switch
            v-model="reDetectAll"
            active-text="包含已检测过的文章"
            inactive-text="仅检测未检测项"
        />
        </div>
    </div>

    <el-radio-group v-model="batchMode" class="mode-group">
        <div
        class="mode-card"
        :class="{ active: batchMode === 'all' }"
        @click="batchMode = 'all'"
        >
        <el-radio label="all" size="large">
            <span class="mode-title">全量检测</span>
        </el-radio>
        <div class="mode-desc">符合当前筛选条件的 <strong>{{ totalFiltered }}</strong> 篇文章</div>
        </div>
        <div
        class="mode-card"
        :class="{ active: batchMode === 'selected' }"
        @click="batchMode = 'selected'"
        >
        <el-radio label="selected" size="large">
            <span class="mode-title">检测已选文章</span>
        </el-radio>
        <div class="mode-desc">手动勾选的 <strong>{{ selectedIds.length }}</strong> 篇文章</div>
        </div>
    </el-radio-group>
    </div>

    <div v-else class="execution-container">
        <!-- Token 状态展示 -->
        <div class="token-box" v-if="tokenValue">
            <div class="token-left">
                <div class="token-label">Access Token:</div>
                <div class="token-value">{{ maskedToken }}</div>
            </div>
            <div class="token-right">
                <div class="token-ttl">{{ tokenCountdownText }}</div>
            </div>
        </div>
        <div class="status-summary">
            <el-row :gutter="20">
            <el-col :span="6">
                <div class="stat-box">
                <div class="stat-label">总数</div>
                <div class="stat-value">{{ totalCount }}</div>
                </div>
            </el-col>
            <el-col :span="6">
                <div class="stat-box is-success">
                <div class="stat-label">成功</div>
                <div class="stat-value">{{ summary.success }}</div>
                </div>
            </el-col>
            <el-col :span="6">
                <div class="stat-box is-warning">
                <div class="stat-label">跳过</div>
                <div class="stat-value">{{ summary.skipped }}</div>
                </div>
            </el-col>
            <el-col :span="6">
                <div class="stat-box is-danger">
                <div class="stat-label">失败</div>
                <div class="stat-value">{{ summary.failed }}</div>
                </div>
            </el-col>
            </el-row>
        </div>
        <div class="execution-progress-wrapper">
            <div class="time-stats-bar">
                <div class="time-item">
                    <el-icon><Timer /></el-icon>
                    <span class="label">已用时间：</span>
                    <span class="value">{{ elapsedTime }}</span>
                </div>
                <div class="time-item">
                    <el-icon><Clock /></el-icon>
                    <span class="label">预计剩余：</span>
                    <span class="value highlight">{{ remainingTime }}</span>
                </div>
            </div>

            <div class="main-progress">
                <el-progress
                    :percentage="progressPercent"
                    :stroke-width="24"
                    :status="progressStatus"
                    striped
                    striped-flow
                >
                    <span class="inner-progress-text">{{ progressPercent }}%</span>
                </el-progress>
                <div class="progress-info-footer">
                    <span class="count-text">处理进度：{{ currentCount }} / {{ totalCount }}</span>
                    <span class="speed-text" v-if="isDetecting">处理中...</span>
                </div>
            </div>
        </div>
        <div class="log-container" ref="logScrollRef">
            <div v-for="(log, index) in logs" :key="index" class="log-item" :class="`is-${log.status}`">
            <el-icon v-if="log.status === 'success'"><CircleCheck /></el-icon>
            <el-icon v-else-if="log.status === 'skipped'"><Warning /></el-icon>
            <el-icon v-else-if="log.status === 'failed'"><CircleClose /></el-icon>
            <span class="log-id">ID: {{ log.article_id }}</span>
            <span class="log-msg">
                <template v-if="log.status === 'success'">检测完成，发现 {{ log.mistakes }} 处错误</template>
                <template v-else-if="log.status === 'skipped'">已跳过 (原因: {{ log.reason }})</template>
                <template v-else-if="log.status === 'failed'">失败 (错误: {{ log.reason }})</template>
            </span>
            </div>
        </div>
    </div>

    <template #footer>
    <div class="dialog-footer">
        <el-button v-if="!isFinished" @click="handleClose" :disabled="isDetecting">取消</el-button>
        <el-button
        v-if="!isFinished"
        type="primary"
        :loading="isDetecting"
        :disabled="(batchMode === 'selected' && selectedIds.length === 0)"
        @click="startBatchDetect"
        >
        开始检测
        </el-button>
        <el-button v-else type="primary" @click="finalize">确定</el-button>
    </div>
    </template>
</el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { CircleCheck, Warning, CircleClose } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps<{
modelValue: boolean
selectedIds: string[]
totalFiltered: number
filters: any
}>()

const emit = defineEmits(['update:modelValue', 'success'])

// --- 状态变量 ---
const visible = computed({
get: () => props.modelValue,
set: (val) => emit('update:modelValue', val)
})

const batchMode = ref<'selected' | 'all'>('all')
const reDetectAll = ref(false)
const isDetecting = ref(false)
const isFinished = ref(false)
const currentCount = ref(0)
const totalCount = ref(0)
const logScrollRef = ref<HTMLElement | null>(null)

// token 状态
const tokenValue = ref<string>('')          // 明文 token（从后端拿到）
const tokenExpiresIn = ref<number>(0)       // 剩余秒数（倒计时）
let tokenTimer: number | null = null

// 统计数据
const summary = ref({ success: 0, skipped: 0, failed: 0 })
const logs = ref<any[]>([])

const progressPercent = computed(() => {
if (totalCount.value === 0) return 0
return Math.floor((currentCount.value / totalCount.value) * 100)
})

const progressStatus = computed(() => {
if (isFinished.value) return 'success'
return ''
})

// 计算属性：遮掩 token 只显示前后片段
const maskedToken = computed(() => {
if (!tokenValue.value) return ''
const t = tokenValue.value
if (t.length <= 20) return t
return `${t.slice(0, 6)}...${t.slice(-6)}`
})

// 格式化剩余时间 mm:ss
const tokenCountdownText = computed(() => {
if (!tokenValue.value) return ''
const s = Math.max(0, Math.floor(tokenExpiresIn.value))
const mm = Math.floor(s / 60).toString().padStart(2, '0')
const ss = (s % 60).toString().padStart(2, '0')
return `有效期：${mm}分 ${ss}秒`
})

function startTokenCountdown() {
// 清除旧计时器
if (tokenTimer) {
    clearInterval(tokenTimer)
    tokenTimer = null
}
if (tokenExpiresIn.value <= 0) return
tokenTimer = window.setInterval(() => {
    tokenExpiresIn.value = Math.max(0, tokenExpiresIn.value - 1)
    if (tokenExpiresIn.value <= 0 && tokenTimer) {
    clearInterval(tokenTimer)
    tokenTimer = null
    }
}, 1000)
}

function stopTokenCountdown() {
    if (tokenTimer) {
        clearInterval(tokenTimer)
        tokenTimer = null
    }
}

onUnmounted(() => {
stopTokenCountdown()
})

// --- 逻辑处理 ---
const handleClose = () => {
if (isDetecting.value) {
    ElMessageBox.confirm('正在检测中，关闭将中断任务。确认关闭？', '提示', { type: 'warning' })
    .then(() => terminate())
    .catch(() => {})
} else {
    visible.value = false
}
}

const terminate = () => {
    isDetecting.value = false
    visible.value = false
    // 停止 token 倒计时
    stopTokenCountdown()
    resetTimer()
}

const finalize = () => {
emit('success')
visible.value = false
}

const copyToken = async () => {
if (!tokenValue.value) {
    ElMessage.warning('当前无可用 token')
    return
}
try {
    await navigator.clipboard.writeText(tokenValue.value)
    ElMessage.success('已复制 access_token（请妥善保管）')
} catch (e) {
    ElMessage.error('复制失败')
}
}

import { useProgressTimer } from './useProgressTimer' // 引入上面的逻辑

const { elapsedTime, remainingTime, start: startTimer, update: updateTimer, reset: resetTimer } = useProgressTimer()

const startBatchDetect = async () => {
    isDetecting.value = true
    isFinished.value = false
    currentCount.value = 0
    summary.value = { success: 0, skipped: 0, failed: 0 }
    logs.value = []
    tokenValue.value = ''
    tokenExpiresIn.value = 0
    stopTokenCountdown()
    resetTimer()
    startTimer()

    totalCount.value = batchMode.value === 'selected' ? props.selectedIds.length : props.totalFiltered

    try {
        const auth_token = localStorage.getItem('user-token')
        const filters: any = props.filters
        const params: any = {
        keyword: filters.keyword,
        }
        // 优先判断是否为按年筛选（filters.dateRange 内元素为 number）
        if (filters.dateRange && filters.dateRange.length > 0 && typeof filters.dateRange[0] === 'number') {
            // 传递 years[] 参数给后端（例如 years[]=2023&years[]=2021）
            params.years = (filters.dateRange as number[]).slice()
        } else if (filters.dateRange && filters.dateRange.length === 2) {
            // 连续区间（Date 对象）
            params.start = (filters.dateRange[0] as Date).toISOString()
            params.end   = (filters.dateRange[1] as Date).toISOString()
        }
        if (filters.sortOrder) {
            params.sort_by    = filters.sortBy
            params.sort_order = filters.sortOrder
        }
        if (filters.selectedLevel.length > 0) {
            params.levels = filters.selectedLevel
        }
        if (filters.selectedCategory.length > 0) {
            params.categories = filters.selectedCategory
        }
        if (filters.affiliation) {
            params.affiliation = filters.affiliation
        }

        const payload = {
        mode: batchMode.value,
        is_detect: reDetectAll.value,
        filters: params,
        ids: props.selectedIds
        }

        const response = await fetch('/api/wechat/proofread/batch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth_token}`,
        },
        body: JSON.stringify(payload),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const reader = response.body?.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''

        if (!reader) return

        while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
            if (!line.trim()) continue
            
            // 解析 SSE 事件类型和数据
            const eventMatch = line.match(/^event: (.*)$/m)
            const dataMatch = line.match(/^data: (.*)$/m)
            
            if (!dataMatch) continue
            const rawData = JSON.parse(dataMatch[1])
            const eventType = eventMatch ? eventMatch[1] : 'message'

            // 处理 SSE event 级别
            if (eventType === 'complete') {
            isFinished.value = true
            isDetecting.value = false
            // 停止 token 倒计时
            stopTokenCountdown()
            return
            }

            if (eventType === 'error') {
            // 后端在 token 发生错误时也会用 error event 推送（包含 token_error）
            throw new Error(rawData.message || '服务器错误')
            }

            // 处理 token_status（可能后端通过 event: token_status 发送，或通过 data.type === 'token_status'）
            if (eventType === 'token_status' || rawData.type === 'token_status') {
            // rawData 期望结构: { type: 'token_status', access_token: 'xxx', expires_in: 3600 }
            tokenValue.value = rawData.access_token || ''
            tokenExpiresIn.value = parseInt(String(rawData.expires_in || '0'), 10) || 0
            startTokenCountdown()
            // 给用户一个轻量提示
            ElMessage.info('已获取 access_token，开始任务。')
            continue
            }

            if (eventType === 'token_error' || rawData.type === 'token_error') {
            // 兼容性：若后端把 token 错误当作 message/type 发送
            throw new Error(rawData.message || '获取 token 失败')
            }

            // 处理 progress 类型数据
            if (rawData.type === 'progress') {
                currentCount.value = rawData.current
                totalCount.value = rawData.total

                // 更新时间预测
                updateTimer(rawData.current, rawData.total)
                
                // 更新汇总
                if (rawData.status === 'success') summary.value.success++
                else if (rawData.status === 'skipped') summary.value.skipped++
                else if (rawData.status === 'failed') summary.value.failed++

                // 添加日志
                logs.value.push(rawData)
                
                // 自动滚动到底部
                await nextTick()
                if (logScrollRef.value) {
                    logScrollRef.value.scrollTop = logScrollRef.value.scrollHeight
                }
            }
        }
        }
    } catch (err: any) {
        ElMessage.error(`检测中断: ${err.message || err}`)
        isDetecting.value = false
        stopTokenCountdown()
    }
}
</script>

<style scoped>
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
/* 样式增强 */
.config-section {
background: #f8f9fb;
padding: 15px;
border-radius: 4px;
margin-bottom: 20px;
}
.config-item {
display: flex;
align-items: center;
gap: 10px;
}
.mode-group {
display: flex;
flex-direction: column;
gap: 12px;
width: 100%;
}
.mode-card {
width: 100%;
border: 1px solid #e4e7ed;
border-radius: 4px;
padding: 16px;
cursor: pointer;
transition: all 0.2s;
box-sizing: border-box;
}
.mode-card.active {
border-color: #409eff;
background-color: #ecf5ff;
}
.mode-title { font-weight: bold; }
.mode-desc { margin-top: 8px; font-size: 13px; color: #909399; margin-left: 30px;}

/* Token box */
.token-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: 4px;
    background: #f4f6fb;
    margin-bottom: 15px;
    border: 1px solid #e6eefc;
}
.token-left { display:flex; flex-direction:row; gap: 4px;}
.token-label { font-weight: bold; }
.token-value { font-family: monospace; }
.token-right { display:flex; align-items:center; gap:10px; }

/* 执行界面 */
.status-summary {
    margin-bottom: 15px;
}
.stat-box {
    text-align: center;
    padding: 10px;
    background: #f4f4f5;
    border-radius: 4px;
}
.stat-box.is-success { background: #f0f9eb; color: #67c23a; }
.stat-box.is-warning { background: #fdf6ec; color: #e6a23c; }
.stat-box.is-danger { background: #fef0f0; color: #f56c6c; }
.stat-label { font-size: 12px; margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: bold; }

/* 时间统计条 */
.time-stats-bar {
    display: flex;
    justify-content: space-around;
    background: #ffffff;
    border: 1px solid #eef0f5;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 15px;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.03);
}

.time-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    color: #606266;
}

.time-item .el-icon {
    font-size: 16px;
    color: #409eff;
}

.time-item .value {
    font-family: 'Monaco', 'Courier New', monospace;
    font-weight: 600;
    color: #303133;
}

.time-item .value.highlight {
    color: #409eff;
}

/* 进度条美化 */
.execution-progress-wrapper {
    background: #fcfcfd;
    padding: 20px;
    border-radius: 4px;
    border: 1px dashed #dcdfe6;
    margin-bottom: 15px;
}

.inner-progress-text {
    font-weight: bold;
    color: #000000;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.progress-info-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    font-size: 13px;
    color: #909399;
}

/* 之前统计框的微调 */
.stat-box {
    border: 1px solid transparent;
    transition: all 0.3s;
}
.stat-box:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.log-container {
height: 180px;
overflow-y: auto;
border: 1px solid #eee;
border-radius: 4px;
padding: 10px;
background: #fafafa;
font-family: monospace;
}
.log-item {
display: flex;
align-items: center;
gap: 8px;
font-size: 12px;
margin-bottom: 6px;
padding: 4px 8px;
border-radius: 4px;
}
.log-item.is-success { color: #67c23a; background: #f0f9eb; }
.log-item.is-skipped { color: #e6a23c; background: #fdf6ec; }
.log-item.is-failed { color: #f56c6c; background: #fef0f0; }
.log-id { font-weight: bold; min-width: 165px; }
</style>
