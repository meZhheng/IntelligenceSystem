<template>
<div class="weibo-list-container">
    <!-- 空状态提示 -->
    <div class="empty-state-blogs" v-if="posts.length === 0">
        <el-empty
            description="当前用户还没有发过微博"
            :image-size="120"
        >
            <template #description>
                <p>当前用户还没有发过微博</p>
                <p>或</p>
                <p>尝试点击右上方按钮重新获取</p>
            </template>
        </el-empty>
    </div>
    <!-- 正常微博列表 -->
    <div class="weibo-list" v-else>
        <div 
            v-for="post in posts" 
            :key="post.id" 
            class="weibo-card"
        >
            <!-- 顶部：内容与头条链接 -->
            <div class="card-header">
                <p class="content">
                    {{ post.content }}
                    <a 
                        v-if="post.article_url" 
                        class="article-link" 
                        :href="post.article_url" 
                        target="_blank"
                    >
                        阅读原文 →
                    </a>
                </p>
                <!-- 新增：检测入口 -->
                <div class="operation-pannel">
                    <div class="detection-entry">
                        <el-button
                            type="primary"
                            size="small"
                            @click="openDetectionModal(post)"
                        >
                            开始检测
                        </el-button>
                    </div>

                </div>
            </div>

            <!-- 中部：位置、发布时间、工具 -->
            <div class="card-meta">
                <span class="meta-item" v-if="post.publish_place && post.publish_place !== '无'">
                    <strong>位置：</strong>{{ post.publish_place }}
                </span>
                <span class="meta-item">
                    <strong>时间：</strong>{{ formatTime(post.publish_time) }}
                </span>
                <span class="meta-item">
                    <strong>来源：</strong>{{ post.publish_tool || '—' }}
                </span>
                <span class="meta-item" v-if="post.detected && post.stance && post.stance.length">
                    <strong>立场：</strong>
                    <el-tag
                        v-for="(item, idx) in post.stance"
                        :key="idx"
                        size="small"
                        class="stance-tag"
                        :type="getStanceType(item.stance)"
                        effect="plain"
                    >
                        {{ item.target }}：{{ item.stance }}
                    </el-tag>
                </span>
                <span class="meta-item" v-if="post.detected && post.sentiment && post.sentiment.length">
                    <strong>情感：</strong>
                    <el-tag
                        v-for="(item, idx) in post.sentiment"
                        :key="idx"
                        size="small"
                        class="stance-tag"
                        :type="getSentimentType(item.sentiment)"
                        effect="plain"
                    >
                        {{ item.target }}：{{ item.sentiment }}
                    </el-tag>
                </span>
            </div>
            <div class="card-meta" v-if="post.detected && post.violations">
                <span class="meta-item">
                    <strong>违规类别：</strong>
                    <div class="tags-container">
                        <el-tag
                            v-if="post.violations.data[0].length > 0" 
                            v-for="(tag, idx) in post.violations.data[0]"
                            :key="idx"
                            size="small"
                            class="violation-tag"
                            effect="plain"
                        >
                            {{ tag }}
                        </el-tag>
                        <el-tag
                            v-else
                            size="small"
                            type="info"
                        >
                            暂无风险内容
                        </el-tag>
                    </div>
                </span>
            </div>

            <!-- 底部：互动数据 -->
            <div class="card-stats">
                <div class="stat" :class="{ active: showListType === 'like' && post.id === showInteractionPostID }" @click="toggleList('like', post.id)">
                    👍点赞数 <span>{{ post.up_num }}</span>
                </div>
                <div class="stat" style="justify-content: center;" :class="{ active: showListType === 'comment' && post.id === showInteractionPostID }" @click="toggleList('comment', post.id)">
                    💬评论数 <span>{{ formatCount(post.comment_num) }}</span>
                </div>
                <div class="stat" style="justify-content: flex-end;" :class="{ active: showListType === 'retweet' && post.id === showInteractionPostID }" @click="toggleList('retweet', post.id)">
                    🔄转发数 <span>{{ formatCount(post.retweet_num) }}</span>
                </div>
            </div>

            <div
                v-if="showListType === 'like' && post.id === showInteractionPostID"
                class="interaction-list"
            >
                <template v-if="interactionList.length > 0">
                    <div
                        class="interaction-item"
                        v-for="item in interactionList"
                        :key="item.username + '_' + item.publish_time"
                    >
                        <span class="username" @click="goUser(item)">{{ item.username }}</span>
                        <span class="time">{{ formatTime(item.publish_time) }}</span>
                    </div>
                    <div class="pagination" v-if="interactionTotalPages > 1">
                        <el-pagination
                            v-model:current-page="pager.page"
                            v-model:page-size="pager.per_page"
                            layout="total, prev, pager, next"
                            :total="interactionTotalItems"
                            @size-change="onSizeChange"
                            @current-change="onPageChange"
                        />
                    </div>
                </template>
                <template v-else>
                    <div class="empty-state">
                        <p>暂无点赞数据</p>
                    </div>
                </template>
            </div>
            <!-- 转发 & 评论 列表 -->
            <div
                v-if="(showListType === 'retweet' || showListType === 'comment') && post.id === showInteractionPostID"
                class="retweet-list"
            >
                <template v-if="interactionList.length > 0">
                    <div
                        class="retweet-item"
                        v-for="item in interactionList"
                        :key="item.username + '_' + item.publish_time"
                    >
                        <div class="user-info">
                            <span class="username" @click="goUser(item)">{{ item.username }}</span>
                            <span class="time">{{ formatTime(item.publish_time) }}</span>
                        </div>
                        <div class="content">{{ item.content }}</div>
                        <div class="meta">
                            <span class="likes">👍 {{ item.like_num }}</span>
                            <span class="source">来源：{{ item.source }}</span>
                        </div>
                    </div>
                    <div class="pagination" v-if="interactionTotalPages > 1">
                        <el-pagination
                            v-model:current-page="pager.page"
                            v-model:page-size="pager.per_page"
                            layout="total, prev, pager, next"
                            :total="interactionTotalItems"
                            @size-change="onSizeChange"
                            @current-change="onPageChange"
                        />
                    </div>
                </template>
                <template v-else>
                    <div class="empty-state">
                        <p>
                        {{ showListType === 'retweet' ? '暂无转发数据' : '暂无评论数据' }}
                        </p>
                    </div>
                </template>
            </div>
        </div>
    </div>
