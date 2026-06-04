<template>
<div class="violation-output">
    <h5 class="output-label">违规类别检测结果</h5>

    <!-- 分类标签展示 -->
    <div class="violation-tags">
    <el-tag
        v-for="(tag, idx) in categories"
        :key="idx"
        class="violation-tag"
        size="small"
        type="danger"
        effect="plain"
    >
        {{ tag }}
    </el-tag>
    </div>

    <!-- 详细解释展示 -->
    <el-collapse v-model="activeNames" class="explanations">
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
import { computed, ref } from 'vue'

const props = defineProps<{ 
    results: {
        data: [string[]];
        log: { llm_response: Record<string, string>[] };
    }
}>()

// 分类标签
const categories = computed(() => props.results.data[0])

// 取 llm_response 的第 0 项作为解释 map
const explanations = computed(() => {
    const resp = props.results.log.llm_response && props.results.log.llm_response[0]
    return resp || {}
})

// 默认全部展开
const activeNames = ref<string[]>(categories.value)
</script>

<style scoped lang="scss">
.violation-output {
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
  