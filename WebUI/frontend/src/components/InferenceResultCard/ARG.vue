<template>
<div class="arg-result-container" v-if="!loading">
  <!-- 顶部结果概览 -->
  <el-card class="result-overview" :class="resultClass">
    <div class="result-header">
        <el-icon class="result-icon"><Finished /></el-icon>
        <span class="result-title">最终判断结果</span>
    </div>
    <div class="result-content">
        <h2>{{ finalResultText }}</h2>
        <el-tag :type="resultTagType" size="large">{{ resultPercentage }}</el-tag>
    </div>
  </el-card>

  <!-- 处理流程步骤 -->
  <el-steps :active="3" finish-status="success" align-center class="process-steps">
    <el-step title="文本分析" description="LLM生成推理依据" />
    <el-step title="有效性评估" description="SLM验证推理质量" />
    <el-step title="综合判断" description="生成最终结论" />
  </el-steps>

  <!-- 详细分析区域 -->
  <el-collapse v-model="activeNames" class="detail-panels" >
    <!-- LLM分析阶段 -->
    <el-collapse-item title="第一步：LLM基础分析" name="1">
      <el-row :gutter="20">
        <el-col :span="12">
            <div class="analysis-panel">
            <h4>文本描述分析</h4>
            <div class="rationale-content">
                {{ modelLog.textualRationale }}
            </div>
            </div>
        </el-col>
        <el-col :span="12">
            <div class="analysis-panel">
            <h4>常识分析</h4>
            <div class="rationale-content">
                {{ modelLog.commonsenseRationale }}
            </div>
            </div>
        </el-col>
      </el-row>
    </el-collapse-item>

    <!-- SLM评估阶段 -->
    <el-collapse-item title="第二步：SLM有效性评估" name="2">
        <el-row :gutter="20">
        <el-col :span="12">
            <div class="assessment-panel">
            <h4>文本分析有效性评估</h4>
            <el-progress 
                :percentage="textualScore" 
                :color="scoreColor"
                :show-text="false"
            />
            <div class="score-text">{{ textualScore }} 分</div>
            </div>
        </el-col>
        <el-col :span="12">
            <div class="assessment-panel">
            <h4>常识分析有效性评估</h4>
            <el-progress 
                :percentage="commonsenseScore" 
                :color="scoreColor"
                :show-text="false"
            />
            <div class="score-text">{{ commonsenseScore }} 分</div>
            </div>
        </el-col>
        </el-row>
    </el-collapse-item>

    <!-- 最终判断阶段 -->
    <el-collapse-item title="第三步：综合判断" name="3">
      <div class="judgment-panel">
        <div class="judgment-item">
          <span class="label">文本维度判断：</span>
          <el-tag :type="textualJudgmentType">{{ textualJudgmentText }}</el-tag>
        </div>
        <div class="judgment-item">
          <span class="label">常识维度判断：</span>
          <el-tag :type="commonsenseJudgmentType">{{ commonsenseJudgmentText }}</el-tag>
        </div>
      </div>
    </el-collapse-item>
  </el-collapse>
</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Finished } from '@element-plus/icons-vue';

defineOptions({
  name: 'ArgResultViewer'
});

const props = defineProps({
  result: {
    type: Object,
    required: true,
    default: () => ({})
  }
});

const loading = ref(true);

watch(
  () => props.result,
  (newVal) => {
    console.log('props.result changed:', newVal, loading.value);
    if (loading.value && newVal != null && Object.keys(newVal).length > 0) {
      loading.value = false;
    } else if (!loading.value && Object.keys(newVal).length === 0) {
      loading.value = true;
    }
  },
  { immediate: true, deep: true } // 可选，看你是否需要立即执行和深度监听
);

// 处理数据格式
const modelLog = computed(() => {
  const log = props.result?.log || {};

  return {
    textualRationale: log['TextualDescriptionRationale'] || '',
    commonsenseRationale: log['CommonsenseRationale'] || '',
    textualJudgment: log['TextualDescriptionJudgement'] || 0,
    commonsenseJudgment: log['CommonsenseJudgement'] || 0,
    textualEvaluation: log['TDEvaluation']*100 || 0,
    commonsenseEvaluation: log['CSEvaluation']*100 || 0,
    confidence: `${log['Confidence']*100}% 置信度` || '95% 置信度',
  };
});

// 最终结果计算
const finalResult = computed(() => props.result?.data ?? 0);
const finalResultText = computed(() => finalResult.value ? '判定为虚假信息' : '判定为真实信息');
const resultClass = computed(() => ({
  'result-success': finalResult.value === 0,
  'result-danger': finalResult.value === 1
}));
const resultTagType = computed(() => finalResult.value ? 'danger' : 'success');
const resultPercentage = computed(() => modelLog.value.confidence);

// 评估分数转换（示例数据）
const textualScore = computed(() => modelLog.value.textualEvaluation);
const commonsenseScore = computed(() => modelLog.value.commonsenseEvaluation);

const scoreColor = (percentage) => {
  return percentage > 80 ? '#67c23a' : '#f56c6c';
};

// 判断结果转换
const textualJudgmentText = computed(() => 
  modelLog.value.textualJudgment ? '存在异常' : '正常文本'
);
const commonsenseJudgmentText = computed(() => 
  modelLog.value.commonsenseJudgment ? '存在矛盾' : '符合逻辑'
);
const textualJudgmentType = computed(() => 
  modelLog.value.textualJudgment ? 'danger' : 'success'
);
const commonsenseJudgmentType = computed(() => 
  modelLog.value.commonsenseJudgment ? 'danger' : 'success'
);

// 折叠面板控制
const activeNames = ref(['1', '2', '3']);
</script>

<style lang="scss" scoped>
.arg-result-container {

  .result-overview {
    margin-bottom: 30px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    
    &.result-success {
      border-left: 4px solid #67c23a;
    }
    
    &.result-danger {
      border-left: 4px solid #f56c6c;
    }
    
    .result-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      
      .result-icon {
        font-size: 24px;
        margin-right: 10px;
      }
      
      .result-title {
        font-size: 18px;
        font-weight: 600;
      }
    }
    
    .result-content {
      text-align: center;
      
      h2 {
        margin: 10px 0;
        font-size: 24px;
      }
    }
  }

  .process-steps {
    margin: 40px 0;
    
    :deep(.el-step__title) {
      font-weight: 600;
    }
    
    :deep(.el-step__description) {
      color: #666;
      font-size: 14px;
    }
  }

  .detail-panels {
    :deep(.el-collapse-item__header) {
      font-size: 16px;
      font-weight: 600;
      padding-left: 20px;
      background: #f5f7fa;
      border-radius: 8px;
    }
    
    .analysis-panel {
      padding: 20px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin: 10px 0;
      height: calc(100% - 20px);
      box-sizing: border-box;
      
      h4 {
        margin-top: 0;
        margin-bottom: 10px;
        color: #333;
      }
      
      .rationale-content {
        line-height: 1.6;
        color: #666;
        white-space: pre-line;
      }
    }

    .assessment-panel {
      padding: 20px;
      background: #fff;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      box-sizing: border-box;
      margin: 10px 0;
      
      h4 {
        margin-bottom: 15px;
        color: #333;
      }
      
      .score-text {
        margin-top: 10px;
        font-size: 16px;
        font-weight: 600;
      }
    }

    .judgment-panel {
      padding: 20px;
      background: #fff;
      border-radius: 8px;
      
      .judgment-item {
        margin: 15px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .label {
          font-weight: 600;
          color: #333;
        }
      }
    }
  }
}
</style>