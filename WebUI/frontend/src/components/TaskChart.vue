<script lang="ts">
import { defineComponent, onMounted, onBeforeUnmount, ref, toRefs, watch } from 'vue';
import * as echarts from 'echarts';
import { json } from 'stream/consumers';

export default defineComponent({
    name: 'TaskChart',

    props: {
        task_id: {
            type: String,
        },

        content: {
            type: Object,
            required: false,
            default: () => ({})
        },
    },

    setup(props) {
        const { task_id, content } = toRefs(props);
        const chart = ref<echarts.ECharts | null>(null);

        // 根据 content 更新图表数据
        const updateChart = () => {
            if (chart.value) {
                if (content.value == null) {
                    return;
                }
                const steps = (content.value as Array<{ loss: number; step: number }>).map(item => item.step);
                const losses = (content.value as Array<{ loss: number; step: number }>).map(item => item.loss);
                const option = {
                    xAxis: {
                        type: 'category',
                        data: steps,
                    },
                    yAxis: {
                        type: 'value',
                    },
                    series: [
                        {
                        data: losses,
                        type: 'line',
                        },
                    ],
                };
                chart.value.setOption(option);
            }
        };

        // 初始化图表
        const initChart = () => {
            const chartDom = document.getElementById('loss-chart-' + task_id.value);
            if (chartDom) {
                chart.value = echarts.init(chartDom);
                updateChart();
            }
        };

        // 在组件挂载时初始化
        onMounted(() => {
            initChart();
            window.addEventListener('resize', resizeChart);
        });

        watch(content, () => {
            updateChart();
        }, { deep: true });

        // 窗口大小变化时，调整 ECharts
        const resizeChart = () => {
            if (chart.value) {
                chart.value.resize();
            }
        };


        // 组件卸载时销毁 ECharts
        onBeforeUnmount(() => {
            window.removeEventListener('resize', resizeChart);
            if (chart.value) {
                chart.value.dispose();
                chart.value = null;
            }
        });

        return {};
    }
});
</script>

<template>
    <!-- 使用动态 id，与 initChart 中一致 -->
    <div :id="'loss-chart-' + task_id" style="width: 100%; height: 500px;"></div>
</template>

<style scoped>
/* 可以在这里自定义样式 */
</style>
