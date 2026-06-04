<template>
  <div id="map-area" class="disable-select">
    <div class="map-container">
      <div class="holographic-grid"></div>
      <div id="map-chart"></div>
      
      <!-- 科技感定位指示器 -->
      <!-- <div class="location-indicator">
        <div class="pulse-ring"></div>
        <div class="core"></div>
        <div class="coordinates">{{ currentLocation }}</div>
      </div> -->
      
      <!-- 科技感图例 -->
      <div class="legend-container">
        <div class="legend-title">舆情热度</div>
        <div class="legend-bar">
          <div v-for="(color, index) in legendColors" :key="index" class="legend-segment" 
               :style="{ backgroundColor: color }"></div>
        </div>
        <div class="legend-values">
          <span>低</span>
          <span>高</span>
        </div>
      </div>
    </div>
    
    <!-- 底部状态栏 -->
    <!-- <div class="status-bar">
      <div class="status-item">
        <span class="status-icon">●</span>
        <span>数据源: {{ dataSource }}</span>
      </div>
      <div class="status-item">
        <span class="status-icon pulse">●</span>
        <span>实时监测中</span>
      </div>
      <div class="status-item">
        <span class="status-icon">●</span>
        <span>更新时间: {{ currentTime }}</span>
      </div>
    </div> -->
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import chinaMap from '@/assets/jsons/china.json'
import { ElLoading } from 'element-plus';

const loading = ref(null);
// 定义props
const props = defineProps({
  mapData: {
    type: Object,
    required: true
  }
})

// 响应式状态
const charts = ref({
  map: null
})
const currentLocation = ref('中国 · 北京')
const currentTime = ref('')
const dataSource = ref('智能检测系统')
const legendColors = [
  'rgb(186, 230, 253)', 'rgb(125, 211, 252)', 'rgb(56, 189, 248)', 'rgb(14, 165, 233)', 
  'rgb(37, 99, 235)', 'rgb(29, 78, 216)', 'rgb(30, 64, 175)', 'rgb(30, 58, 138)'
]

// 计算属性
const maxHeatValue = computed(() => props.mapData.max_value || 100)

// 初始化时间
const updateTime = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    })
}
updateTime()

// 初始化图表
const initCharts = () => {
  echarts.registerMap('china', chinaMap)
  charts.value.map = echarts.init(document.getElementById('map-chart'), null, {
      renderer: 'canvas'
  })
  
  // 设置初始图表配置
  const option = getMapOption()
  charts.value.map.setOption(option)
}

