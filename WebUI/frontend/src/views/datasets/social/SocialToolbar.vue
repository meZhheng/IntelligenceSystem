<template>
  <el-card class="social-toolbar" shadow="never">
    <div class="panel-heading">
      <strong>{{ selectedCount ? `已选择 ${selectedCount} 条` : '选择数据后开始分析' }}</strong>
    </div>

    <div class="selection-block">
      <div class="selection-buttons">
        <el-button type="primary" plain @click="emit('select-current-page')">选择当前页</el-button>
        <el-button plain @click="emit('select-current-page-unanalyzed')">只选未分析</el-button>
        <el-button :disabled="selectedCount === 0" text @click="emit('clear-selection')">清空选择</el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
defineProps<{
  currentPageCount: number;
  analyzedCount: number;
  unanalyzedCount: number;
  selectedCount: number;
  emotionCount: number;
  stanceCount: number;
}>();

const emit = defineEmits<{
  "select-current-page": [];
  "select-current-page-unanalyzed": [];
  "clear-selection": [];
}>();
</script>

<style scoped>
.social-toolbar {
  border: 1px solid rgba(64, 158, 255, 0.12);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}

.social-toolbar :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.panel-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.eyebrow {
  color: #409eff;
  font-size: 12px;
  font-weight: 600;
}

.panel-heading strong {
  color: #1f2937;
  font-size: 17px;
}

.overview-box {
  padding: 14px;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
}

.overview-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.overview-main strong {
  color: #1d4ed8;
  font-size: 32px;
  line-height: 1;
}

.overview-label {
  color: #475569;
  font-size: 13px;
}

.overview-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
}

.selection-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.block-title {
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.selection-buttons {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.selection-buttons :deep(.el-button) {
  width: 100%;
  justify-content: center;
  margin-left: 0;
}

.selection-tip {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 1180px) {
  .selection-buttons {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .social-toolbar :deep(.el-card__body) {
    padding: 12px;
  }

  .selection-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
