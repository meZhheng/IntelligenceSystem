<template>
<div class="pipeline-analysis">
    <!-- 标题 -->
    <h1 class="title">多阶段情感分析流水线</h1>

    <!-- 1. 主体提取 -->
    <section class="stage subjects-stage">
    <div class="stage-header">
        <div class="stage-index">1</div>
        <h2 class="stage-title">主体提取</h2>
    </div>
    <div class="subjects-list">
        <div
        v-for="(s, idx) in result.subjects"
        :key="idx"
        class="subject-card"
        >
        <div class="sub-header">
            <span class="sub-name">{{ s.name }}</span>
            <!-- <span class="sub-score">{{ (s.attention_score * 100).toFixed(0) }}%</span> -->
        </div>
        <div class="sub-context">{{ s.context }}</div>
        </div>
    </div>
    </section>

    <!-- 连接线
    <div class="connector"></div> -->

    <!-- 2. 观点挖掘 -->
    <section class="stage opinions-stage">
    <div class="stage-header">
        <div class="stage-index">2</div>
        <h2 class="stage-title">观点挖掘</h2>
    </div>
    <div class="opinions-grid">
        <div
        v-for="(o, idx) in result.opinions"
        :key="idx"
        class="opinion-card"
        >
        <div class="op-subject">{{ o.subject }}</div>
        <div class="keywords">
            <span 
                v-for="(kw, i) in o.keywords" 
                :key="i" 
                class="keyword"
            >{{ kw }}</span>
        </div>
        </div>
    </div>
    </section>

    <!-- <div class="connector"></div> -->

    <!-- 3. 极性判断 -->
    <section class="stage polarity-stage">
    <div class="stage-header">
        <div class="stage-index">3</div>
        <h2 class="stage-title">极性判断</h2>
    </div>
    <div class="polarity-grid">
        <div
        v-for="(o, idx) in result.opinions"
        :key="idx"
        class="polarity-card"
        :data-polarity="o.polarity"
        >
        <div class="pol-subject">{{ o.subject }}</div>
        <div class="polarity-label">{{ o.polarity }}</div>
        <div class="confidence">置信度: {{ (o.confidence*100).toFixed(1) }}%</div>
        </div>
    </div>
    </section>
</div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

interface Subject {
name: string
source: string
context: string
attention_score: number
}
interface Opinion {
subject: string
keywords: string[]
polarity: '积极' | '中立' | '消极'
confidence: number
}

interface PipelineResult {
subjects: Subject[]
opinions: Opinion[]
}

const props = defineProps<{
result: PipelineResult
}>()
</script>

<style scoped lang="scss">
.pipeline-analysis {
    padding: 20px;
    background: #f7f8fa;
    max-width: 960px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;

    .title {
        text-align: center;
        margin: 0;
        font-size: 1.75rem;
        font-weight: 600;
        color: #333;
    }

.stage {
    background: #fff;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.05);
    position: relative;
    & + .connector {
        margin: -16px auto 24px;
    }
}

.stage-header {
    display: flex;
    align-items: center;
    margin-bottom: 16px;

    .stage-index {
    width: 32px;
    height: 32px;
    line-height: 32px;
    text-align: center;
    border-radius: 50%;
    background: #409EFF;
    color: #fff;
    font-weight: bold;
    margin-right: 12px;
    }
    .stage-title {
    font-size: 1.25rem;
    color: #409EFF;
    margin: 0;
    }
}

.connector {
    width: 4px;
    height: 24px;
    background: #409EFF;
    margin: 0 auto;
}

/* 1. 主体提取列表 */
.subjects-stage {
    .subjects-list {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        padding-bottom: 8px;

        .subject-card {
            flex: 0 0 240px;
            background: #f0f6ff;
            border-radius: 6px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;

            .sub-header {
                display: flex;
                justify-content: space-between;
                font-weight: 500;
                color: #2c3e50;

                .sub-name {
                    white-space: nowrap;
                }
            }
            .sub-context {
            font-size: 0.9rem;
            color: #555;
            line-height: 1.4;
            }
        }
    }
}

/* 2. 观点挖掘网格 */
.opinions-stage {
    .opinions-grid {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        padding-bottom: 8px;

        .opinion-card {
            background: #fffbe8;
            border-left: 4px solid #e6a23c;
            border-radius: 6px;
            padding: 12px;
            display: flex;
            flex: 0 0 240px;
            flex-direction: column;
            gap: 6px;

            .op-subject {
                font-weight: 600;
                white-space: nowrap;
                color: #b38d15;
            }
            .keywords {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            .keyword {
                background: #fef0c1;
                color: #b38d15;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.85rem;
            }
        }
    }
}

/* 3. 极性判断网格 */
.polarity-stage {
    .polarity-grid {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        padding-bottom: 8px;

        .polarity-card {
            background: #f0f6ff;
            border-radius: 6px;
            padding: 14px;
            text-align: center;
            display: flex;
            flex: 0 0 240px;
            flex-direction: column;
            gap: 8px;

            .pol-subject {
                font-weight: 500;
                white-space: nowrap;
                color: #2c3e50;
            }
            .polarity-label {
                font-size: 1.1rem;
                font-weight: 600;
                // &::after {
                //     content: '';
                //     display: inline-block;
                //     width: 8px;
                //     height: 8px;
                //     border-radius: 50%;
                //     margin-left: 6px;
                // }
            }
            &[data-polarity="积极"] .polarity-label {
                color: #67C23A;
            }

            &[data-polarity="中立"] .polarity-label {
                color: #909399;
            }

            &[data-polarity="消极"] .polarity-label {
                color: #F56C6C;
            }
            .confidence {
                font-size: 0.85rem;
                color: #666;
            }
        }
    }
}
}
</style>
  