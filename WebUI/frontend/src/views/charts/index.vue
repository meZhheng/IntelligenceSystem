<template>
  <div class="chart-container">
    <!-- 饼图容器 -->
    <div id="pie-chart"></div>
    <!-- 折线图容器 -->
    <div id="line-chart"></div>
    <!-- 柱状图容器 -->
    <div id="bar-chart"></div>
    <!-- 散点图容器 -->
    <div id="scatter-chart"></div>
    <!-- 雷达图容器 -->
    <div id="radar-chart"></div>
    <!-- 漏斗图容器 -->
    <div id="funnel-chart"></div>
    <!-- 词云图容器 -->
    <div id="wordcloud-chart"></div>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import 'echarts-wordcloud';

export default {
  name: 'AllChartsDemo',
  mounted() {
    // 初始化饼图
    this.initPieChart();
    // 初始化折线图
    this.initLineChart();
    // 初始化柱状图
    this.initBarChart();
    // 初始化散点图
    this.initScatterChart();
    // 初始化雷达图
    this.initRadarChart();
    // 初始化漏斗图
    this.initFunnelChart();
    // 初始化词云图
    this.initWordcloudChart();
  },
  methods: {
    initPieChart() {
      const pieChartDom = document.getElementById('pie-chart');
      const pieChart = echarts.init(pieChartDom);

      const pieOption = {
        title: {
          text: '饼图示例',
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        series: [
          {
            name: '访问来源',
            type: 'pie',
            radius: '50%',
            data: [
              { value: 1048, name: '搜索引擎' },
              { value: 735, name: '直接访问' },
              { value: 580, name: '邮件营销' },
              { value: 484, name: '联盟广告' },
              { value: 300, name: '视频广告' }
            ]
          }
        ]
      };

      if (pieOption && typeof pieOption === 'object') {
        pieChart.setOption(pieOption);
      }
    },
    initLineChart() {
      const lineChartDom = document.getElementById('line-chart');
      const lineChart = echarts.init(lineChartDom);

      const lineOption = {
        title: {
          text: '折线图示例',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            data: [820, 932, 901, 934, 1290, 1330, 1320],
            type: 'line'
          }
        ]
      };

      if (lineOption && typeof lineOption === 'object') {
        lineChart.setOption(lineOption);
      }
    },
    initBarChart() {
      const barChartDom = document.getElementById('bar-chart');
      const barChart = echarts.init(barChartDom);

      const barOption = {
        title: {
          text: '柱状图示例',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: ['苹果', '香蕉', '橙子', '葡萄', '西瓜']
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '销量',
            type: 'bar',
            data: [50, 30, 40, 20, 60]
          }
        ]
      };

      if (barOption && typeof barOption === 'object') {
        barChart.setOption(barOption);
      }
    },
    initScatterChart() {
      const scatterChartDom = document.getElementById('scatter-chart');
      const scatterChart = echarts.init(scatterChartDom);

      const scatterOption = {
        title: {
          text: '散点图示例',
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        xAxis: {
          type: 'value'
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '身高与体重关系',
            type: 'scatter',
            data: [
              [160, 50], [165, 55], [170, 60], [175, 65], [180, 70]
            ]
          }
        ]
      };

      if (scatterOption && typeof scatterOption === 'object') {
        scatterChart.setOption(scatterOption);
      }
    },
    initRadarChart() {
      const radarChartDom = document.getElementById('radar-chart');
      const radarChart = echarts.init(radarChartDom);

      const radarOption = {
        title: {
          text: '雷达图示例',
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        radar: {
          indicator: [
            { name: '速度', max: 100 },
            { name: '安全性', max: 100 },
            { name: '舒适性', max: 100 },
            { name: '油耗', max: 100 }
          ]
        },
        series: [
          {
            name: '汽车性能',
            type: 'radar',
            data: [
              { value: [80, 90, 70, 60], name: '轿车' }
            ]
          }
        ]
      };

      if (radarOption && typeof radarOption === 'object') {
        radarChart.setOption(radarOption);
      }
    },
    initFunnelChart() {
      const funnelChartDom = document.getElementById('funnel-chart');
      const funnelChart = echarts.init(funnelChartDom);

      const funnelOption = {
        title: {
          text: '漏斗图示例',
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        series: [
          {
            name: '电商购物流程',
            type: 'funnel',
            data: [
              { value: 100, name: '浏览商品' },
              { value: 80, name: '加入购物车' },
              { value: 60, name: '下单' },
              { value: 40, name: '支付' },
              { value: 20, name: '完成交易' }
            ]
          }
        ]
      };

      if (funnelOption && typeof funnelOption === 'object') {
        funnelChart.setOption(funnelOption);
      }
    },
initWordcloudChart() {
  const wordcloudChartDom = document.getElementById('wordcloud-chart');
  if (!wordcloudChartDom) {
    console.error('未找到词云图容器元素');
    return;
  }
  const wordcloudChart = echarts.init(wordcloudChartDom);

  const words = [
    { name: '苹果', value: 100 },
    { name: '香蕉', value: 80 },
    { name: '橙子', value: 60 },
    { name: '葡萄', value: 40 },
    { name: '西瓜', value: 20 },
    { name: '草莓', value: 70 },
    { name: '蓝莓', value: 50 },
    { name: '樱桃', value: 30 }
  ];

  const colorList = [
    '#FF5733', '#33FF57', '#5733FF', '#FF33E3', '#33E3FF', '#E3FF33', '#FF9933', '#9933FF'
  ];

  const wordcloudOption = {
    title: {
      text: '词云图示例',
      left: 'center'
    },
    tooltip: {
      show: true
    },
    series: [
      {
        type: 'wordCloud',
        gridSize: 20,
        sizeRange: [12, 60],
        rotationRange: [-90, 90],
        shape: 'rect',
        textStyle: {
          normal: {
            color: function (params) {
              const color = colorList[params.dataIndex % colorList.length];
              console.log('当前文字颜色:', color);
              return color;
            }
          },
          emphasis: {
            shadowBlur: 10,
            shadowColor: '#333'
          }
        },
        data: words
      }
    ]
  };

  if (wordcloudOption && typeof wordcloudOption === 'object') {
    try {
      wordcloudChart.setOption(wordcloudOption);
      console.log('词云图配置应用成功');
    } catch (error) {
      console.error('词云图配置应用失败:', error);
    }
  }
}
  }
};
</script>

<style scoped>
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

.chart-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
  min-height: 100vh; /* 至少占满视口高度 */
  overflow-y: auto; /* 内容超出时显示垂直滚动条 */
  box-sizing: border-box;
  padding: 20px;
}

.chart-container > div {
  width: 100%;
  min-height: 300px; /* 设置每个图表容器的最小高度 */
}
</style>