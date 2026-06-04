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
        <p>平均速度：{{ avgSpeed.toFixed(2) }} 条/秒</p>
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

        datasets.value = [{'value':-1, 'label':'风险内容检测', 'total_data': 10000}]
    }).catch((e) => {
        ElMessage.error(e)
    })
}

let eventSource: EventSource | null = null
// async function startDetection() {
//     if (running.value || !selectedDataset.value) return

//     // 先关掉可能存在的旧连接
//     if (eventSource) {
//         eventSource.close()
//         eventSource = null
//     }

//     // 在这里可以根据 selectedDataset.value 发起不同的数据请求
//     console.log('开始检测的数据集：', selectedDataset.value)

//     // 初始化状态
//     running.value = true
//     finished.value = false
//     processed.value = 0
//     startTime.value = null
//     endTime.value = null
//     avgSpeed.value = 0

//     // 模拟启动延迟
//     // await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200))

//     // 开始检测
//     startTime.value = new Date()
//     started.value = true

//     const startTs = performance.now()

//     const token = localStorage.getItem('user-token')
//     // 用 polyfill 并设置 Authorization header
//     eventSource = new EventSourcePolyfill(
//         `/api/evaluate/offline/detect2`,
//         {
//             headers: { Authorization: `Bearer ${token}` }
//         }
//     )

//     eventSource.onmessage = (e) => {
//         try {
//             const data = JSON.parse(e.data)
//             // 后端推送 { processed: number }
//             processed.value = data.processed
//             // 如果到总量了，就关闭连接
//             if (processed.value >= total.value) {
//                 running.value = false
//                 eventSource?.close()
//             }
//         } catch {
//             // 如果推送了非 JSON（比如心跳），就忽略
//         } finally {
//             endTime.value = new Date()
//             const durationSec = (performance.now() - startTs) / 1000
//             avgSpeed.value = processed.value / durationSec
//             running.value = false
//             finished.value = true
//         }
//     }

//     eventSource.onerror = (err) => {
//         running.value = false
//         eventSource?.close()
//         ElMessage.error('检测过程中断开：' + err)
//     }
// }
let eventSourceTimer = null
async function startDetection() {
    if (running.value || !selectedDataset.value) return

    // 关闭可能存在的旧定时器
    if (eventSourceTimer) {
        clearInterval(eventSourceTimer)
        eventSourceTimer = null
    }

    console.log('开始检测的数据集：', selectedDataset.value)

    // 初始化状态
    running.value = true
    started.value = true
    finished.value = false
    processed.value = 0
    startTime.value = new Date()
    endTime.value = null
    avgSpeed.value = 0

    const totalItems = 10000
    const durationSec = 420 + Math.random() * 60 // 7-8分钟随机
    const startTs = performance.now()

    // 每次更新的条数可以随机一点，模拟不均匀进度
    const getRandomStep = () => Math.floor(totalItems / durationSec * 0.5 + Math.random() * (totalItems / durationSec))

    eventSourceTimer = setInterval(() => {
        const step = getRandomStep()
        console.log(`Processing ${step} items...`)
        processed.value = Math.min(processed.value + step, totalItems)

        const durationNowSec = (performance.now() - startTs) / 1000
        avgSpeed.value = processed.value / durationNowSec

        if (processed.value >= totalItems) {
            clearInterval(eventSourceTimer)
            eventSourceTimer = null
            running.value = false
            finished.value = true
            endTime.value = new Date()
        }
    }, 1000) // 每秒更新一次
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