<template>
<div class="page-container">
    <el-card class="header-card">
        <div class="header-left">
            <h2>专项治理 —— 违规账号清理汇总</h2>
        </div>
        <div class="header-right">
            <el-radio-group v-model="rangeKey" @change="applyRange">
                <el-radio-button :label="'1m'">近1个月</el-radio-button>
                <el-radio-button :label="'3m'">近3个月</el-radio-button>
                <el-radio-button :label="'6m'">近6个月</el-radio-button>
                <el-radio-button :label="'1y'">近1年</el-radio-button>
                <el-radio-button :label="'all'">全部</el-radio-button>
            </el-radio-group>

            <!-- 导入按钮 + 导入数量徽章 -->
            <div class="button-panel">
                <el-badge :value="importedCount" class="import-badge" v-if="importedCount > 0">
                    <el-button 
                        type="primary" 
                        size="small"
                        style="height: 32px;"
                        @click="handleImportAccount"
                    >
                        导入违规账号
                    </el-button>
                </el-badge>
                <el-button 
                    v-else
                    type="primary" 
                    size="small"
                    style="height: 32px;"
                    @click="handleImportAccount"
                >
                    导入违规账号
                </el-button>

                <!-- 隐藏的文件输入框 -->
                <input 
                    type="file" 
                    ref="fileInput" 
                    style="display: none;"
                    @change="handleFileSelect"
                    accept=".csv,.xlsx,.xls"
                >
            </div>
        </div>
    </el-card>

    <div class="main-row">
        <!-- 左：汇总报告 -->
        <div class="col col-left">
            <el-card class="report-card">
                <h3>清理汇总报告</h3>
                <el-divider></el-divider>
                <div class="report-item">
                    <div class="label">时间范围：</div>
                    <div class="value">{{ rangeLabel }}</div>
                </div>

                <div class="report-item">
                    <div class="label">发现违规账号数量：</div>
                    <div class="value">{{ totalFound }} 个</div>
                </div>

                <div class="report-item">
                    <div class="label">被封禁违规账号数量：</div>
                    <div class="value">{{ bannedCount }} 个</div>
                </div>

                <div class="report-item">
                    <div class="label">暂未封禁违规账号数量：</div>
                    <div class="value">{{ fixedUnbanned }} 个</div>
                </div>

                <el-button type="primary" @click="copyReport">下载保存报告</el-button>
                <el-button type="success" @click="reset">重置筛选</el-button>
            </el-card>
        </div>

        <!-- 中：待巡查账号列表（基于导入） -->
        <div class="col col-center">
            <el-card class="inspect-card">
                <div class="inspect-header">
                    <h3>待巡查账号列表</h3>
                    <div class="inspect-stats">
                        <span>总数：<strong>{{ toInspectTotal }}</strong></span>
                        <span>已封禁：<strong>{{ toInspectBanned }}</strong></span>
                        <span>未封禁：<strong>{{ toInspectUnbanned }}</strong></span>
                    </div>
                </div>

                <el-divider></el-divider>

                <div class="inspect-controls">
                    <el-input v-model="searchQuery" placeholder="按昵称或ID搜索" clearable size="small" style="width: 220px;" />
                    <el-radio-group v-model="inspectFilter" size="small" class="inspect-filter">
                        <el-radio-button :label="'all'">全部</el-radio-button>
                        <el-radio-button :label="'banned'">已封禁</el-radio-button>
                        <el-radio-button :label="'unbanned'">未封禁</el-radio-button>
                    </el-radio-group>
                    <el-button type="success" size="small" @click="markAllInspected" :disabled="toInspectFiltered.length === 0">全部标记为已检查</el-button>
                    <el-progress v-if="isChecking" :percentage="checkProgress" :text-inside="false" status="active" stroke-width="8" style="width: 300px"></el-progress>
                </div>

                <el-table
                    :data="toInspectFiltered"
                    style="width: 100%;"
                    size="small"
                    :empty-text="'暂无待巡查账号'"
                >
                    <el-table-column prop="username" label="昵称 / ID" min-width="100">
                        <template #default="{ row }">
                            <div class="row-username">
                                <strong>{{ row.username }}</strong>
                                <div class="muted">ID: {{ row.id }}</div>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column prop="followers" label="粉丝" width="80"></el-table-column>

                    <el-table-column label="状态" width="120">
                        <template #default="{ row }">
                            <el-tag v-if="row.banned_at" size="small" type="danger">已封禁</el-tag>
                            <el-tag v-else size="small">未封禁</el-tag>
                        </template>
                    </el-table-column>

                    <el-table-column prop="banned_at" label="封禁时间" min-width="150">
                        <template #default="{ row }">
                            <div>{{ formatDate(row.banned_at) }}</div>
                        </template>
                    </el-table-column>

                    <el-table-column label="操作" width="220">
                        <template #default="{ row }">
                            <el-button type="primary" plain size="small" @click="openAccountDetail(row)">查看详情</el-button>
                            <el-button type="danger" plain size="small" @click="markInspected(row)">标记为已检查</el-button>
                        </template>
                    </el-table-column>
                </el-table>

                <div class="inspect-empty" v-if="toInspectFiltered.length === 0">
                    <el-empty description="当前没有匹配的待巡查账号"></el-empty>
                </div>
            </el-card>
        </div>

        <!-- 右：已封禁账号列表（原有） -->
        <div class="col col-right">
            <el-card class="report-container">
                <h3>被封禁账号列表</h3>
                <el-collapse v-model="opened" accordion>
                    <el-collapse-item
                        v-for="acc in filteredAccounts"
                        :key="acc.id"
                        :name="String(acc.id)"
                    >
                    <template #title>
                        <div class="acc-title">
                        <div class="left">
                            <strong>{{ acc.username }}</strong>
                            <span class="muted">ID: {{ acc.id }}</span>
                            <!-- <el-tag size="small">{{ acc.location || '未知' }}</el-tag>
                            <el-tag size="small" type="danger">威胁指数: {{ acc.threat_index }}</el-tag> -->
                            <!-- <div>粉丝: {{ acc.followers }}</div>
                            <div>微博数: {{ acc.posts.length }}</div> -->
                            <div class="muted">封禁时间：{{ formatDate(acc.banned_at) }}</div>
                        </div>
                        </div>
                    </template>

                    <div class="acc-body">
                        <div class="acc-info">
                            <span class="label">封禁理由：</span>
                            <p class="desc">{{ acc.description || '无个人简介' }}</p>
                        </div>
                        <el-divider></el-divider>
                        <h4>发表的博文</h4>
                        <el-timeline>
                        <el-timeline-item
                            v-for="post in acc.posts"
                            :key="post.id"
                            :timestamp="post.publish_time"
                        >
                            <div class="post-content">
                            <div class="post-text">{{ post.content }}</div>
                            <div class="post-meta muted">来源：{{ post.publish_tool }} · 地点：{{ post.publish_place }}</div>
                            </div>
                        </el-timeline-item>
                        </el-timeline>
                    </div>
                    </el-collapse-item>
                </el-collapse>

                <div v-if="filteredAccounts.length === 0" class="empty-state">
                    <el-empty description="当前时间段内无被封禁账号"></el-empty>
                </div>
            </el-card>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { accountsData } from './accountsData';
