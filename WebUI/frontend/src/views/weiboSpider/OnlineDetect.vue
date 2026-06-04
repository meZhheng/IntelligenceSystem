<template>
<el-card class="detection-card">
    <h3>在线检测速度</h3>
    <div class="controls">
        <el-button type="primary" :loading="running" @click="startDetection">
            {{ running ? '检测中...' : '启动检测' }}
        </el-button>
    </div>

    <div v-if="started" class="info">
        <p>开始时间：{{ formatTime(startTime) }}</p>
        <p>检测进度：{{ processed }} / {{ total }} 条</p>
        <el-progress :percentage="percent" />
    </div>

    <div v-if="finished" class="result">
        <p>结束时间：{{ formatTime(endTime) }}</p>
        <p>平均速度：{{ avgSpeed.toFixed(2) }} 条/秒</p>
    </div>
</el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { EventSourcePolyfill } from 'event-source-polyfill'

const total = ref(0)
const running = ref(false)
const started = ref(false)
const finished = ref(false)
const processed = ref(0)
const startTime = ref<Date | null>(null)
const endTime = ref<Date | null>(null)
const avgSpeed = ref(0)

const percent = computed(() => {
    const raw = (processed.value / total.value) * 100
    return parseFloat(raw.toFixed(1))
})

function formatTime(date: Date | null) {
    if (!date) return '--:--:--'
    return date.toLocaleTimeString()
}

let eventSource: EventSource | null = null
async function startDetection() {
    if (running.value) return

    // 先关掉可能存在的旧连接
    if (eventSource) {
        eventSource.close()
        eventSource = null
    }

    // 初始化状态
    running.value = true
    finished.value = false
    processed.value = 0
    startTime.value = null
    endTime.value = null
    avgSpeed.value = 0

    // 模拟启动延迟
    // await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200))

    // 开始检测
    startTime.value = new Date()
    started.value = true

    const startTs = performance.now()

    const token = localStorage.getItem('user-token')
    // 用 polyfill 并设置 Authorization header
    eventSource = new EventSourcePolyfill(
        `/api/evaluate/online/detect`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    )

    eventSource.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data)
            // 后端推送 { processed: number }
            processed.value = data.processed
            total.value = data.total
            // 如果到总量了，就关闭连接
            if (processed.value >= total.value) {
                running.value = false
                eventSource?.close()
            }
        } catch {
            // 如果推送了非 JSON（比如心跳），就忽略
        } finally {
            endTime.value = new Date()
            const durationSec = (performance.now() - startTs) / 1000
            avgSpeed.value = total.value / durationSec
            running.value = false
            finished.value = true
        }
    }

    eventSource.onerror = (err) => {
        running.value = false
        eventSource?.close()
        ElMessage.error('检测过程中断开：' + err)
    }
}
</script>

<style scoped>
.detection-card {
    margin: auto;
    min-width: 920px;
    padding: 20px;
}
.controls {
    margin-bottom: 16px;
}
.info, .result {
    margin-top: 12px;
}
</style>
  