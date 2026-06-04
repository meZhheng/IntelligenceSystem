import { defineComponent } from 'vue';
import * as echarts from 'echarts';
export default defineComponent({
    name: 'PieChart',
    props: {
        pieData: {
            type: Array,
            required: false,
            default: () => []
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
        };
    },
    methods: {
        initPieChart(limitedData) {
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
; /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("pie_chart_area disable-select") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
(__VLS_ctx.header_content);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: ("pieChartContainer"),
    ...{ class: ("pie_chart") },
});
// @ts-ignore navigation for `const pieChartContainer = ref()`
/** @type { typeof __VLS_ctx.pieChartContainer } */ ;
['pie_chart_area', 'disable-select', 'chart-title', 'pie_chart',];
var __VLS_special;
let __VLS_self;