import { ElMessage } from 'element-plus';

// 创建文件输入框的引用
const fileInput = ref<HTMLInputElement | null>(null);

// 处理导入按钮点击
const handleImportAccount = () => {
    // 触发隐藏的文件输入框
    fileInput.value?.click();
};

// 处理文件选择（此处仅触发选择并模拟导入样例数据）
const handleFileSelect = (event: Event & { target: HTMLInputElement }) => {
    const file = event.target.files?.[0];
    if (file) {
    console.log('已选择文件:', file.name);
    // 模拟解析并导入账号 - 这里用示例数据填充 toInspectAccounts
    simulateImportSampleAccounts();
    }
    // 重置输入值，允许重复选择相同文件
    if (event.target) event.target.value = '';
};

const REF_DATE = new Date() // 使用当前时间作为参考日期

interface Post {
    id: string
    article_url?: string
    content: string
    publish_time?: string
    publish_tool?: string
    publish_place?: string
}

interface Account {
    id: number | string
    username: string
    description?: string
    followers?: number
    following?: number
    gender?: string
    location?: string
    threat_index?: number
    weibo_num?: number
    last_crawled?: string
    last_crawled_wblogs?: string
    banned_at?: string | null // ISO date or null
    posts: Post[]
}

// 原有 accounts（已封禁的展示来源）
// 示例：为了演示，填入一些已封禁与未封禁账号（你可用真实后端数据替换）
const accounts = ref<Account[]>(accountsData);

// 待巡查账号（来源：用户导入的批量账号）
// 带有 inspected 标记（是否已检查）
type ToInspectAccount = Account & { inspected?: boolean }