// 获取地图配置
const getMapOption = () => {
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 20, 40, 0.9)',
      borderColor: 'rgba(0, 195, 255, 0.8)',
      borderWidth: 1,
      textStyle: {
        color: '#e0f7fa',
        fontFamily: 'Arial, sans-serif'
      },
      formatter: (params) => {
        currentLocation.value = `${params.name} · 舆情热度`
        return `
          <div style="padding: 10px; font-family: 'Arial', sans-serif;">
            <div style="color: #00e5ff; font-size: 16px; margin-bottom: 8px;">${params.name}</div>
            <div style="display: flex; align-items: center; margin-top: 5px;">
              <span style="width: 8px; height: 8px; background: #00e5ff; border-radius: 50%; margin-right: 8px;"></span>
              <span style="color: #b3e5fc;">舆情热度:</span> 
              <span style="color: #00e5ff; font-weight: bold; margin-left: 5px;">${params.value}</span>
            </div>
            <div style="display: flex; align-items: center; margin-top: 5px;">
              <span style="width: 8px; height: 8px; background: #ff4081; border-radius: 50%; margin-right: 8px;"></span>
              <span style="color: #b3e5fc;">预警级别:</span> 
              <span style="color: ${getWarningColor(params.value)}; font-weight: bold; margin-left: 5px;">${getWarningLevel(params.value)}</span>
            </div>
          </div>
        `
      },
      extraCssText: 'box-shadow: 0 0 20px rgba(0, 195, 255, 0.5);'
    },
    geo: {
      map: 'china',
      roam: false,
      zoom: 1.23,
      center: [105, 29],
      itemStyle: {
        areaColor: 'rgba(0, 10, 20, 0.8)',
        borderColor: 'rgba(0, 195, 255, 0.6)',
        borderWidth: 1.5
      },
      emphasis: {
        itemStyle: {
          areaColor: 'rgba(0, 50, 100, 0.9)',
          borderColor: '#00e5ff',
          borderWidth: 2
        },
        label: {
          show: true,
          color: '#00e5ff',
          textShadowBlur: 5,
          textShadowColor: '#00e5ff'
        }
      },
      // 添加发光效果
      blur: {
        itemStyle: {
          areaColor: '#001a33',
          borderColor: 'rgba(0, 120, 255, 0.4)'
        }
      }
    },
    visualMap: {
      min: 0,
      max: maxHeatValue.value,
      calculable: true,
      inRange: {
        color: legendColors
      },
      textStyle: {
        color: '#e0f7fa'
      },
      borderColor: 'rgba(0, 195, 255, 0.5)',
      borderWidth: 1,
      // 自定义视觉映射组件
      color: legendColors,
      show: false // 隐藏默认图例，使用自定义图例
    },
    series: [
        {
            name: '舆情热度',
            type: 'map',
            map: 'china',
            geoIndex: 0,
            data: props.mapData.map_stats || [],
            emphasis: {
                label: {
                    show: true,
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: '#00e5ff',
                    textShadowBlur: 5,
                    textShadowColor: '#00e5ff'
                }
            },
            // 添加涟漪特效
            rippleEffect: {
                brushType: 'stroke',
                scale: 3.5,
                period: 4,
                color: 'rgba(0, 229, 255, 0.7)'
            },
            itemStyle: {
                borderColor: 'rgba(0, 195, 255, 0.3)',
                borderWidth: 1
            }
        },
        // 添加光点流动效果
        // 添加光点流动效果
        {
            type: 'lines',
            zlevel: 2,
            effect: {
                show: true,
                period: 4,
                trailLength: 0.05,
                symbol: 'arrow',
                symbolSize: 5,
                color: 'rgba(255, 105, 180, 0.9)', // 热粉色
                shadowBlur: 10,
                shadowColor: 'rgba(255, 105, 180, 0.7)'
            },
            lineStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: 'rgba(0, 150, 255, 0.9)' },
                    { offset: 0.5, color: 'rgba(0, 200, 255, 0.7)' },
                    { offset: 1, color: 'rgba(140, 0, 255, 0.8)' }
                ]),
                // 修正：直接通过 params 访问 effect 属性
                width: (params) => params.effect?.width || 1.5,
                opacity: 0.8,
                // 修正：直接通过 params 访问 lineStyle 属性
                curveness: (params) => params.lineStyle?.curveness || 0.2
            },
            data: generateFlowLines()
        }
    ],
    // 添加背景光晕
    graphic: {
      elements: [
        {
          type: 'rect',
          left: '10%',
          top: '10%',
          shape: {
            width: '80%',
            height: '80%'
          },
          style: {
            fill: 'rgba(0, 30, 60, 0.3)',
            stroke: 'rgba(0, 195, 255, 0.2)',
            lineWidth: 1
          },
          keyframeAnimation: {
            duration: 3000,
            loop: true,
            data: [
              { percent: 0.5, shape: { width: '80%', height: '80%' } },
              { percent: 1, shape: { width: '100%', height: '100%' } }
            ]
          }
        }
      ]
    }
  }
}

