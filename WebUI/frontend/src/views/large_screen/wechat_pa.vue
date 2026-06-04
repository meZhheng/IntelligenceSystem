<template>
  <div class="compliance-monitor-container" id="wechat-pa-monitor">
    <!-- <div class="panel-header">
      <div class="header-title">文章合规监测统计</div>
      <div class="header-subtitle">实时监测 · 智能分析 · 风险预警</div>
    </div> -->
    
    <div class="panel-content">
      <!-- 左侧统计卡片 -->
      <div class="stats-section">
        <div 
            v-for="(stat, index) in statsData" 
            :key="index" 
            class="stat-card"
            :class="`stat-card-${index}`"
        >
            <div class="card-glow"></div>
            <div class="card-content">
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-value">{{ formatNumber(stat.value) }}</div>
            </div>
        </div>
      </div>
      
      <!-- 右侧柱状图 -->
      <div class="chart-section">
        <div class="chart-title">违规类型TOP5</div>
        <div id="compliance-bar-chart" class="bar-chart"></div>
        
        <!-- 图例说明 -->
        <!-- <div class="chart-legend">
          <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #00aaff, #007aff);"></div>
            <div class="legend-text">违规数量</div>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="box-shadow: 0 0 8px rgba(255, 200, 0, 0.7);"></div>
            <div class="legend-text">高风险</div>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="box-shadow: 0 0 8px rgba(255, 100, 100, 0.7);"></div>
            <div class="legend-text">严重风险</div>
          </div>
        </div> -->
      </div>
    </div>
    
    <!-- 底部状态栏 -->
    <!-- <div class="panel-footer">
      <div class="status-item">
        <span class="status-icon pulse">●</span>
        <span>数据源: 公众号内容监测平台</span>
      </div>
      <div class="status-item">
        <span class="status-icon">●</span>
        <span>监测范围: 全平台</span>
      </div>
      <div class="status-item">
        <span class="status-icon">●</span>
        <span>最后扫描: {{ lastScanTime }}</span>
      </div>
    </div> -->
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElLoading } from 'element-plus';

const loading = ref(null);

// 定义props
const props = defineProps({
  stats: {
    type: Object,
    required: true,
    default: () => ({
      totalArticles: 0,
      monitoredArticles: 0,
      nonCompliantArticles: 0,
    })
  },
  violationTypes: {
    type: Array,
    required: true,
    default: () => []
  }
})

// 响应式状态
const charts = ref({
  bar: null
})
const currentTime = ref('')
const lastScanTime = ref('')
const statsData = ref([
  { label: '公众号文章数', value: 0},
  { label: '已监测文章数', value: 0},
  { label: '内容不合格数', value: 0}
])

// 格式化数字（添加逗号分隔）
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

// 初始化图表
const initCharts = () => {
    charts.value.bar = echarts.init(document.getElementById('compliance-bar-chart'), null, {
        renderer: 'canvas'
    })
    
    // 设置初始图表配置
    const option = getBarChartOption()
    charts.value.bar.setOption(option)
}