const toInspectAccounts = ref<ToInspectAccount[]>([]) 

const importedCount = computed(() => toInspectAccounts.value.length)

// 控件状态
const rangeKey = ref<'1m' | '3m' | '6m' | '1y' | 'all'>('3m')
const opened = ref<string[]>([])
const inspectFilter = ref<'all' | 'banned' | 'unbanned'>('all')
const searchQuery = ref('')

function monthsAgo(date: Date, m: number) {
    const d = new Date(date.getTime())
    d.setMonth(d.getMonth() - m)
    return d
}

const rangeLabel = computed(() => {
    switch (rangeKey.value) {
        case '1m':
            return '近 1 个月'
        case '3m':
            return '近 3 个月'
        case '6m':
            return '近 6 个月'
        case '1y':
            return '近 1 年'
        default:
            return '全部'
    }
})

function applyRange() {
    // 触发计算属性刷新（如果有异步请求可放这里）
}

// 过滤并只展示在范围内被封禁的账号（原有右侧逻辑）
const filteredAccounts = computed(() => {
    let start: Date | null = null
    if (rangeKey.value === 'all') {
        start = null
    } else if (rangeKey.value === '1m') {
        start = monthsAgo(REF_DATE, 1)
    } else if (rangeKey.value === '3m') {
        start = monthsAgo(REF_DATE, 3)
    } else if (rangeKey.value === '6m') {
        start = monthsAgo(REF_DATE, 6)
    } else if (rangeKey.value === '1y') {
        start = monthsAgo(REF_DATE, 12)
    }

    return accounts.value.filter((a) => {
        if (!a.banned_at) return false
        const b = new Date(a.banned_at)
        if (!start) return b <= REF_DATE
        return b >= start && b <= REF_DATE
    })
})

const bannedCount = computed(() => filteredAccounts.value.length)

// 题目要求：未封禁数量固定为 2（保留原逻辑）
const fixedUnbanned = 2
const totalFound = computed(() => bannedCount.value + fixedUnbanned)

function formatDate(d: string | null | undefined) {
    if (!d) return '未封禁'
    const dt = new Date(d)
    return dt.toLocaleString()
}

function copyReport() {
    const report = {
        '时间范围': rangeLabel.value,
        '参考日期': REF_DATE.toISOString(),
        '总发现账号数': totalFound.value,
        '已封禁数量': bannedCount.value,
        '未封禁(固定)': fixedUnbanned,
        '范围内账号': filteredAccounts.value.map((a) => ({
            id: a.id,
            昵称: a.username,
            封禁时间: a.banned_at,
        })),
        '导入待巡查账号数': importedCount.value
    }

    try {
        const content = JSON.stringify(report, null, 2)
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
        const datePart = REF_DATE.toISOString().slice(0, 10)
        const filename = `cleanup-report-${datePart}.json`

        // IE / Edge (legacy) 支持
        // @ts-ignore
        if (window.navigator && (window.navigator as any).msSaveOrOpenBlob) {
            // @ts-ignore
            (window.navigator as any).msSaveOrOpenBlob(blob, filename)
        } else {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            setTimeout(() => {
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            }, 100)
        }

        // @ts-ignore
        window.$message?.success('报告已生成并开始下载')
    } catch (e) {
        // @ts-ignore
        window.$message?.error('生成报告失败，请手动复制')
        console.error(e)
    }
}

function reset() {
    rangeKey.value = '3m'
}

// ---------- 待巡查相关操作 ----------
const toInspectTotal = computed(() => toInspectAccounts.value.length)
const toInspectBanned = computed(() => toInspectAccounts.value.filter(a => !!a.banned_at).length)
const toInspectUnbanned = computed(() => toInspectAccounts.value.filter(a => !a.banned_at).length)

const toInspectFiltered = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return toInspectAccounts.value.filter(a => {
        if (inspectFilter.value === 'banned' && !a.banned_at) return false
        if (inspectFilter.value === 'unbanned' && a.banned_at) return false
        if (!q) return true
        return String(a.username).toLowerCase().includes(q) || String(a.id).includes(q)
    })
})

function markInspected(row: ToInspectAccount) {
    // 将该条标记为已检查（此处示例选择从数组中移除）
    const idx = toInspectAccounts.value.findIndex(r => r.id === row.id)
    if (idx >= 0) {
        toInspectAccounts.value.splice(idx, 1)
        // @ts-ignore
        window.$message?.success(`账号 ${row.username} 已标记为已检查并从待巡查中移除`)
    }
}

