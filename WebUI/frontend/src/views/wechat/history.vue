<template>
<div class="article-list-page">
    <!-- 侧边筛选栏 -->
    <aside class="filter-sidebar">
        <div class="filter-title">账号配置</div>
        <WechatAccountConfig 
            v-model:active-config="wechatAccountConfig"
            :affiliation-id="filters.affiliation"
        />
        <!-- 公众号 -->
        <div class="filter-title">筛选条件</div>
        <WechatAffiliationSelect
            v-model="filters.affiliation"
            :options="affiliations"
            :account-config="wechatAccountConfig"
            @change="fetchArticles(false)"
            @import="handleAffImport"
        />

        <div class="filter-date-range">
            <div class="date-pickers">
                <el-date-picker
                v-model="startDate"
                type="date"
                placeholder="开始日期"
                :disabled-date="disabledDate"
                format="YYYY-MM-DD"
                @change="onDateChange"
                clearable
                />
                <span class="date-sep">-</span>
                <el-date-picker
                v-model="endDate"
                type="date"
                placeholder="结束日期"
                :disabled-date="disabledDate"
                format="YYYY-MM-DD"
                @change="onDateChange"
                clearable
                />
            </div>
            <!-- 日期快捷与按年筛选 -->
            <div class="quick-range-outer">
            <!-- 第一行：快速范围（1 / 7 / 30 天）—— 占一行 -->
            <div class="quick-range-row">
                <button class="quick-btn" @click="setQuickRange('yesterday')">过去1天</button>
                <button class="quick-btn" @click="setQuickRange('7days')">过去7天</button>
                <button class="quick-btn" @click="setQuickRange('30days')">过去30天</button>

                <!-- 保持清除按钮在行尾 -->
                <button class="quick-clear" @click="clearDateRange">清除</button>
            </div>

            <!-- 第二块：按年度选择（可多选，带滚动与数量） -->
            <div class="year-select-block">
                <!-- 用 el-checkbox-group + el-checkbox 渲染年份列表 -->
                <el-checkbox-group v-model="selectedYearsLocal" @change="onYearsChange">
                <div class="year-list">
                    <label
                        v-for="item in yearsList"
                        :key="item.year"
                        class="year-item"
                    >
                        <el-checkbox :label="item.year">{{ item.year }}</el-checkbox>
                        <span class="year-count">（{{ item.count }}）</span>
                    </label>
                </div>
                </el-checkbox-group>
            </div>
            </div>
        </div>
        <!-- 错误等级 -->
        <el-select
            v-model="filters.selectedLevel"
            placeholder="错误等级"
            filterable
            multiple
            clearable
            collapse-tags
            @change="fetchArticles(false)"
        >
            <el-option
                v-for="item in errorOptions.levels"
                :key="item.value"
                :value="item.value"
                :label="item.label"
            />
        </el-select>

        <!-- 错误类型 -->
        <el-select
            v-model="filters.selectedCategory"
            placeholder="错误类型"
            filterable
            multiple
            clearable
            collapse-tags
            @change="fetchArticles(false)"
        >
            <el-option
                v-for="item in errorOptions.categories"
                :key="item.value"
                :value="item.value"
                :label="item.label"
            />
        </el-select>
    </aside>
    <!-- 主内容区 -->
    <section class="main-content">
        <!-- 顶部操作栏 -->
        <div class="toolbar">
            <el-input
                v-model="filters.keyword"
                placeholder="搜索标题或作者"
                clearable
                @clear="fetchArticles(false)"
                @keyup.enter.native="fetchArticles(false)"
                prefix-icon="Search"
            />
            <div class="batch-btns">
                <el-button class="batch-btn" type="primary" plain @click="openBatchDialog" :loading="loading">
                    <el-icon :size="18"><MagicStick /></el-icon><span>批量检测</span>
                </el-button>
                
                <el-button class="batch-btn" type="success" plain @click="openExportDialog">
                    <el-icon :size="18"><Download /></el-icon><span>批量导出报告</span>
                </el-button>
            </div>

            <el-button
                class="refresh-btn"
                @click="openRefreshDialog"
            >
                <el-icon :size="18">
                    <Refresh /> 
                </el-icon>
                <span>获取最新文章</span>
            </el-button>
            <WechatDetectDialog
                v-model="batchDialogVisible"
                :selected-ids="selectedArticles.map(r => r.article_id)"
                :total-filtered="meta.total_items"
                :filters="filters"
                @success="handleBatchSuccess"
            />
            <WechatExportDialog
                v-model="exportDialogVisible"
                :selected-ids="selectedArticles.map(r => r.article_id)"
                :total-filtered="meta.total_items"
                :filters="filters"
                @success="handleExportSuccess"
            />

            <!-- 弹窗组件 -->
            <WechatRefreshDialog
                v-model:visible="refreshDialogVisible"
                :affiliation-id="filters.affiliation"
                :affiliation-name="affiliationName"
                :account-config="wechatAccountConfig"
                :initial-start="refreshInitialStart"
                :initial-end="refreshInitialEnd"
                :loading="loading"
                @finished="handleRefreshFinished"
            />
        </div>
        <el-table
            ref="articleTable"
            :data="articles"
            class="article-table disable-select"
            stripe
            style="width: 100%"
            v-loading="tableLoading"
            @sort-change="onSortChange"
            @selection-change="handleSelectionChange"
            @row-click="handleRowClick"
        >
            <!-- 多选列：type="selection" 会自动在表头渲染全选框 -->
            <el-table-column
                type="selection"
                width="30"
            />
            <el-table-column
                prop="title"
                label="标题"
                min-width="300"
                show-overflow-tooltip
            />
            <el-table-column
                prop="author_name"
                label="作者"
                width="100"
                show-overflow-tooltip
            />
            <el-table-column
                prop="create_time"
                label="发表时间"
                width="180"
                sortable="custom"
                :formatter="fmtDate"
            />
            <el-table-column
                prop="affiliation"
                label="来源"
                width="120"
                show-overflow-tooltip
            />
            <!-- 操作列：合规检测 / 原文 -->
            <el-table-column
                label="操作"
                width="180"
                align="center"
                fixed="right"
            >
            <template #default="scope">
                <div class="operation-group">
                    <el-tooltip content="查看公众号文章合规检测结果，可重新检测" placement="top">
                        <el-button
                            class="operation-action detect-action"
                            link
                            size="small"
                            @click.stop="onDetect(scope.row)"
                        >
                            <el-icon><MagicStick /></el-icon>
                            <span>合规检测</span>
                        </el-button>
                    </el-tooltip>
                    <el-tooltip content="查看图文并茂的公众号原文" placement="top">
                        <el-button
                            class="operation-action original-action"
                            link
                            size="small"
                            @click.stop="onView(scope.row)"
                        >
                            <el-icon><Document /></el-icon>
                            <span>原文</span>
                        </el-button>
                    </el-tooltip>
                </div>
            </template>
            </el-table-column>
            <!-- 新增：检测结果列 -->
            <el-table-column
                label="校对结果"
                prop="mistake_num"
                sortable="custom"
                width="130"
                align="center"
            >
                <template #default="{ row }">
                    <!-- 未检测 -->
                    <el-tag
                        v-if="!row.is_detected"
                        type="info"
                        effect="plain"
                        size="small"
                        @click.stop="onDetect(row)"
                        :disable-transitions="true"
                    >未检测</el-tag>
                    <!-- 有错误 -->
                    <el-tag
                        v-else-if="row.result > 0"
                        type="danger"
                        effect="plain"
                        size="small"
                        @click.stop="onDetect(row)"
                        :disable-transitions="true"
                    >共 {{ row.result }} 个错误</el-tag>
                    <!-- 零错误 -->
                    <el-tag
                        v-else
                        type="success"
                        effect="plain"
                        size="small"
                        @click.stop="onDetect(row)"
                        :disable-transitions="true"
                    >没有错误</el-tag>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
            class="pagination"
            background
            layout="total, prev, pager, next, jumper, sizes"
            :total="meta.total_items"
            v-model:current-page="page"
            v-model:page-size="perPage"
            @current-change="fetchArticles(true)"
            @size-change="fetchArticles(false)"
        />
    </section>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount, computed } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '@/api/axios'
