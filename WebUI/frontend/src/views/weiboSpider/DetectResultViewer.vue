<template>
<div class="inference-results">
    <h4 class="page-title">{{ title }}</h4>
    <div class="cards-container">
        <div v-for="(item, idx) in results" :key="idx" class="result-card">
            <div class="card-header">
                <span class="card-index">目标对象{{ idx + 1 }}</span>
                <span class="card-stance" :data-stance="item.stance" :data-sentiment="item.sentiment">
                    {{ item.stance }}
                    {{ item.sentiment }}
                </span>
            </div>
            <div class="card-body">
                <div class="field" v-if="item.image_description">
                    <div class="label">图片描述</div>
                    <div class="value">{{ item.image_description }}</div>
                </div>
                <div class="field">
                    <div class="label">对应原文片段</div>
                    <div class="value">{{ item.text }}</div>
                </div>
                <div class="field inline">
                    <div class="field-group">
                    <div class="label">目标对象</div>
                    <div class="value">{{ item.target }}</div>
                    </div>
                    <div class="field-group">
                    <div class="label" v-if="item.stance">立场 Stance</div>
                    <div class="value" v-if="item.stance">{{ item.stance }}</div>
                    <div class="label" v-if="item.sentiment">情感 Sentiment</div>
                    <div class="value" v-if="item.sentiment">{{ item.sentiment }}</div>
                    </div>
                </div>
                <div class="field">
                    <div class="label">判断理由</div>
                    <div class="reason">{{ item.reason }}</div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

interface InferenceItem {
    text: string
    target: string
    stance: string
    sentiment: string
    reason: string
    image_description: string
}

const props = defineProps<{
    title: string
    results: InferenceItem[]
}>()
</script>

<style scoped lang="scss">
.inference-results {
    display: flex;
    flex-direction: column;
    max-width: 960px;
    flex: 1;
    box-sizing: border-box;
    margin-bottom: 12px;

    .page-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #333;
        margin: 0;
        margin-bottom: 12px;
    }

    .cards-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .result-card {
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: transform 0.2s ease, box-shadow 0.2s ease;

        &:hover {
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #fafafa;
            border-bottom: 1px solid #ececec;

            .card-index {
                font-size: 0.9rem;
                color: #888;
            }

            .card-stance {
                font-size: 0.85rem;
                font-weight: 500;
                padding: 4px 8px;
                border-radius: 5px;
                color: #fff;
                &[data-stance="支持"] { background: #67C23A; }
                &[data-stance="反对"] { background: #F56C6C; }
                &[data-stance="中立"] { background: #909399; }

                &[data-sentiment="正面"] { background: #67C23A; }
                &[data-sentiment="负面"] { background: #F56C6C; }
                &[data-sentiment="中立"] { background: #909399; }
            }
        }

        .card-body {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;

        .field {
            display: flex;
            flex-direction: column;
            .label {
            font-size: 0.85rem;
            color: #666;
            margin-bottom: 4px;
            }
            .value {
            font-size: 0.95rem;
            color: #333;
            line-height: 1.4;
            }
            &.inline {
            flex-direction: row;
            gap: 16px;
            .field-group {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            }
            .reason {
            background: #f5f7fa;
            padding: 12px;
            border-left: 3px solid #409EFF;
            border-radius: 4px;
            color: #555;
            font-size: 0.95rem;
            line-height: 1.5;
            white-space: pre-wrap;
            }
        }
        }
    }
}
</style>
      