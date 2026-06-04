<template>
<div class="crawl-progress-overlay">
    <div class="main-box">
    <!-- 关闭按钮 -->
    <el-button class="close-btn" :icon="Close" circle @click="closeWblogsCrawler" :disabled="loading || loadingAll"/>

    <!-- 标题与信息区域 -->
    <div class="crawl-progress-box title-box">
        <h2 class="title">爬取进度监控</h2>
        <div class="description">
            <p>用户 ID：<strong>{{ props.userId }}</strong></p>
            <!-- <p>时间范围：<strong>{{ props.config.since_date }}</strong> 至 <strong>{{ props.config.end_date }}</strong></p> -->
        </div>
    </div>

    <!-- 步骤列表 -->
    <div
        class="crawl-progress-box step-box"
        v-for="(step, index) in steps"
        :key="step.key"
    >
        <div>
        <span class="step-label">{{ step.label }}</span>
        <div class="step-info" v-if="step.key !== 'blogs'">
            已处理：{{ stepCounts[step.key].current }} / {{ stepCounts[step.key].total }} 条
        </div>
        </div>

        <div class="progress-container">
            <span class="progress-text">{{ getProgress(step.key) | 0 }}%</span>
            <el-progress
                :percentage="getProgress(step.key)"
                :status="status(step.key)"
                :show-text="false"
                :indeterminate="currentStepKey === step.key"
                :duration="5"
            />
        </div>

        <el-button
            class="step-button"
            type="text"
            size="small"
            :loading="(loadingAll || loading) && currentStepKey === step.key"
            @click="runSingle(step.key)"
            :disabled="loading || loadingAll"
            >
            单独爬取
        </el-button>
    </div>

    <!-- 操作按钮 -->
    <div class="crawl-progress-box operation-box">
        <el-button 
            type="primary" 
            :loading="loadingAll" 
            :disabled="loadingAll || loading"
            @click="startCrawlingAll"
        >
            {{ loadingAll ? '爬取中...' : '全部爬取' }}
        </el-button>
    </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { ref, defineProps } from 'vue'
import { ElProgress, ElButton } from 'element-plus'
import { Close } from '@element-plus/icons-vue'

interface CrawlingConfig {
  max_blog_pages: number
  like_per_blog: number
  forwrd_per_blog: number
  comment_per_blog: number
}
interface UserConfig { since_date: string; end_date: string; cookie: string }
interface Props { 
    userId: string | number; 
    crawlingConfig: CrawlingConfig; 
    config: UserConfig; 
    closeWblogsCrawler: () => void 
    fetchBlogs: () => Promise<void>
}
const props = defineProps<Props>()

const loadingAll = ref(false)
const loading = ref(false)
const currentStepKey = ref<string | null>(null)

// 进度与计数
const progress = ref({ blogs: 0, likes: 0, forwards: 0, comments: 0 })
const stepCounts = ref({
  likes: { current: 0, total: 0 },
  forwards: { current: 0, total: 0 },
  comments: { current: 0, total: 0 }
})

interface Step { key: string; label: string; fn: () => Promise<void> }
const steps: Step[] = [
  { key: 'blogs', label: '检查新博文', fn: crawlBlogs },
  { key: 'likes', label: '爬取点赞关系', fn: crawlLikes },
  { key: 'forwards', label: '爬取转发关系', fn: crawlForwards },
  { key: 'comments', label: '爬取评论关系', fn: crawlComments }
]

function status(key: string) {
    const pct = progress.value[key]
    // 完成时显示 success，当前进行中显示 ''，其他显示 warning
    if (pct >= 100) return 'success'
    if (currentStepKey.value === key) return ''
    return 'warning'
}


function getProgress(key: string) {
    // 向上取整，并保证在 0 到 100 范围内
    const pct = Math.ceil(progress.value[key]);
    return Math.min(Math.max(pct, 0), 100);
}