import WechatRefreshDialog from './WechatRefreshDialog.vue'
import WechatAffiliationSelect from './WechatAffiliationSelect.vue'
import WechatAccountConfig from './WechatAccountConfig.vue'
import WechatDetectDialog from './WechatDetectDialog.vue'
import WechatExportDialog from './WechatExportDialog.vue'

const wechatAccountConfig = ref({ token: '', fingerprint: '', cookie: '' })

const refreshDialogVisible = ref(false)
const refreshInitialStart = ref<Date | null>(null)
const refreshInitialEnd = ref<Date | null>(null)

const handleBatchSuccess = () => {
  // 检测完成后，刷新列表数据
  fetchArticles()
}

const openRefreshDialog = () => {
    const end = endOfDay(new Date())
    const start = startOfDay(new Date())
    start.setFullYear(start.getFullYear() - 1)

    refreshInitialStart.value = start
    refreshInitialEnd.value = end
    refreshDialogVisible.value = true
}

const handleRefreshFinished = ({ success }: { success: boolean }) => {
    if (success) {
        fetchArticles(true)
    }
}

interface Article {
    article_id: string
    title: string
    affiliation: string
    author_name: string
    create_time: string
    update_time: string
    is_deleted: boolean
    result: object
    is_detected: boolean
}

