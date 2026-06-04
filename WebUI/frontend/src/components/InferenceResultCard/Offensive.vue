<template>
<div class="offensive-check-container" v-if="result != null">
    <!-- 结果概览卡片 -->
    <el-card class="result-card" :class="resultClass">
    <div class="result-header">
        <el-icon class="result-icon" :size="40">
        <SuccessFilled v-if="isSafe" />
        <WarningFilled v-else />
        </el-icon>
        <div class="result-text">
        <h2>{{ resultTitle }}</h2>
        <el-tag :type="resultTagType" size="large">{{ confidenceText }}</el-tag>
        </div>
    </div>
    </el-card>

    <!-- 置信度详情 -->
    <el-card class="confidence-card">
    <template #header>
        <span class="card-title">模型置信度分析</span>
    </template>
    
    <div class="confidence-item">
        <div class="label">冒犯性概率</div>
        <el-progress 
        :percentage="offensiveConfidence" 
        :color="offensiveGradient"
        :stroke-width="18"
        :show-text="false"
        />
        <div class="percentage">{{ offensiveConfidence }}%</div>
    </div>

    <div class="confidence-item">
        <div class="label">安全性概率</div>
        <el-progress 
        :percentage="safeConfidence" 
        :color="safeGradient"
        :stroke-width="18"
        :show-text="false"
        />
        <div class="percentage">{{ safeConfidence }}%</div>
    </div>
    </el-card>
</div>
</template>

<script setup>
import { computed } from 'vue';
import { SuccessFilled, WarningFilled } from '@element-plus/icons-vue';

const props = defineProps({
  result: {
    type: Object,
    required: true,
    default: null,
  }
});

// 计算属性
const isSafe = computed(() => props.result.data?.[0] === 1);
const offensiveConfidence = computed(() => 
  Math.round(props.result.confidences?.[0]?.[0] * 100 || 0)
);
const safeConfidence = computed(() => 
  Math.round(props.result.confidences?.[0]?.[1] * 100 || 0)
);

// 样式计算
const resultClass = computed(() => ({
  'safe-result': isSafe.value,
  'offensive-result': !isSafe.value
}));

const resultTitle = computed(() => 
  isSafe.value ? '安全文本' : '检测到冒犯性内容'
);

const resultTagType = computed(() => 
  isSafe.value ? 'success' : 'danger'
);

const confidenceText = computed(() => 
  isSafe.value 
    ? `安全置信度 ${safeConfidence.value}%`
    : `风险置信度 ${offensiveConfidence.value}%`
);

// 渐变色配置
const offensiveGradient = [
  { color: '#f56c6c', percentage: 0 },
  { color: '#cf1322', percentage: 80 },
]

const safeGradient = [
  { color: '#67c23a', percentage: 0 },
  { color: '#389e0d', percentage: 80 },
]
</script>

<style lang="scss" scoped>
.offensive-check-container {
    padding: 20px;
    max-width: 1280px;
    width: 100%;
    flex: 1;

    .result-card {
        margin-bottom: 30px;
        padding: 30px;
        border-radius: 12px;
        transition: transform 0.3s;
        
        .result-header {
          display: flex;
          align-items: center;
          gap: 20px;
          
          .result-icon {
              flex-shrink: 0;
          }
          
          .result-text {
              h2 {
              margin: 0;
              font-size: 24px;
              color: #2c3e50;
              }
          }
        }
    }

    .confidence-card {
        .card-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        }
        
        .confidence-item {
        margin: 20px 0;
        position: relative;
        
        .label {
            margin-bottom: 8px;
            font-weight: 500;
            color: #666;
        }
        
        .percentage {
            position: absolute;
            right: 0;
            top: 22px;
            font-weight: 600;
            color: #333;
        }
    }
}

// 动态样式
.safe-result {
    border-left: 4px solid #67c23a;
    background: #f0f9eb;
}

.offensive-result {
    border-left: 4px solid #f56c6c;
    background: #fef0f0;
}
}
</style>