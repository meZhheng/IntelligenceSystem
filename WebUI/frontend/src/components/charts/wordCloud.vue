<template>
<div class="WordCloud-area disable-select">
    <div class="chart-title">
    关键词高频分布统计
    </div>
    <div ref="wordCloudContainer" class="wordcloud-container"></div>
</div>
</template>

<style scoped>
.wordcloud-container {
    height: 100%;
}

.WordCloud-area {
    width: 100%;
    box-sizing: border-box;
    padding: 20px;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    border-radius: 5px;
    height: 680px;
}

.chart-title {
    margin: 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
    justify-content: space-between;
    color: rgb(17, 55, 78);
    font-weight: bold;
    font-size: 22px;
    box-sizing: border-box;
    border-bottom: rgb(232, 232, 232) 1px solid;
}
</style>

<script lang="ts">
import * as echarts from 'echarts'
import 'echarts-wordcloud'

export default {
    name: 'WordCloud',

    props: {
        wordCloudData: {
            type: Object,
            required: true,
            default: []
        },
    },

    watch: {
        wordCloudData: {
            handler(newVal) {
                const limit = 220;
                let limitedData = newVal;
                if (limitedData && limitedData.length > limit) {
                    limitedData = limitedData.slice(0, limit);
                }
                this.initwordCloud(limitedData);
            },
            deep: true
        }
    },

    data() {
        return {
            wordCloudChart: null,
        }
    },

    methods: {
        initwordCloud(limitedData: Object){

            if (this.wordCloudChart == null) {
                const echartDom = this.$refs.wordCloudContainer;
                this.wordCloudChart = echarts.init(echartDom)
            }
            const option  = {
                series: [{
                    type: 'wordCloud',
                    shape: 'circle',
                    keepAspect: false,
                    left: 'center',
                    top: 'center',
                    width: '100%',
                    height: '95%',
                    sizeRange: [20, 150],
                    rotationRange: [-30, 30],
                    rotationStep: 15,
                    gridSize: 10,
                    drawOutOfBound: false,
                    layoutAnimation: true,
                    textStyle: {
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        color: function () {
                            return 'rgb(' + [
                                Math.round(Math.random() * 160),
                                Math.round(Math.random() * 160),
                                Math.round(Math.random() * 160)
                            ].join(',') + ')';
                        }
                    },
                    emphasis: {
                        focus: 'self',

                        textStyle: {
                            textShadowBlur: 10,
                            textShadowColor: '#333'
                        }
                    },
                    //data属性中的value值却大，权重就却大，展示字体就却大
                    data: limitedData,
                }]
           }
           
           this.wordCloudChart.setOption(option)

           //随着屏幕大小调节图表
            window.addEventListener("resize", () => {
                this.wordCloudChart.resize();
            });
        }
    },
}
</script>