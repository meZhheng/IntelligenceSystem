<template>
<div class="crawler-dashboard">
    <!-- 左侧面板 -->
    <aside class="sidebar">
        <div class="sidebar-header">
            <el-button type="primary" icon="Plus" @click="createSeed" :disabled="loading">新增种子账号</el-button>
        </div>
        <div class="sidebar-search">
            <el-input
                v-model="seedSearch"
                @input="searchSeeds"
                placeholder="搜索种子账号昵称或UID"
                clearable
                prefix-icon="Search"
                :disabled="loading"
            />
        </div>
        <ul class="seed-list">
            <li
                v-for="(seed, idx) in seed_list"
                :key="seed.id"
                :class="{ active: seed.id == selectedSeed?.id, disabled: loading }"
                @click="selectSeed(seed)"
            >
                {{ seed.username }}（{{ seed.id }}）
            </li>
        </ul>
        <!-- 底部返回首页 -->
        <div class="sidebar-footer" style="color: #409EFF; background: rgba(64, 158, 255, 0.1);" @click="goDetect">
            <span>在线检测</span>
        </div>
        <div class="sidebar-footer" @click="goHome">
            <span>返回首页</span>
        </div>
    </aside>

    <!-- 主体区域 -->
    <section class="main">
        <!-- 输入及配置 -->
        <div class="config-panel" v-if="view === 'create'">
            <h4 class="section-title">种子账号挖掘</h4>
            <div class="config-form">
                <el-input
                    v-model="query_user"
                    placeholder="搜索种子账号"
                    class="uid-input"
                    :disabled="loading"
                    clearable
                    @keyup.enter="queryUser"
                />
                <el-button type="primary" @click="queryUser" :disabled="loading">查询用户</el-button>
                <!-- <el-button type="success" @click="startCrawl" :disabled="!userFound || loading">开始挖掘</el-button> -->
                <el-button icon="Setting" @click="showConfig = true" :disabled="loading">配置参数</el-button>
            </div>
            <!-- 当 userFound 不为空且长度大于 0 时，正常渲染列表 -->
            <div v-if="userFound && userFound.length > 0" class="user-info-preview">
                <div
                    v-for="(valid_user, key) in userFound"
                    :key="key"
                    class="user-info-preview-card"
                    @click="valid_user.exists ? goToInternal(valid_user) : handleCommitCrawl(valid_user)"
                >
                <!-- 1. 用户名行 -->
                <div class="header-row">
                    <span class="username">{{ valid_user.username }}</span>
                    <span
                        class="status"
                        :class="{ exists: valid_user.exists, missing: !valid_user.exists }"
                    >
                        {{ valid_user.exists ? '已在库中' : '尚未入库' }}
                    </span>
                </div>
                <!-- 2. 点击用户名跳转到微博个人主页 -->
                <a
                    class="profile-link"
                    @click="goToWeiboProfile(valid_user)"
                    @click.stop
                >
                    前往微博主页
                </a>
                <!-- 描述 & 粉丝数 -->
                <span class="description">{{ valid_user.description }}</span>
                <span class="followers_count">{{ valid_user.followers_count }}</span>
                </div>
            </div>
            <!-- 当 userFound 已经定义但长度为 0 时，显示“未找到用户”提示 -->
            <div
                v-else-if="Array.isArray(userFound) && userFound.length === 0"
                class="no-results"
            >
                暂未搜索到用户
            </div>
            <!-- 如果 userFound 还没初始化（例如 null/undefined），可以再加一个 loading 或默认提示 -->
            <div v-else class="no-search">
                请输入关键词后点击搜索
            </div>
            <el-dialog title="挖掘参数配置" v-model="showConfig">
                <!-- 在表单上方增加提示，使用 el-alert 突出展示 -->
                <el-alert
                    class="alert-info"
                    type="info"
                    show-icon
                    :closable="false"
                    style="margin-bottom: 10px;"
                >
                    若您还未获取下面的参数，请前往以下链接获取：
                    <a
                        href="https://weibo.cn/"
                        target="_blank"
                        style="color: #409EFF;"
                    >
                    点击这里前往获取参数
                    </a>
                </el-alert>
                <el-form 
                    :model="config"       
                    label-width="80px"
                >
                    <el-form-item label="起始日期">
                        <el-date-picker v-model="config.since_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD"/>
                    </el-form-item>
                    <el-form-item label="结束日期">
                        <el-date-picker v-model="config.end_date" type="date" placeholder="选择日期 或 now" value-format="YYYY-MM-DD"/>
                    </el-form-item>
                    <el-form-item label="Cookie">
                        <el-input v-model="config.cookie" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" placeholder="输入 Cookie" resize="none"/>
                    </el-form-item>
                </el-form>
                <span slot="footer" class="dialog-footer">
                    <el-button @click="showConfig = false">取消</el-button>
                    <el-button type="primary" @click="applyConfig">保存</el-button>
                </span>
            </el-dialog>
        </div>
        <!-- 进度日志 -->
        <div class="progress-log" v-if="view === 'create'">
            <h4 class="section-title">挖掘进度</h4>
            <ul ref="logContainer">
                <li v-for="(msg, idx) in logs" :key="idx">{{ msg }}</li>
            </ul>
        </div>

        <!-- 结果展示 -->
        <div class="result-panel" ref="scrollContainer" v-if="view === 'detail'">
            <!-- 用户信息展示 -->
            <div class="user-info advanced">
                <h4 class="section-title">
                    用户基础信息
                </h4>
                <div class="user-card">
                    <div class="profile-header">
                        <el-avatar class="user-avatar" size="large" icon="User" />
                        <div class="user-basic">
                            <div class="nickname">{{ userInfo.username }}</div>
                            <div class="id">{{ userInfo.id }}</div>
                        </div>
                        <div class="profile-stats">
                            <div class="stat-item">
                                <div class="stat-value">{{ userInfo.weibo_num }}</div>
                                <div class="stat-label">微博数</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">{{ userInfo.following }}</div>
                                <div class="stat-label">关注数</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" :class="{ 'large-number': userInfo.followers >= 10000 }">{{ formatFans(userInfo.followers) }}</div>
                                <div class="stat-label">粉丝数</div>
                            </div>
                        </div>
                    </div>
                    <div class="profile-details">
                        <div class="detail-item description-item">
                            <div class="label">🔖 简介</div>
                            <div class="value">{{ userInfo.description }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="label">🎂 生日</div>
                            <div class="value">{{ userInfo.birthday }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="label">⭐ 认证</div>
                            <div class="value">{{ userInfo.verified_reason }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="label">🎓 教育</div>
                            <div class="value">{{ userInfo.education }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="label">💼 工作</div>
                            <div class="value">{{ userInfo.work }}</div>
                        </div>
                        <div class="detail-item">
                            <div class="label">🌋 地点</div>
                            <div class="value">{{ userInfo.location }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 社交网络图 -->
            <div class="relation-chart" v-if="view === 'detail'">
                <div class="chart-header">
                    <h4 class="section-title">
                        用户关系网络
                        <el-icon :size="24"><FullScreen /></el-icon>
                    </h4>
                    <div class="last-refresh" v-if="userInfo.last_crawled">
                        <span>上次更新：{{ formatDateTime(userInfo.last_crawled) }}</span>
                    </div>
                    <el-button
                        circle
                        @click="fetchAndRender(true)"
                        :loading="loading"
                        title="重新计算并更新关系图"
                        class="refresh-btn"
                    > 
                        <template #icon>
                            <el-icon :size="18"><Refresh /></el-icon>
                        </template>
                    </el-button>
                </div>
                <div id="relationChart"></div>
            </div>
            <div class="blog-viewer" v-if="view === 'detail'">
                <div ref="chartHeader" class="chart-header disable-select">
                    <h4 class="section-title">
                        用户博客
                        <!-- <span class="subtitle" v-if="weiboPosts._meta.total_items">
                        仅展示最新 {{ weiboPosts._meta.total_items }} 条
                        </span> -->
                        <el-button
                            circle
                            @click="showWblogsConfig = true"
                            class="config-btn"
                            title="微博爬取配置"
                            style="border: none;"
                        >
                            <template #icon>
                                <el-icon :size="24"><Setting /></el-icon>
                            </template>
                        </el-button>
                    </h4>
                    <div class="last-refresh" v-if="userInfo.last_crawled_wblogs">
                        <span>上次更新：{{ formatDateTime(userInfo.last_crawled_wblogs) }}</span>
                    </div>
                    <el-button
                        circle
                        @click="showCrawlerProgress=true"
                        :loading="loading"
                        title="获取用户最新博客"
                        class="refresh-btn"
                    > 
                        <template #icon>
                            <el-icon :size="18"><Refresh /></el-icon>
                        </template>
                    </el-button>
                </div>
                <blogViewer
                    :posts="weiboPosts.items"
                    @refresh="crawlingBlogs"
                    :handleNodeClickAsync="handleNodeClickAsync"
                    :fetchBlogs="fetchBlogs"
                >
                </blogViewer>
                <!-- 分页控件 -->
                <div class="pagination-wrap" v-if="weiboPosts._meta.total_pages > 1">
                    <el-pagination
                        v-model:current-page="pager.page"
                        v-model:page-size="pager.per_page"
                        :page-sizes="[10, 20, 50]"
                        layout="total, sizes, prev, pager, next, jumper"
                        :total="weiboPosts._meta.total_items"
                        @size-change="onSizeChange"
                        @current-change="onPageChange"
                    />
                </div>
            </div>
            <div class="interaction-viewer" v-if="view === 'detail'">
                <h4 class="interaction-viewer-header disable-select">
                    用户交互记录
                </h4>
                <InteractionViewer
                    :selected-seed="selectedSeed"
                    :handleNodeClickAsync="handleNodeClickAsync"
                >
                </InteractionViewer>
            </div>
        </div>
        <div v-if="view === 'home'" class="home-leaderboard">
            <!-- 标题行：标题 + 右侧导出按钮 -->
            <div class="title-row">
                <h2 class="title">🚨 风险用户排行榜</h2>
                <el-button size="large" type="primary" @click="exportThreatUsers">
                    <el-icon><Download /></el-icon>
                    导出风险用户
                </el-button>
            </div>
            <div class="leaderboard-container" ref="container">
                <!-- 滚动内容双份，实现循环 -->
                <div class="scroll-content">
                    <div
                        v-for="(user, idx) in fullLoopList"
                        :key="`usr-${idx}-${user.id}`"
                        :class="['user-card', { 'user-card--safe': user.threat_index === 0 }]"
                    >
                        <div class="rank">#{{ (idx % threatUserList.length) + 1 }}</div>
                        <div class="info">
                            <div class="username" @click="toUserSpace(user)">@{{ user.username }}</div>
                        </div>
                        <div class="meta" v-if="user.threat_index > 0">
                            <el-icon :size="16" class="threat"><Warning /></el-icon>
                            <span class="threat">风险指数：{{ user.threat_index }}</span>
                        </div>
                        <div class="meta meta--safe" v-else>
                            <span>安全</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <OnlineDetect
            v-if="view === 'online-detect'"
        >
        </OnlineDetect>
    </section>
</div>
<!-- 右侧弹出的 Sidebar -->
<el-drawer
    v-model="showSidebar"
    direction="rtl"
    size="20%"
    :with-header="false"
    class="node-sidebar"
    :destroy-on-close="true"
>
    <template #default>
        <div v-if="userInfoExists" class="user-info-card">
            <div class="header">
                <el-avatar size="large" icon="User" />
                <div class="basic">
                    <h3>{{ activateUserInfo.username }}</h3>
                    <small class="uid">UID: {{ activateUserInfo.id }}</small>
                </div>
            </div>
            <el-divider />
            <div class="stats">
                <div class="stat">
                    <div class="value">{{ activateUserInfo.weibo_num }}</div>
                    <div class="label">微博</div>
                </div>
                <div class="stat">
                    <div class="value">{{ activateUserInfo.following }}</div>
                    <div class="label">关注</div>
                </div>
                <div class="stat">
                    <div 
                        class="value" 
                        :class="{ 'highlight': activateUserInfo.followers > 10000 }"
                    >
                        {{ formatFans(activateUserInfo.followers) }}
                    </div>
                    <div class="label">粉丝</div>
                </div>
            </div>
            <el-divider />
            <div class="details">
                <div class="detail-item"><strong>性别：</strong>{{ activateUserInfo.gender }}</div>
                <div class="detail-item"><strong>所在地：</strong>{{ activateUserInfo.location }}</div>
                <div class="detail-item"><strong>生日：</strong>{{ activateUserInfo.birthday }}</div>
                <div class="detail-item"><strong>认证：</strong>{{ activateUserInfo.verified_reason }}</div>
                <div class="detail-item"><strong>教育：</strong>{{ activateUserInfo.education }}</div>
                <div class="detail-item"><strong>工作：</strong>{{ activateUserInfo.work }}</div>
                <div class="detail-item full"><strong>简介：</strong>{{ activateUserInfo.description }}</div>
            </div>
            <el-divider />
            <!-- 新增跳转按钮 -->
                <div class="actions">
                <el-button type="primary" @click="selectSeed(activateUserInfo)" icon="UserFilled">
                    查看用户主页
                </el-button>
            </div>
        </div>

        <!-- 404 情况：只显示节点基本数据，并给出引导 -->
        <div v-else class="user-info-card missing">
            <div class="header">
            <el-icon><WarningFilled /></el-icon>
            <div class="basic">
                <h3>{{ activeNode.name }}</h3>
                <small class="uid">UID: {{ activeNode.id }}</small>
            </div>
            </div>
            <el-divider />
            <p>此用户信息尚未在系统中</p>
            <el-button 
                type="primary" 
                icon="CopyDocument" 
                @click="copyUserName(activeNode.name)"
            >
                复制 UID，去新增种子挖掘
            </el-button>
        </div>
    </template>
</el-drawer>

<!-- 配置弹窗 -->
<el-dialog
    title="用户博客爬取配置"
    v-model="showWblogsConfig"
    width="520px"
    @close="onConfigClose"
>
    <el-form :model="config" label-width="240px">
        <el-form-item label="最大爬取博客页数">
            <el-input-number
            v-model="wbolgsConfig.max_blog_pages"
            :min="1"
            :max="50"
            />
        </el-form-item>
        <el-form-item label="爬取的点赞关系数(页/博客)">
            <el-input-number
            v-model="wbolgsConfig.like_per_blog"
            :min="1"
            :max="20"
            />
        </el-form-item>
        <el-form-item label="爬取的转发关系数(页/博客)">
            <el-input-number
            v-model="wbolgsConfig.forwrd_per_blog"
            :min="1"
            :max="20"
            />
        </el-form-item>
        <el-form-item label="爬取的评论关系数(页/博客)">
            <el-input-number
            v-model="wbolgsConfig.comment_per_blog"
            :min="1"
            :max="20"
            />
        </el-form-item>
    </el-form>
    <template #footer>
        <el-button @click="showWblogsConfig = false">取消</el-button>
        <el-button type="primary" @click="applyWblogsConfig">确认</el-button>
    </template>
</el-dialog>
<CrawlerProgress
    :userId=selectedSeed.id
    :crawlingConfig=wbolgsConfig
    :config=config
    :closeWblogsCrawler="closeWblogsCrawler"
    :fetchBlogs="fetchBlogs"
    v-if="showCrawlerProgress"
>
</CrawlerProgress>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, watch, nextTick, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '@/api/axios'
import * as echarts from 'echarts'
import type { SelectChangedPayload } from 'echarts'
import blogViewer from './weibo_blog.vue'
import { getTodayDate } from '@/utils/date'
import CrawlerProgress from './CrawlerProgress.vue'
import InteractionViewer from './InteractionViewer.vue'
import OnlineDetect from './OnlineDetect.vue'

const showCrawlerProgress = ref(false)
const showWblogsConfig = ref(false)

const wbolgsConfig = ref({
    max_blog_pages: 5,
    like_per_blog: 20,
    forwrd_per_blog: 20,
    comment_per_blog: 20
})

interface User {
    id: number
    username: string
    description: string
    followers: number
    threat_index: number
}

// 全部数据
const threatUserList = ref<User[]>([])
// 当前显示的窗口起始索引
const container = ref<HTMLElement | null>(null)
// rAF 控制
let rafId: number|null = null
let lastTime = 0
// 滚动速度：px per ms
const speed = 0.025  // 0.025px 每毫秒，即 25px/s
// 可见列表切片
const fullLoopList = ref<User[]>([])
// 拉取排行榜
async function fetchTopThreats() {
    const res = await axios.post('/weibo/users/top-threats', { page: 1, per_page: 100 }, {
        timeout: 100000
    })
    threatUserList.value = res.data.items
    fullLoopList.value = [...threatUserList.value, ...threatUserList.value]
    await nextTick()
    if (container.value) container.value.scrollTop = 0
    startAutoScroll()
    // 绑定 hover 暂停/继续
    if (container.value) {
        container.value.addEventListener('mouseenter', stopAutoScroll)
        container.value.addEventListener('mouseleave', () => {
            // 只有在抽屉关闭时才恢复自动滚动
            if (!showSidebar.value) {
                startAutoScroll()
            }
        })
        container.value.addEventListener('scroll', onScrollLoop)
    }
}

function toUserSpace(user: User) {
    stopAutoScroll()
    handleNodeClickAsync({
        data: {
            id: user.id, 
            name: user.username
        }
    })
}

// 无缝回环逻辑
function onScrollLoop() {
    if (!container.value) return
    const el = container.value
    const half = el.scrollHeight / 2
    if (el.scrollTop >= half) {
        el.scrollTop -= half
    } else if (el.scrollTop <= 0) {
        el.scrollTop += half
    }
}

// rAF 步进函数
function step(timestamp: number) {
    if (!container.value) return
    if (lastTime) {
        const delta = timestamp - lastTime
        container.value.scrollTop += speed * delta
    }
    lastTime = timestamp
    onScrollLoop()      // 保证无缝回环
    rafId = requestAnimationFrame(step)
}

function startAutoScroll() {
    if (rafId !== null) return
    lastTime = 0
    rafId = requestAnimationFrame(step)
}

function stopAutoScroll() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
    }
}

// 关闭时恢复到最新生效值（可选） 
function onConfigClose() {
    // 如果想重置到上次生效的值，可以在这里处理
}

// 应用配置：把 config 同步到 pager、或保存到后端/本地
function applyWblogsConfig() {

}

function closeWblogsCrawler() { 
    showCrawlerProgress.value = false
}

const selectedSeed = ref(null)
const userFound = ref(null)
const logs = ref<string[]>([])

const weiboPosts = ref({
    items: [],
    _meta: {
        page: null,
        per_page: null,
        total_items: null,
        total_pages: null
    }
})

const relationChart = ref<echarts.ECharts|null>(null)
const rawNodes = ref([])
const nodes = ref([])
const links = ref([])
const categories = ref([])

function formatDateTime(dt: string | Date) {
    const d = new Date(dt)
    return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// 分页状态
const pager = ref({ page: 1, per_page: 10 })
const chartHeader = ref<HTMLElement|null>(null)
// 改变页码
function onPageChange(page: number) {
    pager.value.page = page
    fetchBlogs()
}

// 改变每页大小
function onSizeChange(size: number) {
    pager.value.per_page = size
    pager.value.page = 1
    fetchBlogs()
}

async function handleCommitCrawl(valid_user: any) {
  try {
    await ElMessageBox.confirm(
      `是否开始挖掘用户 ${valid_user.username} 的信息？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success',
      }
    )
    // 用户确认后，调用爬取接口或导航到爬取流程
    // 例如：
    startCrawl(valid_user.id)
  } catch {
    // 取消
  }
}

async function goToInternal(valid_user: any) {
    await ElMessageBox.confirm(
        `是否跳转到种子用户 ${valid_user.username} 的页面？`,
        '确认操作',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'success',
        }
    )
    // 导航到系统内部该用户页面，比如 /seeds/:uid
    selectSeed(valid_user)
}

async function goToWeiboProfile(valid_user: any) {
    await ElMessageBox.confirm(
        `是否跳转到微博用户 ${valid_user.username} 个人主页？确认后前往外部连接 ${valid_user.profile_url}`,
        '警告：正在前往外部连接',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        }
    )
    // 导航到系统内部该用户页面，比如 /seeds/:uid
    window.open(valid_user.profile_url, '_blank');
}

async function queryUser() {
    if (!query_user) return ElMessage.warning("请输入查询内容");
    loading.value = true;
    try {
        const { data } = await axios.post(`/crawling/query_user`, {
            q: query_user.value,
            cookie: config.value.cookie
        }, {
            timeout: 100000
        });

        userFound.value = data

    } catch (err) {
        ElMessage.error("查询失败");
    } finally {
        loading.value = false;
    }
}

async function fetchBlogs(scrollToTop: boolean = true) {
    if (!selectedSeed.value) return
    loading.value = true
    try {
        const { data } = await axios.get(`/search/wblogs/${selectedSeed.value.id}`,
            { params: { page: pager.value.page, per_page: pager.value.per_page }, timeout: 100000 }
        )
        weiboPosts.value = data

        if (scrollToTop) {
            await nextTick()
            chartHeader.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    } finally {
        loading.value = false
    }
}

async function crawlingBlogs() {
    if (!selectedSeed.value) return;
    loading.value = true;

    // 1. 创建 AbortController
    const controller = new AbortController();
    const { signal } = controller;

    // 2. 先设一个全局超时，超时后 abort() 整个 fetch
    const globalTimeout = setTimeout(() => {
        controller.abort();
    }, 5 * 60 * 1000); // 5 分钟

    try {
        const token = localStorage.getItem('user-token');
        const url = `/api/crawling/blogs/${selectedSeed.value.id}`;

        const response = await fetch(url, {
            method: 'POST',
            signal,   // ← 传入 signal
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ config: config.value }),
        });

        if (!response.ok) throw new Error(`请求失败：${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        // 3. 然后再对「流中断」设局部超时
        let streamTimeout = null;
        const resetStreamTimeout = () => {
            if (streamTimeout) clearTimeout(streamTimeout);
            streamTimeout = setTimeout(() => {
                controller.abort();            // 中断整个请求
                ElMessage.error('网络连接超时');
                setTimeout(() => window.location.reload(), 2000);
            }, 5 * 60 * 1000);
        };
        resetStreamTimeout();

        // 4. 读取流
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            resetStreamTimeout();

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\n/);
            buffer = lines.pop();
            for (const line of lines) {
                const text = line.trim();
                if (!text) continue;
                try {
                    console.log('[爬取日志]', JSON.parse(text));
                } catch {
                    console.log('[爬取日志]', text);
                }
            }
        }

        if (buffer.trim()) console.log('[爬取日志]', buffer.trim());
        console.log('✅ 爬取微博完毕');
        fetchBlogs();
        fetchUserInfo(selectedSeed.value.id);

    } catch (err) {
        if (err.name === 'AbortError') {
            console.error('❌ 请求已超时并被中断');
        } else {
            console.error('❌ 爬取微博出错:', err);
        }
    } finally {
        clearTimeout(globalTimeout);
        loading.value = false;
    }
}

// 五种关系类型
const TYPES = ['following','fan','like','retweet','comment'] as const

async function fetchAndRender(refresh: boolean = false) {
    
    const el = document.getElementById('relationChart')
    relationChart.value = echarts.init(el)
    relationChart.value!.on('click', handleNodeClickSync)

    loading.value = true
    nodes.value = []
    links.value = []
    categories.value = []
    renderWithCurrentSize()

    relationChart.value.showLoading()

    const { data } = await axios.get(`/crawling/relations/${selectedSeed.value.id}`, {
        params: {
            k: 3,
            refresh: refresh
        },
        timeout: 600000
    })
    
    relationChart.value.hideLoading()
    loading.value = false

    rawNodes.value = data.nodes
    links.value = data.links
    categories.value = data.node_categories

    renderWithCurrentSize()

    // 绑定 legend 过滤逻辑
    relationChart.value!.off('legendselectchanged');
    relationChart.value!.on('legendselectchanged', (params: SelectChangedPayload) => {
        // 1. 哪几种边被选中
        const selectedEdgeTypes = Object.entries(params.selected)
            .filter(([type, checked]) => checked && TYPES.includes(type as any))
            .map(([type]) => type as typeof TYPES[number]);

        // 2. 先给每一种 edge-series 重新设置 links
        const updatedEdgeSeries = TYPES.map(t => ({
            name: t,
            // 如果这个类型被选中，就保留对应 links，否则清空
            links: selectedEdgeTypes.includes(t)
            ? links.value.filter(l => l.type === t)
            : []
        }));

        // 3. 计算哪些节点还有连线
        const aliveNodeIds = new Set<string>();
        updatedEdgeSeries.forEach(es => {
            es.links.forEach(l => {
            aliveNodeIds.add(l.source as string);
            aliveNodeIds.add(l.target as string);
            });
        });
        // 永远保留根节点
        aliveNodeIds.add(selectedSeed.value.id);

        // 4. 重新计算要渲染的节点数组（带 x,y）
        const W = relationChart.value!.getDom().clientWidth;
        const H = relationChart.value!.getDom().clientHeight;
        const filteredNodes = rawNodes.value
            .filter(n => aliveNodeIds.has(n.id))
            .map(n => ({
                ...n,
                x: n.x_norm * W,
                y: n.y_norm * H
            }));

        // 5. 一次性下发所有更新：nodeSeries + edge-series
        relationChart.value!.setOption({
            series: [
            {
                name: 'nodes',
                data: filteredNodes
            },
            // 把 updatedEdgeSeries 里的 links 覆盖到原来的那五个 series
            ...updatedEdgeSeries.map(es => ({
                name: es.name,
                // 只更新 links，就能触发边的增删，不会影响它们的坐标或颜色
                data: filteredNodes,
                links: es.links
            }))
            ]
        });
    });
}
// 定义一个映射表
const TYPE_LABELS = {
    following: '关注',
    fan:       '粉丝',
    like:      '点赞',
    retweet:   '转发',
    comment:   '评论'
};

// 根据当前 container 大小，给 nodes 计算 x,y
function renderWithCurrentSize() {
    if (!relationChart.value) return
    const container = relationChart.value.getDom() as HTMLElement
    const W = container.clientWidth
    const H = container.clientHeight

    nodes.value = rawNodes.value.map(n => ({
        ...n,
        x: n.x_norm * W,
        y: n.y_norm * H
    }))

    const nodeSeries = {
        name: 'nodes',
        type: 'graph',
        layout: 'none',
        data: nodes.value,
        links: [],
        categories: categories.value,
        label: { show: true, position: 'right', formatter: '{b}' },
        lineStyle: { opacity: 0 },
        z: 10  // 保证节点在最上层
    }

    // 2) 五个 edge-series：每个只渲染一种 type
    const edgeSeries = TYPES.map(t => {
        const lineColor =
            t === 'following'  ? '#4caf50' :
            t === 'fan'        ? '#2196f3' :
            t === 'like'       ? '#ff9800' :
            t === 'retweet'    ? '#9c27b0' :
            t === 'comment'    ? '#f44336' : '#ccc';

        return {
            name: t,       // ← 用中文名,
            type: 'graph',
            layout: 'none',
            data: nodes.value,
            links: links.value.filter(l => l.type === t),
            // ① 把颜色放到 series.color 上
            color: lineColor,
            lineStyle: {
                color: lineColor,  // ② 继续在 lineStyle 里用
                curveness: 0.3
            },
            emphasis: {
                focus: 'adjacency',
                lineStyle: { width: 4 }
            },
            label: { show: false },
            z: 5
        };
    });

    const option = {
        title: {
            text: '图例用户交互关系',
            subtext: '',    // ← 在这里写说明
            top: 'bottom',
            left: 'right',
            textStyle: { fontSize: 12, color: '#888' }
        },
        tooltip: {
            show: true,
            // params.data 指的是节点的数据对象
            formatter: params => {
                // 节点
                if (params.dataType === 'node') {
                    return `
                    <strong>${params.data.name}</strong><br/>
                    影响力：${params.data.value}
                    `
                }
                // 定制 link 的悬浮
                if (params.dataType === 'edge') {
                    return `
                    <strong>关系：${params.data.type}</strong><br/>
                    从：${params.data.source}<br/>
                    到：${params.data.target}
                    `
                }
                return ''
            }
        },
        legend: [{
            data: TYPES,              // ['following','fan', …]
            formatter: name => TYPE_LABELS[name] || name,
            // selected: {
            //     following: true,
            //     fan: true,
            //     like: true,
            //     retweet: true,
            //     comment: true
            // },
            top: 'top',
            left: 'right'
        }],
        series: [
            nodeSeries,
            ...edgeSeries
        ],
        animationDuration: 1500,
    };

    relationChart.value.setOption(option)
}

// 监听窗口 resize，重新渲染坐标
function onResize() {
  if (relationChart.value) {
    relationChart.value.resize()
    renderWithCurrentSize()
  }
}

watch(logs, () => {
    scrollToBottom()
}, { deep: true })

watch(() => selectedSeed, async (user: any) => {
    weiboPosts.value.items = []
    if (user.value && user.value.id) {
        await nextTick()
        fetchAndRender()
        fetchBlogs(false)
    }
}, { deep: true })

const userInfo = ref({
    id: '',
    username: '',
    gender: '', 
    location: '', 
    birthday: '',
    description: '', 
    verified_reason: '', 
    education: '', 
    work: '',
    weibo_num: 0, 
    following: 0, 
    followers: 0,

    last_crawled: '',
    last_crawled_wblogs: '',
})

const activateUserInfo = ref({
    id: '',
    username: '',
    gender: '', 
    location: '', 
    birthday: '',
    description: '', 
    verified_reason: '', 
    education: '', 
    work: '',
    weibo_num: 0, 
    following: 0, 
    followers: 0
})

const userInfoExists = ref(false)

const seedSearch = ref('')
const query_user = ref('')
const showConfig = ref(false)
const view = ref<'home' | 'create' | 'detail' | 'online-detect'>('home')

watch(view, async (newView, oldView) => {
    // 如果切换到了首页
    if (newView === 'home') {
        fetchTopThreats()
    }

    // 如果离开了首页
    if (oldView === 'home' && newView !== 'home') {
        stopAutoScroll()
        if (container.value) {
            container.value.removeEventListener('mouseenter', stopAutoScroll)
            container.value.removeEventListener('mouseleave', startAutoScroll)
            container.value.removeEventListener('scroll', onScrollLoop)
        }
    }
}, {immediate: true})

const config = ref({
    since_date: '2024-01-01',
    end_date: 'now',
    cookie: ''
})

const seed_list = ref([])

const searchSeeds = async (keyword: string = null) => {
    try {
        const params = {
            q: keyword,
            page: 1,
            pageSize: 100
        };
        const res = await axios.get('/crawling/search', { params, timeout: 10000 }); // 假设后端支持搜索参数
        seed_list.value = res.data.items;
    } catch (error) {
        console.error('种子账号搜索失败', error);
    }
};

function createSeed() {
    view.value = 'create'
    selectedSeed.value = null
    
    if (showSidebar) showSidebar.value = false;
}

function goHome() {
    view.value = 'home'
    selectedSeed.value = null
}

function goDetect() {
    view.value = 'online-detect'
    selectedSeed.value = null
}

const formatFans = (num) => {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    } 

    return num.toString();
};

const scrollContainer = ref<HTMLElement|null>(null)
function selectSeed(seed) {
    if (loading.value) return

    if (!seed) return
    
    if (showSidebar) showSidebar.value = false

    selectedSeed.value = seed
    view.value = 'detail'
    // 清空旧日志和用户信息
    logs.value = []
    fetchUserInfo(seed.id).then(async () => {
        // 等待 DOM 更新
        await nextTick()
        if (scrollContainer.value) {
            scrollContainer.value.scrollTop = 0
        }
    })
}

function applyConfig() {
    showConfig.value = false
    localStorage.setItem('crawl-config', JSON.stringify(config.value))
    loadConfig()
    ElMessage.success('配置已更新')
}

const loading = ref(false)
async function startCrawl(user_id: number) {
    logs.value = [];
    loading.value = true;

    try {
        const token = localStorage.getItem('user-token');
        const response = await fetch('/api/crawling', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ uid: user_id, config: config.value }),
        });

        // 预检查：如果后端直接返回 JSON 且 exists=true
        const ct = response.headers.get('Content-Type') || '';
        if (ct.includes('application/json')) {
            const data = await response.json();
            if (data.exists) {
                ElMessage.info(`用户 ${data.user.username} 已存在，无需重复爬取`);
                await new Promise(r => setTimeout(r, 1000));
                // 直接选中已有 seed
                selectSeed({ id: data.user.id, username: data.user.username });
                loading.value = false;
                return;
            }
        }

        if (!response.ok) {
            throw new Error('请求失败 ' + response.status);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        // 流式读取
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (let line of chunk.split('\n')) {
                if (!line.trim()) continue;
                if (line.startsWith('ERROR:')) {
                    const errObj = JSON.parse(line.slice(6));
                    logs.value.push(`❌ 爬虫中断：${errObj.message}`);
                    ElMessage.error(errObj.message);
                    await reader.cancel();
                    loading.value = false;
                    return;
                }
                logs.value.push(line);
            }
        }

        // 完成
        logs.value.push('✅ 爬取完成');
        loading.value = false;

        // 清空搜索输入，刷新 seed 列表
        seedSearch.value = '';
        await searchSeeds(seedSearch.value);

        // **关键：用传入的 user_id 去匹配**
        const crawledSeed = seed_list.value.find(s => s.id === user_id);
        if (crawledSeed) {
            selectSeed(crawledSeed);
        } else {
            // 万一没取到，也可以提示或 fallback
            console.warn('未在列表中找到新爬取的 seed', user_id);
        }

    } catch (err: any) {
        console.error(err);
        logs.value.push('❌ 爬取出错：' + err.message);
        loading.value = false;
        await searchSeeds(seedSearch.value);
    }
}