// 限制日期范围：2000-1-1 至今天
const disabledDate = (time: Date) => {
    const min = new Date('2018-12-30').getTime();
    const max = new Date().getTime();
    return time.getTime() < min || time.getTime() > max;
};

const articles = ref<Article[]>([])
const meta = ref({ total_items: 0 })
const page = ref(1)
const perPage = ref(50)

const filters = ref({
    keyword: '',
    affiliation: '',
    dateRange: [] as Array<Date | number>,
    sortBy: '',
    sortOrder: '' as 'asc' | 'desc' | '',
    selectedLevel: [],
    selectedCategory: []
})

const affiliationName = computed(() => {
    const affiliation = filters.value.affiliation
    return affiliation ? affiliations.value.find(item => item.value === affiliation)?.label : ''
})

interface YearCount {
    year: number;
    count: number;
}

const yearsList = ref<YearCount[]>([])
const selectedYearsLocal = ref<number[]>([])

const currentArticle = ref<Article | null>(null)
const loading = ref(false)

const selectedArticles = ref<any[]>([])


// 当 selection 变化时触发
const handleSelectionChange = (val: any[]) => {
    selectedArticles.value = val
}

const articleTable = ref<InstanceType<typeof import('element-plus')['ElTable']> | null>(null)
const tableLoading = ref(false)

const handleRowClick = row => {
    // 切换选中状态
    articleTable.value.toggleRowSelection(row)
}

