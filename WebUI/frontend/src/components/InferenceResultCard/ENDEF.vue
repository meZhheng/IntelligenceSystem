<template>
<div v-if="hasData" class="debiased-rumor-container disable-select">
    <!-- 结果概览 -->
    <el-card class="result-card" :class="resultClass">
    <div class="result-header">
        <el-icon class="status-icon" :size="40">
        <SuccessFilled v-if="isReal" />
        <WarningFilled v-else />
        </el-icon>
        <div class="result-content">
        <h2>{{ verdictText }}</h2>
        <el-tag :type="verdictType" size="large">{{ confidenceText }}</el-tag>
        </div>
    </div>
    </el-card>

    <!-- 原文展示 -->
    <el-card class="text-card">
        <template #header>
            <span class="card-title">关键实体提取</span>
        </template>
        <div class="original-text" v-html="highlightedText"></div>
    </el-card>

    <!-- 置信度分析 -->
    <el-card class="analysis-card">
        <template #header>
        <span class="card-title">模型决策分析</span>
        </template>

        <div class="decision-flow">
        <!-- 输入维度 -->
        <div class="input-dimensions">
            <div class="dimension text-dimension">
            <div class="dimension-header">
                <el-icon class="dimension-icon"><Document /></el-icon>
                <span class="dimension-title">文本偏差分析</span>
            </div>
            <el-progress 
                type="dashboard"
                :percentage="textConfidence"
                :color="textColor"
                :width="180"
            >
                <template #default="{ percentage }">
                <div class="progress-content">
                    <span class="metric-label">文本支持度</span>
                    <span class="metric-value">{{ percentage }}%</span>
                </div>
                </template>
            </el-progress>
            </div>

            <div class="dimension entity-dimension">
            <div class="dimension-header">
                <el-icon class="dimension-icon"><Connection /></el-icon>
                <span class="dimension-title">实体维度分析</span>
            </div>
            <el-progress 
                type="dashboard"
                :percentage="entityConfidence"
                :color="entityColor"
                :width="180"
            >
                <template #default="{ percentage }">
                <div class="progress-content">
                    <span class="metric-label">实体支持度</span>
                    <span class="metric-value">{{ percentage }}%</span>
                </div>
                </template>
            </el-progress>
            </div>
        </div>

        <!-- 综合决策 -->
        <div class="synthesis-panel">
            <div class="formula-display">
            <span class="formula-text">最终决策 = </span>
            <span class="formula-component">
                (文本支持度 × {{ textWeight }}%) 
                <el-icon class="formula-icon"><Plus /></el-icon>
                (实体支持度 × {{ entityWeight }}%)
            </span>
            </div>

            <div class="result-display">
            <el-progress
                type="circle"
                :percentage="finalConfidence"
                :color="finalColor"
                :width="200"
            >
                <template #default="{ percentage }">
                <div class="final-result">
                    <span class="result-label">最终置信度</span>
                    <span class="result-value">{{ percentage }}%</span>
                </div>
                </template>
            </el-progress>
            </div>
        </div>
        </div>
    </el-card>
    <!-- 实体展示 -->
    <!-- <el-card class="entity-card">
    <template #header>
        <span class="card-title">关键实体分析</span>
    </template>

    <div class="entity-cloud">
        <el-tag
            v-for="(entity, index) in entities"
            :key="index"
            class="entity-tag"
            effect="dark"
            size="large"
        >
            {{ entity }}
        </el-tag>
    </div>
    </el-card> -->
</div>
</template>

<script setup>
import { computed } from 'vue';
import { SuccessFilled, WarningFilled } from '@element-plus/icons-vue';

const props = defineProps({
    data: {
        type: Object,
        default: null
    }
});

// 只有当 data 不为 null 时才渲染主要内容
const hasData = computed(() => props.data !== null);

// 分类结果
const isReal = computed(() => props.data?.prediction === 0);

// 假设的权重配置（根据实际模型调整）
const textWeight = 90; 
const entityWeight = 10;

// 置信度与原始分数
const raw = computed(() => props.data?.raw_scores ?? {
    final: 0,
    bias_contrib: 0,
    entity_contrib: 0
});

// 百分比形式
const finalConfidence = computed(() => Math.round(raw.value.final * 100));
const textConfidence  = computed(() => Math.round(raw.value.bias_contrib * 100));
const entityConfidence= computed(() => Math.round(raw.value.entity_contrib * 100));