async function fetchUserInfo(uid) {
    // 模拟请求
    const response = await axios.get(`/crawling/search/${uid}`, {timeout: 10000})
    userInfo.value = response.data
}

function loadConfig() {
    const configStr = localStorage.getItem('crawl-config');
    if (configStr) {
        config.value = JSON.parse(configStr);
    }
    // 无论本地是否有存储，都将 end_date 更新为今天
    config.value.end_date = getTodayDate();
}

// 引用日志容器
const logContainer = ref<HTMLElement | null>(null)

// 自动滚动到底部
const scrollToBottom = () => {
    nextTick(() => {
        if (logContainer.value) {
            logContainer.value.scrollTop = logContainer.value.scrollHeight
        }
    })
}

// 新增：点击后要展示的侧边栏控制
const showSidebar = ref(false)
const activeNode = ref<any>(null)

watch(showSidebar, (visible) => {
    if (!visible) {
        // 抽屉关闭后，如果还是在 home 视图，重新启动自动滚动
        if (view.value === 'home') {
            startAutoScroll()
        }
    }
})

function handleNodeClickSync(params: any) {
    if (params.dataType === 'node') {
        handleNodeClickAsync(params);
    }
}

async function handleNodeClickAsync(params: any) {
    activeNode.value = params.data
    showSidebar.value = true

    try {
        const res = await axios.get(`/crawling/search/${params.data.id}`, { timeout: 10000 })
        activateUserInfo.value = res.data
        userInfoExists.value = true
    } catch (err: any) {
        if (err.response && err.response.status === 404) {
            userInfoExists.value = false
        } else {
            ElMessage.error('获取用户信息失败')
            showSidebar.value = false
        }
    }
}

