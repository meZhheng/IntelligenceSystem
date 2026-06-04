<template>
<div class="wechat-aff-select">
    <el-select
        v-model="internalValue"
        filterable
        remote
        clearable
        :remote-method="onRemoteSearch"
        :loading="searching"
        placeholder="公众号"
        @popup-scroll="onScroll"
        @change="onChange"
    >
        <el-option
            v-for="opt in displayOptions"
            :key="opt.value"
            :value="opt.value"
            :label="opt.label"
        />
    </el-select>

    <!-- 搜索/新增结果弹窗 -->
    <el-dialog
        v-model="dialogVisible"
        title="选择并导入公众号"
        width="720px"
        :close-on-click-modal="false"
        :show-close="false"
        class="wechat-import-dialog"
    >
        <div v-loading="dialogLoading && dialogPage === 1" element-loading-text="正在抓取公众号数据...">
            
            <el-empty 
                v-if="dialogItems.length === 0 && !dialogLoading" 
                :image-size="120" 
                description="未检索到匹配的公众号"
            >
                <template #extra>
                    <p style="font-size: 13px; color: #909399;">可能该公众号不存在或请求被限制，请尝试更换关键词</p>
                </template>
            </el-empty>

            <div v-if="dialogLoading && dialogItems.length === 0" style="padding: 10px;">
                <el-skeleton :rows="3" animated v-for="i in 3" :key="i" style="margin-bottom: 20px;" />
            </div>

            <div
                v-else
                class="dialog-scroll-container"
                ref="dialogScrollEl"
                @scroll="onDialogScroll"
            >
                <div class="card-grid">
                    <div
                        v-for="item in dialogItems"
                        :key="item.fakeid"
                        class="account-card"
                        :class="{ 'is-active': selectedDialogFakeid === item.fakeid }"
                        @click="selectedDialogFakeid = item.fakeid"
                    >
                        <div class="select-badge" v-if="selectedDialogFakeid === item.fakeid">
                            <el-icon color="#fff"><Check /></el-icon>
                        </div>

                        <div class="card-content">
                            <div class="avatar-wrapper">
                                <el-avatar 
                                    :size="56" 
                                    :src="item.round_head_img || placeholderAvatar" 
                                    shape="square"
                                />
                                <div 
                                    v-if="item.verify_status > 0" 
                                    class="v-badge" 
                                    :style="{ backgroundColor: getVerifyInfo(item.verify_status).color }"
                                >
                                    V
                                </div>
                            </div>
                            <div class="account-info">
                                <div class="info-header">
                                    <span class="nickname">{{ item.nickname }}</span>
                                    <div class="tags">
                                        <el-tag 
                                            size="small" 
                                            effect="plain"
                                            :style="{ 
                                                color: getVerifyInfo(item.verify_status).color, 
                                                borderColor: getVerifyInfo(item.verify_status).color,
                                                backgroundColor: 'transparent'
                                            }"
                                        >
                                            <div style="display: flex; align-items: center; gap: 4px;">
                                                <el-icon v-if="getVerifyInfo(item.verify_status).icon" :size="20">
                                                    <component :is="getVerifyInfo(item.verify_status).icon" />
                                                </el-icon>
                                                {{ getVerifyInfo(item.verify_status).label }}
                                            </div>
                                        </el-tag>

                                        <el-tag size="small" type="info" effect="light">
                                            {{ serviceLabel(item.service_type) }}
                                        </el-tag>
                                    </div>
                                </div>
                                
                                <div class="alias">微信号: {{ item.alias || '未设置'}}</div>
                                <div class="signature" :title="item.signature">{{ item.signature || '该公众号暂无简介' }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="load-more-status">
                    <template v-if="dialogLoading && dialogPage > 1">
                        <el-icon class="is-loading"><Loading /></el-icon>
                        <span>正在加载更多...</span>
                    </template>
                    <template v-else-if="!dialogHasMore && dialogItems.length > 0">
                        <el-divider border-style="dashed">已显示全部结果</el-divider>
                    </template>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <span class="selected-tip" v-if="selectedDialogFakeid">
                    已选择: <strong>{{ dialogItems.find(i => i.fakeid === selectedDialogFakeid)?.nickname }}</strong>
                </span>
                <span v-else></span>
                <div>
                    <el-button @click="closeDialog" :disabled="dialogSaving">取 消</el-button>
                    <el-button
                        type="primary"
                        :loading="dialogSaving"
                        :disabled="!selectedDialogFakeid"
                        @click="confirmImport"
                    >
                        确认并导入
                    </el-button>
                </div>
            </div>
        </template>
    </el-dialog>
</div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, watch } from 'vue'
import axios from '@/api/axios'
import { ElMessage } from 'element-plus'