</div>
<!-- 检测弹窗 -->
<DetectionModal
    v-if="modalVisible && currentPost"
    v-model:visible="modalVisible"
    :post="currentPost"
    @detection-complete="handleDetection"
/>
</template>

<script setup lang="ts">
import { defineEmits, ref, computed } from 'vue'
import dayjs from 'dayjs'
import axios from '@/api/axios'
import DetectionModal from './BlogDetect.vue'
interface InferenceItem {
    text: string
    target: string
    stance: string
    sentiment: string
    reason: string
    image_description: string
}

interface Post {
    id: string
    content: string
    article_url: string
    publish_place: string
    publish_time: string // ISO 或 'YYYY-MM-DD HH:mm'
    up_num: number
    retweet_num: number
    comment_num: number
    publish_tool: string

    // 以下是检测相关字段
    detected?: boolean
    stance?: InferenceItem[]
    sentiment?: InferenceItem[]
    violations?: {
        data: [string[]]
    }
}

interface Interaction {
    user_id: Number,
    username: string,
    content: string,
    like_num: number,
    source: string,
    publish_time: string
}

const props = defineProps<{ 
    posts: Post[]
    handleNodeClickAsync: (params: any) => Promise<void>
    fetchBlogs: (scrollToTop: boolean) => Promise<void>
}>()

// 触发重新获取事件
const emit = defineEmits<{
    (e: 'refresh'): void
}>()

function getStanceType(stance: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (stance) {
        case '支持':
            return 'success'
        case '反对':
            return 'danger'
        case '中立':
            return 'warning'
        default:
            return 'info'
    }
}

function getSentimentType(sentiment: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (sentiment) {
        case '正面':
            return 'success'
        case '负面':
            return 'danger'
        case '中立':
            return 'warning'
        default:
            return 'info'
    }
}

// 控制弹窗显隐
const modalVisible = ref(false)
// 存储当前要检测的博文
const currentPost = ref<Post>()

// 打开弹窗时设置 currentPost 并显示
function openDetectionModal(item: Post) {
    currentPost.value = item
    modalVisible.value = true
}

// 监听子组件检测完成事件
function handleDetection(payload: { postId: string; type: string; result: any }) {
    console.log('检测完成：', payload)
    // 你可以在这里更新 posts 数组中对应项的检测结果字段：
    props.fetchBlogs(false)
}

async function goUser(item) {
    props.handleNodeClickAsync({
        'data': {
            id: item.user_id,
            name: item.username
        }
    })
}

const pager = ref({ page: 1, per_page: 10 })

const showListType = ref('') // 当前展开的列表类型
const showInteractionPostID = ref('')
const interactionList = ref<Interaction[]>([])
const interactionTotalPages = ref(1)
const interactionTotalItems = ref(0)
const loadingInteraction = ref(false)

function toggleList(type: string, weibo_id: string) {
  if (showListType.value === type && showInteractionPostID.value === weibo_id) {
    showListType.value = ''
    showInteractionPostID.value = ''
  } else {
    showListType.value = type
    showInteractionPostID.value = weibo_id
    pager.value.page = 1
    loadInteractionPage()
  }
}