async function copyUserName(username: string) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            // 主流现代浏览器、HTTPS 环境下
            await navigator.clipboard.writeText(username)
        } else {
            // 兼容老浏览器/非安全上下文的回退方案
            const textarea = document.createElement('textarea')
            textarea.value = username
            // 把它放到屏幕外
            textarea.style.position = 'fixed'
            textarea.style.top = '-9999px'
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
        }

        ElMessage.success('UID 已复制，可以去“新增种子账号”粘贴使用')
    } catch (err) {
        console.error('复制失败：', err)
        ElMessage.error('复制失败，请手动复制')
    }

    await nextTick()
    createSeed()
}

onMounted(() => {
    nextTick(() => {
        loadConfig()
        searchSeeds()
        window.addEventListener('resize', onResize)
    })
})

onBeforeUnmount(() => {
    if (relationChart.value) relationChart.value!.off('click', handleNodeClickSync)
    
    window.removeEventListener('resize', onResize)
})
const filteredThreatUsers = computed(() => (threatUserList?.value || []).filter(u => u.threat_index > 0))

function exportThreatUsers() {
    const data = filteredThreatUsers.value
    if (!data || data.length === 0) {
        ElMessage.warning('当前没有风险用户（threat_index > 0）可导出。')
        return
    }

    // 保留全部字段（如需只导出部分字段，在这里做 map）
    const json = JSON.stringify(data, null, 2)

    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-') // 形如 2025-09-06T05-30-00
    const filename = `threat-users-${timestamp}.json`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    ElMessage.success(`已导出 ${data.length} 条风险用户，文件名：${filename}`)
}
</script>