function markAllInspected() {
    const n = toInspectFiltered.value.length
    if (n === 0) {
        // @ts-ignore
        window.$message?.warning('当前没有可标记的账号')
        return
    }
    // 简单行为：移除所有匹配项
    const ids = new Set(toInspectFiltered.value.map(i => i.id))
    toInspectAccounts.value = toInspectAccounts.value.filter(i => !ids.has(i.id))
    // @ts-ignore
    window.$message?.success(`已将 ${n} 条账号标记为已检查`)
}

// 打开详情（当前示例仅展开右侧已有的被封禁列表中相应账号，如没有则提示）
function openAccountDetail(row: ToInspectAccount) {
    // 如果该账号在右侧已封禁数据中，展开对应面板
    const idx = filteredAccounts.value.findIndex(a => a.id === row.id)
    if (idx >= 0) {
        opened.value = [String(filteredAccounts.value[idx].id)]
    } else {
        // @ts-ignore
        ElMessage?.info('该账号暂未在已封禁列表中，或详情不可用')
    }
}
// 新增：用于模拟巡查的状态与进度
const isChecking = ref(false)
const checkProgress = ref(0) // 0 - 100
const checkingCount = ref(0) // 当前要检测的账号数（仅用于显示）

/** 简单的延时函数 */
function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

// 模拟导入样例数据（触发后填充 toInspectAccounts）
async function simulateImportSampleAccounts() {
  // 若已有导入，先追加（示例行为）
  const sample: ToInspectAccount[] = [
    {
        id: 'imp-201',
        username: '疑似谣言1',
        description: '疑似发布谣言内容',
        followers: 230,
        location: '重庆',
        threat_index: 7,
        banned_at: null,
        posts: [{ id: 'sp1', content: '导入示例帖子1', publish_time: '2025-08-01', publish_tool: 'Web', publish_place: '重庆' }]
    },
    {
        id: 'imp-202',
        username: '已封账号X',
        description: '大量转发不实信息',
        followers: 560,
        location: '浙江',
        threat_index: 8,
        banned_at: null, // 10 天前
        posts: [{ id: 'sp2', content: '导入示例帖子2', publish_time: '2025-08-28', publish_tool: 'Mobile', publish_place: '浙江' }]
    },
    {
        id: 'imp-203',
        username: '自动化测试账号',
        description: '疑似机器人行为',
        followers: 12,
        location: '未知',
        threat_index: 4,
        banned_at: null,
        posts: []
    },
    {
        id: 'imp-204',
        username: '可能违规Y',
        description: '涉及敏感话题',
        followers: 980,
        location: '湖南',
        threat_index: 9,
        banned_at: null,
        posts: [{ id: 'sp3', content: '导入示例帖子3', publish_time: '2025-07-30', publish_tool: 'Web', publish_place: '湖南' }]
    }
  ]

  // append（避免重复 id）
  const existingIds = new Set(toInspectAccounts.value.map(a => a.id))
  const newItems: ToInspectAccount[] = []
  for (const s of sample) {
    if (!existingIds.has(s.id)) {
      // 增加一个临时字段 checkedChecking 用于 UI（可选）
      newItems.push({ ...s, inspected: false })
    }
  }
  if (newItems.length === 0) {
    // @ts-ignore
    ElMessage?.info('没有新的账号需要导入')
    return
  }

  // 将新项追加到待巡查数组（初始状态：尚未检测）
  toInspectAccounts.value.push(...newItems)

  // 开始模拟巡查动画
  isChecking.value = true
  checkProgress.value = 0
  checkingCount.value = newItems.length

  // 对每条新导入账号逐个“检测”
  for (let i = 0; i < newItems.length; i++) {
    const current = newItems[i]

    // 模拟网络/检测延迟：0.6s ~ 1.4s 随机
    const wait = 600 + Math.floor(Math.random() * 800)
    // 为了更平滑的视觉效果，内部做几个小步进
    const steps = 6
    const stepDelay = Math.max(50, Math.floor(wait / steps))
    for (let s = 0; s < steps; s++) {
      // 逐步提升进度（当前处理到 (i + s/steps) / total）
      const part = ((i + s / steps) / newItems.length) * 100
      checkProgress.value = Math.min(100, Math.round(part))
      // 等待一个小步
      // eslint-disable-next-line no-await-in-loop
      await delay(stepDelay)
    }

    // 最终等待（保证每个 item 有一段完整等待）
    // eslint-disable-next-line no-await-in-loop
    await delay(120)

    // 随机判断该账号是否在检测时被发现已封禁（若本身已被封禁则保留）
    // let detectedBanned = false
    // if (!current.banned_at) {
    //   // 40% 的概率被判定为已封禁（仅模拟）
    //   if (Math.random() < 0.4) {
    //     detectedBanned = true
    //     // 模拟封禁时间：随机 1 - 30 天前
    //     const daysAgo = 1 + Math.floor(Math.random() * 30)
    //     current.banned_at = new Date(REF_DATE.getTime() - 1000 * 60 * 60 * 24 * daysAgo).toISOString()
    //   }
    // }

    // 将检测结果写回到 toInspectAccounts（保持引用一致）
    // const idx = toInspectAccounts.value.findIndex(a => a.id === current.id)
    // if (idx >= 0) {
    //   toInspectAccounts.value[idx] = { ...current, inspected: false }
    // }

    // 如果检测到已封禁，可选择把该账号同步到右侧已封禁列表（这里示例仅**同步追加**，不从待巡查里移除）
    // if (detectedBanned) {
    //   // 若右侧 accounts 中并不存在该 id，则追加
    //   const existsInRight = accounts.value.some(a => String(a.id) === String(current.id))
    //   if (!existsInRight) {
    //     accounts.value.push({
    //       ...current,
    //       // 确保 posts 不为 undefined
    //       posts: current.posts || []
    //     })
    //   }
    // }

    // 更新进度到 (i+1)/N * 100
    checkProgress.value = Math.min(100, Math.round(((i + 1) / newItems.length) * 100))
  }

  // 等待短暂时间表现检测完成动画
  await delay(300)
  isChecking.value = false
  checkingCount.value = 0
  checkProgress.value = 100

  // @ts-ignore
  ElMessage?.error(`导入 ${newItems.length} 条, 网络异常，同步封禁状态失败`)
}
</script>