// 实体列表
const entities = computed(() =>
    (props.data?.entities ?? '').split('[SEP]').filter(s => s)
);

// 样式／标签
const resultClass = computed(() => ({
    'real-news': isReal.value,
    'fake-news': !isReal.value
}));
const verdictText = computed(() =>
    isReal.value ? '真实信息' : '虚假信息'
);
const verdictType = computed(() =>
    isReal.value ? 'success' : 'danger'
);
const confidenceText = computed(() =>
    `${finalConfidence.value}% 置信度`
);

// 进度条颜色
const finalColor = [
    { color: '#67c23a', percentage: 0 },
    { color: isReal.value ? '#389e0d' : '#cf1322', percentage: 80 }
];
const textColor = [
    { color: '#f56c6c', percentage: 0 },
    { color: '#cf1322', percentage: 80 }
];
const entityColor = [
    { color: '#f56c6c', percentage: 0 },
    { color: '#cf1322', percentage: 80 }
];

// 原文高亮
const highlightedText = computed(() => {
    let text = props.data.text;
    // 创建实体副本并按长度降序排序（解决短实体优先匹配长实体的问题）
    const sortedEntities = entities.value.slice().sort((a, b) => b.length - a.length);
    
    sortedEntities.forEach(entity => {
        // 转义正则特殊字符
        const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 使用单词边界和正向向前断言确保精确匹配
        const regex = new RegExp(`(${escapedEntity})(?![^<]*>)(?![^<]*</span>)`, 'g');
        text = text.replace(regex, 
            `<span class="entity-highlight" style="background: ${getEntityColor(entity)}">$1</span>`
        );
    });
    return text;
});


const getEntityColor = (entity) => {
  const hash = entity.split('').reduce((acc, char) => 
    acc + char.charCodeAt(0), 0
  );
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 80%)`;
};
</script>
  

<style lang="scss" scoped>
.debiased-rumor-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  
  .result-card {
    padding: 30px;
    border-radius: 12px;
    transition: transform 0.3s;
    
    .result-header {
      display: flex;
      align-items: center;
      gap: 20px;
      
      .status-icon {
        flex-shrink: 0;
      }
      
      .result-content {
        h2 {
          margin: 0;
          font-size: 24px;
          color: #2c3e50;
        }
      }
    }
  }
  
  .analysis-card {
    .decision-flow {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 30px;
        
        @media (min-width: 768px) {
        flex-direction: row;
        justify-content: space-between;
        }
    }

    .input-dimensions {
        display: flex;
        flex-direction: column;
        gap: 20px;
        flex: 1;
        
        @media (min-width: 768px) {
        flex-direction: row;
        justify-content: space-around;
        }
    }

    .dimension {
        text-align: center;
        padding: 20px;
        background: #f5f7fa;
        border-radius: 8px;
        transition: transform 0.3s;
        
        &:hover {
            transform: translateY(-5px);
        }
        
        .dimension-header {
            margin-bottom: 27px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .dimension-icon {
        font-size: 20px;
        }
        
        .dimension-title {
        font-size: 16px;
        font-weight: 600;
        }
    }

    .synthesis-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        
        .formula-display {
        background: #fff3cd;
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: monospace;
        font-size: 14px;
        color: #856404;
        }
        
        .formula-icon {
        color: #666;
        }
        
        .result-display {
        position: relative;
        
        &::after {
            content: '';
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 10px solid #e4e7ed;
        }
        }
    }
    }
  
  .entity-card {
    margin-bottom: 30px;
    
    .entity-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 10px;
    }
    
    .entity-tag {
      font-size: 14px;
      padding: 8px 12px;
      border-radius: 18px;
      transition: transform 0.2s;
      
      &:hover {
        transform: scale(1.05);
      }
    }
  }
  
  .text-card {
    .original-text {
      line-height: 1.8;
      white-space: pre-line;
      padding: 10px;
      min-height: 100px;
      border-radius: 8px;
      background: #f5f7fa;
    }
    
    .entity-highlight {
        padding: 2px 4px;
        border-radius: 4px;
        font-weight: 600;
        margin: 0 2px;
    }
  }
  
  // 动态样式
  .real-news {
    border-left: 4px solid #67c23a;
    background: #f0f9eb;
  }
  
  .fake-news {
    border-left: 4px solid #f56c6c;
    background: #fef0f0;
  }
}
</style>