// 获取柱状图配置
const getBarChartOption = () => {
  // 按违规数量排序，取前5
  const top5Violations = [...props.violationTypes]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .reverse() // 反转以便横向柱状图从上到下排序
  
  // 识别高风险和严重风险类型
  const highRiskTypes = top5Violations
    .filter(item => item.riskLevel === 'high')
    .map(item => item.type)
  
  const criticalRiskTypes = top5Violations
    .filter(item => item.riskLevel === 'critical')
    .map(item => item.type)
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(0, 150, 255, 0.2)'
        }
      },
      backgroundColor: 'rgba(0, 20, 40, 0.9)',
      borderColor: 'rgba(0, 195, 255, 0.8)',
      textStyle: {
        color: '#e0f7fa'
      },
      formatter: (params) => {
        const param = params[0]
        const riskText = param.data.riskLevel === 'critical' ? 
          '<span style="color: #ff4081">[严重风险]</span>' : 
          param.data.riskLevel === 'high' ? 
          '<span style="color: #ff9800">[高风险]</span>' : 
          '<span style="color: #81d4fa">[中风险]</span>'
        
        return `
          <div style="padding: 10px; font-family: 'Arial', sans-serif;">
            <div style="color: #00e5ff; font-size: 16px; margin-bottom: 8px;">${param.name}</div>
            <div style="display: flex; align-items: center; margin-top: 5px;">
              <span style="width: 8px; height: 8px; background: #00e5ff; border-radius: 50%; margin-right: 8px;"></span>
              <span style="color: #b3e5fc;">违规数量:</span> 
              <span style="color: #00e5ff; font-weight: bold; margin-left: 5px;">${param.value}</span>
            </div>
            <div style="display: flex; align-items: center; margin-top: 5px;">
              <span style="width: 8px; height: 8px; background: ${param.data.riskLevel === 'critical' ? '#ff4081' : param.data.riskLevel === 'high' ? '#ff9800' : '#81d4fa'}; border-radius: 50%; margin-right: 8px;"></span>
              <span style="color: #b3e5fc;">风险等级:</span> 
              <span style="color: ${param.data.riskLevel === 'critical' ? '#ff4081' : param.data.riskLevel === 'high' ? '#ff9800' : '#81d4fa'}; font-weight: bold; margin-left: 5px;">${riskText}</span>
            </div>
          </div>
        `
      },
      extraCssText: 'box-shadow: 0 0 20px rgba(0, 195, 255, 0.5);'
    },
    grid: {
      top: '1%',
      right: '5%',
      bottom: '1%',
      left: '5%',
      containLabel: true
    },
    xAxis: {
        show: false,
        type: 'value',
        axisLine: {
            lineStyle: {
                color: 'rgba(224, 247, 250, 0.3)'
            }
        },
        axisLabel: {
            color: 'rgba(224, 247, 250, 0.7)',
            formatter: (value) => {
            if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'k'
            }
            return value
            }
        },
        splitLine: {
            lineStyle: {
                color: 'rgba(224, 247, 250, 0.1)'
            }
        }
    },
    yAxis: {
      type: 'category',
      data: top5Violations.map(item => item.type),
        // 轴线（整条竖轴）的颜色和粗细
        axisLine: {
            show: true,
            lineStyle: {
                color: 'rgba(191, 219, 254, 0.5)', // 轴线颜色（可调）
                width: 4,                        // 轴线宽度（像素）
                type: 'solid'
            }
        },
        axisTick: {
            show: false,
        },
        // 使用 rich + formatter 根据风险级别动态改变标签样式（大小/颜色/加粗）
        axisLabel: {
            interval: 0,
            formatter: (value) => {
                if (criticalRiskTypes.includes(value)) {
                    return `{critical|${value}}`;
                }
                if (highRiskTypes.includes(value)) {
                    return `{high|${value}}`;
                }
                return `{normal|${value}}`;
            },
            rich: {
                normal: {
                    color: 'rgba(224,247,250,0.85)',
                    fontSize: 20,
                    fontWeight: 700,
                    padding: [0, 6, 0, 6]
                },
                high: {
                    color: '#ff9800',
                    fontSize: 20,
                    fontWeight: 700,
                    padding: [0, 6, 0, 6]
                },
                critical: {
                    color: '#ff4081',
                    fontSize: 20,
                    fontWeight: 700,
                    padding: [0, 6, 0, 6]
                }
            }
        }
    },
    series: [
      {
        name: '违规数量',
        type: 'bar',
        barWidth: '40px',
        data: top5Violations.map(item => ({
          value: item.count,
          riskLevel: item.riskLevel,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: item.riskLevel === 'critical' ? 
                'rgba(255, 64, 130, 0.8)' : 
                item.riskLevel === 'high' ? 
                'rgba(255, 152, 0, 0.8)' : 
                'rgba(0, 170, 255, 0.8)' },
              { offset: 1, color: item.riskLevel === 'critical' ? 
                'rgba(255, 100, 150, 1)' : 
                item.riskLevel === 'high' ? 
                'rgba(255, 180, 50, 1)' : 
                'rgba(0, 200, 255, 1)' }
            ]),
            shadowBlur: item.riskLevel === 'critical' ? 15 : 
                        item.riskLevel === 'high' ? 10 : 5,
            shadowColor: item.riskLevel === 'critical' ? 'rgba(255, 64, 130, 0.5)' : 
                         item.riskLevel === 'high' ? 'rgba(255, 152, 0, 0.5)' : 
                         'rgba(0, 150, 255, 0.3)'
          }
        })),
        label: {
            show: true,
            position: 'right',
            color: '#fff',
            formatter: '{c}',
            fontSize: 20,
            fontWeight: 'bold',
            offset: [5, 0],
        },
        emphasis: {
          itemStyle: {
            opacity: 0.9
          }
        }
      }
    ],
    animationEasing: 'elasticOut',
    animationDelay: function (idx) {
      return idx * 20;
    }
  }
}

