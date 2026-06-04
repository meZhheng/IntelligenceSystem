<template>
  <div class="navbar">
    <div class="header-title disable-select" v-if="store.state.sidebarOpen">智能检测系统</div>
    <div class="container">
      <!-- <div class="expand" @click="toggleSidebar">
        <Fold style="width: 22px; height: 22px;" v-if="store.state.sidebarOpen" />
        <Expand style="width: 22px; height: 22px;" v-if="!store.state.sidebarOpen" />
      </div> -->
      <el-menu
        :default-active="activeIndex"
        class="el-menu disable-select"
        mode="horizontal"
        :router="true"
        :ellipsis="false"
      >
        <el-sub-menu index="3">
          <template #title>智能分析模型</template>
          <el-menu-item index="/application/analysis/10">用户情感识别</el-menu-item>
          <el-menu-item index="/application/analysis/12">用户立场检测</el-menu-item>
          <el-menu-item index="/application/analysis/11">风险内容检测</el-menu-item>
          <el-menu-item index="/application/analysis/13">异常账号发现</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/study">教学管理</el-menu-item>
        <el-menu-item index="/datasets">数据管理</el-menu-item>
        <el-sub-menu index="4">
          <template #title>微信公众号检测</template>
          <el-menu-item index="/wechatPA/proofread">文本校对</el-menu-item>
          <el-menu-item index="/wechatPA/history">历史追溯</el-menu-item>
          <el-menu-item index="/wechatPA/autoDetect">自动检测列表</el-menu-item>
          <el-menu-item index="/wechatPA/wordDict">词库管理</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="5">
          <template #title>种子账号挖掘</template>
          <el-menu-item index="/operation/seedbase">种子账号库</el-menu-item>
          <el-menu-item index="/operation/report">违规账号清理汇总</el-menu-item>
        </el-sub-menu>
        <!-- <el-menu-item index="/test_model">模型性能测试</el-menu-item> -->
        <el-menu-item index="/large_screen" @click="goLargeScreen">
          数据可视化平台
        </el-menu-item>
        <div class="nav-system-box">
          <el-sub-menu index="system-status">
            <template #title>系统状态</template>
            <el-menu-item index="/tasks">后台任务监控</el-menu-item>
            <el-menu-item v-if="isAdmin" index="/admin/scheduler/jobs">调度器状态</el-menu-item>
          </el-sub-menu>
        </div>
        <!-- 外部链接：使用 el-tooltip 提示 + 可键盘触发 -->
        <div class="nav-external-box">
          <el-tooltip content="打开文本标注工具（跳转外部链接）" placement="bottom">
            <div
              class="nav-external"
              role="button"
              tabindex="0"
              @click="openAnno"
              @keydown.enter.prevent="openAnno"
              @keydown.space.prevent="openAnno"
              aria-label="打开文本标注工具（跳转外部链接）"
            >
              文本标注工具
              <span class="external-icon" aria-hidden="true">
                <!-- 简单外部链接 SVG -->
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"></path>
                  <path d="M5 5h6v2H7v10h10v-4h2v6H5z"></path>
                </svg>
              </span>
            </div>
          </el-tooltip>
          <!-- <el-tooltip content="系统接口文档（跳转外部链接）" placement="bottom">
            <div
              class="nav-external"
              role="button"
              tabindex="0"
              @click="openApidocs"
              @keydown.enter.prevent="openApidocs"
              @keydown.space.prevent="openApidocs"
              aria-label="系统接口文档（跳转外部链接）"
            >
              系统接口文档
              <span class="external-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"></path>
                  <path d="M5 5h6v2H7v10h10v-4h2v6H5z"></path>
                </svg>
              </span>
            </div>
          </el-tooltip> -->
        </div>
        <div v-if="!store.state.is_authenticated" class="user-state-box">
          <el-menu-item index="/register" >注册</el-menu-item>
          <el-menu-item index="/login">登录</el-menu-item>
        </div>
        <div v-else class="user-state-box user-islogin">
          <div class="user-state-nav">
            <img src="@/assets/icons/user.svg" alt="icon" style="width: 40px; height: 40px;" />
            <span>{{ store.state.user_name }}</span>
          </div>
          <div class="dropdown">
            <div class="profile">
              <div class="profile-header">
                <div class="profile-avatar">
                  <el-icon><Avatar /></el-icon>
                  <span>账号</span>
                  <el-icon><ArrowRight /></el-icon>
                </div>
                <div class="logout" @click="handleLogout">退出登录</div>
              </div>
              <div class="profile-detail">
                <div class="avatar">
                  <img src="@/assets/icons/user.svg" alt="icon" style="width: 40px; height: 40px;" />
                </div>
                <div class="user-name-id">
                    <div class="username-top-bar">
                      <span>{{ store.state.user_name }}</span>
                      <div class="auth-type">
                        <div
                          class="type"
                          :style="{
                            color: roleInfo.color,
                            backgroundColor: roleInfo.bgColor
                          }"
                        >
                          {{ roleInfo.label }}
                        </div>
                      </div>
                    </div>
                    <div class="user-id">
                      <span>账号 ID：</span>
                      <span>{{ store.state.user_id }}</span>
                    </div>
                </div>
              </div>
            </div>
            <div class="auth">
              <div class="auth-header">
                <el-icon><InfoFilled /></el-icon>
                <span>限额</span>
              </div>
              <!-- 新增：上传容量限额显示 -->
              <div class="quota-section">
                <QuotaCardNumber
                  title="数据存储容量"
                  :quota-data="datasetQuota"
                  :loading="loading.dataset"
                  :error="error.dataset"
                />
                <QuotaCard
                  title="模型存储容量"
                  :quota-data="checkpointQuota"
                  :loading="loading.checkpoint"
                  :error="error.checkpoint"
                />
              </div>
            </div>
            <div class="alert">
              <div class="alert-header">
                <el-icon><BellFilled /></el-icon>
                <span>警告</span>
              </div>

              <div class="alert-body">
                <el-card class="alert-card">
                  <div class="alert-content">
                    <template v-if="threatLoading">
                      <el-skeleton :rows="1" animated style="width: 160px" />
                    </template>
                    <template v-else-if="threatError">
                      <div class="error">{{ threatError }}</div>
                    </template>
                    <template v-else>
                      <div class="count">
                        <span class="alert-title">发现威胁账号：</span> 
                        {{ threatCount }}
                      </div>
                      <div class="timestamp">
                        统计时间：
                        {{ new Date(threatUpdatedAt).toLocaleString('zh-CN', { hour12: false }) }}
                      </div>
                    </template>
                  </div>
                </el-card>
              </div>
            </div>
            <!-- 模板：放到 dropdown 内 -->
            <div v-if="isAdmin" class="invite-section">
              <div class="invite-header">
                <div class="invite-header-title">
                  <el-icon><Share /></el-icon>
                  <span style="font-weight:600;">管理员邀请码</span>
                </div>
                <div>
                  <el-button size="small" type="text" @click="refreshInvite" :loading="inviteLoading">刷新</el-button>
                </div>
              </div>
              <div class="invite-body">
                <el-card class="invite-card">
                  <template v-if="inviteLoading">
                    <el-skeleton :rows="1" animated />
                  </template>

                  <template v-else-if="inviteError">
                    <div class="error" style="color:#f56c6c;">{{ inviteError }}</div>
                  </template>

                  <template v-else>
                    <div class="code-row" >
                      <div class="invite-code-box" >
                        <span style="font-size:14px;">{{ inviteCode || '--' }}</span>
                      </div>
                      <el-button size="small" @click="copyCode" :disabled="!inviteCode">
                        <el-icon><CopyDocument /></el-icon>
                      </el-button>
                    </div>
                    <div class="meta">
                      <div class="expire-label">有效期至：{{ expiresAtDisplay }}</div>
                      <div 
                        v-if="remainingDisplay" 
                        :class="{
                          'remaining': true,
                          'low': remainingSec < 150,
                          'normal': remainingSec > 450,
                          'high': remainingSec >= 150 && remainingSec <= 450
                        }"
                      >剩余：{{ remainingDisplay }}
                      </div>
                      <div v-else class="remaining low">已过期</div>
                    </div>
                  </template>
                </el-card>
              </div>
            </div>
          </div>
        </div>
      </el-menu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
