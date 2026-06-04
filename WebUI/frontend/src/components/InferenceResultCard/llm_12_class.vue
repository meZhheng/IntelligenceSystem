<template>
    <div class="violation-output">
        <h5 class="output-label">违规类别检测结果</h5>
    
        <!-- 分类标签展示 -->
        <div class="violation-tags">
            <el-tag
                v-if="!categories"
                class="null-tag"
                size="small"
                type="success"
                effect="plain"
            >
                暂无推理结果
            </el-tag>
            <el-tag
                v-else-if="categories.length > 0"
                v-for="(tag, idx) in categories"
                :key="idx"
                class="violation-tag"
                size="small"
                type="danger"
                effect="plain"
            >
                {{ tag }}
            </el-tag>
            <el-tag
                v-else-if="categories.length === 0"
                class="legal-tag"
                size="small"
                type="success"
                effect="plain"
            >
                无涉及违法违规与敏感信息
            </el-tag>
        </div>
    
        <!-- 详细解释展示 -->
        <el-collapse v-model="activeKeys" class="explanations">
            <el-collapse-item
                v-for="(explanation, cat) in explanations"
                :key="cat"
                :title="cat"
                :name="cat"
            >
                <p class="explanation-text">{{ explanation }}</p>
            </el-collapse-item>
        </el-collapse>
    </div>
    </template>

<script setup lang="ts">
import { computed, defineProps, ref } from 'vue'
// 分类标签
const categories = computed(() => props.result?.data?.[0] || null)

// 取 llm_response 的第 0 项作为解释 map
const explanations = computed(() => {
    const resp = props.result?.log?.llm_response && props.result?.log?.llm_response[0]
    return resp || {}
})

interface RawLLMResponse {
    [label: string]: string
}

type LLMResult = {
    data: any;
    log: { llm_response: RawLLMResponse[] };
    status: string;
}

type Titles = {
    errorMessage: string;    // e.g. "推理失败，请稍后重试"
}

const props = defineProps<{ 
    result: LLMResult;
    titles?: Titles;
}>()

// Take first LLM response object
const responseMap = computed(() => {
const arr = props.result?.log?.llm_response || []
return arr.length > 0 ? arr[0] : {}
})

// For collapse control
const activeKeys = ref<string[]>(Object.keys(responseMap.value))
</script>

<style scoped lang="scss">
.violation-output {
    width: 100%;
    .output-label {
        font-size: 1.25rem;
        font-weight: 600;
        color: #333;
        margin: 0;
        margin-bottom: 12px;
    }

    .violation-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
    }

    .violation-tag {
        border-color: #f56c6c;
        color: #f56c6c;
    }

    .legal-tag {
        border-color: #67c23a;
        color: #67c23a;
    }

    .null-tag {
        border-color: #909399;
        color: #909399;
    }

    .explanations {
        .el-collapse-item__header {
            font-size: 0.95rem;
            color: #f56c6c;
        }
        .explanation-text {
            margin: 8px 0;
            color: #606266;
            white-space: pre-wrap;
        }
    }
}
</style>  