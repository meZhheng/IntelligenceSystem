import { defineComponent, onMounted, onBeforeUnmount, ref, toRefs, watch } from 'vue';
import * as echarts from 'echarts';
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
        const chart = ref(null);
        // 根据 content 更新图表数据
        const updateChart = () => {
            if (chart.value) {
                if (content.value == null) {
                    return;
                }
                const steps = content.value.map(item => item.step);
                const losses = content.value.map(item => item.loss);
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
; /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: (('loss-chart-' + __VLS_ctx.task_id)),
    ...{ style: ({}) },
});
var __VLS_special;
let __VLS_self;