/**
 * Props:
 * - modelValue: 当前选中的 affiliation value（向父组件暴露 v-model）
 * - options: 初始选项数组 [{ value, label, ... }]
 */

 // 定义选项类型
interface OptionItem {
    value: string | number
    label: string
}

interface ConfigData {
    token: string
    fingerprint: string
    cookie: string
}

const props = withDefaults(defineProps<{
    modelValue?: string | number | null
    options?: OptionItem[]
    accountConfig?: ConfigData
}>(), {
    options: () => []
})

const emit = defineEmits(['update:modelValue', 'change', 'import'])


/* ---------------- v-model ---------------- */

const internalValue = ref(props.modelValue)
watch(() => props.modelValue, (newVal) => {
    internalValue.value = newVal;
});

watch(internalValue, v => emit('update:modelValue', v))

/* ---------------- search state ---------------- */

const searching = ref(false)
const searchText = ref('')
const page = ref(1)
const pageSize = 5
const hasMore = ref(true)

const searchOptions = ref<OptionItem[]>([])

const ADD_KEY = '__ADD__'

/* ---------------- display options ---------------- */

const displayOptions = computed(() => {
    // 基础列表：如果是搜索状态就用搜索结果，否则用初始列表
    let list = !searchText.value ? [...props.options] : [...searchOptions.value]

    // 如果没有搜索结果，且有搜索文字，显示“新增”项
    if (searchText.value && list.length === 0 && !searching.value) {
        return [{
            value: ADD_KEY,
            label: `新增公众号: "${searchText.value}"`,
        }]
    }

    return list
})

/* ---------------- remote search ---------------- */

let searchTimer: any = null

function onRemoteSearch(q: string) {
    searchText.value = q.trim()
    page.value = 1
    hasMore.value = true
    searchOptions.value = []

    if (searchTimer) clearTimeout(searchTimer)
    if (!q) return

    searchTimer = setTimeout(() => {
        fetchPage()
    }, 400)
}

async function fetchPage() {
    if (!hasMore.value) return
    searching.value = true
    try {
        // call backend with page info
        const resp = await axios.post('/wechat/search_affiliation', {
            q: searchText.value,
            page: page.value,
            pageSize
        })

        // expected resp.data.items = [{ fakeid, name, desc, avatar, source }], resp.data.total
        const items = resp.data?.items || []
        const total = resp.data?._meta.total_items || 0

        // remove any ADD_KEY placeholder before merging (防止重复)
        searchOptions.value = searchOptions.value.filter(o => o.value !== ADD_KEY)

        // append new items
        const mapped = items.map((it: any) => ({
            value: it.value, // 使用 fakeid 作为 value（若你后端返回不同，请调整）
            label: it.label
        }))
        searchOptions.value.push(...mapped)

        // paging logic
        if (searchOptions.value.length >= total) {
            hasMore.value = false
        } else {
            page.value += 1
        }

    } catch (e: any) {
        ElMessage.error(e?.response?.data?.message || e?.message || '搜索公众号失败')
        hasMore.value = false
    } finally {
        searching.value = false
    }
}

/* ---------------- dropdown scroll load more ---------------- */

function onScroll(e: Event) {
    const el = e.target as HTMLElement
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        fetchPage()
    }
}