let intervalId: ReturnType<typeof setInterval> | null = null;
// 监听 loading，一旦变成 true，就开启定时器；变为 false 时清除定时器
watch(loading, (newVal) => {
    if (newVal) {
        // loading = true 时，每隔 5 秒调用一次 fetchArticles
        intervalId = setInterval(() => {
            fetchArticles();
        }, 5000); // 5000 毫秒 = 5 秒，可根据实际需求调整

        // 如果一开始就想立即触发一次，也可以在这里先手动调用一次
        // fetchArticles();
    } else {
        // loading = false，则清除定时器
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
});

const batchDialogVisible = ref(false);
const exportDialogVisible = ref(false)

// 打开导出弹窗
const openExportDialog = () => {
    // 逻辑建议：如果没有选中文章，且当前筛选结果也为空，可以拦截一下
    if (selectedArticles.value.length === 0 && meta.value.total_items === 0) {
        return ElMessage.warning('当前没有可导出的文章')
    }
    exportDialogVisible.value = true
}

// 处理导出成功（如果有回调）
const handleExportSuccess = () => {
    exportDialogVisible.value = false
}

const openBatchDialog = () => {
    batchDialogVisible.value = true;
};

const errorOptions = ref({ levels: [], categories: []});
const affiliations = ref([]);

const fetchAvailableAffiliations = async () => {
    const savedUserAffiliation = localStorage.getItem('wechat-affiliation')

    // 如果本地有保存值，则作为 query 传给后端
    const response = await axios.get('/wechat/affiliation/list', {
        params: savedUserAffiliation
            ? { affiliation: savedUserAffiliation }
            : {}
    })

    affiliations.value = response.data || []

    // 优先级：本地保存值 > 当前筛选值 > 第一项
    if (affiliations.value.length > 0) {
        if (savedUserAffiliation) {
            filters.value.affiliation = savedUserAffiliation
        } else if (!filters.value.affiliation) {
            filters.value.affiliation = affiliations.value[0].value
        }

        fetchArticles()
    }
}

const setWechatAffiliation = (affiliationId: string) => {
    if (!affiliationId) return
    localStorage.setItem('wechat-affiliation', affiliationId)
}


const fetchErrorCategories = async () => { 
    const response = await axios.get('/wechat/error_category/list')
    errorOptions.value = response.data
}

// 组件卸载时也要确保清除定时器，避免内存泄漏
onBeforeUnmount(() => {
    if (intervalId !== null) {
        clearInterval(intervalId);
    }
});

function onView(row: Article) {
    openDetail(row)
}

// “检测”按钮点击
function onDetect(row: Article) {
    window.open(`/wechatPA/analysis/${row.article_id}`, '_blank')
}

function fmtDate(row: any, col: any, val: string) {
    const d = new Date(val)
    if (isNaN(d.getTime())) {
        return ''
    }
    const Y = d.getFullYear()
    // 月＋1 并补两位
    const M = String(d.getMonth() + 1).padStart(2, '0')
    const D = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${Y}年${M}月${D}日 ${h}:${m}`
}

const startDate = computed<Date | null>({
    get() {
        const dr = filters.value.dateRange
        if (!dr || dr.length === 0) return null
        // 如果第一个元素是数字（按年筛选），datepicker 显示为空
        if (typeof dr[0] === 'number') return null
        return (dr.length >= 1 && dr[0] instanceof Date) ? (dr[0] as Date) : null
    },
    set(val: Date | null) {
        // 当用户通过 datepicker 修改时，清除按年选择
        if (typeof filters.value.dateRange[0] === 'number') {
            selectedYearsLocal.value = []
            filters.value.dateRange = []
        }
        const end = (filters.value.dateRange && filters.value.dateRange.length >= 2 && filters.value.dateRange[1] instanceof Date)
            ? (filters.value.dateRange[1] as Date)
            : null
        if (!val && !end) {
            filters.value.dateRange = []
        } else if (val && end) {
            filters.value.dateRange = [val, end]
        } else if (val && !end) {
            filters.value.dateRange = [val]
        } else if (!val && end) {
            filters.value.dateRange = [end]
        }
    }
})

const endDate = computed<Date | null>({
    get() {
        const dr = filters.value.dateRange
        if (!dr || dr.length === 0) return null
        if (typeof dr[0] === 'number') return null
        return (dr.length >= 2 && dr[1] instanceof Date) ? (dr[1] as Date) : null
    },
    set(val: Date | null) {
        // 当用户通过 datepicker 修改时，清除按年选择
        if (typeof filters.value.dateRange[0] === 'number') {
            selectedYearsLocal.value = []
            filters.value.dateRange = []
        }
        const start = (filters.value.dateRange && filters.value.dateRange.length >= 1 && filters.value.dateRange[0] instanceof Date)
            ? (filters.value.dateRange[0] as Date)
            : null
        if (!start && !val) {
            filters.value.dateRange = []
        } else if (start && val) {
            filters.value.dateRange = [start, val]
        } else if (!start && val) {
            filters.value.dateRange = [val]
        } else if (start && !val) {
            filters.value.dateRange = [start]
        }
    }
})

// 当用户在任一 datepicker 改变时触发（会走到 fetchArticles）
function onDateChange() {
    const dr = filters.value.dateRange

    // 必须满足：
    // 1. 存在
    // 2. 长度为 2
    // 3. 两端都是 Date（而不是 number / year）
    if (
        Array.isArray(dr) &&
        dr.length === 2 &&
        dr[0] instanceof Date &&
        dr[1] instanceof Date
    ) {
        let [start, end] = dr

        // 规范化顺序：若 start > end，则交换
        if (start.getTime() > end.getTime()) {
            filters.value.dateRange = [end, start]
        }

        // 发起查询
        fetchArticles()
    } else {
        // 其他情况：
        // - 按年份筛选（number[]）
        // - 只选了一端日期
        // - 正在切换筛选模式
        // 都不在这里触发查询
    }
}

function onYearsChange(vals: number[]) {
    // 规范化并排序
    selectedYearsLocal.value = vals.slice().sort((a, b) => a - b)

    if (selectedYearsLocal.value.length === 0) {
        // 取消所有年份选择 -> 清空 dateRange
        filters.value.dateRange = []
        fetchArticles()
        return
    }

    // 关键改动：**不要合并成一个连续区间**（避免覆盖中间年份）
    // 直接把年份列表写回 filters.dateRange（保持字段名不变）
    filters.value.dateRange = selectedYearsLocal.value.slice()

    // 立即触发查询
    fetchArticles()
}

// 辅助：把 date 设置到当天开始/结束，保证后端接收时是含整天
function startOfDay(d: Date) {
    const t = new Date(d)
    t.setHours(0, 0, 0, 0)
    return t
}
function endOfDay(d: Date) {
    const t = new Date(d)
    t.setHours(23, 59, 59, 999)
    return t
}

function setQuickRange(name: string) {
    // 清除年份选择（避免冲突）
    selectedYearsLocal.value = []

    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    let start: Date
    let end: Date = todayEnd

    switch (name) {
        case 'yesterday': {
            const yesterday = new Date(today)
            yesterday.setDate(today.getDate() - 1)
            start = startOfDay(yesterday)
            end = endOfDay(yesterday)
            break
        }
        case '7days': {
            const d7 = new Date(today)
            d7.setDate(today.getDate() - 6) // 包含今天，共7天
            start = startOfDay(d7)
            break
        }
        case '30days': {
            const d30 = new Date(today)
            d30.setDate(today.getDate() - 29)
            start = startOfDay(d30)
            break
        }
        default:
            return
    }

    // 写入连续区间（Date 对象），保持原始行为
    filters.value.dateRange = [start, end]
    fetchArticles()
}

function clearDateRange() {
    filters.value.dateRange = []
    selectedYearsLocal.value = []
    fetchArticles()
}


async function loadContent() {
  const articleId = currentArticle.value.article_id
  const configStr = encodeURIComponent(JSON.stringify(wechatAccountConfig.value))

  window.open(
    `/wechatPA/history/${articleId}?config=${configStr}`,
    '_blank'
  )
}


async function handleAffImport(affiliation) {
    setWechatAffiliation(affiliation)

    nextTick(() => {
        fetchAvailableAffiliations()
    })
}

async function fetchArticles(keep_page = false) {
    tableLoading.value = true
    try {
        if (!keep_page) {
            page.value = 1
        }

        const params: any = {
            page: page.value, 
            per_page: perPage.value,
            keyword: filters.value.keyword,
        }

        // 优先判断是否为按年筛选（filters.dateRange 内元素为 number）
        if (filters.value.dateRange && filters.value.dateRange.length > 0 && typeof filters.value.dateRange[0] === 'number') {
            // 传递 years[] 参数给后端（例如 years[]=2023&years[]=2021）
            params['years[]'] = (filters.value.dateRange as number[]).slice()
        } else if (filters.value.dateRange && filters.value.dateRange.length === 2) {
            // 连续区间（Date 对象）
            params.start = (filters.value.dateRange[0] as Date).toISOString()
            params.end   = (filters.value.dateRange[1] as Date).toISOString()
        }

        if (filters.value.sortOrder) {
            params.sort_by    = filters.value.sortBy
            params.sort_order = filters.value.sortOrder
        }
        if (filters.value.selectedLevel.length > 0) {
            params.levels = filters.value.selectedLevel
        }
        if (filters.value.selectedCategory.length > 0) {
            params.categories = filters.value.selectedCategory
        }
        if (filters.value.affiliation) {
            params.affiliation = filters.value.affiliation
        }

        const resp = await axios.get('/wechat/articles', { params })
        articles.value = resp.data.items
        meta.value = resp.data._meta
        yearsList.value = resp.data.years || []

        setWechatAffiliation(params.affiliation)
    } catch (err) {
        ElMessage.error('加载失败：' + (err?.message || String(err)))
    }  finally {
        tableLoading.value = false
    }
}


function onSortChange({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) {
    // 如果 prop 是 result，就告诉后端按 mistake_num 排序
    filters.value.sortBy = prop
    filters.value.sortOrder =
        order === 'ascending'  ? 'asc' :
        order === 'descending' ? 'desc' :
        ''
    fetchArticles()
}

function openDetail(row: Article) {
    currentArticle.value = row
    loadContent()
}

onMounted(() => {
    nextTick(() => {
        fetchAvailableAffiliations()
        fetchErrorCategories()
    })
})
</script>

<style lang="scss" scoped>
.batch-actions {
    margin: 16px 0;
    text-align: right;
}

.batch-dialog {
    .el-dialog__header {
        font-size: 18px;
        border-bottom: 1px solid #eaeaea;
    }

    .el-radio-group {
        margin: 16px 0;
    }

    .date-picker-wrapper {
        margin-bottom: 16px;
    }

    .count-info {
        margin: 8px 0;
        font-size: 14px;
    }

    .progress-wrapper {
        margin: 12px 0;
    }

    .progress-text {
        text-align: center;
        margin-top: 4px;
        font-size: 13px;
    }

    .dialog-footer {
        text-align: right;
    }
}

.alert-info {
    margin-bottom: 10px;
}
/* 让 el-form 的每一行表单项更紧凑 */
.config-form .el-form-item {
  margin-bottom: 16px;
}

/* 调整 dialog-footer 内按钮的间距 */
.dialog-footer {
  text-align: right;
  padding: 10px 0;
}

.dialog-footer .el-button {
  margin-left: 8px;
}

.article-list-page {
    display: flex;
    width: 100%;
    height: 100%;
    background: #f5f7fa;
    gap: 16px;
    overflow-x: hidden;
}

.filter-sidebar {
    width: 260px;
    padding: 16px;
    background: #ffffff;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.filter-title {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 8px;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    .article-table {
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
    }

    /* 表头 */
    .article-table th {
        background-color: #fafafa;
        font-weight: 600;
    }

    /* hover 更明显 */
    .article-table .el-table__row:hover {
        background-color: #f5f9ff;
    }

    .toolbar {
        width: 100%;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #ffffff;
        border-radius: 8px;

        /* 搜索框占据主要空间 */
        .el-input {
            flex: 1;
        }

        /* 批量操作按钮组逻辑分块 */
        .batch-btns {
            margin-left: auto;
            display: flex;
            gap: 4px;
            margin-left: 8px;
            padding-right: 12px;
            border-right: 1px solid #ebeef5; /* 增加一个垂直分割线区分动作类型 */

            .batch-btn {
                span {
                    margin-left: 8px;
                }
            }
        }

        .refresh-btn {
            span {
                margin-left: 8px;
            }
        }
    }

    .pagination {
        margin-top: auto;
        text-align: right;
        display: flex;
        flex-direction: row;
        width: 100%;

        .el-pagination__sizes {
            margin-left: auto;
        }
    }
}

/* 保证 .el-select__tags 区域不换行 */
.el-select .el-select__tags {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
}

/* （可选）隐藏水平滚动条，保持美观 */
.el-select .el-select__tags::-webkit-scrollbar {
  height: 4px;
}
.el-select .el-select__tags::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.2);
  border-radius: 2px;
}
.operation-group {
    display: flex;
    flex-direction: row;
    gap: 4px;
    align-items: center;
    justify-content: center;
    padding-right: 8px;
}

.operation-action {
    padding: 4px 6px;
    border-radius: 6px;
    color: #606266;
    font-weight: 500;
    transition: background-color .18s ease, color .18s ease;

    .el-icon {
        margin-right: 2px;
        font-size: 14px;
    }

    &:hover {
        background-color: #ecf5ff;
        color: #409eff;
    }
}

.detect-action:hover {
    background-color: #fdf6ec;
    color: #e6a23c;
}

/* 日期范围区块 */
.filter-date-range {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
  box-shadow: 0 1px 0 rgba(0,0,0,0.1);
}

.filter-subtitle {
  font-size: 13px;
  color: #333;
  font-weight: 600;
  margin-bottom: 4px;
}

/* 两个日期选择器横向排列 */
.date-pickers {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-sep {
  color: #999;
  margin: 0;
}

/* 快捷 & 年份整体外层 */
.quick-range-outer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 第一行：快速范围 */
.quick-range-row {
  display: flex;
  gap: 2px;
  align-items: center;
}

/* 年份选择块 */
.year-select-block {
  background: #fff;
}

/* 年份可滚动列表：最大高度，超出出现滚动条 */
.year-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-height: 160px; /* 你可以调整这个值 */
  overflow-y: auto;
}

/* 单个年份条目 */
.year-item {
  display: flex;
  align-items: center;
  gap: 1px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
}

/* 数量展示 */
.year-count {
  color: #888;
  font-size: 12px;
}

/* 小样式：保持现有 quick-btn/quick-clear 风格 */
.quick-btn {
  border: 1px solid #e6eef9;
  background: #ffffff;
  color: #333;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
.quick-btn:hover {
  background: #f5faff;
  border-color: #cde1ff;
}
.quick-clear {
  margin-left: auto;
  background: #fff7f7;
  border: 1px solid #ffdede;
  color: #c33;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.refresh-btn {
    span {
        margin-left: 8px;
    }
}
</style>
  