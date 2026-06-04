<template>
<div class="multi-sentiment-result">
    <el-collapse accordion>
    <el-collapse-item
        v-for="(item, idx) in results"
        :key="idx"
        :title="`第 ${idx + 1} 句话：${utterances[idx] || ''}`"
        :name="String(idx)"
    >
        <div class="content-block">
        <!-- 预测标签 -->
        <div class="prediction">
            <span class="label">预测情感：</span>
            <el-tag type="success">{{ labels[item.predicted_class] }}</el-tag>
        </div>

        <!-- 概率分布 -->
        <div class="probabilities">
            <span class="label">类别概率分布</span>
            <div
                class="prob-list"
                v-for="(p, ci) in item.class_probs"
                :key="ci"
            >
                <span class="prob-label">{{ labels[ci], p }}</span>
                <el-progress
                    :percentage="Math.round(p * 100)"
                    :stroke-width="16"
                    :text-inside="true"
                    :color="colorMap[ci]"
                />
            </div>
        </div>

        <!-- V/A/D 圆形进度 -->
        <div class="vad-analysis">
            <span class="label">V/A/D 三维度</span>
            <el-row :gutter="24">
            <el-col :span="8" v-for="name in ['Valence','Arousal','Dominance']" :key="name">
                <div class="vad-item">
                    <el-progress
                        type="circle"
                        :percentage="Math.round(item[name.toLowerCase()] * 100)"
                        :width="80"
                        :color="vadColorMap[name]"
                    />
                    <div class="vad-label">{{ VADMapping[name] }}</div>
                </div>
            </el-col>
            </el-row>
        </div>
        </div>
    </el-collapse-item>
    </el-collapse>
</div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

type SingleResult = {
    predicted_class: number;
    class_probs: number[];
    valence: number;
    arousal: number;
    dominance: number;
}

defineProps<{
    results: SingleResult[];
    utterances: string[];
    labels: string[];
}>()

// 根据类别数量生成一组颜色（可自定义）
const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#9A60B4']
const colorMap = reactive(colors)

const VADMapping = {
    Valence: 'Valence/情绪正负向',
    Arousal: 'Arousal/情绪强度',
    Dominance: 'Dominance/控制感'
}

// V/A/D 颜色映射
const vadColorMap: Record<string, string> = {
    Valence: '#409EFF',
    Arousal: '#E6A23C',
    Dominance: '#F56C6C',
}
</script>

<style scoped lang="scss">
.multi-sentiment-result {
    width: 100%;
}

.prediction {
    margin-bottom: 16px;
}
.prediction .label {
    font-weight: bold;
    margin-right: 8px;
}
.probabilities {
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    width: 100%;

    .label {
        font-weight: bold;
        margin-right: 8px;
    }

    .prob-list {
        display: grid;
        grid-template-columns: 100px 1fr;
        width: 100%;
    }
}

.prob-label {
    width: 60px;
    font-size: 14px;
}
.vad-analysis {
    margin-top: 16px;

    .label {
        font-weight: bold;
        margin-right: 8px;
    }
}
.vad-item {
    text-align: center;
}
.vad-label {
    margin-top: 4px;
    font-size: 14px;
    color: #555;
}
.vad-value {
    font-size: 16px;
    margin-top: 2px;
}
</style>