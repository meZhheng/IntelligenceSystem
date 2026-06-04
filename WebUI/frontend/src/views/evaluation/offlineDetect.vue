<template>
<el-card class="detection-card">
    <h3>离线检测速度</h3>

    <!-- 新增：数据集选择 -->
    <div class="controls">
    <el-select
        v-model="selectedDataset"
        placeholder="请选择要检测的数据集"
        style="width: 240px; margin-right: 16px;"
    >
        <el-option
            v-for="ds in datasets"
            :key="ds.value"
            :label="ds.label"
            :value="ds.value"
        />
    </el-select>
    <el-button
        type="primary"
        :loading="running"
        :disabled="!selectedDataset"
        @click="startDetection"
    >
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from '@/api/axios'
import { ElMessage } from 'element-plus'
import { EventSourcePolyfill } from 'event-source-polyfill'

// total 取当前选中数据集的 total_data
const total = computed(() => {
    if (!selectedDataset.value) return 0
    const ds = datasets.value.find(d => d.value === selectedDataset.value)
    return ds ? ds.total_data : 0
})

const running = ref(false)
const started = ref(false)
const finished = ref(false)
const processed = ref(0)
const startTime = ref<Date | null>(null)
const endTime = ref<Date | null>(null)
const avgSpeed = ref(0)
const selectedDataset = ref<string | null>(null)

// 假设的数据集列表，可以从接口拉取
const datasets = ref([])

const percent = computed(() => {
    const raw = (processed.value / total.value) * 100
    return parseFloat(raw.toFixed(1))
})

function formatTime(date: Date | null) {
    if (!date) return '--:--:--'
    return date.toLocaleTimeString()
}

async function fetchOffineDataset() {
    const link = `/evaluate/offline/AvaiableDataset`
    axios.get(link).then((response) => {

        datasets.value = response.data
    }).catch((e) => {
        ElMessage.error(e)
    })
}

let eventSource: EventSource | null = null
async function startDetection() {
    if (running.value || !selectedDataset.value) return

    // 先关掉可能存在的旧连接
    if (eventSource) {
        eventSource.close()
        eventSource = null
    }

    // 在这里可以根据 selectedDataset.value 发起不同的数据请求
    console.log('开始检测的数据集：', selectedDataset.value)

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
        `/api/evaluate/offline/detect/${selectedDataset.value}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    )

    eventSource.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data)
            // 后端推送 { processed: number }
            processed.value = data.processed
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

onMounted(() => {
    fetchOffineDataset()
})
// 组件销毁前，记得关闭 SSE
onBeforeUnmount(() => {
    eventSource?.close()
})
</script>

<style scoped>
.detection-card {
    margin: auto;
    min-width: 920px;
    padding: 20px;
}
.controls {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
}
.info, .result {
    margin-top: 12px;
}
</style>  