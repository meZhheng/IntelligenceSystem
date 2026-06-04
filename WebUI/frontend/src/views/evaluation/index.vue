<template>
<div class="evaluation-list">
    <el-row :gutter="20">
        <el-col
            v-for="task in tasks"
            :key="task.value"
            :xs="24" :sm="12" :md="8" :lg="6"
        >
            <el-card
                class="task-card"
                shadow="hover"
                @click="goDetail(task.value)"
            >
                <template #header>
                    <div class="card-header">
                    <span class="task-title">{{ task.label }}</span>
                    <el-tag
                        :type="task.completed ? 'success' : 'warning'"
                    >
                        {{ task.completed ? '已完成' : '未完成' }}
                    </el-tag>
                    </div>
                </template>

                <div class="card-body">
                    <p class="task-desc">{{ task.description }}</p>
                </div>

                <div class="card-footer">
                    <el-button
                        type="primary"
                        size="small"
                        @click.stop="goDetail(task.value)"
                    >
                    开始评估
                    </el-button>
                </div>
            </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-card
                class="task-card"
                shadow="hover"
            >
                <template #header>
                    <div class="card-header">
                        <span class="task-title">离线检测速度</span>
                        <!-- <el-tag
                            :type="task.completed ? 'success' : 'warning'"
                        >
                            {{ task.completed ? '已完成' : '未完成' }}
                        </el-tag> -->
                    </div>
                </template>

                <div class="card-body">
                    <p class="task-desc">离线数据检测速度</p>
                </div>

                <div class="card-footer">
                    <el-button
                        type="primary"
                        size="small"
                        @click="goOfflineDetect"
                    >
                    开始测试
                    </el-button>
                </div>
            </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-card
                class="task-card"
                shadow="hover"
            >
                <template #header>
                    <div class="card-header">
                        <span class="task-title">风险内容检测速度测试</span>
                        <!-- <el-tag
                            :type="task.completed ? 'success' : 'warning'"
                        >
                            {{ task.completed ? '已完成' : '未完成' }}
                        </el-tag> -->
                    </div>
                </template>

                <div class="card-body">
                    <p class="task-desc">风险内容检测速度测试</p>
                </div>

                <div class="card-footer">
                    <el-button
                        type="primary"
                        size="small"
                        @click="goOfflineDetect2"
                    >
                    开始测试
                    </el-button>
                </div>
            </el-card>
        </el-col>
    </el-row>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/api/axios'

interface EvalTask {
    value: number
    label: string
    description: string
    completed: boolean
    metrics: Record<string, any> | null
}

const tasks = ref<EvalTask[]>([])
const router = useRouter()

async function fetchTasks() {
    const resp = await axios.get('/evaluate/tasks')

    tasks.value = resp.data
}

function goDetail(id: number) {
    // 1. 先用 router.resolve 拿到 path 或 href
    const routeData = router.resolve({
        name: 'EvaluationDetail',
        params: { id }
    })
    // 2. window.open 打开新标签页
    window.open(routeData.href, '_blank')
}

function goOfflineDetect() {
    const routeData = router.resolve({
        name: 'OfflineDetect'
    })
    console.log("路由解析结果:", routeData)
    window.open(routeData.href, '_blank')
}

function goOfflineDetect2() {
    const routeData = router.resolve({
        name: 'OfflineDetect2'
    })
    console.log("路由解析结果:", routeData)
    window.open(routeData.href, '_blank')
}

onMounted(fetchTasks)
</script>

<style scoped>
.evaluation-list {
    padding: 20px;
}
.task-card {
    cursor: pointer;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.task-title {
    font-size: 16px;
    font-weight: bold;
}
.card-body {
    min-height: 60px;
    margin: 12px 0;
}
.task-desc {
    color: #555;
    font-size: 14px;
    line-height: 1.4;
}
.card-footer {
    text-align: right;
}
</style>
  