// import { Fold, Expand } from '@element-plus/icons-vue'
import { useStore } from '@/store'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from '@/api/axios'
import QuotaCard from './QuotaCard.vue'
import QuotaCardNumber from './QuotaCardNumber.vue'
// components registration for `<script setup>`
// const components = { Fold, Expand }

// reactive state
const activeIndex = ref('/')
const store = useStore()
const router = useRouter()
const route = useRoute()

const goLargeScreen = () => {
  router.push({
    path: '/large_screen',
    query: { redirect: route.fullPath }
  })
}

const roleMap = {
  shutup: {
    label: '黑名单',
    color: '#ffffff',
    bgColor: '#e3e3e3',
  },
  student: {
    label: '学员',
    color: '#ffffff',
    bgColor: '#455d7a',
  },
  mentor: {
    label: '导师',
    color: '#ffffff',
    bgColor: '#233142',
  },
  administrator: {
    label: '管理员',
    color: '#ffffff',
    bgColor: '#f95959',
  },
  // 新增：超级管理员
  superadministrator: {
    label: '超级管理员',
    color: '#ffffff',
    bgColor: '#6B21A8', // 深紫，突出且与其他配色对比明显
  },
} as const

// computed equivalent of options API roleInfo
const roleInfo = computed(() => {
  const key = store.state.user_perms as keyof typeof roleMap
  return roleMap[key] ?? {
    label: store.state.user_perms,
    color: '#2b84dc',
    bgColor: '#badcff58',
  }
})