// 更新图表
const updateChart = () => {
  if (charts.value.bar) {
    const option = getBarChartOption()
    charts.value.bar.setOption(option, true)
  }
}

// 处理窗口大小调整
const handleResize = () => {
  if (charts.value.bar) {
    charts.value.bar.resize()
  }
}

// 清理资源
const cleanup = () => {
  if (charts.value.bar) {
    charts.value.bar.dispose()
    charts.value.bar = null
  }
  window.removeEventListener('resize', handleResize)
}

// 初始化数据
const initData = () => {
    statsData.value = [
        { 
            label: '公众号文章总数', 
            value: props.stats.totalArticles, 
        },
        { 
            label: '已监测文章数', 
            value: props.stats.monitoredArticles, 
        },
        { 
            label: '内容不合格数', 
            value: props.stats.nonCompliantArticles, 
        }
    ]
}

// 生命周期钩子
onMounted(() => {
    window.addEventListener('resize', handleResize)
    nextTick().then(() => {
        loading.value = ElLoading.service({
            target: '#wechat-pa-monitor',
            text: '加载中...',
        });
    });
})

onUnmounted(() => {
  cleanup()
})

// 监听数据变化
watch(() => props.stats, (newVal) => {
  if (newVal) {
    initData()
  }
}, { deep: true })

watch(() => props.violationTypes, (newVal) => {
  if (newVal && newVal.length > 0) {
    initCharts()
    try { loading.value?.close?.(); } catch (e) { /* ignore */ }
  }
}, { deep: true })
</script>

<style scoped>
.compliance-monitor-container {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #050c19, #03060c);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 全息网格背景 */
.holographic-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(0, 150, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 150, 255, 0.05) 1px, transparent 1px);
  background-size: 30px 30px;
  pointer-events: none;
  z-index: 0;
}

/* 霓虹边框 */
.neon-border {
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  border: 1px solid;
  border-image: linear-gradient(to right, #00aaff, #4b00ff, #c200ff) 1;
  pointer-events: none;
  z-index: 1;
  border-radius: 8px;
}

.panel-header {
  padding: 15px 25px 10px;
  color: #e0f7fa;
  position: relative;
  z-index: 10;
  border-bottom: 1px solid rgba(0, 150, 255, 0.2);
}

.header-title {
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 1px;
  text-shadow: 0 0 15px rgba(0, 229, 255, 0.7);
  background: linear-gradient(90deg, #00e5ff, #00aaff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 6px;
  font-family: 'Arial', sans-serif;
}

.header-subtitle {
  font-size: 13px;
  color: rgba(224, 247, 250, 0.7);
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(0, 150, 255, 0.3);
}

.panel-content {
  display: flex;
  flex: 1;
  padding: 15px;
  min-height: 450px;
}

/* 左侧统计区域 */
.stats-section {
  width: 30%;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-right: 10px;
}

/* 主题变量（可按需调整）*/
:root {
  --accent-start: rgba(37, 99, 235, 0.95);   /* blue-ish */
  --accent-mid:   rgba(16, 185, 129, 0.85);  /* teal-ish */
  --accent-end:   rgba(6, 95, 170, 0.75);
  --border-glow:  rgba(0, 195, 255, 0.85);
}

/* card 背景与上下边框（通过伪元素实现）*/
.stat-card {
    margin: 50px 10px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    align-items: center;
    flex: 1;
    border-radius: 8px;
    backdrop-filter: blur(5px);
    transition: transform 0.28s ease, box-shadow 0.28s ease;
    z-index: 2;

    /* 渐变背景 + 内侧阴影，制造凹陷感 */
    background: linear-gradient(180deg,
        rgba(6,16,40,0.72) 0%,
        rgba(8,40,80,0.56) 30%,
        rgba(4,75,130,0.45) 100%);

    box-shadow:
        inset 0 2px 10px rgba(0,0,0,0.55),
        inset 0 -18px 40px rgba(6,30,60,0.25);
}

/* 左右为空：使用伪元素绘制上/下边框（从 left 12px 到 right 12px）*/
.stat-card::before,
.stat-card::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  height: 3px;
  border-radius: 2px;
  pointer-events: none;
  z-index: 1;
  /* 使用线性渐变并移动以营造流动光带 */
  background-image: linear-gradient(90deg,
    rgba(0,0,0,0) 0%,
    rgba(60,200,255,0.95) 20%,
    rgba(120,180,255,0.95) 50%,
    rgba(60,200,255,0.9) 80%,
    rgba(0,0,0,0) 100%);
  background-size: 200% 100%;
  animation: moveGradient 6s linear infinite;
  filter: drop-shadow(0 4px 12px rgba(0,195,255,0.12));
}

/* top / bottom 定位 */
.stat-card::before { top: 10px; }   /* 上边框 */
.stat-card::after  { bottom: 10px; }/* 下边框 */

/* 角落装饰（短线块）- 放在伪元素上方 - 采用 box-shadow 仿多个小块 */
.stat-card::before {
  box-shadow:
    -16px 0 0 0 rgba(10,30,60,0.35),
    16px 0 0 0 rgba(10,30,60,0.35);
}
.stat-card::after {
  box-shadow:
    -16px 0 0 0 rgba(10,30,60,0.35),
    16px 0 0 0 rgba(10,30,60,0.35);
}

/* 背景内部动态光点 / 线条（card-glow DOM 元素）*/
.card-glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle at 12% 20%, rgba(0,200,255,0.10), transparent 8%),
    radial-gradient(circle at 88% 80%, rgba(120,150,255,0.06), transparent 10%),
    linear-gradient(135deg, rgba(10,35,75,0.14), rgba(2,70,110,0.08));
  mix-blend-mode: screen;
  transition: opacity 0.35s ease, transform 0.35s ease;
  opacity: 1;
}

