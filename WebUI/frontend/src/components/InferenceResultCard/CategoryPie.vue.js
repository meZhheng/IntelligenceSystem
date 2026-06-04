import { ref, onMounted, watch, computed } from 'vue';
import * as echarts from 'echarts';
import { CATEGORY_MAP } from './Lexicon.vue';
const props = defineProps();
const chartEl = ref();
let chart = null;
// 颜色映射需要与高亮样式保持一致
const COLOR_MAP = {
    general: '#f56c6c',
    LGBT: '#409eff',
    racism: '#e6a23c',
    region: '#67c23a',
    sexism: '#f06292'
};
const chartData = computed(() => {
    const countMap = {};
    props.matches.forEach(m => {
        countMap[m.category] = (countMap[m.category] || 0) + 1;
    });
    // 在chartData计算属性中
    return Object.entries(countMap).map(([name, value]) => ({
        name: CATEGORY_MAP[name] || name, // 转换为中文
        value,
        itemStyle: { color: COLOR_MAP[name] || '#999' }
    }));
});
onMounted(() => {
    if (chartEl.value) {
        chart = echarts.init(chartEl.value);
        updateChart();
        window.addEventListener('resize', handleResize);
    }
});
const handleResize = () => chart?.resize();
const updateChart = () => {
    chart?.setOption({
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
        },
        series: [{
                type: 'pie',
                radius: ['40%', '65%'],
                avoidLabelOverlap: false,
                label: {
                    show: true,
                    formatter: '{b|{b}}\n{d|{d}%}',
                    rich: {
                        b: { fontSize: 12, lineHeight: 20 },
                        d: { color: '#909399', fontSize: 14 }
                    }
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                data: chartData.value
            }]
    });
};
watch(chartData, updateChart); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: ("chartEl"),
    ...{ class: ("category-pie") },
    ...{ style: ({}) },
});
// @ts-ignore navigation for `const chartEl = ref()`
/** @type { typeof __VLS_ctx.chartEl } */ ;
['category-pie',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartEl: chartEl,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
