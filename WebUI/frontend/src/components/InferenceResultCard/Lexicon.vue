<template>
<div class="content-analysis-container disable-select">
    <!-- 结果概览 -->
    <el-card class="result-card" :class="resultClass">
    <div class="result-header">
        <el-icon class="status-icon" :size="40">
        <SuccessFilled v-if="isLexicon" />
        <WarningFilled v-else />
        </el-icon>
        <div class="result-content">
            <h2>{{ verdictText }}</h2>
        </div>
    </div>
    </el-card>
    <!-- 主体内容 -->
    <div class="analysis-layout">
        <!-- 原文展示区域 -->
        <section class="text-display">
            <h3 class="section-title">
                <el-icon><Document /></el-icon>
                原文内容分析
            </h3>
            <div class="original-text">
            <text-highlighter 
                :text="result?.text || ''"
                :matches="result?.matches?.[0]?.details || []"
            />
            </div>
        </section>

        <!-- 统计面板 -->
        <aside class="stat-panel">
            <!-- 风险概览 -->
            <div class="risk-overview">
                <h3 class="section-title">
                    <el-icon><Warning /></el-icon>
                    风险类别分布
                </h3>
                <category-pie :matches="result?.matches?.[0]?.details || []" v-if="totalMatches"/>
                <div class="result-content" v-else>
                    <h2>没有识别到冒犯词语</h2>
                </div>
            </div>

            <!-- 详细匹配列表 -->
            <div class="match-details">
            <h3 class="section-title">
                <el-icon><List /></el-icon>
                敏感词明细（{{ totalMatches }}项）
            </h3>
            <category-accordion 
                :matches="processedMatches"
                @highlight="handleHighlight"
            />
            </div>
        </aside>
    </div>
</div>
</template>
<script lang="ts">
// 在公共工具文件中添加
export const CATEGORY_MAP: Record<string, string> = {
    general: '一般违规',
    LGBT: 'LGBT性少数群体',
    racism: '种族歧视', 
    region: '地域歧视',
    sexism: '性别歧视',
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Document, Warning, List } from '@element-plus/icons-vue'
import TextHighlighter from './TextHighlighter.vue'
import CategoryPie from './CategoryPie.vue'
import CategoryAccordion from './CategoryAccordion.vue'

// 类型定义
export interface MatchDetail {
    category: string
    positions: number[]
    word: string
}

interface AnalysisResult {
    data: number[]
    matches: {
        details: MatchDetail[]
        types: string[]
    }[]
    status: string
    text: string
}

const props = defineProps<{
    result: AnalysisResult
}>()

const resultClass = computed(() => ({
    'real-news': isLexicon.value,
    'fake-news': !isLexicon.value
}));

const isLexicon = computed(() => props.result?.data?.[0] === 0);

const verdictText = computed(() =>
    isLexicon.value ? '安全内容' : '高风险内容'
);

const totalMatches = computed(() => {
    return props.result?.matches?.[0]?.details?.length ?? 0
})

// 处理匹配数据（按类别分组）
const processedMatches = computed(() => {
    const details = props.result?.matches?.[0]?.details ?? []
    const groups: Record<string, MatchDetail[]> = {}

    details.forEach(match => {
        if (!groups[match.category]) {
        groups[match.category] = []
        }
        groups[match.category].push(match)
    })

    return Object.entries(groups).map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.positions[0] - b.positions[0])
    }))
})

// 高亮交互处理
const handleHighlight = (position: number) => {
    const element = document.querySelector(`[data-pos="${position}"]`)
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.classList.add('highlight-focus')
        setTimeout(() => element.classList.remove('highlight-focus'), 1500)
    }
}
</script>

<style lang="scss" scoped>
.content-analysis-container {
    $risk-color: #f56c6c;
    $safe-color: #67c23a;
    $border-color: #ebeef5;
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;

    .analysis-layout {
        display: flex;
        flex-direction: column;
        gap: 24px;
        
        .text-display {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        
            .original-text {
                line-height: 1.8;
                font-size: 15px;
                white-space: pre-wrap;
                padding: 16px;
                border: 1px solid $border-color;
                border-radius: 4px;
            }
        }

        .stat-panel {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-bottom: 50px;
            
            .risk-overview {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-items: center;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-sizing: border-box;
                box-shadow: 0 0 6px 2px rgba(0, 0, 0, 0.1);

                .result-content {
                    h2 {
                        margin: 0;
                        font-size: 24px;
                        color: #2c3e50;
                    }
                }
            }
            
            .match-details {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-sizing: border-box;
                box-shadow: 0 0 6px 2px rgba(0, 0, 0, 0.1);
                flex-grow: 1;
            }
        }
    }

    .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #303133;
        margin: 0 0 16px;
        font-size: 16px;
        width: 100%;
        
        .el-icon {
            font-size: 18px;
        }
    }
}

.result-card {
    padding: 30px;
    border-radius: 12px;
    transition: transform 0.3s;
    
    .result-header {
        display: flex;
        align-items: center;
        gap: 20px;
        
        .status-icon {
            flex-shrink: 0;
        }
        
        .result-content {
            h2 {
                margin: 0;
                font-size: 24px;
                color: #2c3e50;
            }
        }
    }
}

.real-news {
    border-left: 4px solid #67c23a;
    background: #f0f9eb;
}

.fake-news {
    border-left: 4px solid #f56c6c;
    background: #fef0f0;
}

// 高亮动画
.highlight-focus {
    animation: highlight-pulse 1.5s ease-out;
}

@keyframes highlight-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}
</style>