// 生成流动光点数据
// 生成流动光点数据
const generateFlowLines = () => {
    const lines = [];
    const provinces = [
        { name: '北京', coords: [116.4551, 40.2539] },
        { name: '上海', coords: [121.4648, 31.2891] },
        { name: '广州', coords: [113.5107, 23.2196] },
        { name: '深圳', coords: [114.0255, 22.5431] },
        { name: '成都', coords: [104.0657, 30.6595] },
        { name: '武汉', coords: [114.3896, 30.6628] },
        { name: '杭州', coords: [120.19, 30.26] },
        { name: '南京', coords: [118.796878, 32.060255] },
        { name: '西安', coords: [108.95, 34.27] },
        { name: '重庆', coords: [106.504962, 29.533155] },
        { name: '天津', coords: [117.200983, 39.084158] },
        { name: '苏州', coords: [120.62, 31.32] },
        { name: '长沙', coords: [112.98, 28.25] },
        { name: '郑州', coords: [113.62, 34.75] },
        { name: '济南', coords: [117.00, 36.65] },
        { name: '沈阳', coords: [123.43, 41.80] },
        { name: '福州', coords: [119.30, 26.08] },
        { name: '合肥', coords: [117.27, 31.86] },
        { name: '昆明', coords: [102.832892, 24.880095] },
        { name: '哈尔滨', coords: [126.534967, 45.803775] },
        { name: '长春', coords: [125.3245, 43.886841] },
        { name: '石家庄', coords: [114.502461, 38.045474] },
        { name: '太原', coords: [112.549248, 37.857014] },
        { name: '兰州', coords: [103.823557, 36.058039] },
        { name: '贵阳', coords: [106.713478, 26.578341] },
        { name: '南宁', coords: [108.320004, 22.824024] },
        { name: '银川', coords: [106.278179, 38.46637] },
        { name: '乌鲁木齐', coords: [87.617733, 43.792818] }
    ];
    
    // 生成随机流动线 (5-12条)
    const lineCount = Math.floor(10 + Math.random() * 20);
    
    for (let i = 0; i < lineCount; i++) {
        // 随机选择起点和终点
        const fromIndex = Math.floor(Math.random() * provinces.length);
        let toIndex = Math.floor(Math.random() * provinces.length);
        
        // 确保起点和终点不同
        while (toIndex === fromIndex) {
            toIndex = Math.floor(Math.random() * provinces.length);
        }
        
        const from = provinces[fromIndex];
        const to = provinces[toIndex];
        
        // 添加随机弯曲度 (0.1-0.4)
        const curveness = 0.1 + Math.random() * 0.3;
        
        // 添加随机线条宽度 (1-2)
        const width = 1 + Math.random() * 1;
        
        // 添加随机动画周期 (2-4秒)
        const period = 2 + Math.random() * 2;
        
        lines.push({
            coords: [from.coords, to.coords],
            // 直接放在数据项顶层，而非嵌套对象
            lineStyle: { curveness },
            effect: { period, width }
        });
    }
    
    return lines;
}

// 获取预警级别
const getWarningLevel = (value) => {
  if (value > maxHeatValue.value * 0.8) return '严重'
  if (value > maxHeatValue.value * 0.6) return '高'
  if (value > maxHeatValue.value * 0.4) return '中'
  if (value > maxHeatValue.value * 0.2) return '低'
  return '正常'
}

// 获取预警颜色
const getWarningColor = (value) => {
  if (value > maxHeatValue.value * 0.8) return '#ff4081'
  if (value > maxHeatValue.value * 0.6) return '#ff9800'
  if (value > maxHeatValue.value * 0.4) return '#ffd54f'
  if (value > maxHeatValue.value * 0.2) return '#81c784'
  return '#81d4fa'
}

// 更新图表
const updateChart = () => {
  if (charts.value.map) {
    const option = getMapOption()
    charts.value.map.setOption(option, true)
  }
}

// 处理窗口大小调整
const handleResize = () => {
  if (charts.value.map) {
    charts.value.map.resize()
  }
}

// 清理资源
const cleanup = () => {
  if (charts.value.map) {
    charts.value.map.dispose()
    charts.value.map = null
  }
  window.removeEventListener('resize', handleResize)
}

let flowInterval = null;

// 在updateChart函数后添加
const updateFlowLines = () => {
    if (charts.value.map) {
        const option = getMapOption()
        charts.value.map.setOption(option, true);
    }
    updateTime()
};

// 生命周期钩子
onMounted(() => {
    initCharts()
    window.addEventListener('resize', handleResize)

    let provinces_list = [
        '北京', '上海', '天津', '重庆',
        '河北', '山西', '辽宁', '吉林', '黑龙江', 
        '江苏', '浙江', '安徽', '福建', '江西', '山东', 
        '河南', '湖北', '湖南', '广东', '海南', 
        '四川', '贵州', '云南', '陕西', '甘肃', '青海', 
        '台湾', '内蒙古', '广西', '西藏', '宁夏', '新疆', 
        '香港', '澳门'
    ]

    // 模拟数据更新
    setInterval(() => {
        if (Math.random() > 0.7) {
            currentLocation.value = `${provinces_list[Math.floor(Math.random() * provinces_list.length)]} · 热点事件`
        }
    }, 3000)

    // 动态刷新流动线
    flowInterval = setInterval(() => {
        updateFlowLines();
    }, 60000);

    nextTick().then(() => {
      loading.value = ElLoading.service({
          target: '#map-area',
          text: '加载中...',
      });
    });
})