const isAdmin = computed(() => store.state.user_perms === 'administrator' || store.state.user_perms === 'superadministrator')
const inviteCode = ref<string>('')
const expiresAt = ref<number | null>(null) // ms since epoch
const inviteLoading = ref(false)
const inviteError = ref<string>('')
const remainingSec = ref<number>(0)
let timer: number | null = null

// --- 解析后端返回，支持两种常见格式：{code, expires_at} 或 {code, ttl_seconds} ---
function applyInvitePayload(payload: any) {
  if (!payload) return
  if (payload.code) inviteCode.value = payload.code
  if (payload.expires_at) {
    // 兼容 ISO 字符串或时间戳
    const t = Date.parse(payload.expires_at)
    if (!isNaN(t)) expiresAt.value = t
  } else if (typeof payload.ttl_seconds === 'number') {
    expiresAt.value = Date.now() + payload.ttl_seconds * 1000
  } else if (payload.ttl_ms) {
    expiresAt.value = Date.now() + payload.ttl_ms
  }

  startTimer()
}

async function fetchInvite(force = false) {
  inviteLoading.value = true
  inviteError.value = ''
  try {
    // 这里把 force 放在 body 中发送，后端可按需读取；也可以改为 params: { force: 1 }
    const res = await axios.post(
      '/auth/inviteCode',
      { force: force ? 1 : 0 },
      { withCredentials: true }
    )

    // axios 成功响应，数据通常在 res.data
    applyInvitePayload(res.data)
  } catch (err: unknown) {
    // 更友好的错误处理，兼容 axios 的 error 结构
    const e: any = err
    const serverMsg =
      e?.response?.data?.message ||
      e?.response?.data ||
      e?.message ||
      (e?.response ? `状态 ${e.response.status}` : '获取邀请码失败')

    inviteError.value = serverMsg
    inviteCode.value = ''
    expiresAt.value = null
    clearTimer()
  } finally {
    inviteLoading.value = false
  }
}

async function refreshInvite() {
  // 调用相同 endpoint 带 force 参数，或你也可以使用 POST 到 /api/invite-code/refresh
  await fetchInvite(true)
}

async function copyCode() {
  if (!inviteCode.value) {
    ElMessage.warning('无可复制的邀请码')
    return
  }
  try {
    await navigator.clipboard.writeText(inviteCode.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    // 兼容旧浏览器，fallback
    const ta = document.createElement('textarea')
    ta.value = inviteCode.value
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      ElMessage.success('已复制到剪贴板（兼容模式）')
    } catch {
      ElMessage.error('复制失败，请手动复制')
    } finally {
      document.body.removeChild(ta)
    }
  }
}

function startTimer() {
  clearTimer()
  updateRemaining()
  timer = window.setInterval(updateRemaining, 1000)
}

function updateRemaining() {
  if (!expiresAt.value) {
    remainingSec.value = 0
    return
  }
  const sec = Math.max(0, Math.floor((expiresAt.value - Date.now()) / 1000))
  remainingSec.value = sec
  if (sec <= 0) {
    // 到期后停止计时并清空 code（可选）
    clearTimer()
    // 自动尝试刷新一次（可选）
    // fetchInvite(true)
  }
}

function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const expiresAtDisplay = computed(() => {
  if (!expiresAt.value) return '--'
  try {
    return new Date(expiresAt.value).toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return '--'
  }
})

const remainingDisplay = computed(() => {
  const s = remainingSec.value
  if (!s) return ''
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m > 0) return `${m}分${sec}秒`
  return `${sec}秒`
})

onMounted(() => {
  if (isAdmin.value) fetchInvite()
})