// 全部爬取
async function startCrawlingAll() {
    loadingAll.value = true
    for (let i = 0; i < steps.length; i++) {
        currentStepKey.value = steps[i].key
        await steps[i].fn()
    }
    loadingAll.value = false
    currentStepKey.value = null

    props.closeWblogsCrawler()
}

// 单独爬取
async function runSingle(key: string) {
    loading.value = true
    currentStepKey.value = key
    const step = steps.find(s => s.key === key)!

    await step.fn()
    loading.value = false
    currentStepKey.value = null
}

// 博文假进度
let blogTimer: number
async function crawlBlogs() {
    progress.value.blogs = 0
    blogTimer = window.setInterval(() => {
        const inc = progress.value.blogs < 90 ? Math.random() * 5 : Math.random() * 2
        progress.value.blogs = Math.min(progress.value.blogs + inc, 98)
    }, 800)
    await postStream(`/api/crawling/blogs/${props.userId}`)
    clearInterval(blogTimer)
    progress.value.blogs = 100

    await props.fetchBlogs()
}

// 点赞/转发/评论
async function crawlLikes() { 
    initStep('likes'); 
    await postStream(`/api/crawling/likes/${props.userId}`) 
}
async function crawlForwards() { 
    initStep('forwards'); 
    await postStream(`/api/crawling/forwards/${props.userId}`) 
}
async function crawlComments() { 
    initStep('comments'); 
    await postStream(`/api/crawling/comments/${props.userId}`) 
}

function initStep(key: 'likes' | 'forwards' | 'comments') {
    progress.value[key] = 0
    stepCounts.value[key] = { current: 0, total: 0 }
}

// 通用流式请求
async function postStream(url: string) {
    const token = localStorage.getItem('user-token')
    const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ config: props.config, crawlingConfig: props.crawlingConfig })
    })
    if (!resp.ok) throw new Error(`请求失败：${resp.status}`)
    const reader = resp.body!.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\n/)
        buffer = lines.pop() || ''
        lines.forEach(line => {
        if (!line.trim()) return
        try {
            const log = JSON.parse(line)
            const { type, current_index, total_count } = log
            // 更新计数与进度
            stepCounts.value[type === 'like' ? 'likes' : type === 'forward' ? 'forwards' : 'comments'].current = current_index
            stepCounts.value[type === 'like' ? 'likes' : type === 'forward' ? 'forwards' : 'comments'].total = total_count
            const pct = (current_index / total_count) * 100
            progress.value[type === 'like' ? 'likes' : type === 'forward' ? 'forwards' : 'comments'] = pct
        } catch { /* ignore */ }
        })
    }
    if (buffer.trim()) console.log('[剩余日志]', buffer.trim())

    await props.fetchBlogs()
}
</script>
  

<style lang="scss" scoped>
.crawl-progress-overlay {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
}
.main-box {
    position: relative;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    width: 620px;
    padding: 12px 24px;
}
.close-btn {
    position: absolute; 
    top: 12px; 
    right: 12px;
    width: 27px;
    height: 27px;
}
.title-box {
    margin-bottom: 16px;
    .title { font-size: 18px; margin: 0 0 8px; }
    .description p { margin: 4px 0; font-size: 14px; color: #555; }
}
.step-box {
    display: grid;
    grid-template-columns: 135px 1fr 100px;
    align-items: center;
    padding: 12px 0;
    border-top: 1px solid #eee;
    &:last-child { border-bottom: 1px solid #eee; }
    &:hover { background: #fafafa; }
    .step-label { font-weight: 500; }
    .step-info { font-size: 12px; color: #888; margin-top: 4px; }
    .progress-container { 
        margin: 0 16px; 
    }
    .progress-text { font-size: 12px; color: #333; }
    .step-button { 
        color: #409eff; 
        margin-left: auto;
        padding-right: 15px;
    }
}
.operation-box {
    margin-top: 12px;
    text-align: right;
}
</style>
      