<style lang="scss" scoped>
.page-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
    height: calc(100vh - 60px);

    .header-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 16px;

        .header-left h2 {
            margin: 0 0 4px 0;
        }
    }

    .muted {
        color: #888;
        font-size: 12px;
    }
}

/* 三栏布局 */
.main-row {
    display: grid;
    grid-template-columns: 300px 1fr 450px;
    gap: 16px;
    align-items: start;
    flex: 1;
    box-sizing: border-box;

    .col {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .col-left {
        .report-card { padding-bottom: 12px; }
    }

    .col-center {
        .inspect-card {
            min-height: 400px;
        }
    }

    .col-right {
        .report-container {
            height: calc(100vh - 230px);
            overflow-y: auto;
            display: flex;
            scrollbar-width: thin;
            flex-direction: column;
        }
    }

    .report-card {
        height: 100%;
        h3 { margin-top: 0 }
    }

    .report-item {
        display: grid;
        grid-template-columns: 160px 1fr;
        padding: 6px 0;
        .value { font-weight: 600 }
    }

    /* 待巡查卡片 */
    .inspect-card {
        height: 100%;
        h3 { margin: 0; display: inline-block; }
        .inspect-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            .inspect-stats { display: flex; gap: 12px; align-items: center; }
        }

        .inspect-controls {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 10px 0 14px 0;

            .inspect-filter { margin-left: 8px; }
        }

        .row-username { display: flex; flex-direction: column; gap: 2px; }
    }

    /* 右侧账号标题样式保留 */
    .acc-title {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        .left { 
            display: grid;
            grid-template-columns: 80px 90px 1fr; 
            gap: 8px; 
            align-items: center;
            justify-items: start;
        }
        .muted { color: #999 }
    }

    .post-content { padding: 6px 0 }

    .empty-state { padding: 20px }
}

/* header-right 导入按钮区域 */
.header-right {
    display: flex;
    flex-direction: row;
    width: 100%;
    align-items: center;
}
.button-panel {
    margin-left: 20px;
    height: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* 导入徽章微调 */
.import-badge {
    display: inline-flex;
    align-items: center;
}

/* 卡片 body 宽度适配 */
.el-card__body {
    width: 100%;
}

/* 表格行按钮间距 */
.el-table .el-button {
    margin-right: 6px;
}

/* 响应式：窄屏下三列变堆叠 */
@media (max-width: 1100px) {
    .main-row {
        grid-template-columns: 1fr;
    }
    .col-right { order: 3; }
    .col-center { order: 2; }
    .col-left { order: 1; }
}
</style>