import { ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import { ElLoading } from 'element-plus';
const props = defineProps();
// --- state ---
const checkAll_words = ref(false);
const indeterminate_words = ref(false);
const lineChart = ref(null);
const rawData = ref(props.content || {});
const filteredData = ref({});
// 时间相关
const time_range = ref([new Date(), new Date()]);
const time_range_default = ref([new Date(), new Date()]);
const range_type = ref('all');
// 图表配置 / 其它
const tooltip = reactive({
    trigger: "axis",
    axisPointer: { type: "cross" }
});
const loading = ref(null);
// --- 监听 props.content ---
watch(() => props.content, (newValue) => {
    rawData.value = newValue || {};
    if (newValue && Object.keys(newValue).length > 0) {
        updateChartData();
        // 关闭 loading（如果存在）
        try {
            loading.value?.close?.();
        }
        catch (e) { /* ignore */ }
    }
}, { deep: true });
// --- 生命周期 ---
onMounted(() => {
    nextTick().then(() => {
        initLineChart();
        loading.value = ElLoading.service({
            target: '#stance-chart-area',
            text: '加载中...',
        });
    });
});
onBeforeUnmount(() => {
    // 销毁 echarts 实例
    try {
        lineChart.value?.dispose?.();
    }
    catch (e) { /* ignore */ }
    lineChart.value = null;
});
// --- methods (composition 风格实现) ---
function initLineChart() {
    const chartDom = document.getElementById('stance-line-chart');
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
            areaStyle: { color: echarts.color?.modifyAlpha ? echarts.color.modifyAlpha(color, 0.08) : undefined },
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
        negative: [],
        neutral: [],
        positive: []
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
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['corner', 'corner', 'corner', 'corner',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: ("stance-chart-area"),
    ...{ class: ("disable-select") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: ("stance-line-chart"),
});
['disable-select',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