onUnmounted(() => {
  clearTimer()
})

// 限额数据
// 状态
const datasetQuota = ref<QuotaData | null>(null)
const checkpointQuota = ref<QuotaData | null>(null)
const loading = ref({ dataset: true, checkpoint: true })
const error = ref({ dataset: '', checkpoint: '' })

const threatLoading = ref(true)
const threatError = ref('')
const threatCount = ref(0)
const threatUpdatedAt = ref('')

interface QuotaData {
  used_bytes: number
  limit_bytes: number | null
  updated_at: string
}

async function fetchQuota(
  url: string
): Promise<QuotaData> {
  const resp = await axios.get(url)
  return resp.data
}

async function loadQuotas() {
  // 数据集
  loading.value.dataset = true
  error.value.dataset = ''
  try {
    datasetQuota.value = await fetchQuota('/user/quota/dataset')
  } catch (e: any) {
    error.value.dataset = '获取失败'
    console.error('dataset quota error', e)
  } finally {
    loading.value.dataset = false
  }

  // checkpoint
  loading.value.checkpoint = true
  error.value.checkpoint = ''
  try {
    checkpointQuota.value = await fetchQuota('/user/quota/checkpoint')
  } catch (e: any) {
    error.value.checkpoint = '获取失败'
    console.error('checkpoint quota error', e)
  } finally {
    loading.value.checkpoint = false
  }
}

async function fetchThreatAccountCount() {
  threatLoading.value = true
  threatError.value = ''
  try {
    const resp = await axios.get('/user/alert/threat-accounts')
    threatCount.value = resp.data.threat_account_count
    threatUpdatedAt.value = resp.data.updated_at
  } catch (e) {
    console.error('加载威胁账号数量失败:', e)
    threatError.value = '加载失败，请稍后重试'
  } finally {
    threatLoading.value = false
  }
}

onMounted(() => {
  loadQuotas()
  fetchThreatAccountCount()
})
// methods
// function toggleSidebar() {
//   store.toggleSidebar()
// }

function handleLogout() {
  store.logoutAction()
  ElMessage.success('退出成功')
  setTimeout(() => {
    location.reload()
  }, 500)
}

function encrypt(text: string) {
  const base64 = btoa(unescape(encodeURIComponent(text)));
  return encodeURIComponent(base64);
}

function openAnno() {
  const token = window.localStorage.getItem('user-token');
  if (!token || token === null) {
    ElMessage.error('请先登录')
    return
  }
  const userPayload = String(store.state.user_name ?? '')
  const encrypted = encrypt(userPayload)
  const annoBase = import.meta.env.VITE_ANNO_URL
  if (!annoBase) {
    ElMessage.warning('未配置外部标注工具地址')
    return
  }
  const url = `${annoBase.replace(/\/$/, '')}/zh/auth?user=${encrypted}`
  window.open(url, '_blank')
}

</script>

<style scoped lang="scss">
.auth {
  display: flex;
  flex-direction: column;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;

  .auth-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    color: #727273;
    font-weight: bold;
    gap: 8px;
  }
  .quota-section {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
}
.alert {
  display: flex;
  flex-direction: column;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;

  .alert-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    color: #727273;
    font-weight: bold;
    gap: 8px;
  }

  .alert-body {
    .alert-card {
      background-color: #fff0f0;
      margin-top: 8px;

      .alert-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .alert-content {
        font-size: 13px;

        .count {
          font-size: 18px;
          font-weight: bold;
          color: #f56c6c;
        }

        .timestamp {
          font-size: 12px;
          color: #999;
          margin-top: 4px;
        }

        .error {
          color: #f56c6c;
        }
      }
    }
  }
}

.profile-detail {
  display: flex;
  flex-direction: row;
  gap: 15px;
}

.user-name-id {
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .username-top-bar {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    .auth-type {
      display: flex;
      align-items: center;

      .auth-type-item {
        margin-right: 4px;
      }
      .type {
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
      }
    }
  }
}

.user-name-id > .user-id {
  color: rgb(100, 100, 100);
}

.profile-avatar {
  color: #727273;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.profile-avatar > span {
  font-weight: bold;
}