/* ---------------- change ---------------- */
function onChange(val: any) {
    if (val === ADD_KEY) {
        // 1. 立即恢复为旧值，防止下次点击失效
        internalValue.value = props.modelValue || null
        // 2. 打开弹窗
        openImportDialog()
        return
    }
    
    // 关键：手动同步给父组件，确保 filters.affiliation 得到更新
    emit('update:modelValue', val)
    
    // 关键：在 nextTick 后触发 change，确保父组件 fetchArticles 时拿到的已经是新值
    nextTick(() => {
        emit('change', val)
    })
}

/* ========== 当用户在 select 里选择“新增”项时，打开弹窗并调用 crawl 接口 ========== */
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const dialogSaving = ref(false)
const dialogItems = ref<any[]>([])           // 存放 crawl 返回的 affiliations 列表
const selectedDialogFakeid = ref<string | null>(null)

const dialogPage = ref(1)
const dialogHasMore = ref(true)

const API_CRAWL = '/wechat/crawl_affiliation'
const API_IMPORT = '/wechat/import_affiliation'

/* 打开弹窗并加载第一页（使用当前 searchText 作为 query） */
async function openImportDialog() {
    dialogVisible.value = true
    dialogPage.value = 1
    dialogHasMore.value = true
    dialogItems.value = []
    selectedDialogFakeid.value = null
    await fetchDialogPage(1)
}

/* 抓取指定 page 的数据（由后端 crawl_affiliation 提供） */
async function fetchDialogPage(page: number) {
    // 如果没有更多数据或正在加载则直接返回
    if (!dialogHasMore.value && page !== 1) return
    if (dialogLoading.value) return

    // first page 使用 dialogLoading 的 spinner，后续页用 dialogLoading 也行（UI 会显示“正在加载更多...”）
    dialogLoading.value = true
    try {
        const payload: any = {
            query: searchText.value || '',
            page: page,
            token: props.accountConfig.token,
            fingerprint: props.accountConfig.fingerprint,
            cookie: props.accountConfig.cookie
        }
        // optional: 如果有 fakeid/token/fingerprint/cookie 的场景，可以在 payload 中传入（这里按需求传递）
        const resp = await axios.post(API_CRAWL, payload)
        const affiliations = resp.data?.affiliations || []
        const hasMoreResp = resp.data?.hasMore
        // append 去重（以 fakeid 作为唯一键）
        const existFakeids = new Set(dialogItems.value.map(i => i.fakeid))
        const newOnes = affiliations.filter((a: any) => !existFakeids.has(a.fakeid))
        dialogItems.value.push(...newOnes)

        dialogHasMore.value = !!hasMoreResp
        dialogPage.value = page + 1

        // 默认选中第一项（仅当之前没有选中）
        if (!selectedDialogFakeid.value && dialogItems.value.length) {
            selectedDialogFakeid.value = dialogItems.value[0].fakeid
        }
    } catch (e) {
        ElMessage.error(e?.response?.data?.message || e?.message || '抓取公众号失败')
        dialogHasMore.value = false
    } finally {
        dialogLoading.value = false
    }
}

/* 弹窗内滚动处理：滚动到底触发 fetchDialogPage(nextPage) */
function onDialogScroll(e: Event) {
    const el = e.target as HTMLElement
    // 距底 120px 触发加载更多
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
        if (dialogHasMore.value && !dialogLoading.value) {
            fetchDialogPage(dialogPage.value)
        }
    }
}

/* 确认导入：调用后端 import 接口 */
async function confirmImport() {
    if (!selectedDialogFakeid.value) {
        ElMessage.warning('请先选择一个公众号')
        return
    }
    dialogSaving.value = true
    try {
        // 根据选中的 fakeid 找到对应的完整项（后端需要 fakeid）
        const chosen = dialogItems.value.find(i => i.fakeid === selectedDialogFakeid.value)
        if (!chosen) throw new Error('选中项数据缺失')

        try {
            const resp = await axios.post(API_IMPORT, { fakeid: chosen.fakeid, nickname: chosen.nickname })
            const created = resp.data?.item

            if (!created) {
                ElMessage.error('公众号导入失败,请重试')
                return
            }

            // 1. 更新下拉列表
            searchOptions.value = [created, ...searchOptions.value.filter(o => o.value !== created.value)]
            
            // 2. 先通知父组件修改 v-model 的值
            emit('update:modelValue', created.value)
            internalValue.value = created.value // 保持内部同步

            // 3. 提示并关闭
            ElMessage.success('公众号导入成功')
            closeDialog()

            // 4. 最后触发父组件的 fetchArticles
            nextTick(() => {
                emit('import', created.value)
                emit('change', created.value)
            })

        } catch (e) {
            ElMessage.error(e?.response?.data?.message || e?.message || '导入失败')
        }

    } catch (e) {
        ElMessage.error(e?.response?.data?.message || e?.message || '导入失败')
    } finally {
        dialogSaving.value = false
    }
}

