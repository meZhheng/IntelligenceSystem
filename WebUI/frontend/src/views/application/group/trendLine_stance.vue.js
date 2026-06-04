import * as echarts from 'echarts';
import { ElLoading } from 'element-plus';
export default (await import('vue')).defineComponent({
    name: 'LineChart',
    data() {
        return {
            lineChart: null,
            rawData: {}, // 原始数据存储
            filteredData: {}, // 筛选后数据
            // 筛选相关状态
            selectedTargets: [],
            availableTargets: [],
            filterText: '', // 搜索文本
            // 原有时间相关状态
            time_range: [new Date(), new Date()],
            time_range_default: [new Date(), new Date()],
            range_type: 'all',
            // 图表配置
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "cross" }
            },
            watchCharts: null,
            resizeTimeout: 0,
            loading: null
        };
    },
    props: {
        content: {
            type: Object,
            required: false,
            default: () => ({})
        },
    },
    computed: {
        // 计算过滤后的目标列表
        computedFilteredTargets() {
            if (!this.filterText)
                return this.availableTargets;
            return this.availableTargets.filter(target => target.includes(this.filterText));
        },
        // 计算选项列表（包含原始数据）
        computedOptions() {
            return this.availableTargets.map(target => ({
                value: target,
                label: target
            }));
        }
    },
    watch: {
        content: {
            handler: function (newValue) {
                this.rawData = newValue;
                this.updateTargetOptions();
                this.handleFilterChange();
                if (newValue && Object.keys(newValue).length > 0) {
                    const dates = Object.keys(newValue);
                    const timestamps = dates.map(d => new Date(d).getTime());
                    const [minDate, maxDate] = [Math.min(...timestamps), Math.max(...timestamps)];
                    this.time_range = [new Date(minDate), new Date(maxDate)];
                    this.time_range_default = [new Date(minDate), new Date(maxDate)];
                    this.loading?.close();
                }
            },
            deep: true
        },
    },
    mounted() {
        this.$nextTick().then(() => {
            this.initLineChart();
            this.loading = ElLoading.service({
                target: '#chart-area',
                text: '加载中...',
            });
        });
    },
    beforeUnmount() {
        this.watchCharts?.unobserve(document.getElementById('chart-area'));
    },
    methods: {
        // 初始化图表
        initLineChart() {
            const chartDom = document.getElementById('line-chart');
            if (!chartDom)
                return console.error("找不到图表容器");
            this.lineChart = echarts.init(chartDom);
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
                series: colors.map(color => ({
                    type: 'line',
                    lineStyle: { color },
                    areaStyle: { color: echarts.color.modifyAlpha(color, 0.08) },
                    itemStyle: { color },
                    showSymbol: false,
                    smooth: true
                }))
            };
            this.lineChart.setOption(baseOption);
            this.setupResizeObserver();
        },
        // 更新目标选项
        updateTargetOptions() {
            const targets = new Set();
            Object.values(this.rawData).forEach(dateData => {
                Object.keys(dateData).forEach(target => targets.add(target));
            });
            this.availableTargets = Array.from(targets);
            // 默认选中所有目标
            this.selectedTargets = [...this.availableTargets];
        },
        // 全选目标
        selectAll() {
            this.selectedTargets = [...this.availableTargets];
            this.handleFilterChange();
            this.filterText = '';
        },
        // 全选匹配项
        selectAllMatched() {
            if (this.filterText && this.computedFilteredTargets.length) {
                const matchedTargets = this.computedFilteredTargets;
                // 合并已选目标和匹配项（去重）
                const mergedTargets = [...new Set([...this.selectedTargets, ...matchedTargets])];
                this.selectedTargets = mergedTargets;
                this.handleFilterChange();
            }
        },
        // 目标过滤器方法
        onTargetFilter(query) {
            this.filterText = query;
        },
        // 目标选择变更处理
        handleTargetChange(value) {
            this.handleFilterChange();
        },
        // 时间范围筛选
        filterByDate() {
            if (!this.time_range || this.time_range.length !== 2)
                return this.rawData;
            const [start, end] = this.time_range.map(d => d.getTime());
            return Object.keys(this.rawData).reduce((acc, date) => {
                const timestamp = new Date(date).getTime();
                if (timestamp >= start && timestamp <= end) {
                    acc[date] = this.rawData[date];
                }
                return acc;
            }, {});
        },
        // 目标筛选
        filterByTarget(data) {
            if (this.selectedTargets.length === 0)
                return data;
            return Object.keys(data).reduce((acc, date) => {
                acc[date] = this.selectedTargets.reduce((targetAcc, target) => {
                    if (data[date][target])
                        targetAcc[target] = data[date][target];
                    return targetAcc;
                }, {});
                return acc;
            }, {});
        },
        // 统一处理筛选变化
        handleFilterChange() {
            const timeFiltered = this.filterByDate();
            this.filteredData = this.filterByTarget(timeFiltered);
            this.updateChartData();
        },
        // 更新图表数据
        updateChartData() {
            const dates = Object.keys(this.filteredData).sort();
            const activeTargets = this.selectedTargets.length > 0
                ? this.selectedTargets
                : this.availableTargets;
            const seriesData = {
                negative: [],
                neutral: [],
                positive: []
            };
            dates.forEach(date => {
                const sum = activeTargets.reduce((acc, target) => ({
                    negative: acc.negative + (this.filteredData[date][target]?.negative || 0),
                    neutral: acc.neutral + (this.filteredData[date][target]?.neutral || 0),
                    positive: acc.positive + (this.filteredData[date][target]?.positive || 0)
                }), { negative: 0, neutral: 0, positive: 0 });
                seriesData.negative.push(sum.negative);
                seriesData.neutral.push(sum.neutral);
                seriesData.positive.push(sum.positive);
            });
            this.lineChart.setOption({
                xAxis: { data: dates },
                series: [
                    { name: '反对立场', data: seriesData.negative },
                    { name: '中立立场', data: seriesData.neutral },
                    { name: '支持立场', data: seriesData.positive }
                ]
            });
        },
        // 原有时间处理方法
        changeTimeRangeType() {
            if (this.range_type === 'all') {
                this.time_range = [...this.time_range_default];
                this.handleFilterChange();
            }
        },
        disabledDate(date) {
            const [min, max] = this.time_range_default;
            return date < min || date > max;
        },
        // 图表自适应
        setupResizeObserver() {
            this.watchCharts = new ResizeObserver(() => {
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => this.lineChart?.resize(), 100);
            });
            this.watchCharts.observe(document.getElementById('line-chart'));
        }
    }
}); /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['el-select', 'select-actions', 'select-actions', 'el-button',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: ("chart-area"),
    ...{ class: ("disable-select") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("time_selector") },
});
const __VLS_0 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.range_type)),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.range_type)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_6;
const __VLS_7 = {
    onChange: (__VLS_ctx.changeTimeRangeType)
};
let __VLS_3;
let __VLS_4;
const __VLS_8 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    label: ("全部范围"),
    value: ("all"),
}));
const __VLS_10 = __VLS_9({
    label: ("全部范围"),
    value: ("all"),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
const __VLS_14 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
    label: ("按年统计"),
    value: ("yearrange"),
}));
const __VLS_16 = __VLS_15({
    label: ("按年统计"),
    value: ("yearrange"),
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
const __VLS_20 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: ("按月统计"),
    value: ("monthrange"),
}));
const __VLS_22 = __VLS_21({
    label: ("按月统计"),
    value: ("monthrange"),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
const __VLS_26 = {}.ElOption;
/** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    label: ("按日统计"),
    value: ("daterange"),
}));
const __VLS_28 = __VLS_27({
    label: ("按日统计"),
    value: ("daterange"),
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
__VLS_5.slots.default;
var __VLS_5;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("date-box") },
});
const __VLS_32 = {}.ElDatePicker;
/** @type { [typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ] } */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.time_range)),
    type: ((__VLS_ctx.range_type === 'all' ? 'daterange' : __VLS_ctx.range_type)),
    isRange: (true),
    arrowControl: (true),
    rangeSeparator: ("到"),
    startPlaceholder: ("开始时间"),
    endPlaceholder: ("结束时间"),
    readonly: ((__VLS_ctx.range_type === 'all')),
    ...{ class: ("date-input") },
    disabledDate: ((__VLS_ctx.disabledDate)),
    unlinkPanels: ((true)),
}));
const __VLS_34 = __VLS_33({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.time_range)),
    type: ((__VLS_ctx.range_type === 'all' ? 'daterange' : __VLS_ctx.range_type)),
    isRange: (true),
    arrowControl: (true),
    rangeSeparator: ("到"),
    startPlaceholder: ("开始时间"),
    endPlaceholder: ("结束时间"),
    readonly: ((__VLS_ctx.range_type === 'all')),
    ...{ class: ("date-input") },
    disabledDate: ((__VLS_ctx.disabledDate)),
    unlinkPanels: ((true)),
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
let __VLS_38;
const __VLS_39 = {
    onChange: (__VLS_ctx.handleFilterChange)
};
let __VLS_35;
let __VLS_36;
var __VLS_37;
const __VLS_40 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.selectedTargets)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    filterable: (true),
    placeholder: ("选择分析目标"),
    filterMethod: ((__VLS_ctx.onTargetFilter)),
    ...{ style: ({}) },
}));
const __VLS_42 = __VLS_41({
    ...{ 'onChange': {} },
    modelValue: ((__VLS_ctx.selectedTargets)),
    multiple: (true),
    clearable: (true),
    collapseTags: (true),
    filterable: (true),
    placeholder: ("选择分析目标"),
    filterMethod: ((__VLS_ctx.onTargetFilter)),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
let __VLS_46;
const __VLS_47 = {
    onChange: (__VLS_ctx.handleTargetChange)
};
let __VLS_43;
let __VLS_44;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("select-actions") },
});
const __VLS_48 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    ...{ 'onClick': {} },
    type: ("text"),
}));
const __VLS_50 = __VLS_49({
    ...{ 'onClick': {} },
    type: ("text"),
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
let __VLS_54;
const __VLS_55 = {
    onClick: (__VLS_ctx.selectAll)
};
let __VLS_51;
let __VLS_52;
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: ("el-icon-circle-check") },
});
__VLS_53.slots.default;
var __VLS_53;
if (__VLS_ctx.filterText && __VLS_ctx.computedFilteredTargets.length > 0) {
    const __VLS_56 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        ...{ 'onClick': {} },
        type: ("text"),
    }));
    const __VLS_58 = __VLS_57({
        ...{ 'onClick': {} },
        type: ("text"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    let __VLS_62;
    const __VLS_63 = {
        onClick: (__VLS_ctx.selectAllMatched)
    };
    let __VLS_59;
    let __VLS_60;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("el-icon-finished") },
    });
    (__VLS_ctx.computedFilteredTargets.length);
    __VLS_61.slots.default;
    var __VLS_61;
}
for (const [target] of __VLS_getVForSourceType((__VLS_ctx.computedOptions))) {
    const __VLS_64 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        key: ((target.value)),
        label: ((target.label)),
        value: ((target.value)),
    }));
    const __VLS_66 = __VLS_65({
        key: ((target.value)),
        label: ((target.label)),
        value: ((target.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
}
__VLS_45.slots.default;
var __VLS_45;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: ("line-chart"),
});
['disable-select', 'chart-title', 'time_selector', 'date-box', 'date-input', 'select-actions', 'el-icon-circle-check', 'el-icon-finished',];
var __VLS_special;
let __VLS_self;
