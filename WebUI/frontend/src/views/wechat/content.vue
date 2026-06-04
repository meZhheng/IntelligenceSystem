<template>
    <div class="page-wrapper">
        <div v-if="state === 'loading'" class="loading">
            <div class="spinner"></div>
            <p class="loading-text">{{ loadingMessage }}</p>

            <div class="skeleton">
                <div v-for="i in 6" :key="i" class="skeleton-line"></div>
            </div>
        </div>

        <div
            v-else-if="state === 'success'"
            class="content"
            v-html="htmlContent"
        ></div>

        <div v-else class="error">
            <div class="error-card">
                <div class="error-icon">⚠️</div>
                <h2>内容加载失败</h2>
                <p class="error-message">
                    {{ errorMessage }}
                </p>

                <div class="error-actions">
                    <button @click="loadContent">重试</button>
                    <button 
                        class="warning" 
                        @click="handleRefetch" 
                        :disabled="isRefetching"
                    >
                        <span v-if="isRefetching" class="mini-spinner"></span>
                        <span>{{ isRefetching ? '同步中...' : '重新从公众号获取' }}</span>
                    </button>
                    <button class="secondary" @click="goOriginal">
                        打开微信原文
                    </button>
                </div>
                <p class="hint-text">如果文章正文显示不全或报错，请尝试“重新获取”。</p>
            </div>
        </div>
        <div v-if="state === 'success'" class="floating-toolbar">
            <button 
                class="tool-btn" 
                title="重新获取正文" 
                @click="handleRefetch" 
                :disabled="isRefetching"
            >
                <el-icon v-if="!isRefetching" :size="24">
                    <Refresh />
                </el-icon>
                <span v-else class="tiny-spinner"></span>
            </button>
            <button class="tool-btn" title="返回顶部" @click="scrollToTop">
                <el-icon :size="24"><Top /></el-icon>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from '@/api/axios'
import { useRoute } from 'vue-router'
const route = useRoute()

interface ConfigData {
    token: string
    fingerprint: string
    cookie: string
}
const article_id = route.params.article_id as string

const accountConfig = ref<ConfigData>(
  route.query.config
    ? JSON.parse(decodeURIComponent(route.query.config as string))
    : { token: '', fingerprint: '', cookie: '' }
)

const htmlContent = ref('')
const state = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')
const loadingMessage = ref('正在加载文章内容…')

// 通用的内容获取逻辑
async function loadContent() {
    state.value = 'loading'
    loadingMessage.value = '正在加载文章内容…'
    errorMessage.value = ''
    
    try {
        const resp = await axios.get(
            `/wechat/articles/${article_id}/content`,
            { responseType: 'text', timeout: 60000 }
        )
        htmlContent.value = resp.data
        state.value = 'success'
    } catch (err: any) {
        handleError(err)
    }
}

const isRefetching = ref(false)

async function handleRefetch() {
    if (!confirm('确定要强制重新从公众号抓取吗？这通常用于修复正文显示异常。')) return;
    
    isRefetching.value = true // 开始独立 loading
    loadingMessage.value = '正在重新抓取正文，请稍候...';
    try {
        const resp = await axios.post(`/wechat/articles/${article_id}/refetch_content`, {
            token: accountConfig.value.token,
            fingerprint: accountConfig.value.fingerprint,
            cookie: accountConfig.value.cookie
        }, { timeout: 300000 })

        if (resp.data.status === 'success') {
            await loadContent()
        }
    } catch (err: any) {
        handleError(err)
    } finally {
        isRefetching.value = false // 结束
    }
}

function handleError(err: any) {
    console.error(err)
    state.value = 'error'
    const status = err?.response?.status
    if (status === 404) {
        errorMessage.value = '文章内容不存在或已被删除。'
    } else if (status === 403) {
        errorMessage.value = '你没有权限查看该文章内容。'
    } else if (err.code === 'ECONNABORTED') {
        errorMessage.value = '请求超时，服务器抓取时间较长，请稍后刷新重试。'
    } else {
        errorMessage.value = err.message || '网络异常或服务器错误，请稍后再试。'
    }
}