<style lang="scss" scoped>
$c-bg: #f4f6f8;
$c-sidebar: #fff;
$c-primary: #409eff;
$c-text: #303133;
$c-muted: #909399;

.interaction-viewer {
    background: $c-sidebar;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-radius: 8px;
    box-sizing: border-box;

    .interaction-viewer-header {
        display: flex;
        align-items: center;
        font-size: 1.2rem;
        margin-bottom: 8px;
        margin-top: 0;
        color: $c-text;
        border-left: 4px solid $c-primary;
        padding-left: 8px;
    }
}

.pagination-wrap {
    display: flex;
    margin: 20px;
    .el-pagination {
        margin-left: auto;
    }
}

.crawler-dashboard {
    display: flex;
    flex: 1;
    width: 100%;
    background: $c-bg;
    overflow-x: hidden;

    .sidebar {
        width: 280px;
        background: $c-sidebar;
        border-right: 1px solid #ebeef5;
        display: flex;
        flex-direction: column;
        padding: 20px;

        .sidebar-header {
            margin-bottom: 16px;
            width: 100%;

            button {
                width: 100%;
            }
        }
        .sidebar-search {
            margin-bottom: 16px;
        }
        .seed-list {
            margin-top: 0;
            padding-left: 0;
            flex: 1;
            overflow-y: auto;

            li {
                padding: 8px;
                border-radius: 4px;
                transition: all 0.3s;
                cursor: pointer;
                list-style-type: none;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                &.active { background: rgba($c-primary, 0.1); color: $c-primary; }
                &:hover { background: rgba($c-primary, 0.05); }

                &.disabled { 
                    cursor: not-allowed;
                }
            }
        }
        .sidebar-footer {
            padding: 8px 0;
            margin-bottom: 8px;
            text-align: center;
            background: rgba(255, 64, 64, 0.1);
            color: #ff4040;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;

            &:hover {
                background: rgba(64, 158, 255, 0.2);
            }
        }
    }

    .main {
        flex: 1;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;

        .progress-log {
            display: flex;
            width: 100%;
            flex-direction: column;
            background: $c-sidebar;
            padding: 16px;
            border-radius: 8px;
            max-height: calc(100vh - 216.8px);
            h4 { margin: 0 0 8px; color: $c-text; }
            ul {
                padding: 0;
                margin: 0;
                flex: 1;
                overflow-y: auto;
            }
            li { 
                list-style-type: none;
                font-size: 14px; 
                color: $c-muted; 
                line-height: 1.6; 
            }
            .section-title {
                display: flex;
                align-items: center;
                font-size: 1.2rem;
                margin-bottom: 16px;
                margin-top: 0;
                color: $c-text;
                border-left: 4px solid $c-primary;
                padding-left: 8px;
            }
        }

        .config-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 16px;
            background: $c-sidebar;
            padding: 16px;
            border-radius: 8px;
            box-sizing: border-box;
            // overflow-y: auto;
            overflow-x: hidden;

            .user-info-preview {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
                gap: 3px;
                width: 100%;
                padding: 4px;

                .user-info-preview-card {
                    padding: 12px;
                    background: #fff;
                    border-radius: 5px;
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;

                    .header-row {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;

                        .username {
                            font-weight: 600;
                            font-size: 14px;
                            color: #1a1a1a;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        }

                        .status {
                            font-size: 12px;
                            padding: 2px 6px;
                            border-radius: 3px;
                            &.exists {
                                background: #f0f9eb;
                                color: #67c23a;
                            }
                            &.missing {
                                background: #f4f4f5;
                                color: #909399;
                            }
                        }
                    }

                    .profile-link {
                        font-size: 12px;
                        color: #409eff;
                        text-decoration: none;
                        &:hover {
                            text-decoration: underline;
                        }
                    }

                    .description {
                        font-size: 12px;
                        color: #666;
                        line-height: 1.4;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }

                    .followers_count {
                        font-size: 11px;
                        color: #999;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        &::before {
                            content: "❤️";
                            font-size: 10px;
                        }
                    }

                    .action-row {
                        display: flex;
                        justify-content: flex-end;
                        margin-top: 8px;
                        gap: 8px;
                    }

                    &:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
                    }
                }

                /* 提升交互体验 */
                .user-info-preview-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
                }
            }


            .config-form {
                display: flex;
                flex-direction: row;
                gap: 12px;
                width: 100%;

                margin-bottom: 12px;
            }

            .section-title {
                width: 100%;
                font-size: 1.2rem;
                margin-bottom: 16px;
                margin-top: 0;
                color: $c-text;
                border-left: 4px solid $c-primary;
                padding-left: 8px;
            }

            .uid-input { width: 280px; }

            .el-button {
                margin-left: 0;
            }
        }

        .result-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            gap: 12px;
            overflow-y: auto;            /* 开启纵向滚动 */

            // scroll-snap-type: y proximity;  /* y 方向、临近吸附 */
            // scroll-behavior: smooth;        /* 可选：平滑滚动，看起来更友好 */

            .user-info.advanced,
            .relation-chart,
            .blog-viewer {
                scroll-snap-align: start;
            }

            .user-info.advanced {
                background: $c-sidebar;
                padding: 24px;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.05);
                box-sizing: border-box;

                .section-title {
                    display: flex;
                    align-items: center;  /* 整行内容竖直居中 */
                    font-size: 1.2rem;
                    line-height: 1.2rem;   /* 保证行高与字体大小一致 */
                    margin-bottom: 16px;
                    height: 24px;
                    margin-top: 0;
                    color: $c-text;
                    border-left: 4px solid $c-primary;
                    padding-left: 8px;

                    /* 让 el-icon 内部也做 flex，确保 svg 与文字同基线 */
                    .el-icon {
                        display: flex;
                        align-items: center;
                        margin-left: 8px;   /* 图标与文字之间留点空隙 */
                    }
                }

                .user-card {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;

                    .profile-header {
                        display: flex;
                        align-items: center;
                        gap: 16px;

                        .user-avatar {
                            border: 2px solid $c-primary;
                        }
                        .user-basic {
                            .nickname {
                                font-size: 1.4rem;
                                font-weight: bold;
                                color: $c-text;
                            }
                            .id {
                                font-size: 0.9rem;
                                color: $c-muted;
                            }
                        }
                    }

                    .profile-details {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 12px;
                        .description-item {
                            grid-column: span 3;
                        }

                        .detail-item {
                            background: #f9fafb;
                            padding: 12px;
                            border-radius: 4px;
                            transition: transform 0.2s ease;
    
                            // 防止网格项宽度塌陷
                            min-width: 0;

                            .label {
                                font-size: 0.85rem;
                                color: $c-muted;
                                margin-bottom: 4px;
                                white-space: nowrap;
                            }
                            .value {
                                font-size: 1rem;
                                color: $c-text;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                position: relative;
                                padding-right: 20px; // 为tooltip留出空间

                                // 自定义tooltip
                                &::after {
                                    content: attr(title);
                                    position: absolute;
                                    bottom: 100%;
                                    left: 0;
                                    background: rgba(0, 0, 0, 0.8);
                                    color: white;
                                    padding: 4px 8px;
                                    border-radius: 4px;
                                    white-space: nowrap;
                                    opacity: 0;
                                    transition: opacity 0.2s ease;
                                    pointer-events: none;
                                    font-size: 0.9rem;
                                    min-width: max-content;
                                    max-width: 300px;
                                    word-break: break-all;
                                    display: none;
                                }

                                // 鼠标悬停时显示tooltip
                                &:hover::after {
                                    display: block;
                                    opacity: 1;
                                }
                            }
                        }
                    }

                    .profile-stats {
                        display: flex;
                        gap: 24px;
                        justify-content: flex-start;
                        margin-left: auto;

                        .stat-item {
                            text-align: center;

                            .stat-value {
                                font-size: 1.4rem;
                                font-weight: bold;
                                color: $c-primary;

                                &.large-number {
                                    color: #f56c6c;
                                }
                            }
                            .stat-label {
                                font-size: 0.85rem;
                                color: $c-muted;
                            }
                        }
                    }
                }
            }

            .relation-chart {
                background: $c-sidebar;
                height: calc(100vh - 60px);
                padding: 16px;
                border-radius: 8px;
                box-sizing: border-box;

                .chart-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;

                    .section-title {
                        display: flex;
                        align-items: center;  /* 整行内容竖直居中 */
                        font-size: 1.2rem;
                        line-height: 1.2rem;   /* 保证行高与字体大小一致 */
                        margin-bottom: 0;
                        margin-top: 0;
                        color: $c-text;
                        border-left: 4px solid $c-primary;
                        padding-left: 8px;

                        /* 让 el-icon 内部也做 flex，确保 svg 与文字同基线 */
                        .el-icon {
                            display: flex;
                            align-items: center;
                            margin-left: 8px;   /* 图标与文字之间留点空隙 */

                            &:hover {
                                cursor: pointer;
                                color: $c-primary;
                                background: rgba($c-primary, 0.1);
                            }
                        }
                    }


                    .refresh-btn {
                        color: $c-primary;
                        &:hover {
                            background: rgba($c-primary, 0.1);
                        }
                    }

                    .last-refresh {
                        margin-left: auto;
                        font-size: 0.875rem;
                        color: #909399;
                        height: 24px;
                        display: flex;
                        flex-direction: row;
                        align-items: end;
                        margin-right: 6px;
                    }
                }

                #relationChart {
                    width: 100%;
                    height: calc(100vh - 140px); // 留出标题空间
                }
            }

            .blog-viewer {
                background: $c-sidebar;
                flex: 1;
                display: flex;
                flex-direction: column;
                padding: 16px;
                border-radius: 8px;
                box-sizing: border-box;

                .chart-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;

                    .section-title {
                        display: flex;
                        align-items: center;  /* 整行内容竖直居中 */
                        font-size: 1.2rem;
                        line-height: 1.2rem;   /* 保证行高与字体大小一致 */
                        margin-bottom: 0;
                        margin-top: 0;
                        color: $c-text;
                        border-left: 4px solid $c-primary;
                        padding-left: 8px;

                        .subtitle {
                            font-size: 0.875rem;
                            color: #909399;
                            margin-left: 6px;
                        }
                    }

                    .refresh-btn {
                        color: $c-primary;
                        &:hover {
                            background: rgba($c-primary, 0.1);
                        }
                    }

                    .last-refresh {
                        margin-left: auto;
                        font-size: 0.875rem;
                        color: #909399;
                        height: 32px;
                        display: flex;
                        flex-direction: row;
                        align-items: end;
                        margin-right: 6px;
                    }
                }
            }
        }
    }
}