onUnmounted(() => {
    cleanup()
    if (flowInterval) {
        clearInterval(flowInterval);
        flowInterval = null;
    }
})

// 监听数据变化
watch(() => props.mapData, (newVal) => {
  if (newVal && newVal.map_stats) {
    updateChart()
    try { loading.value?.close?.(); } catch (e) { /* ignore */ }
  }
}, { deep: true })
</script>

<style scoped>
#map-area {
    flex: 1;
    width: 100%;
    /* background: linear-gradient(135deg, #000428 0%, #004e92 100%); */
    /* box-shadow: 0 0 30px rgba(0, 150, 255, 0.3); */
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    /* border: 1px solid rgba(0, 195, 255, 0.2); */
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

.chart-title {
  padding: 15px 25px 10px;
  color: #e0f7fa;
  text-align: center;
  position: relative;
  z-index: 10;
}

.title-glow {
  font-size: 28px;
  font-weight: bold;
  letter-spacing: 2px;
  text-shadow: 0 0 15px rgba(0, 229, 255, 0.7);
  background: linear-gradient(90deg, #00e5ff, #00aaff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
  font-family: 'Arial', sans-serif;
}

.subtitle {
  font-size: 14px;
  color: rgba(224, 247, 250, 0.7);
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(0, 150, 255, 0.3);
}

.map-container {
  flex: 1;
  position: relative;
  padding: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
}

#map-chart {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 5;
}

/* 科技感定位指示器 */
.location-indicator {
  position: absolute;
  bottom: 30px;
  left: 30px;
  background: rgba(0, 10, 20, 0.8);
  border: 1px solid rgba(0, 195, 255, 0.4);
  border-radius: 50%;
  width: 180px;
  height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
  box-shadow: 0 0 20px rgba(0, 195, 255, 0.3);
  z-index: 10;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(0, 195, 255, 0.5);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.pulse-ring::before {
  content: '';
  position: absolute;
  width: 90%;
  height: 90%;
  top: 5%;
  left: 5%;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 50%;
}

.core {
  width: 12px;
  height: 12px;
  background: #00e5ff;
  border-radius: 50%;
  box-shadow: 0 0 15px #00e5ff;
  z-index: 2;
}

.coordinates {
  color: #00e5ff;
  font-size: 16px;
  margin-top: 10px;
  text-align: center;
  text-shadow: 0 0 5px rgba(0, 229, 255, 0.7);
  font-weight: bold;
  letter-spacing: 1px;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  70% {
    transform: scale(1.05);
    opacity: 0;
  }
  100% {
    transform: scale(0.95);
    opacity: 0;
  }
}

/* 科技感图例 */
.legend-container {
  position: absolute;
  bottom: 30px;
  right: 30px;
  background: rgba(0, 10, 20, 0.8);
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 8px;
  padding: 12px 15px;
  width: 220px;
  backdrop-filter: blur(5px);
  box-shadow: 0 0 15px rgba(0, 195, 255, 0.2);
  z-index: 10;
}

.legend-title {
  color: #00e5ff;
  font-weight: bold;
  margin-bottom: 8px;
  text-align: center;
  font-size: 16px;
  letter-spacing: 1px;
}

.legend-bar {
  display: flex;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.legend-segment {
  flex: 1;
}

.legend-values {
  display: flex;
  justify-content: space-between;
  color: rgba(224, 247, 250, 0.7);
  font-size: 13px;
}

/* 底部状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 10px 25px;
  background: rgba(0, 15, 30, 0.7);
  border-top: 1px solid rgba(0, 195, 255, 0.2);
  color: rgba(224, 247, 250, 0.8);
  font-size: 14px;
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