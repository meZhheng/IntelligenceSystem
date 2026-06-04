<template>
    <div id="sentiment-chart-area" class="disable-select">
        <!-- <span class="corner tl"></span>
        <span class="corner tr"></span>
        <span class="corner bl"></span>
        <span class="corner br"></span> -->
        <div id="sentiment-line-chart"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import { ElLoading } from 'element-plus';

const props = defineProps<{
  content?: Record<string, any>
}>();

// --- state ---
const checkAll_words = ref(false);
const indeterminate_words = ref(false);

const lineChart = ref<any>(null);
const rawData = ref<Record<string, any>>(props.content || {});
const filteredData = ref<Record<string, any>>({});

// 时间相关
const time_range = ref<[Date, Date]>([new Date(), new Date()]);
const time_range_default = ref<[Date, Date]>([new Date(), new Date()]);
const range_type = ref<'all' | string>('all');

// 图表配置 / 其它
const tooltip = reactive({
  trigger: "axis",
  axisPointer: { type: "cross" }
});
const loading = ref<any>(null);

// --- 监听 props.content ---
watch(
  () => props.content,
  (newValue) => {
    rawData.value = newValue || {};
    if (newValue && Object.keys(newValue).length > 0) {
      updateChartData();
      // 关闭 loading（如果存在）
      try { loading.value?.close?.(); } catch (e) { /* ignore */ }
    }
  },
  { deep: true }
);

// --- 生命周期 ---
onMounted(() => {
  nextTick().then(() => {
    initLineChart();
    loading.value = ElLoading.service({
      target: '#sentiment-chart-area',
      text: '加载中...',
    });
  });
});

onBeforeUnmount(() => {
  // 销毁 echarts 实例
  try { lineChart.value?.dispose?.(); } catch (e) { /* ignore */ }
  lineChart.value = null;
});

// --- methods (composition 风格实现) ---
function initLineChart() {
  const chartDom = document.getElementById('sentiment-line-chart');
  if (!chartDom) {
    console.error("找不到图表容器");
    return;
  }

  lineChart.value = echarts.init(chartDom);
  const colors = ['#FF0000', '#FFA500', '#32CD32'];

  const baseOption = {
    legend: {
      top: 12,
      icon: "square",
      itemWidth: 16,
      textStyle: { fontSize: 16 }
    },
    grid: {
      left: '2%',
      right: '2%',
      bottom: '10px',
      top: '80px',
      containLabel: true
    },
    xAxis: { type: 'category', data: [] },
    yAxis: { type: 'value' },
    tooltip,
    series: colors.map(color => ({
      type: 'line',
      lineStyle: { color },
      areaStyle: { color: (echarts as any).color?.modifyAlpha ? (echarts as any).color.modifyAlpha(color, 0.08) : undefined },
      itemStyle: { color },
      showSymbol: false,
      smooth: true
    }))
  };

  lineChart.value.setOption(baseOption);
}

function updateChartData() {
  const dates = Object.keys(rawData.value || {}).sort();

  const seriesData = {
    negative: [] as number[],
    neutral: [] as number[],
    positive: [] as number[]
  };

  dates.forEach(date => {
    // 如果 filteredData 没有该日期，尝试使用 rawData（兼容不同数据来源）
    const dateGroup = (filteredData.value && filteredData.value[date]) || (rawData.value && rawData.value[date]) || {};

    // 对该日期下的所有 target 累加（不再依赖 activeTargets）
    const sum = Object.keys(dateGroup).reduce((acc, target) => {
      const t = dateGroup[target] || {};
      acc.negative += Number(t.negative || 0);
      acc.neutral += Number(t.neutral || 0);
      acc.positive += Number(t.positive || 0);
      return acc;
    }, { negative: 0, neutral: 0, positive: 0 });

    seriesData.negative.push(sum.negative);
    seriesData.neutral.push(sum.neutral);
    seriesData.positive.push(sum.positive);
  });

  if (lineChart.value && lineChart.value.setOption) {
    lineChart.value.setOption({
      xAxis: { data: dates },
      series: [
        { name: '负面情绪', data: seriesData.negative },
        { name: '中立情绪', data: seriesData.neutral },
        { name: '正面情绪', data: seriesData.positive }
      ]
    });
  }
}
</script>


<style scoped lang="scss">
#sentiment-chart-area {
    position: relative;
    width: 100%;
    height: calc(100% - 50px);
    box-sizing: border-box;
    border-radius: 8px;
    background: #0a0f1c; /* 深色背景，突出光效 */
    // border: 2px solid rgba(30, 144, 255, 0.6);
    // box-shadow: 
    //     0 0 8px rgba(30, 144, 255, 0.6),
    //     0 0 25px rgba(0, 191, 255, 0.4),
    //     inset 0 0 8px rgba(0, 191, 255, 0.3);
    overflow: visible; /* 允许角标伸出容器 */
}

/* 公共角标样式 */
#sentiment-chart-area .corner {
    position: absolute;
    width: 20px;   /* 稍微大点，突出效果 */
    height: 20px;
    border: 2px solid #00bfff;
    box-shadow: 0 0 10px #00bfff;
    animation: breath 2.5s infinite ease-in-out;
}

/* 左上 */
#sentiment-chart-area .corner.tl {
    top: -10px;   /* 高度一半在外 */
    left: -10px;  /* 宽度一半在外 */
    border-right: none;
    border-bottom: none;
    border-radius: 8px 0 0 0;
}

/* 右上 */
#sentiment-chart-area .corner.tr {
    top: -10px;
    right: -10px;
    border-left: none;
    border-bottom: none;
    border-radius: 0 8px 0 0;
}

/* 左下 */
#sentiment-chart-area .corner.bl {
    bottom: -10px;
    left: -10px;
    border-right: none;
    border-top: none;
    border-radius: 0 0 0 8px;
}

/* 右下 */
#sentiment-chart-area .corner.br {
    bottom: -10px;
    right: -10px;
    border-left: none;
    border-top: none;
    border-radius: 0 0 8px 0;
}

/* 呼吸光效 */
@keyframes breath {
    0% {
        box-shadow: 0 0 8px #00bfff, 0 0 15px rgba(0,191,255,0.5);
        border-color: #00bfff;
    }
    50% {
        box-shadow: 0 0 16px #1e90ff, 0 0 30px rgba(30,144,255,0.8);
        border-color: #1e90ff;
    }
    100% {
        box-shadow: 0 0 8px #00bfff, 0 0 15px rgba(0,191,255,0.5);
        border-color: #00bfff;
    }
}

#sentiment-line-chart {
    width: 100%;
    height: 100%;
    color: aliceblue;
    box-sizing: border-box;
}
</style>