.dialog-footer {
    display: flex;
    flex-direction: row;
    gap: 20px;

    .el-button {
        width: 80px;
    }
}

.node-sidebar {
    .el-drawer__body {
        .user-info-card {
            background: #fff;
            height: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;

            .header {
                display: flex;
                align-items: center;
                .el-avatar, .el-icon {
                    font-size: 32px;
                    margin-right: 12px;
                    color: #409EFF;
                }
                .basic {
                    h3 {
                        margin: 0;
                        font-size: 20px;
                        color: #2c3e50;
                    }
                    .uid {
                        font-size: 12px;
                        color: #999;
                    }
                }
            }

            .stats {
                display: flex;
                justify-content: space-between;
                margin: 16px 0;
                .stat {
                    text-align: center;
                    .value {
                        font-size: 18px;
                        font-weight: bold;
                        color: #333;
                        &.highlight { color: #E67E22; }
                    }
                    .label {
                        font-size: 12px;
                        color: #666;
                    }
                }
            }

            .details {
                flex: 1;
                .detail-item {
                    margin-bottom: 8px;
                    font-size: 14px;
                    color: #444;
                    &.full { white-space: pre-wrap; }
                }

                .actions {
                    margin-top: 16px;
                    text-align: center;
                    el-button {
                        width: 100%;
                    }
                }
            }
        }
    }

    .user-info-card.missing {
        padding: 24px;
        text-align: center;
        color: #555;

        .header {
            display: flex;
            align-items: center;
            justify-content: center;
            .el-icon {
                font-size: 28px;
                color: #E74C3C;
                margin-right: 8px;
            }
            h3 {
                margin: 0;
                font-size: 18px;
            }
        }
        p {
            margin: 16px 0;
            color: #888;
        }
        .el-button {
            margin-top: 12px;
        }
    }
}

.no-results,
.no-search {
    padding: 16px;
    text-align: center;
    color: #888;
    font-size: 14px;
}

.home-leaderboard {
    padding: 16px;
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;

    .title-row {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 10px;
        gap: 16px;

        .title {
            font-size: 48px;
            color: #f56c6c;
            text-align: center;
            margin-bottom: 24px;
        }
    }

    .leaderboard-container {
        flex: 1;
        position: relative;
        box-sizing: border-box;

        overflow-y: auto;
        scrollbar-width: none;
    }

    .scroll-content {
        display: flex;
        flex-direction: column;
    }

    /* 单行卡片 */
    .user-card {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background: #fff5f5;
        border-left: 4px solid #f56c6c;
        margin-bottom: 4px;
        border-radius: 4px;
        height: 40px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        gap: 12px;

        &--safe {
            background: #f5f7fa;
            border-color: #c0c4cc;
        }

        .username {
            cursor: pointer;
        }
    }

    .rank {
        width: 40px;
        text-align: center;
        font-weight: bold;
        color: inherit;
    }
    .info .username {
        font-weight: 600;
    }
    .meta {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 6px;
        .threat { color: #f56c6c; }
    }
    .meta--safe {
        color: #67c23a;
        margin-left: auto;
    }

    /* 无缝滚动动画 */
    @keyframes scrollLoop {
        0%   { transform: translateY(0); }
        100% { transform: translateY(-50%); } /* 上移一半高度（即一份列表高度） */
    }
}
</style>