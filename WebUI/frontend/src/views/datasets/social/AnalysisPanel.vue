<template>
  <el-card class="analysis-panel" shadow="never">
    <div class="panel-heading">
      <div class="block-title">选择要执行的检测</div>
    </div>

    <el-radio-group v-model="taskType" class="task-switch">
      <el-radio-button label="emotion">情感识别</el-radio-button>
      <el-radio-button label="stance">立场检测</el-radio-button>
    </el-radio-group>

    <div v-if="taskType === 'stance'" class="target-area">
      <div class="block-title">设置立场目标</div>
      <div class="quick-targets">
        <el-button
          v-for="item in quickTargets"
          :key="item"
          size="small"
          @click="addTarget(item)"
        >
          {{ item }}
        </el-button>
      </div>
      <div class="target-list">
        <el-tag
          v-for="(target, index) in targets"
          :key="target"
          closable
          @close="removeTarget(index)"
        >
          {{ target }}
        </el-tag>
        <el-input
          v-if="targetInputVisible"
          ref="targetInputRef"
          v-model="newTarget"
          size="small"
          class="target-input"
          placeholder="输入目标，如 中国"
          @keyup.enter="confirmTarget"
          @blur="confirmTarget"
        />
        <el-button v-else size="small" plain @click="showTargetInput"
          >+ 添加目标</el-button
        >
      </div>
      <p class="helper-text">立场检测必须至少设置一个目标，最多 5 个。</p>
    </div>
  </el-card>
  <el-card class="analysis-panel" shadow="never">
    <div class="config-area">
      <div class="block-title">分析配置</div>
      <label class="field-label">分析模型</label>
      <el-select
        v-model="config.model_choice"
        class="model-select"
        size="small"
      >
        <el-option
          v-for="model in modelOptions"
          :key="model"
          :label="model"
          :value="model"
        />
      </el-select>

      <el-collapse class="advanced-config">
        <el-collapse-item title="高级参数" name="advanced">
          <el-form :model="config" label-width="100px" size="small">
            <el-form-item label="最小文本长度">
              <el-slider
                v-model="config.min_text_length"
                :min="1"
                :max="50"
                show-input
              />
            </el-form-item>
            <el-form-item label="最大文本长度">
              <el-slider
                v-model="config.max_text_length"
                :min="50"
                :max="500"
                show-input
              />
            </el-form-item>
            <el-form-item label="随机性">
              <el-slider
                v-model="config.temperature"
                :min="0.1"
                :max="1.0"
                :step="0.1"
                show-input
              />
            </el-form-item>
            <el-form-item label="采样范围">
              <el-slider
                v-model="config.top_p"
                :min="0.1"
                :max="1.0"
                :step="0.1"
                show-input
              />
            </el-form-item>
            <el-form-item label="采样数量">
              <el-slider
                v-model="config.top_k"
                :min="1"
                :max="100"
                show-input
              />
            </el-form-item>
            <el-form-item label="启用采样">
              <el-switch v-model="config.do_sample" />
            </el-form-item>
          </el-form>
        </el-collapse-item>
      </el-collapse>

      <div class="config-actions">
        <el-button size="small" type="primary" plain @click="saveConfig"
          >保存配置</el-button
        >
        <el-button size="small" @click="resetConfig">重置</el-button>
      </div>
    </div>

    <el-button
      class="start-button"
      type="primary"
      size="large"
      :disabled="startDisabled"
      @click="startAnalysis"
    >
      {{ startButtonText }}
    </el-button>
    <p class="disabled-reason" v-if="startDisabled">{{ disabledReason }}</p>
  </el-card>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { ElMessage } from "element-plus";
import type { AnalysisConfig } from "./useAnalysisConfig";

const props = defineProps<{
  selectedCount: number;
  config: AnalysisConfig;
  modelOptions: string[];
}>();

const emit = defineEmits<{
  "analyze-emotion": [];
  "analyze-stance": [targets: string[]];
  "save-config": [];
  "reset-config": [];
}>();

const quickTargets = [
  "中国",
  "美国",
  "台湾地区",
  "日本",
  "俄罗斯",
  "乌克兰",
  "欧洲",
];
const taskType = ref<"emotion" | "stance">("emotion");
const targets = ref<string[]>([]);
const newTarget = ref("");
const targetInputVisible = ref(false);
const targetInputRef = ref();

const startDisabled = computed(
  () =>
    props.selectedCount === 0 ||
    (taskType.value === "stance" && targets.value.length === 0)
);

const disabledReason = computed(() => {
  if (props.selectedCount === 0)
    return "请先在右侧数据列表中选择要分析的数据。";
  if (taskType.value === "stance" && targets.value.length === 0)
    return "立场检测需要先添加分析目标。";
  return "";
});

const startButtonText = computed(() => {
  const prefix = taskType.value === "emotion" ? "开始情感识别" : "开始立场检测";
  return props.selectedCount
    ? `${prefix}（${props.selectedCount} 条）`
    : prefix;
});

const showTargetInput = () => {
  targetInputVisible.value = true;
  nextTick(() => targetInputRef.value?.focus?.());
};

const addTarget = (target: string) => {
  const value = target.trim();
  if (!value || targets.value.includes(value)) return;
  if (targets.value.length >= 5) {
    ElMessage.warning("最多只能添加5个分析目标");
    return;
  }
  targets.value.push(value);
};

const confirmTarget = () => {
  addTarget(newTarget.value);
  newTarget.value = "";
  targetInputVisible.value = false;
};

const removeTarget = (index: number) => {
  targets.value.splice(index, 1);
};

const saveConfig = () => {
  emit("save-config");
  ElMessage.success("配置已保存");
};

const resetConfig = () => {
  emit("reset-config");
};

const startAnalysis = () => {
  if (startDisabled.value) return;
  if (taskType.value === "emotion") {
    emit("analyze-emotion");
    return;
  }
  emit("analyze-stance", targets.value);
};
</script>

<style scoped>
.analysis-panel {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.analysis-panel :deep(.el-card__body) {
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

.panel-heading p,
.helper-text,
.disabled-reason {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}

.task-switch {
  width: 100%;
}

.task-switch :deep(.el-radio-button) {
  width: 50%;
}

.task-switch :deep(.el-radio-button__inner) {
  width: 100%;
}

.block-title {
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.target-area,
.config-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-targets,
.target-list,
.config-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.field-label {
  color: #64748b;
  font-size: 13px;
}

.model-select,
.target-input {
  width: 100%;
}

.advanced-config {
  border-top: 0;
  border-bottom: 0;
}

.start-button {
  width: 100%;
  margin-top: 2px;
}

.disabled-reason {
  color: #e6a23c;
}

@media (max-width: 1180px) {
  .analysis-panel :deep(.el-card__body) {
    display: grid;
    grid-template-columns: minmax(240px, 0.9fr) minmax(280px, 1fr) minmax(
        220px,
        0.8fr
      );
    align-items: start;
  }

  .panel-heading,
  .task-switch,
  .start-button,
  .disabled-reason {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .analysis-panel :deep(.el-card__body) {
    display: flex;
    padding: 12px;
  }
}
</style>
