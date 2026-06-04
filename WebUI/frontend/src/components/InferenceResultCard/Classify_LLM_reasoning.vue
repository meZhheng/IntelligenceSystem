<template>
<div class="result-card">
    <!-- 1. 预测摘要 -->
    <header class="result-header">
    <div class="result-title">模型推理结果</div>
    <div class="prediction">
        <span class="label">预测:</span>
        <span class="value">{{ result.prediction }}</span>
    </div>
    </header>

    <!-- 2. 主要内容区：原文、目标、置信度 -->
    <div class="result-main">
        <div class="text-block" v-if="result.target">
            <h4 class="block-title">立场对象</h4>
            <p class="target-content">{{ result.target }}</p>
        </div>
        <div class="probs-block">
            <h4 class="block-title">置信度分布</h4>
            <div
            class="prob-item"
            v-for="(p, label) in result.probabilities"
            :key="label"
            >
            <div class="prob-label">{{ label }}</div>
            <div class="prob-bar-container">
                <div
                class="prob-bar"
                :style="{ width: (p * 100).toFixed(1) + '%' }"
                ></div>
            </div>
            <div class="prob-value">{{ (p * 100).toFixed(1) }}%</div>
            </div>
        </div>
    </div>

    <!-- 3. 推理理由 -->
    <section class="reasoning-block">
        <h4 class="block-title">模型理由</h4>
        <p class="reasoning-content">{{ result.reasoning }}</p>
    </section>
</div>
</template>

<script setup lang="ts">

interface Result {
    prediction: string
    probabilities: Record<string, number>
    reasoning: string
    target: string
    text: string
}

const props = defineProps<{
result: Result
}>()
</script>

<style scoped lang="scss">
.result-card {
    max-width: 960px;
    margin: 0 auto;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    padding: 20px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;

.result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .result-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #333;
    }
    .prediction {
        display: flex;
        align-items: baseline;
    .label {
        font-size: 1rem;
        color: #666;
        margin-right: 8px;
    }
    .value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #409EFF;
    }
    }
}

.result-main {
    display: flex;
    flex-direction: column;
    gap: 32px;

    .text-block, .probs-block {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;

        .block-title {
            font-size: 1rem;
            font-weight: 500;
            color: #000000;
            margin: 0;
        }
    }

    .text-block {
    .text-content, .target-content {
        background: #f9fafb;
        padding: 12px;
        border-radius: 4px;
        font-size: 0.95rem;
        color: #555;
        line-height: 1.5;
    }
    .target-content {
        font-style: italic;
    }
    }

    .probs-block {
        .prob-item {
            display: flex;
            align-items: center;
            gap: 8px;
            .prob-label {
                width: 60px;
                font-size: 0.9rem;
                color: #555;
            }
            .prob-bar-container {
                flex: 1;
                background: #eee;
                border-radius: 4px;
                overflow: hidden;
                height: 12px;
            }
            .prob-bar {
                height: 100%;
                background: #67C23A;
            }
            .prob-value {
                width: 50px;
                text-align: right;
                font-size: 0.9rem;
                color: #333;
            }
            &:nth-child(2) .prob-bar { background: #E6A23C; }
            &:nth-child(3) .prob-bar { background: #F56C6C; }
        }
    }
}

    .reasoning-block {
        .block-title {
            font-size: 1rem;
            font-weight: 500;
            color: #000000;
            margin-bottom: 8px;
        }
        .reasoning-content {
            background: #f5f7fa;
            padding: 16px;
            border-left: 4px solid #409EFF;
            border-radius: 4px;
            font-size: 0.95rem;
            color: #555;
            line-height: 1.6;
            white-space: pre-wrap;
        }
    }
}
</style>
  