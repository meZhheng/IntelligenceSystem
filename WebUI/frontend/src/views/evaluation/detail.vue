<template>
<div class="container">
    <div class="model-detail-container">
        <!-- 顶部基础信息 -->
        <div class="model-header">
            <div class="model-meta">
                <h1 class="model-title">{{ task.label }}</h1>
            </div>
        </div>
        <!-- 核心信息卡片 -->
        <div class="info-cards">
            <div class="card-wrapper">
                <el-card class="info-card">
                    <template #header>
                    <span class="card-title">测试任务</span>
                    </template>
                    <div class="card-content">
                    <div class="model-info">
                        <div class="info-item">
                        <span class="label">名称</span>
                        <span class="value">{{ task.label }}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">任务描述</span>
                            <span class="value">{{ task.description }}</span>
                        </div>
                    </div>
                    </div>
                </el-card>
                <el-card class="info-card">
                    <template #header>
                    <span class="card-title">关联模型</span>
                    </template>
                    <div class="card-content">
                    <div class="model-info">
                        <div class="info-item">
                        <span class="label">名称</span>
                        <span class="value">{{ task.model.alias }}</span>
                        </div>
                        <div class="info-item">
                        <span class="label">模型描述</span>
                        <span class="value">{{ task.model.description }}</span>
                        </div>
                    </div>
                    </div>
                </el-card>
            </div>
        </div>
        <!-- 上传数据集 & checksum -->
        <el-card class="upload-card">
            <template #header><span class="card-title">上传数据集</span></template>
            <!-- 单文件上传 -->
            <div class="upload-wrapper">
                <!-- 隐藏文件夹上传 input -->
                <input
                    type="file"
                    ref="folderInput"
                    class="hidden-input"
                    webkitdirectory
                    directory
                    multiple
                    @change="onFolderSelected"
                />
                <el-button
                    icon="FolderOpened"
                    class="ml-2"
                    @click="triggerFolderSelect"
                    :type="fileList.length ? 'primary' : 'default'"
                >
                    {{ fileList.length ? `${fileList.length} 个文件已选` : '选择文件夹上传' }}
                </el-button>
                <el-upload
                    v-model:file-list="fileList"
                    class="upload-list disable-select"
                    multiple
                    :auto-upload="false"
                    :before-upload="() => false"
                    list-type="text"
                    @change="onFileChange"
                    @remove="onRemove"
                >
                    <el-button icon="Upload" class="upload_button">添加文件</el-button>
                </el-upload>
            </div>
            <div v-if="uploading" class="mt-2">
                <el-progress
                :text-inside="true"
                :stroke-width="18"
                :percentage="uploadProgress"
                />
                <span>{{ uploadProgress }}% 上传中…</span>
            </div>

            <div v-if="running" class="run-progress mt-2">
                <el-progress :percentage="progress" />
                <p>{{ progressMessage }}</p>
            </div>

            <el-button
                class="mt-2"
                type="primary"
                :disabled="!fileList.length"
                @click="evaluate"
            >
                {{ running ? '测试中…' : '开始测试' }}
            </el-button>
        </el-card>
    </div>
    
    <div class="evaluation-container" v-if="task.completed">
        <!-- 顶部指标概览 -->
        <div class="metric-overview">
            <el-card
                v-for="item in overviewList"
                :key="item.key"
                :class="['metric-card', item.passed ? 'passed' : 'failed']"
            >
                <div class="metric-header">
                    {{ item.key }}
                    <small v-if="item.requirement">（要求 {{ item.requirement }}）</small>
                </div>
                <div class="metric-value">
                    {{ item.actual }}
                </div>
                <el-icon
                class="status-icon"
                :color="item.passed ? '#67C23A' : '#F56C6C'"
                >
                <Check v-if="item.passed" />
                <Close v-else />
                </el-icon>
            </el-card>
        </div>
        <!-- 主要内容区域 -->
        <div class="main-content">
            <!-- 左侧区域 -->
            <div class="left-panel">
                <!-- 分类报告表格 -->
                <el-card class="report-card">
                    <template #header>
                    <span>分类报告</span>
                    <el-tooltip content="Precision-Recall Curve" placement="top">
                        <el-icon><QuestionFilled /></el-icon>
                    </el-tooltip>
                    </template>
                    <el-table 
                        ref="classificationTable"
                        :data="classificationReport" 
                        border 
                        stripe
                        max-height="240"
                        :cell-style="{ height: '68px', padding: '12px 0' }"
                    >
                    <el-table-column prop="class" label="类别" width="200"/>
                    <el-table-column prop="precision" label="精确率"/>
                    <el-table-column prop="recall" label="召回率"/>
                    <el-table-column prop="f1_score" label="F1 值"/>
                    <el-table-column prop="support" label="样本数"/>
                    </el-table>
                </el-card>
            </div>

            <!-- 右侧区域 -->
            <div class="right-panel">
                <!-- 混淆矩阵 -->
                <el-card class="matrix-card">
                    <template #header>
                    <span>混淆矩阵</span>
                    <el-tooltip content="Precision-Recall Curve" placement="top">
                        <el-icon><QuestionFilled /></el-icon>
                    </el-tooltip>
                    </template>
                    <div ref="matrixChartRef" class="matrix-chart">
                    </div>
                </el-card>
            </div>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from '@/api/axios'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import CryptoJS from 'crypto-js'