/* 叠加一条微弱的纵向发光线（视觉细节） */
.stat-card .card-glow::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 6%;
  bottom: 6%;
  width: 2px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0));
  filter: blur(6px);
  opacity: 0.35;
  pointer-events: none;
}

/* hover 强化效果 */
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 40px rgba(0,150,255,0.16), 0 2px 30px rgba(0,40,80,0.45);
}
.stat-card:hover::before,
.stat-card:hover::after {
  transform: translateY(0);
  filter: drop-shadow(0 8px 24px rgba(0,195,255,0.18));
  animation-duration: 4s;
  opacity: 1;
}
.stat-card:hover .card-glow {
  transform: scale(1.02);
  opacity: 1;
}

/* 小屏兼容：收缩边框长度 */
@media (max-width: 720px) {
  .stat-card::before,
  .stat-card::after {
    left: 8px;
    right: 8px;
  }
}

/* 动画关键帧：光带流动 */
@keyframes moveGradient {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.card-content {
    width: 100%;
    padding: 20px;
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

.stat-label {
    font-size: 24px;
    font-weight: 800;
    color: rgba(255, 255, 255, 1);
    margin-bottom: 8px;
    text-shadow: 0 0 5px rgba(0, 150, 255, 0.2);
}

.stat-value {
    text-align: center;
    margin: 0 auto;
    font-weight: 800;
    font-size: 36px;
    line-height: 1;
    color: #00e5ff;
    margin-bottom: 10px;
    text-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
    letter-spacing: 1px;
}

.card-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed rgba(0, 150, 255, 0.2);
}

.update-time {
  font-size: 12px;
  color: rgba(224, 247, 250, 0.5);
}

/* 右侧图表区域 */
.chart-section {
    width: 100%;
    padding-left: 15px;
    display: flex;
    flex-direction: column;
}

.chart-title {
    margin: auto;
    font-size: 40px;
    color: #00e5ff;
    text-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
    font-weight: bold;
    letter-spacing: 3px;
}

.bar-chart {
  flex: 1;
  min-height: 300px;
}

.chart-legend {
  display: flex;
  gap: 20px;
  margin-top: 10px;
  padding-left: 5px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: rgba(224, 247, 250, 0.7);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 6px;
  background: linear-gradient(90deg, #00aaff, #007aff);
}

/* 底部状态栏 */
.panel-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 25px;
  background: rgba(0, 15, 30, 0.7);
  border-top: 1px solid rgba(0, 195, 255, 0.2);
  color: rgba(224, 247, 250, 0.8);
  font-size: 13px;
  z-index: 10;
}

.status-item {
  display: flex;
  align-items: center;
}

.status-icon {
  color: #00e5ff;
  margin-right: 8px;
  font-size: 10px;
}

.pulse {
  animation: statusPulse 1.5s infinite;
}

@keyframes statusPulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

/* 禁止选择 */
.disable-select {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>