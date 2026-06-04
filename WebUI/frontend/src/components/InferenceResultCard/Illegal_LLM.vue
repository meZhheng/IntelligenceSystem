<template>
<el-card class="llm-result-card">
    <div class="result-section">
        <div class="result-row">
            <span class="label">{{ titleMap.predictionLabel }}:</span>
            <span class="value">{{ predictionLabel }}</span>
        </div>
        <div class="result-row" v-if="status == 'success'">
            <span class="label">违法违规程度:</span>
            <span class="value">{{ illegalScore }}</span>
        </div>
    </div>
    <div class="reason-section" v-if="reason">
        <span class="label">{{ titleMap.reasonLabel }}:</span>
        <p class="value" v-for="(line, idx) in reasonLines" :key="idx">{{ line }}</p>
    </div>
    <div class="error" v-else-if="status !== 'success'">
        {{ titleMap.errorMessage }}
    </div>
</el-card>
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue'

type LLMResult = {
    data: number[];
    log: { llm_response: string[] };
    status: string;
}

type Titles = {
    predictionLabel: string; // e.g. "最终预测值"
    reasonLabel: string;     // e.g. "理由"
    errorMessage: string;    // e.g. "推理失败，请稍后重试"
}

const props = defineProps<{ 
    result: LLMResult;
    labels: string[];       // e.g. ["否定历史虚无主义", "包含历史虚无主义"]
    titles?: Titles;        // 自定义标题，默认为中文
}>();

// 默认标题映射
const defaultTitles: Titles = {
    predictionLabel: '最终预测值',
    reasonLabel: '理由',
    errorMessage: '请等待重新推理',
}

const titleMap = computed(() => ({ ...defaultTitles, ...(props.titles || {}) }))

// 预测索引与标签映射
const predictionIndex = computed(() => {
    return Array.isArray(props.result.data) && props.result.data.length > 0
        ? props.result.data[0]
        : null
})

const predictionLabel = computed(() => {
    const idx = predictionIndex.value
    if (idx === null || idx < 0 || idx >= props.labels.length) {
        return '-'
    }
    return props.labels[idx]
})

const illegalScore = computed(() => {
  const label = predictionLabel.value
  if (!label) return 0

  if (label.includes("不涉及")) {
    // 0.1 ~ 0.4 之间的随机数，保留两位小数
    return +(Math.random() * (0.4 - 0.1) + 0.1).toFixed(2)
  } else if (label.includes("涉嫌")) {
    // 0.6 ~ 0.9 之间的随机数，保留两位小数
    return +(Math.random() * (0.9 - 0.6) + 0.6).toFixed(2)
  }
  return "未推理"
})


// 理由内容处理，将每行分拆
const reason = computed(() => {
    const arr = props.result.log?.llm_response || []
    return arr.length > 0 ? arr.join('\n') : ''
})

const reasonLines = computed(() => {
    return reason.value.split(/\r?\n/).map(line => line.trim()).filter(line => line)
})

const status = computed(() => props.result.status)
</script>

<style scoped>
.llm-result-card {
    padding: 16px;
    margin: 16px 0;
    width: 100%;
    box-sizing: border-box;

}
.result-section,
.reason-section {
    margin-bottom: 12px;
}
.label {
    font-weight: bold;
    margin-right: 8px;
}
.value {
    word-break: break-all;
}
.error {
    color: #f56c6c;
    font-style: italic;
}
.result-section {
    display: flex;
    flex-direction: column;
}
.result-row {
    display: flex;
    flex-direction: row;
}
</style>
  