// ----------------- 上传文件通用逻辑 -----------------
interface UploadFile { name: string; raw: File }

// 主列表，单文件和目录文件都进这里
const fileList = ref<UploadFile[]>([])

// 单文件上传回调
function onFileChange(_: any, newList: any[]) {
  mergeFileLists(
    newList.map(f => ({ name: f.name, raw: f.raw as File }))
  )
}

// 文件夹上传触发
const folderInput = ref<HTMLInputElement>()
function triggerFolderSelect() { folderInput.value?.click() }

// 文件夹选择回调
function onFolderSelected(e: Event) {
    const input = e.target as HTMLInputElement
    if (!input.files) return
    const arr = Array.from(input.files)
        .map(f => ({ name: f.name, raw: f } as UploadFile))
    mergeFileLists(arr)
    input.value = ''  // 支持重复选同一个文件夹
}

// 合并并去重
function mergeFileLists(newItems: UploadFile[]) {
    const seen = new Set<string>()
    // 先把老的 key 加进去
    fileList.value.forEach(f => seen.add(f.raw.webkitRelativePath || f.name))
    // push 新的不重复
    newItems.forEach(f => {
        const key = f.raw.webkitRelativePath || f.name
        if (!seen.has(key)) {
            seen.add(key)
            fileList.value.push(f)
        }
    })
}

// 单条删除
function onRemove(f: UploadFile) {
    fileList.value = fileList.value.filter(x => x !== f)
}

// refs & state
const running = ref(false)
const confusion = ref([])
const task = reactive({
    label: '',
    value: null,
    description: '',
    completed: false,
    model: { alias: '', description: '' },
    requirements: null as any
})

const overviewMetrics = ref<Record<string,string>>({})

// 解析阈值字符串 “>= 80%” -> { op: '>=', threshold: 80 }
function parseReq(req: string) {
  const m = req.match(/(>=|<=|>|<)\s*([\d.]+)/)
  return m ? { op: m[1], threshold: parseFloat(m[2]) } : null
}

// 检验 actual 值“92.7%”是否满足 {op, threshold}
function checkValue(actualStr: string, rule: {op:string, threshold:number}) {
    const num = parseFloat(actualStr.replace('%',''))
    switch (rule.op) {
        case '>=': return num >= rule.threshold
        case '<=': return num <= rule.threshold
        case '>':  return num >  rule.threshold
        case '<':  return num <  rule.threshold
    }
    return true
}

// 合并成带状态的列表
const overviewList = computed(() => {
    return Object.entries(overviewMetrics.value)
    .map(([key, actual]) => {
      const reqStr = task.requirements?.[key]
      let passed = true
      if (reqStr) {
        const rule = parseReq(reqStr)
        passed = rule ? checkValue(actual, rule) : true
      }
      return { key, actual, requirement: reqStr, passed }
    })
    // 只保留那些有 requirement 的
    .filter(item => !!item.requirement)
})


const classificationReport = ref([])

const route = useRoute()
// fetch detail on mount
async function fetchDetail() {
    const { data } = await axios.get(`/evaluate/detail/${route.params.id}`)
    Object.assign(task, data)
    overviewMetrics.value = data.metrics.overview
    classificationReport.value = data.metrics.classification
    confusion.value = data.metrics.confusion

    await nextTick()

    initMatrixChart()
}

onMounted(fetchDetail)

interface UploadFile {
    name: string
    raw: File
}

// const fileList = ref<UploadFile[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)

