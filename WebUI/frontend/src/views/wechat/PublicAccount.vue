<template>
<div class="editor-container">
    <!-- 左侧历史记录 -->
    <div class="history-panel">
        <div class="history-header">
            <el-icon><Document /></el-icon>
            <h3>校对历史</h3>
        </div>
        <!-- 新建按钮 -->
        <div class="create-new-btn">
            <el-button type="primary" @click="createNew" :icon="Plus">
                新建校对文本
            </el-button>
        </div>
        <div class="history-list">
            <div 
                v-for="(item, index) in historyList"
                :key="index"
                class="history-item"
                :class="{ 'active': activeHistory === index }"
                @click="loadHistory(index)"
                @contextmenu.prevent.stop="onHistoryContextMenu(index)"
            >
            <div class="item-header">
                <span class="title">{{ shortenText(item.title, 7) }}</span>
                <el-tag :type="item.titleCheck.sum > 0 ? 'danger' : 'success'" size="small">
                标题 {{ item.titleCheck.sum }}处
                </el-tag>
            </div>
            <div class="item-info">
                <span class="time">{{ formatTime(item.time) }}</span>
                <el-tag :type="item.contentCheck.sum > 0 ? 'warning' : 'success'" size="small">
                正文 {{ item.contentCheck.sum }}处
                </el-tag>
            </div>
            </div>
        </div>
    </div>

    <!-- 右侧编辑区域 -->
    <div class="edit-panel">
    <!-- 输入区域 -->
    <div class="input-section">
        <div class="title-input">
            <template v-if="viewMode === 'edit'">
                <el-input
                    v-model="currentTitle"
                    placeholder="请输入文章标题..."
                    maxlength="50"
                    show-word-limit
                    clearable
                    :class="{ 'error-border': titleCheck.sum > 0 }"
                >
                    <template #prefix>
                        <el-icon><EditPen /></el-icon>
                    </template>
                </el-input>
            </template>
            <template v-else>
                <div 
                    class="title-preview" 
                    v-html="highlightedTitle"                 
                    @mouseover="handleTitleHover"
                    @mouseleave="clearSuggestion">
                </div>
            </template>
            <el-button 
                type="primary" 
                :loading="checking"
                @click="startCheck"
                v-if="viewMode === 'edit'"
            >
                <template #icon>
                    <el-icon><Check /></el-icon>
                </template>
                    开始校对
            </el-button>
        </div>

        <div class="content-editor">
            <div class="editor-toolbar">
                <el-button-group>
                    <el-button size="small" @click="toggleView('edit')" :class="{ 'active': viewMode === 'edit' }">
                        <el-icon><Edit /></el-icon>编辑模式
                    </el-button>
                    <el-button size="small" @click="toggleView('preview')" :class="{ 'active': viewMode === 'preview' }">
                        <el-icon><View /></el-icon>预览模式
                    </el-button>
                </el-button-group>
                <span class="word-count">字数：{{ contentLength }}</span>
            </div>
        
            <!-- 编辑模式 -->
            <textarea
                v-show="viewMode === 'edit'"
                v-model="currentContent"
                class="edit-area"
                placeholder="请输入文章正文..."
            ></textarea>

            <!-- 预览模式 -->
            <div 
                v-show="viewMode === 'preview'"
                class="preview-area"
                v-html="highlightedContent"
                @mouseover="handleTextHover"
                @mouseleave="clearSuggestion"
            ></div>
        </div>
        <!-- 悬浮建议框 -->
        <div 
            v-if="activeSuggestion"
            class="suggestion-popover"
            :style="popoverStyle"
        >
            <div class="popover-header">
                <span>修改建议（{{ activeSuggestion.category }}）</span>
            </div>
            <div class="popover-content">
                <div 
                    class="suggestion-item"
                >
                    <el-icon><Pointer /></el-icon>
                    <span>{{ activeSuggestion.recommend || activeSuggestion.desc1 || '未知错误' }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- 校对结果 -->
    <div class="result-section" v-if="showResult">
        <el-alert 
            :title="resultSummary"
            :type="totalErrors === 0 ? 'success' : 'warning'"
            show-icon
            :closable="false"
        />
        
        <!-- 标题错误 -->
        <div class="error-block" v-if="titleCheck.sum > 0">
            <div class="error-header">
                <el-icon color="#F56C6C"><Warning /></el-icon>
                <h4>标题问题（{{ titleCheck.sum }}处）</h4>
            </div>
            <div class="error-item">
                <span class="error-text">{{ titleCheck.result.sentence }}</span>
                <div class="suggestions">
                    <el-tag 
                        v-for="(mistake, idx) in titleCheck.result.mistakes"
                        :key="idx"
                        type="danger"
                        effect="dark"
                    >
                        {{ mistake.infos[0].recommend || '需修改' }}
                    </el-tag>
                </div>
            </div>
        </div>

        <!-- 正文错误 -->
        <div class="error-block" v-if="contentCheck.sum > 0">
        <div class="error-header">
            <el-icon color="#E6A23C"><Warning /></el-icon>
            <h4>正文问题（{{ contentCheck.sum }}处）</h4>
        </div>
        <div 
            class="error-item"
            v-for="(mistake, index) in contentCheck.result.mistakes"
            :key="index"
        >
            <div class="error-meta">
            <el-tag size="small">位置：{{ mistake.l }}-{{ mistake.r }}</el-tag>
            <el-tag size="small" type="warning">类型：{{ mistake.infos[0].category }}</el-tag>
            </div>
            <div class="suggestions">
                <el-tag
                    v-for="(info, idx) in mistake.infos"
                    :key="idx"
                    :type="info.type === 1 ? 'danger' : 'warning'"
                >
                    {{ info.recommend ? '修改建议：' : '错误类型：' }} {{ info.recommend || info.desc1 || '未知'}}
                </el-tag>
            </div>
        </div>
        </div>
    </div>
    </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus'
import {
    Document,
    EditPen,
    Check,
    View,
    Edit,
    Warning,
    Pointer,
    Plus
} from '@element-plus/icons-vue'
import axios from '@/api/axios'

// 响应式数据
const currentTitle = ref('')
const currentContent = ref('')
const checking = ref(false)
const viewMode = ref('edit') // edit/preview
const activeHistory = ref(-1)
const historyList = ref([])
const contentCheck = ref({ result: { mistakes: [] } })
const titleCheck = ref({ result: { mistakes: [] } })
const activeSuggestion = ref(null)
const popoverStyle = ref({})
const showResult = ref(false)

// 计算属性
const contentLength = computed(() => currentContent.value.length)
const totalErrors = computed(() => titleCheck.value.sum + contentCheck.value.sum)
const resultSummary = computed(() => {
    if (totalErrors.value === 0) return '🎉 恭喜！未发现任何错误'
    return `共发现 ${totalErrors.value} 处问题（标题 ${titleCheck.value.sum} 处，正文 ${contentCheck.value.sum} 处）`
})
// 高亮标题
const highlightedTitle = computed(() => {
    let title = currentTitle.value
    const mistakes = titleCheck.value.result.mistakes || []
    mistakes.slice().sort((a, b) => b.l - a.l).forEach(m => {
        const text = title.slice(m.l, m.r)
        title = insertHighlight(title, m.l, m.r, 'highlight_title')
    })
    return title
})

// 高亮内容生成
const highlightedContent = computed(() => {
    let content = currentContent.value
    contentCheck.value.result.mistakes
        .slice() // 创建副本避免排序影响原始数据
        .sort((a, b) => b.l - a.l) // 反向处理避免位置偏移
        .forEach(m => {
            const text = content.slice(m.l, m.r)
            const highlightClass = `highlight_content ${getErrorClass(m.infos[0])}`
            content = insertHighlight(content, m.l, m.r, 'highlight_content')
        })
    return content
})

// 错误类型样式
const getErrorClass = (info) => {
  if (info.type === 1) return 'critical'
  if (info.type === 2) return 'warning'
  return 'suggestion'
}

// 插入高亮标签
const insertHighlight = (str, start, end, className) => {
  return (
    str.slice(0, start) +
    `<span class="${className}" data-start="${start}">` +
    str.slice(start, end) +
    '</span>' +
    str.slice(end)
  )
}

// 创建新文本
function createNew() {
    currentTitle.value = ''
    currentContent.value = ''
    titleCheck.value = { sum: 0, result: { mistakes: [] } }
    contentCheck.value = { sum: 0, result: { mistakes: [] } }
    viewMode.value = 'edit'
    showResult.value = false
    activeHistory.value = -1
    activeSuggestion.value = null
}

// 开始校对
const startCheck = async () => {
    if (!currentTitle.value || !currentContent.value) {
        ElMessage.warning('请填写标题和内容')
        return
    }

    checking.value = true
    const loading = ElLoading.service({ fullscreen: true })

    try {
        // 模拟API请求
        const response = await axios.post('/wechat/proofread', {
            title: currentTitle.value, 
            content: currentContent.value
        }, { timeout: 60000 })

        // 更新校验结果
        contentCheck.value = response.data.content_check
        titleCheck.value = response.data.title_check
        
        // 添加到历史记录
        storeHistory()
        
        ElMessage.success(`校对完成，发现${totalErrors.value}处问题`)
        viewMode.value = 'preview'
        showResult.value = true
    } catch (error) {
        ElMessage.error('校验失败：' + error.message)
    } finally {
        loading.close()
        checking.value = false
    }
}

// 点击高亮文本
function handleTextHover(e) {
    const target = e.target.closest('.highlight_content')
    if (!target) {
        activeSuggestion.value = null
        return
    }

    const startPos = parseInt(target.dataset.start)
    const mistake = contentCheck.value.result.mistakes.find(
        m => m.l <= startPos && m.r >= startPos
    )
    if (!mistake) return

    const rect = target.getBoundingClientRect()
    popoverStyle.value = {
        top: `${rect.bottom + window.scrollY + 8}px`,
        left: `${rect.left + window.scrollX}px`
    }
    activeSuggestion.value = {
        ...mistake.infos[0],
        category: mistake.infos[0].category,
        position: `${mistake.l}-${mistake.r}`
    }
}

function handleTitleHover(e) {
    const target = e.target.closest('.highlight_title')
    if (!target) {
        activeSuggestion.value = null
        return
    }

    const startPos = parseInt(target.dataset.start)
    const mistake = titleCheck.value.result.mistakes.find(
        m => m.l <= startPos && m.r >= startPos
    )

    if (!mistake) return

    const rect = target.getBoundingClientRect()
    popoverStyle.value = {
        top: `${rect.bottom + window.scrollY + 8}px`,
        left: `${rect.left + window.scrollX}px`
    }
    activeSuggestion.value = {
        ...mistake.infos[0],
        category: mistake.infos[0].category,
        position: `${mistake.l}-${mistake.r}`
    }
}

// 鼠标移出时隐藏弹窗
function clearSuggestion() {
    activeSuggestion.value = null
}

// 加载历史记录
const loadHistory = (index) => {
    const history = historyList.value[index]
    currentTitle.value = history.title
    currentContent.value = history.content
    titleCheck.value = history.titleCheck
    contentCheck.value = history.contentCheck
    activeHistory.value = index
    viewMode.value = 'preview'
    showResult.value = true
}

const storeHistory = () => {
    const history = {
        title: currentTitle.value,
        content: currentContent.value,
        time: Date.now(),
        titleCheck: { ...titleCheck.value },
        contentCheck: { ...contentCheck.value },
    }
    historyList.value.unshift(history)
    localStorage.setItem('history', JSON.stringify(historyList.value))
}

// 切换视图模式
const toggleView = (mode) => {
    viewMode.value = mode
    if (mode === 'preview') {
        nextTick(() => {
            const firstError = document.querySelector('.highlight_content')
            firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
    }
}

// 工具函数
const shortenText = (text, maxLength) => {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// 初始化加载示例数据
onMounted(() => {
    historyList.value = localStorage.getItem('history') ? JSON.parse(localStorage.getItem('history')) : []
})

function onHistoryContextMenu(index) {
    ElMessageBox.confirm(
        '确定要删除这条历史记录吗？',
        '删除确认',
        {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning'
        }
    )
    .then(() => {
      historyList.value.splice(index, 1)
      localStorage.setItem('history', JSON.stringify(historyList.value))
      if (activeHistory.value === index) {
        activeHistory.value = -1
        showResult.value = false
      } else if (activeHistory.value > index) {
        activeHistory.value--
      }
      ElMessage.success('删除成功')
    })
    .catch(() => {
      /* 取消不操作 */
    })
}
</script>

<style lang="scss" scoped>
.editor-container {
    display: grid;
    grid-template-columns: 280px 1fr;
    height: 100%;
    flex: 1;

    .history-panel {
        background: white;
        border-right: 1px solid #ebeef5;
        padding: 20px;
        box-sizing: border-box;
        overflow-y: auto;
    
        .history-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            
            h3 {
                margin: 0 8px;
                color: #303133;
                height: 32px;
            }
        }

        .refresh-btn {
            margin-left: auto;
            color: #409eff;
            &:hover {
                background: rgba(#409eff, 0.1);
            }
        }
        /* 新建按钮样式 */
        .create-new-btn {
            margin: 16px 0;
            display: flex;
            justify-content: center;
            .el-button {
                width: 100%;
                font-weight: 500;
            }
        }

        .history-list {
            .history-item {
                    padding: 12px;
                    margin-bottom: 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.3s;
                    border: 1px solid #ebeef5;

                    &:hover {
                        background: #f5f7fa;
                        transform: translateX(4px);
                    }

                    &.active {
                        border-color: #409eff;
                        background: #ecf5ff;
                    }

                .item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                
                    .title {
                        max-width: 70%;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                }

                .item-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 12px;
                    color: #909399;
                }
            }
        }
    }

    .edit-panel {
        padding: 24px;
        overflow-y: auto;
        
        .input-section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.05);

            .title-input {
                display: grid;
                grid-template-columns: 1fr 120px;
                gap: 16px;
                margin-bottom: 20px;

                :deep(.el-input__wrapper) {
                    border-radius: 6px;
                    &.error-border {
                        box-shadow: 0 0 0 1px #F56C6C inset;
                    }
                }
            }

            .content-editor {
                border: 1px solid #dcdfe6;
                box-sizing: border-box;
                width: 100%;
                border-radius: 6px;
                height: 760px;
                display: flex;
                flex-direction: column;

                .editor-toolbar {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 12px;
                    border-bottom: 1px solid #ebeef5;
                    background: #fafafa;
                    box-sizing: border-box;

                    .el-icon {
                        margin-right: 3px;
                    }

                    .el-button {
                        &.active {
                            border-color: #409eff;
                            background: #ecf5ff;
                        }

                        margin-right: 0;
                        box-sizing: border-box;
                    }
                }

                .edit-area {
                    width: 100%;
                    padding: 16px;
                    height: 100%;
                    border: none;
                    resize: none;
                    outline: none; // 去除选中状态边框
                    box-sizing: border-box;
                    font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
                    font-size: 16px;
                    font-weight: 400;
                    line-height: 1.5;
                    border-radius: 6px;
                }

                .preview-area {
                    height: 100%;
                    border-radius: 6px;
                    padding: 16px;
                    border: none;
                    resize: none;
                    box-sizing: border-box;
                    overflow-y: auto;
                    position: relative;
                    /* 保留换行和空格 */
                    white-space: pre-wrap;

                    :deep(.highlight_content) {
                        background: #fff3eb;
                        border-bottom: 2px solid #ff8c00;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    :deep(.highlight_content:hover) {
                        background: #ffe4d3;
                    }
                    :deep(.highlight_content.active) {
                        background: #ffd3b8;
                        box-shadow: 0 0 4px rgba(255,140,0,0.3);
                    }
                }
            }
        }

        .result-section {
            margin-top: 24px;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.05);

        .error-block {
            margin-top: 20px;

            .error-header {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            
            h4 {
                margin-left: 8px;
                color: #606266;
            }
            }

            .error-item {
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 4px;
            background: #fafafa;

            .error-meta {
                margin-bottom: 8px;
                
                .el-tag {
                margin-right: 8px;
                }
            }

            .suggestions {
                .el-tag {
                    margin-right: 8px;
                    cursor: pointer;
                    transition: transform 0.2s;

                    &:hover {
                        transform: translateY(-2px);
                    }
                }
            }
            }
        }
        }
    }

    .suggestion-popover {
        position: fixed;
        background: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2000;
        max-width: 450px;
        min-width: 300px;
    
        .popover-header {
            padding: 12px;
            border-bottom: 1px solid #ebeef5;
            font-weight: 500;
            color: #303133;
        }

        .popover-content {
            padding: 12px;
        
            .suggestion-item {
                display: flex;
                align-items: center;
            
                .el-icon {
                    margin-right: 8px;
                    color: #409eff;
                }
            }
        }
    }
}

/* 标题预览高亮样式 */
.title-preview {
    font-size: 1.25rem;
    color: var(--text-color);
    margin-bottom: 2px;
    white-space: pre-wrap;

    :deep(.highlight_title) {
        background: #ffebeb;
        border-bottom: 2px solid #ff2200;
        cursor: pointer;
        transition: all 0.2s;
    }
    :deep(.highlight_title:hover) {
        background: #ffd3d3;
    }
    :deep(.highlight_title.active) {
        background: #ffb8b8;
        box-shadow: 0 0 4px rgba(255,140,0,0.3);
    }
}
</style>