/* 关闭 dialog */
function closeDialog() {
    dialogVisible.value = false
    dialogItems.value = []
    selectedDialogFakeid.value = null
    dialogPage.value = 1
    dialogHasMore.value = true
    dialogLoading.value = false
    
    // 二次保险：如果发现值还是 ADD_KEY（理论上 onChange 已经处理了，这里做兜底）
    if (internalValue.value === ADD_KEY) {
        internalValue.value = props.modelValue || null
    }
}

// 认证状态配置表
const VERIFY_MAP = {
    0: { label: '未认证', color: '#909399', type: 'info', icon: '' },
    1: { label: '个人认证', color: '#faad14', type: 'warning', icon: 'CircleCheckFilled' }, // 黄V
    2: { label: '官方账号', color: '#2f54eb', type: 'primary', icon: 'CircleCheckFilled' }, // 蓝V
    3: { label: '新闻媒体', color: '#f5222d', type: 'danger', icon: 'CircleCheckFilled' },  // 红V
}

// 获取认证信息的辅助函数
const getVerifyInfo = (status: number | undefined) => {
    return VERIFY_MAP[status as keyof typeof VERIFY_MAP] || VERIFY_MAP[0]
}

function serviceLabel(type: number | undefined) {
    if (type === 0) return '公众号'
    if (type === 1) return '公众号'
    if (type === 2) return '服务号'
    return '未知'
}

/* 占位图 */
const placeholderAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTIiIGhlaWdodD0iNTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUyIiBoZWlnaHQ9IjUyIiBmaWxsPSIjZGRkZGRkIiByeD0iOCI+PC9yZWN0Pjwvc3ZnPg=='

</script>

<style scoped>
.wechat-aff-select {
    display: inline-block;
    min-width: 260px;
}

/* 容器滚动条美化 */
.dialog-scroll-container {
    max-height: 400px;
    overflow-y: auto;
    padding: 10px 14px 10px 2px;
}

.dialog-scroll-container::-webkit-scrollbar {
    width: 6px;
}
.dialog-scroll-container::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 10px;
}

/* 卡片布局 */
.card-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.account-card {
    position: relative;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    background: #fff;
}

.account-card:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

/* 选中状态样式 */
.account-card.is-active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    outline: 1px solid var(--el-color-primary);
}

.select-badge {
    position: absolute;
    top: -1px;
    right: -1px;
    background: var(--el-color-primary);
    width: 24px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0 8px 0 8px;
    z-index: 1;
}

/* 内部元素样式 */
.card-content {
    display: flex;
    gap: 16px;
    align-items: flex-start;
}

.account-info {
    flex: 1;
    min-width: 0; /* 保证 text-overflow 生效 */
}

.info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.nickname {
    font-size: 16px;
    font-weight: 700;
    color: #303133;
}

.tags {
    display: flex;
    gap: 6px;
}

.alias {
    font-size: 13px;
    color: #606266;
    margin-bottom: 6px;
}

.signature {
    font-size: 12px;
    color: #909399;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 底部状态 */
.load-more-status {
    padding: 20px 0;
    text-align: center;
    color: #909399;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.dialog-footer {
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    width: 100%;
}

.selected-tip {
    font-size: 13px;
    color: #606266;
}
.selected-tip strong {
    color: var(--el-color-primary);
    margin-left: 4px;
}

.avatar-wrapper {
    position: relative;
    flex-shrink: 0;
}

.v-badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    color: #fff;
    font-size: 10px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff; /* 白边增加对比度 */
    z-index: 2;
}
</style>
  