// 读取单个文件为 ArrayBuffer 并计算 SHA-256
async function hashFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    // 直接把 TypedArray 传进去，下面两种都可以：
    // const wordArray = CryptoJS.lib.WordArray.create(buffer as any);
    const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(buffer));

    const hash = CryptoJS.SHA256(wordArray);
    return hash.toString(CryptoJS.enc.Hex);
}
async function hashFileIncremental(
    file: File,
    chunkSize = 4 * 1024 * 1024
): Promise<string> {
    const sha256 = CryptoJS.algo.SHA256.create();
    const total = file.size;
    let offset = 0;

    while (offset < total) {
        const slice = file.slice(offset, offset + chunkSize);
        const buf = await slice.arrayBuffer();
        const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(buf));
        sha256.update(wordArray);
        offset += chunkSize;
    }

    const result = sha256.finalize();
    return result.toString(CryptoJS.enc.Hex);
}

// 模拟上传并校验
async function verifyAll() {
    uploading.value = true
    uploadProgress.value = 0

    const total = fileList.value.length
    const checksums: string[] = []

    try {
        for (let i = 0; i < total; i++) {
            const fileRecord = fileList.value[i]
            if (!fileRecord || !fileRecord.raw) {
                throw new Error(`文件列表第 ${i} 项不存在或没有 raw 属性`)
            }
            const file = fileRecord.raw   // 这是一个 File/Blob
            const digest = await hashFile(file)
            checksums.push(digest)

            // 模拟进度：按文件占比
            uploadProgress.value = Math.round(((i + 1) / total) * 100)
        }

        return checksums
    } catch (err) {
        console.error(err)
        ElMessage.error('文件校验失败，请检查文件是否选择错误')
    } finally { 
        uploading.value = false
    }
}

/**
* 把多段 SHA-256 校验和再次合并 SHA-256
* @param checksums 已计算好的各段文件 SHA-256 十六进制字符串数组
* @returns 最终合并后的 SHA-256 十六进制字符串
*/
function combineChecksums(checksums: string[]): string {
    // 1. 排序
    const sorted = checksums.slice().sort()
    // 2. 拼接
    const joint = sorted.join('|')
    // 3. 使用 crypto-js 同步计算 SHA-256
    const hash = CryptoJS.SHA256(joint)
    return hash.toString(CryptoJS.enc.Hex)
}

const progress = ref(0)
const progressMessage = ref('')
// 开始评估
async function startEvaluation(checksums: string[]) {
    const finalCode = await combineChecksums(checksums)
    running.value = true
    progress.value = 0
    progressMessage.value = '开始评估…'

    try {
        // 2. 发起 POST，拿到 ReadableStream
        const token = localStorage.getItem('user-token');
        const res = await fetch('/api/evaluate/run', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                files: finalCode,
                task_id: route.params.id
            })
        })

        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.message || '启动失败')
        }

        // 3. 逐行读取 NDJSON
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            // 最后一行可能不完整，留到下一次循环
            buffer = lines.pop()!  

            for (const line of lines) {
                if (!line.trim()) continue
                try {
                    const obj = JSON.parse(line)
                    // 更新进度和文字
                    if (obj.progress !== undefined) {
                        progress.value = obj.progress
                    }
                    if (obj.message) {
                        progressMessage.value = obj.message
                    }

                    if (obj.metrics !== undefined) {
                        overviewMetrics.value = obj.metrics.overview
                        classificationReport.value = obj.metrics.classification
                        confusion.value = obj.metrics.confusion

                        fetchDetail()
                    }
                } catch {}
            }
        }

        // 完成后
        progress.value = 100
        progressMessage.value = '评估完成'
        ElMessage.success('模型测试完成')
    } catch (err: any) {
        ElMessage.error(err.message)
    } finally {
        running.value = false
    }
}

// 当用户第一次点击“开始评估”前，先触发校验
// 因为“开始评估”按钮要 disabled => !verified
// 我们用 watcher 或者直接将 verifyAll() 放到按钮点击逻辑里
// 下面示例：在按钮点击时先校验
const evaluate = async () => {
    if (!uploading.value) {
        const checksums = await verifyAll()
        await startEvaluation(checksums)
    }
}

const matrixChartRef = ref<HTMLDivElement>()

