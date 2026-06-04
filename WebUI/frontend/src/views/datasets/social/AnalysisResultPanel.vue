<template>
  <el-drawer
    :model-value="visible"
    :title="analysisType === 'emotion' ? '情感分析结果' : '立场分析结果'"
    size="72%"
    @update:model-value="emit('update:visible', $event)"
  >
    <div class="analysis-summary">
      <el-tag type="success" v-if="summary.valid > 0">有效: {{ summary.valid }}</el-tag>
      <el-tag type="danger" v-if="summary.invalid > 0">无效: {{ summary.invalid }}</el-tag>
      <el-tag>处理时间: {{ summary.processing_time_sec || 0 }}秒</el-tag>
      <el-tag>使用模型: {{ summary.model_used || '—' }}</el-tag>
    </div>

    <el-table :data="results" border height="calc(100vh - 210px)">
      <el-table-column prop="text" label="原文" min-width="260">
        <template #default="{ row }">
          <el-tooltip effect="dark" :content="row.text" placement="top">
            <span class="text-preview">{{ row.text }}</span>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column label="处理后文本" min-width="260">
        <template #default="{ row }">
          <el-tooltip effect="dark" :content="row.processed_text" placement="top">
            <span class="text-preview">{{ row.processed_text || '未处理' }}</span>
          </el-tooltip>
          <span v-if="row.error" class="error-text">({{ row.error }})</span>
        </template>
      </el-table-column>

      <el-table-column v-if="analysisType === 'emotion'" prop="pred" label="情感结果" width="100">
        <template #default="{ row }">
          <el-tag :type="getEmotionTagType(row.pred)">{{ row.pred || '无效' }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column v-if="analysisType === 'emotion'" prop="label" label="舆情标签" width="100">
        <template #default="{ row }">
          <el-tag :type="getEmotionTagType(getSentimentLabel(row.label))">
            {{ getSentimentLabel(row.label) || '缺失' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column v-if="analysisType === 'stance'" prop="target" label="分析目标" width="120" />

      <el-table-column v-if="analysisType === 'stance'" prop="pred" label="立场结果" width="110">
        <template #default="{ row }">
          <el-tag :type="getStanceTagType(row.pred)">{{ row.pred || '无效' }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="模型判断理由" min-width="220">
        <template #default="{ row }">
          <span v-if="row.raw_result" class="raw-preview" @click="showRaw(row)">
            {{ getRawPreview(row) }}
          </span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="rawDialogVisible" :title="rawDialogTitle" width="70%" append-to-body>
      <div class="raw-dialog-actions">
        <el-button size="small" @click="rawDialogVisible = false">关闭</el-button>
        <el-tag size="small" v-if="rawDialogSource">来源: {{ rawDialogSource }}</el-tag>
      </div>
      <div class="raw-content-wrapper">
        <pre class="raw-content">{{ rawDialogContent }}</pre>
      </div>
    </el-dialog>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import type { AnalysisSummary, AnalysisType } from "./useSocialAnalysis";
import { getEmotionTagType, getSentimentLabel, getStanceTagType, stringifyRawResult } from "./socialResult";

defineProps<{
  visible: boolean;
  analysisType: AnalysisType;
  results: any[];
  summary: AnalysisSummary;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
}>();

const rawDialogVisible = ref(false);
const rawDialogContent = ref("");
const rawDialogTitle = ref("模型原始输出");
const rawDialogSource = ref("");

const getRawPreview = (row: any) => {
  if (!row?.raw_result) return "";
  const cleaned = stringifyRawResult(row.raw_result).replace(/\s+/g, " ").trim();
  return cleaned.length > 120 ? `${cleaned.slice(0, 120)}...` : cleaned;
};

const showRaw = (row: any) => {
  if (!row?.raw_result) {
    ElMessage.info("无原始输出可查看");
    return;
  }

  rawDialogContent.value = stringifyRawResult(row.raw_result);
  rawDialogTitle.value = `原始输出${row.model_name ? ` — ${row.model_name}` : ""}`;
  rawDialogSource.value = row.data_id ? `data_id: ${row.data_id}` : "";
  rawDialogVisible.value = true;
};
</script>

<style scoped>
.analysis-summary {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.text-preview,
.raw-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.raw-preview {
  cursor: pointer;
  color: #409eff;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
  margin-left: 5px;
}

.muted {
  color: #c0c4cc;
}

.raw-dialog-actions {
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
}

.raw-content-wrapper {
  max-height: 60vh;
  overflow: auto;
  border: 1px solid #f0f0f0;
  padding: 12px;
  background: #fafafa;
}

.raw-content {
  font-family: Menlo, Monaco, "Courier New", monospace;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}
</style>