function onPageChange(page: number) {
    pager.value.page = page
    loadInteractionPage()
}

// 改变每页大小
function onSizeChange(size: number) {
    pager.value.per_page = size
    pager.value.page = 1
    loadInteractionPage()
}

function loadInteractionPage() {
    const url = `weibo/wblogs/interaction`
    loadingInteraction.value = true

    interactionList.value = []
    interactionTotalPages.value = 1
    interactionTotalItems.value = 0

    axios.post(url, {
        page: pager.value.page,
        type: showListType.value,
        weibo_id: showInteractionPostID.value
    }).then(response => {
        const data = response.data

        interactionList.value = data.items || []
        interactionTotalPages.value = data._meta.total_pages || 1
        interactionTotalItems.value = data._meta.total_items || 0

    }).catch(error => {
        console.error('加载点赞列表失败:', error)
    }).finally(() => {
        loadingInteraction.value = false
    })
}

function formatTime(ts: string): string {
    return dayjs(ts).format('YYYY-MM-DD HH:mm')
}

function formatCount(n: number): string {
    return n >= 1_000_000 ? '1000000+' : String(n) 
}
</script>

<style lang="scss" scoped>
.weibo-list-container {
    display: flex;
    height: 100%;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    box-sizing: border-box;
    height: 100%;

    .empty-state-blogs {
        width: 100%;
        max-width: 600px;
        margin-top: 40px;
        text-align: center;

        .el-empty {
            margin-bottom: 20px;
        }
    }

    .weibo-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(1fr, 1fr));
        gap: 16px;
        width: 100%;

        .weibo-card {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            padding: 20px;
            transition: transform 0.2s, box-shadow 0.2s;

            &:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .detection-entry {
                display: flex;
                align-items: center;
            }

            .card-header {
                margin-bottom: 12px;
                .content {
                    color: #333;
                    line-height: 1.5;
                    margin: 0 0 8px;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .article-link {
                    font-size: 0.9rem;
                    color: #409EFF;
                    text-decoration: none;
                    &:hover { text-decoration: underline; }
                }
                .operation-pannel {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                }
            }

            .card-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 12px;
                font-size: 0.85rem;
                color: #666;
                margin-top: auto;

                .meta-item {
                    display: flex;
                    align-items: center;

                    strong {
                        margin-right: 4px;
                        color: #333;
                    }

                    .stance-tag {
                        margin-right: 6px;
                    }
                }

                .tags-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    max-height: 72px;      /* 最多三行左右，超出滚动 */
                    overflow-y: auto;
                    padding-right: 4px;    /* 给滚动条留空间 */
                }
                .violation-tag {
                    border-color: #f56c6c;
                    color: #f56c6c;
                }
            }

            .card-stats {
                display: flex;
                justify-content: space-between;
                gap: 16px;
                font-size: 0.9rem;
                color: #999;

                .stat {
                    display: flex;
                    width: 100%;
                    align-items: center;
                    span { margin-left: 4px; }
                    cursor: pointer;

                    &.active {
                        background-color: #f0f9ff;
                        border-bottom: 2px solid #409eff;
                        font-weight: bold;
                    }
                }
            }
        }
    }
}

.interaction-list {
    margin-top: 10px;
    border-top: solid 1px #eee;

    .interaction-item {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px solid #eee;

        .username {
            font-weight: bold;
            font-size: 14px;

            &:hover {
                cursor: pointer;
            }
        }

        .time {
            color: #888;
            font-size: 0.85rem;
        }
    }

    .pagination {
        display: flex;
        flex-direction: row;
        text-align: center;
        padding-top: 20px;
    }
}

.interaction-list,
.retweet-list {
    .empty-state {
        text-align: center;
        color: #999;
        p {
            margin: 6px 0;
            font-size: 14px;
        }
        border-bottom: solid 1px #eee;
    }
}

.retweet-list {
    margin-top: 10px;
    border-top: solid 1px #eee;
    .retweet-item {
        background: #fff;
        padding: 8px 0;
        border-bottom: solid 1px #eee;

        .user-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;

            .username {
                font-weight: bold;
                font-size: 14px;

                &:hover {
                    cursor: pointer;
                }
            }
            .time {
                font-size: 12px;
                color: #888;
            }
        }

        .content {
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 8px;
            word-break: break-word;
        }

        .meta {
            display: flex;
            justify-content: flex-end;
            font-size: 12px;
            color: #555;

            .likes {
                margin-right: 16px;
            }
            .source {
                color: #888;
            }
        }
    }

    .pagination {
        text-align: center;
        margin: 16px 0;
    }
}
</style>