.user-state-nav {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.profile {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
}

.profile .logout {
  border: #727273 solid 1px;
  color: #727273;
  font-weight: bold;
  padding: 2px 10px;
  cursor: pointer;
}

.profile-header .logout:hover, .profile-avatar:hover {
  color: var(--el-menu-hover-text-color)
}

.profile-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.el-menu--horizontal {
  width: 100%;
}

.user-state-box {
  display: flex;
  flex-direction: row;
  height: 100%;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

.user-state-box > * {
  height: 100%;
}

.user-state-nav > span {
  display:inline-block;
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  font-weight: 400;
  color-scheme: light dark;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  font-size: var(--el-menu-item-font-size);
  line-height: var(--el-menu-item-height);
  max-width: 108px;
  min-width: 60px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-islogin {
  position: relative; /* 便于绝对定位下拉列表 */
  transition: background-color 0.3s ease;
}

.user-islogin:hover {
  outline: none;
}

/* 下拉列表默认隐藏 */
.user-islogin .dropdown {
  display: none;
  position: absolute;
  top: calc(100% + 1px);
  right: 0;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: auto;
  min-width: 280px;
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out, max-height 0.8s ease-out;
  z-index: 100;
  max-height: 0;
  pointer-events: none; /* 初始时禁止鼠标交互 */
  padding: 10px 20px;
  font-size: 14px;
  scrollbar-width: thin;
}

/* 当鼠标悬停在父容器上时显示下拉列表 */
.user-islogin:hover .dropdown {
  display: block;
  opacity: 1;
  transform: translateY(0);
  min-height: 500px;
  max-height: 960px;
  pointer-events: auto; /* 激活后允许鼠标交互 */
}

.navbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  box-sizing: border-box;
}

.expand {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 20px;
}
.expand:hover {
  color: #409eff;
  cursor: pointer;
}

.container {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  z-index: 1000;
  height: 60px;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.header-title {
  min-width: 240px;
  background-color: #303133;
  color: #fff;
  font-size: 20px;
  text-align: center;
  height: 60px;
  line-height: 60px;
  font-weight: bold;
  box-sizing: border-box;
}

.nav-system-box {
  display: flex;
  flex-direction: row;
  margin-left: auto;
}

.nav-external-box {
  display: flex;
  flex-direction: row;
}

.nav-external {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 16px;
  margin-left: 8px;            /* 与左侧菜单项保持间距 */
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  line-height: 1;
  transition: background-color .18s, color .18s, transform .06s;
  color: inherit;             /* 继承 el-menu 的文字色 */
  /* 让显示更轻盈：使用半透明边框来区分（在深色/浅色主题都不突兀） */
  border: 1px solid rgba(0,0,0,0);
  
  .external-icon {
    display: inline-flex;
    margin-left: 8px;
    opacity: 0.85;
    transform: translateY(-1px);
  }

  &:hover {
    background-color: rgba(0,0,0,0.04);   /* 轻微 hover 背景 */
    transform: translateY(-1px);
  }

  /* focus 可见性，便于键盘导航 */
  &:focus {
    outline: 2px solid rgba(24, 144, 255, 0.18);
    box-shadow: 0 0 0 3px rgba(24,144,255,0.06);
  }
}

/* 在紧靠其他菜单时，外部链接看起来更“按钮化”可以增加辨识度 */
.nav-external:first-of-type {
  margin-left: 12px;
}

.invite-section {
  display: flex;
  flex-direction: column;
  .invite-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    color: #727273;
    font-weight: bold;
    gap: 8px;

    .invite-header-title {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }
  }
  .invite-body {
    .invite-card {
      margin-top: 8px;

      .code-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        background: linear-gradient(135deg, #f8fafc 0%, #f0f5ff 100%);
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        transition: all 0.3s ease;
        gap: 4px;
        
        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .invite-code-box {
          padding: 4px 6px;
          display: inline-flex;
          align-items: center;
          background: white;
          border-radius: 1px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 1px;
          color: #1e40af;
          text-shadow: 0 1px 2px rgba(30, 64, 175, 0.1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          justify-content: center;
          
          span {
            display: block;
            word-break: keep-all;
          }
        }
        
        .el-button {
          padding: 8px;
          background: transparent;
          border: none;
          color: #4f46e5;
          border-radius: 8px;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          
          &:hover {
            background: rgba(79, 70, 229, 0.08);
            color: #4338ca;
            transform: translateY(-1px);
          }
          
          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }

      .meta {
        margin-top: 12px;
        font-size: 12px;
        color: #64748b;
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        
        .expire-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #94a3b8;
        }
        
        .remaining {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          
          &.low {
            color: #ef4444;
          }
          
          &.normal {
            color: #10b981;
          }
          
          &.high {
            color: #f59e0b;
          }
        }
      }
    }
  }
}
</style>