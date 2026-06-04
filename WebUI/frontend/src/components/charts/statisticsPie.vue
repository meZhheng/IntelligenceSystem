<template>
<div  class="pie_chart_area disable-select">
    <div class="chart-title">
    {{ header_content }}
    </div>
    <div ref="pieChartContainer" class="pie_chart"></div>
</div>

</template>

<style scoped>
.pie_chart {
    height: 100%;
}

.pie_chart_area {
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
import { defineComponent } from 'vue';
import * as echarts from 'echarts';

export default defineComponent({
    name: 'PieChart',
    props: {
        pieData: {
            type: Array,
            required: false,
            default: () =>[]
        },
        header_content: {
            type: String,
            required: false,
        }
    },

    watch: {
        pieData: {
            handler(newVal) {
                let limitedData = newVal;
                if (limitedData && limitedData.length > 20) {
                    limitedData = limitedData.slice(0, 20);
                }
                this.initPieChart(limitedData);
            },
        }
    },

    data() {
        return {
            chartInstance: null
        }
    },

    methods: {
        initPieChart(limitedData: Object) {
            const pieOption = {
                tooltip: {
                    trigger: 'item'
                },
                legend: {
                    top: '10px',
                    left: 'left',
                    orient: 'vertical',
                },
                series: [{
                    name: this.header_content,
                    type: 'pie',
                    radius: ['45%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 36,
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: limitedData,
                }]
            };

            if (pieOption && typeof pieOption === 'object') {
                this.chartInstance.setOption(pieOption);
            }

            window.addEventListener("resize", () => {
                this.chartInstance.resize();
            });
        },
    },

    mounted() {
        // 获取当前组件的 DOM 元素引用
        const pieChartDom = this.$refs.pieChartContainer;
        // 初始化 ECharts 实例
        this.chartInstance = echarts.init(pieChartDom);
    },

    beforeUnmount() {
        window.removeEventListener("resize", () => {
            this.chartInstance.resize();
        });

        // 销毁 ECharts 实例
        if (this.chartInstance) {
            this.chartInstance.dispose();
            this.chartInstance = null;
        }
    }

});

</script>