function initMatrixChart() {

    const chart = echarts.init(matrixChartRef.value);
    const labels = classificationReport.value.map(r => r.class);

    chart.setOption({
        tooltip: {
            trigger: 'item',
                // 自定义 formatter：params.data = [xIndex, yIndex, value]
                formatter: params => {
                const [actualIdx, predIdx, count] = params.data;
                const actualLabel    = labels[actualIdx];
                const predictedLabel = labels[predIdx];
                return `
                    <div>
                    <strong>实际标签：</strong> ${actualLabel}<br/>
                    <strong>预测标签：</strong> ${predictedLabel}<br/>
                    <strong>数量：</strong> ${count}
                    </div>
                `;
            },
            backgroundColor: 'rgba(50,50,50,0.7)',
            textStyle: { color: '#fff' },
            extraCssText: 'padding:10px; border-radius:4px;'
        },
        xAxis: {
            type: 'category',
            data: labels,
            nameLocation: 'middle',
            nameGap: 30
        },
        yAxis: {
            type: 'category',
            data: labels,
            nameLocation: 'middle',
            nameGap: 40,
            inverse: true    // 通常混淆矩阵会把第一行显示在上面
        },
        grid: {
            left: 0,
            right: 0,
            top: '10%',
            bottom: '25%',    
            containLabel: true
        },
        visualMap: {
            min: 0,
            max: Math.max(...confusion.value.map(c => c[2])),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
        },
        series: [{
            name: '混淆矩阵',
            type: 'heatmap',
            data: confusion.value,
            label: { show: true, formatter: ({ value }) => value[2] }
        }]
    });
}

</script>

<style lang="scss" scoped>
.hidden-input { display: none; }
.mt-2 { margin-top: 16px; }
.ml-2 { margin-bottom: 16px;}

.upload-wrapper {
    display: flex;
    flex-direction: column;

    .upload-list {
        display: flex;
        flex-direction: column;

        .el-upload-list__item {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .el-upload {
            width: 100%;

            .upload_button {
                width: 100%;
            }
        }
    }
}

.run-progress {
    margin: 16px 0;
}

.upload-card {
    .card-title {
        font-size: 1.125rem;
        font-weight: 500;
        color: #1f2f3d;
    }
}

.upload-list .el-upload-list__item-button {
    margin-left: 8px;
}

.evaluation-container {
    max-width: 1280px;
    width: 100%;
}

.metric-overview {
    display: flex;
    flex-direction: row;
    width: 100%;
    gap: 20px;
    margin-bottom: 32px;
}

.metric-card {
    background: linear-gradient(135deg, #f5f7fa 0%, #e6ebf5 100%);
    width: 100%;
    border: none;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s;
}

.metric-card:hover {
    transform: translateY(-4px);
}

.metric-header {
    font-size: 16px;
    color: #666;
    margin-bottom: 10px;
}

.metric-value {
    font-size: 24px;
    font-weight: bold;
    color: #333;
}

.metric-card {
  position: relative;
  padding-right: 32px;
}
.metric-card.passed {
  border-color: #67C23A;
}
.metric-card.failed {
  border-color: #F56C6C;
}
.status-icon {
  position: absolute;
  top: 12px;
  right: 12px;
}

.metric-value small {
  margin-left: 4px;
  color: #909399;
  font-size: 12px;
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

.matrix-chart {
    width: 100%;
    height: 240px;    /* 或者根据实际需求 */
    box-sizing: border-box;
}

:deep(.el-card__header) {
    background-color: #f5f7fa;
    border-bottom: 1px solid #e4e7ed;
    padding: 15px;
    display: flex;
    align-items: center;
}

:deep(.el-icon) {
    color: #999;
    cursor: help;
}

.model-detail-container {
    max-width: 1280px;
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
    
    .info-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;

    .card-wrapper {
        display: grid;
        grid-template-columns: 1fr 1fr;
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
}

.container {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 20px;
    height: calc(100% - 60px);
    overflow: auto;
    padding: 20px;
    align-items: center;
}
.file-upload-container {
    position: relative;
    display: inline-block;
    width: 100%;
    margin-bottom: 10px;
}
.folder-upload-btn {

    .folder-icon {
        margin-right: 8px;
    }

    .file-count {
        font-size: 0.9em;
        color: #909399;
    }
}
.hidden-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    overflow: hidden;
}
.dashed-upload-btn {
    border: 1px dashed #dcdfe6 !important;
    background-color: #f5f7fa !important;
    height: 100%;
    width: 100%;
    border-radius: 4px;
    transition: all 0.3s ease;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;

    .file-icon {
        color: #909399;
        font-size: 14px;
        margin-right: 8px;
    }

    .upload-text {
        color: #111111;
        font-size: 14px;
    }
}
</style>

<style>
.report-card .el-card__body {
    flex: 1;
    overflow: hidden;
}

.upload-list .el-upload-list {
    max-height: 272px;
    overflow-y: auto;
    margin-bottom: 10px;
    scrollbar-width: thin;
}
</style>