function goOriginal() {
    window.open(`https://mp.weixin.qq.com/s/${article_id}`, '_blank')
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(loadContent)
</script>


<style scoped>
.page-wrapper {
    min-height: 80vh;
    margin: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 40px 16px;
    box-sizing: border-box;
}

/* ========== Loading ========== */
.loading {
    width: 100%;
    max-width: 680px;
    text-align: center;
}

.loading-text {
    margin-top: 12px;
    color: #666;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top-color: #409eff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* 骨架屏 */
.skeleton {
    margin-top: 24px;
}

.skeleton-line {
    height: 14px;
    background: linear-gradient(
        90deg,
        #eee 25%,
        #f5f5f5 37%,
        #eee 63%
    );
    background-size: 400% 100%;
    animation: shimmer 1.4s ease infinite;
    margin-bottom: 12px;
    border-radius: 4px;
}

@keyframes shimmer {
    0% {
        background-position: 100% 0;
    }
    100% {
        background-position: 0 0;
    }
}

/* ========== Content ========== */
.content {
    width: 100%;
    max-width: 680px;
}

/* ========== Error ========== */
.error {
    width: 100%;
    display: flex;
    justify-content: center;
}

.error-card {
    max-width: 420px;
    text-align: center;
    padding: 32px 24px;
    border-radius: 12px;
    background: #fff;
    /* box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); */
}

.error-icon {
    font-size: 40px;
    margin-bottom: 12px;
}

.error-message {
    color: #666;
    margin: 12px 0 24px;
}

.error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
}

button {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    background: #409eff;
    color: #fff;
    cursor: pointer;
}

button.secondary {
    background: #e5e7eb;
    color: #333;
}

button:hover {
    opacity: 0.9;
}

.error-actions {
    display: flex;
    flex-wrap: wrap; /* 适配移动端多按钮换行 */
    gap: 12px;
    justify-content: center;
}

button.warning {
    background: #e6a23c;
    color: #fff;
}

button:disabled {
    background: #a0cfff;
    cursor: not-allowed;
}

.hint-text {
    margin-top: 16px;
    font-size: 12px;
    color: #999;
}

/* 按钮内的微型加载动画 */
.mini-spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 8px;
    vertical-align: middle;
}

/* 适配移动端 */
@media (max-width: 480px) {
    .error-actions {
        flex-direction: column;
    }
    button {
        width: 100%;
    }
}

/* 悬浮工具栏容器 */
.floating-toolbar {
    position: fixed;
    right: 40px;
    bottom: 120px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 100;
}

/* 按钮基础样式 */
.tool-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #fff;
    border: 1px solid #e5e7eb;
    color: #666;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.3; /* 默认半透明 */
    font-size: 24px;
    padding: 0;
    box-sizing: border-box;
}

/* 鼠标移入或点击时高亮 */
.floating-toolbar:hover .tool-btn {
    opacity: 1;
}

.tool-btn:hover {
    background: #f9fafb;
    border-color: #409eff;
    color: #409eff;
    transform: translateY(-2px);
}

/* 针对重新抓取按钮的特殊状态 */
.tool-btn:disabled {
    cursor: not-allowed;
    background: #f3f4f6;
}

/* 小号转圈动画 */
.tiny-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e5e7eb;
    border-top-color: #409eff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

/* 移动端适配：缩小尺寸并降低间距 */
@media (max-width: 768px) {
    .floating-toolbar {
        right: 16px;
        bottom: 24px;
    }
    .tool-btn {
        width: 36px;
        height: 36px;
        opacity: 0.6; /* 移动端没有 hover，透明度稍微提高一点 */
    }
}
</style>