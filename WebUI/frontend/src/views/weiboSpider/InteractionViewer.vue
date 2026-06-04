<template>
<div class="box-container">
    <!-- Header -->
    <div class="filters">
        <el-input
            v-model="searchText"
            placeholder="搜索内容关键词"
            class="filter-item"
            clearable
        >
            <template #suffix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filterType" placeholder="交互类型" class="filter-item">
            <el-option label="全部" value=""></el-option>
            <el-option label="点赞" value="like"></el-option>
            <el-option label="转发" value="retweet"></el-option>
            <el-option label="评论" value="comment"></el-option>
        </el-select>
        <el-date-picker
            v-model="filterDate"
            type="daterange"
            unlink-panels
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="filter-item"
            value-format="YYYY-MM-DD"
        />
        <el-button
            type="primary"
            @click="applyFilters"
            class="filter-item"
        >
            查找交互记录
        </el-button>
    </div>

    <!-- Interaction List -->
    <div class="interaction-list">
        <div
            class="interaction-card"
            v-for="item in filteredList"
            :key="item.id"
        >
            <div class="interaction-header">
            <span class="username" @click="goUser(item)">@{{ item.target_username }}</span>
            <span class="type-tag">{{ interactionTypeLabel(item.interaction_type) }}</span>
            </div>
            <div class="interaction-content" v-if="item.content">
                {{ item.content || '[无文本内容]' }}
            </div>
            <div class="interaction-meta">
                <span class="time">{{ formatTime(item.publish_time) }}</span>
                <span class="source"><strong>来自：</strong>{{ item.source || '未知设备' }}</span>
            </div>
        </div>
    </div>

    <!-- Pagination -->
    <div class="pagination">
    <el-pagination
        background
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="currentPage"
        @current-change="handlePageChange"
        small
    />
    </div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import axios from '@/api/axios';

const props = defineProps<{
    selectedSeed: {
        id: number
        name: string
    },
    handleNodeClickAsync: (params: any) => Promise<void>
}>()

// 当 selectedSeed 发生变化时触发一次 applyFilters()
// 只在 id 或 name 变化时触发（避免引用变化导致重复调用）
watch(
    () => props.selectedSeed,
    (newVal, oldVal) => {
        if (!newVal) return
        if (!oldVal || newVal.id !== oldVal.id || newVal.name !== oldVal.name) {
            applyFilters()
        }
    }
)

interface Interaction {
    id: number
    interaction_type: 'like' | 'comment' | 'retweet'
    target_username: string
    content: string
    publish_time: string
    source?: string
}

const interactions = ref<Interaction[]>([])

const filterType = ref('')
const filterDate = ref<[string, string] | null>(null)
const searchText = ref('')
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)

const loading = ref(false)

async function goUser(item) {
    props.handleNodeClickAsync({
        'data': {
            id: item.target_user_id,
            name: item.target_username
        }
    })
}

onMounted(() => {
    applyFilters()
})

const applyFilters = async () => {
    currentPage.value = 1
    loading.value = true
    try {
        const params = {
            user_id: props.selectedSeed.id,
            type: filterType.value || null,
            start_date: filterDate.value?.[0] || null,
            end_date: filterDate.value?.[1] || null,
            search_text: searchText.value || null,
            page: currentPage.value,
            page_size: pageSize
        }

        const response = await axios.post('/weibo/blog/interactions', params)

        interactions.value = response.data.items
        total.value = response.data._meta.total_items
    } catch (err) {
        console.error('交互记录获取失败：', err)
    } finally {
        loading.value = false
    }
}

const filteredList = computed(() => {
    let list = [...interactions.value]

    if (filterType.value) {
        list = list.filter(item => item.interaction_type === filterType.value)
    }
    if (filterDate.value) {
        const [start, end] = filterDate.value
        list = list.filter(item =>
        item.publish_time >= start && item.publish_time <= end
        )
    }
    if (searchText.value) {
        list = list.filter(item =>
        item.content?.toLowerCase().includes(searchText.value.toLowerCase())
        )
    }

    const startIdx = (currentPage.value - 1) * pageSize
    return list.slice(startIdx, startIdx + pageSize)
})

const handlePageChange = (page: number) => {
    currentPage.value = page
}

const formatTime = (ts: string) => {
    return new Date(ts).toLocaleString()
}

const interactionTypeLabel = (type: string) => {
    if (type === 'like') return '点赞'
    if (type === 'comment') return '评论'
    if (type === 'retweet') return '转发'
    return type
}
</script>

<style lang="scss" scoped>
.box-container {
    margin: 20px;
    .filters {
        display: grid;
        width: 100%;
        grid-template-columns: 2fr 1fr 1fr 135px;
        gap: 20px;
        margin-bottom: 16px;
    }

    .interaction-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .interaction-card {
        padding: 12px 16px;
        background: #fff;
        border-radius: 8px;
        border: 1px solid #ebeef5;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);

        .interaction-header {
            display: flex;
            justify-content: space-between;
            font-weight: 500;
            margin-bottom: 8px;

            .type-tag {
                background: #f0f0f0;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
                color: #666;
            }

            .username {
                cursor: pointer;
            }
        }

        .interaction-content {
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 6px;
        }

        .interaction-meta {
            font-size: 12px;
            color: #999;
            display: flex;
            gap: 24px;
        }
    }

    .pagination {
        margin-top: 20px;
        display: flex;
        justify-content: center;
    }
}
</style>