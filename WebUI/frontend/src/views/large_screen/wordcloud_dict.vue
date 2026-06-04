<template>
  <div id="wordCloudArea" class="keyword-cloud-wrap" ref="chartRef" :style="{ width: width, height: height }">
    <div class="chart-container" ref="chartContainerRef"></div>
    <!-- 统计信息 -->
    <!-- <div class="stats-panel">
      <div class="stat-item">
        <span class="stat-label">总关键词</span>
        <span class="stat-value">{{ totalCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">高频词</span>
        <span class="stat-value">{{ topKeywords }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">更新频率</span>
        <span class="stat-value">{{ updateFrequency }}</span>
      </div>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import { ElLoading } from 'element-plus';

const loading = ref(null);

// 定义关键词数据结构
type KeywordItem = {
  name: string;
  value: number;
};

const props = defineProps<{
  keywords?: KeywordItem[];
  width?: string;
  height?: string;
  title?: string;
  rotationRange?: number[]; // 词云旋转范围 [min, max]
  minSize?: number; // 最小字体大小
  maxSize?: number; // 最大字体大小
  shape?: 'circle' | 'cardioid' | 'diamond' | 'triangle-forward' | 'triangle' | 'pentagon' | 'star';
  updateInterval?: number; // 更新频率（秒）
}>();

// 响应式引用
const chartRef = ref<HTMLElement | null>(null);
const chartContainerRef = ref<HTMLElement | null>(null);
const chartInstance = ref<echarts.ECharts | null>(null);

// 默认配置
const DEFAULT_ROTATION_RANGE = [-45, 45];
const DEFAULT_MIN_SIZE = 12;
const DEFAULT_MAX_SIZE = 70;
const DEFAULT_SHAPE = 'circle';
const DEFAULT_UPDATE_INTERVAL = 15;

// 计算属性
const keywords = computed(() => props.keywords ?? []);
const rotationRange = computed(() => props.rotationRange ?? DEFAULT_ROTATION_RANGE);
const minSize = computed(() => props.minSize ?? DEFAULT_MIN_SIZE);
const maxSize = computed(() => props.maxSize ?? DEFAULT_MAX_SIZE);
const shape = computed(() => props.shape ?? DEFAULT_SHAPE);
const updateInterval = computed(() => props.updateInterval ?? DEFAULT_UPDATE_INTERVAL);

// 统计信息
const totalCount = computed(() => keywords.value.length);
const topKeywords = computed(() => {
    if (keywords.value.length === 0) return '0';
    const sorted = [...keywords.value].sort((a, b) => b.value - a.value);
    return sorted.slice(0, 15).map(item => item.name).join(' ');
});
const updateFrequency = computed(() => `${updateInterval.value}秒`);

/* 初始化图表 */
function initChart() {
  if (!chartContainerRef.value) return;
  
  // 销毁现有实例
  if (chartInstance.value) {
    chartInstance.value.dispose();
  }
  
  // 创建新实例
  chartInstance.value = echarts.init(chartContainerRef.value, null, {
    renderer: 'canvas',
    useDirtyRect: false
  });
  
  // 设置图表配置
  setChartOptions();
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
}

// 辅助：生成 CSS rgb/rgba，遇到非法值返回 fallback
const rgbToCssSafe = (rgb: number[], alpha?: number) => {
  if (!Array.isArray(rgb) || rgb.length < 3) return 'rgb(77,166,255)'; // fallback
  const [r, g, b] = rgb.map(x => Number.isFinite(x) ? Math.round(x) : 0);
  if (alpha == null) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
/* 设置图表选项 */
function setChartOptions() {
  if (!chartInstance.value) return;

  // 固定的最小/最大颜色（blue-100 -> blue-900）
  const LOW_RGB = [147, 197, 253]; // blue-100
  const HIGH_RGB = [30, 58, 138];  // blue-900

  // 辅助函数：clamp、RGB -> CSS、根据比例插值、调整亮度
  const clamp = (v: number, a = 0, b = 255) => Math.max(a, Math.min(b, Math.round(v)));

  // 根据 t(0..1) 在两个 RGB 之间线性插值
  const lerpRgb = (a: number[], b: number[], t: number) => [
    clamp(a[0] + (b[0] - a[0]) * t),
    clamp(a[1] + (b[1] - a[1]) * t),
    clamp(a[2] + (b[2] - a[2]) * t)
  ];

  // 调整亮度：amount 为 -1..1（负数变暗，正数变亮），简单向 0 或 255 推近
  const adjustBrightness = (rgb: number[], amount: number) => {
    if (amount === 0) return rgb.map(v => clamp(v));
    if (amount > 0) {
      return rgb.map(v => clamp(v + (255 - v) * amount));
    } else {
      return rgb.map(v => clamp(v + (0 - v) * (-amount)));
    }
  };

  // 计算当前关键词中的最小/最大值（仅数值）
  const values = keywords.value.map((k: any) => (typeof k.value === 'number' ? k.value : NaN)).filter((v: number) => !Number.isNaN(v));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1; // 防止除以0

  const option = {
    tooltip: {
      show: true,
      backgroundColor: 'rgba(5, 25, 45, 0.9)',
      borderColor: 'rgba(100, 200, 255, 0.3)',
      borderWidth: 1,
      textStyle: {
        color: '#e0f7fa',
        fontSize: 14
      },
      formatter: (params: any) => {
        return `${params.name}<br/>权重: ${params.value}`;
      },
      extraCssText: 'box-shadow: 0 0 10px rgba(100, 200, 255, 0.5);'
    },
    series: [{
      type: 'wordCloud',
      gridSize: 2,
      sizeRange: [minSize.value, maxSize.value],
      rotationRange: rotationRange.value,
      shape: shape.value,
      width: '100%',
      height: '100%',
      drawOutOfBound: false,
      textStyle: {
        fontFamily: 'Microsoft YaHei, Arial, sans-serif',
        fontWeight: 'bold',
        // 假定你已定义了 clamp, lerpRgb, adjustBrightness, rgbToCssSafe 等辅助函数（参照之前代码）
        color: (params: any) => {
          // 防护：解析 value
          const rawVal = params && params.value;
          const val = Number.isFinite(Number(rawVal)) ? Number(rawVal) : 0;

          // 规范化 weight
          let weight = 0.5;
          if (maxValue !== minValue && Number.isFinite(minValue) && Number.isFinite(maxValue)) {
            weight = Math.max(0, Math.min(1, (val - minValue) / (maxValue - minValue)));
          }

          // 基础颜色插值并微调
          const baseRgb = lerpRgb(LOW_RGB, HIGH_RGB, Number.isFinite(weight) ? weight : 0.5);

          // name hash -> 微扰动
          const name = String(params.name || '');
          let hash = 0;
          for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
            hash |= 0;
          }
          const hueOffset = ((hash >> 2) % 13) - 6;
          const microAdjust = Number.isFinite(hueOffset) ? (hueOffset / 30) : 0;
          const adjustedBase = adjustBrightness(baseRgb, microAdjust);

          // 若 data 中有合法的 item.color 字符串则优先用它
          const itemColor = params.data && params.data.color;
          if (typeof itemColor === 'string' && itemColor.trim()) {
            return itemColor;
          }

          // 根据权重返回不同亮度的纯色字符串（不使用 gradient）
          // 高权重 -> 更亮一点，低权重 -> 稍暗一些
          const brightnessAdj = weight >= 0.85 ? 0.18 : weight >= 0.6 ? 0.08 : 0.02;
          const finalRgb = adjustBrightness(adjustedBase, brightnessAdj);

          return rgbToCssSafe(finalRgb); // e.g. "rgb(34,120,200)"
        },
        emphasis: {
          shadowBlur: 10,
          shadowColor: '#4da6ff'
        }
      },
      emphasis: {
        textStyle: {
          textShadowBlur: 20,
          textShadowColor: '#4da6ff'
        }
      },
      data: keywords.value.map((item: any) => ({
        name: item.name,
        value: item.value,
        category: item.category,
        color: item.color
      }))
    }],
    animation: true,
    animationDuration: 1000
  };

  chartInstance.value.setOption(option);
}


/* 处理窗口大小变化 */
function handleResize() {
  if (chartInstance.value) {
    chartInstance.value.resize();
  }
}

/* 生命周期钩子 */
onMounted(async () => {
  await nextTick();
  initChart();

  // 初始渲染
  setChartOptions();
  nextTick().then(() => {
    loading.value = ElLoading.service({
        target: '#wordCloudArea',
        text: '加载中...',
    });
  });
});

onBeforeUnmount(() => {
  if (chartInstance.value) {
    chartInstance.value.dispose();
    chartInstance.value = null;
  }
  window.removeEventListener('resize', handleResize);
});

/* 监听关键词变化 */
watch(keywords, () => {
  if (chartInstance.value) {
    setChartOptions();
    try { loading.value?.close?.(); } catch (e) { /* ignore */ }
  }
}, { deep: true });
</script>

<style scoped>
.keyword-cloud-wrap {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgba(5,12,25,0.8), rgba(3,6,12,0.8));
  border-radius: 12px;
  padding: 24px 20px 20px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(0, 100, 255, 0.15), inset 0 0 20px rgba(0, 20, 40, 0.5);
  border: 1px solid rgba(100, 200, 255, 0.1);
}

/* 标题栏样式 */
.title-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  position: relative;
  z-index: 2;
}

.title-glow {
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.7), transparent);
  border-radius: 2px;
  animation: glow-pulse 3s infinite;
}

.title-text {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  padding: 0 16px;
  background: linear-gradient(90deg, #4da6ff, #80ccff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 10px rgba(77, 166, 255, 0.3);
  position: relative;
  z-index: 2;
  letter-spacing: 1px;
}

.title-decoration {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.8), transparent);
  margin-left: 12px;
}

/* 图表容器 */
.chart-container {
  width: 100%;
  height: calc(100% - 50px);
  position: relative;
  z-index: 1;
}

/* 统计面板 */
.stats-panel {
  position: absolute;
  bottom: 16px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  background: rgba(0, 10, 20, 0.7);
  border-radius: 8px;
  padding: 10px 16px;
  border: 1px solid rgba(100, 200, 255, 0.1);
  z-index: 2;
  backdrop-filter: blur(4px);
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 18px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #4da6ff;
  text-shadow: 0 0 5px rgba(77, 166, 255, 0.5);
}

/* 动画效果 */
@keyframes glow-pulse {
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}

.keyword-cloud-wrap:hover .title-glow {
  animation-duration: 2s;
}
</style>