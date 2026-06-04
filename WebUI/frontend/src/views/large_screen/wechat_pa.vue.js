import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import { ElLoading } from 'element-plus';
const loading = ref(null);
// 定义props
const props = defineProps({
    stats: {
        type: Object,
        required: true,
        default: () => ({
            totalArticles: 0,
            monitoredArticles: 0,
            nonCompliantArticles: 0,
        })
    },
    violationTypes: {
        type: Array,
        required: true,
        default: () => []
    }
});
// 响应式状态
const charts = ref({
    bar: null
});
const currentTime = ref('');
const lastScanTime = ref('');
const statsData = ref([
    { label: '公众号文章数', value: 0 },
    { label: '已监测文章数', value: 0 },
    { label: '内容不合格数', value: 0 }
]);
// 格式化数字（添加逗号分隔）
const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
// 初始化图表
const initCharts = () => {
    charts.value.bar = echarts.init(document.getElementById('compliance-bar-chart'), null, {
        renderer: 'canvas'
    });
    // 设置初始图表配置
    const option = getBarChartOption();
    charts.value.bar.setOption(option);
};
// 获取柱状图配置
const getBarChartOption = () => {
    // 按违规数量排序，取前5
    const top5Violations = [...props.violationTypes]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .reverse(); // 反转以便横向柱状图从上到下排序
    // 识别高风险和严重风险类型
    const highRiskTypes = top5Violations
        .filter(item => item.riskLevel === 'high')
        .map(item => item.type);
    const criticalRiskTypes = top5Violations
        .filter(item => item.riskLevel === 'critical')
        .map(item => item.type);
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow',
                shadowStyle: {
                    color: 'rgba(0, 150, 255, 0.2)'
                }
            },
            backgroundColor: 'rgba(0, 20, 40, 0.9)',
            borderColor: 'rgba(0, 195, 255, 0.8)',
            textStyle: {
                color: '#e0f7fa'
            },
            formatter: (params) => {
                const param = params[0];
                const riskText = param.data.riskLevel === 'critical' ?
                    '<span style="color: #ff4081">[严重风险]</span>' :
                    param.data.riskLevel === 'high' ?
                        '<span style="color: #ff9800">[高风险]</span>' :
                        '<span style="color: #81d4fa">[中风险]</span>';
                return `
          <div style="padding: 10px; font-family: 'Arial', sans-serif;">
            <div style="color: #00e5ff; font-size: 16px; margin-bottom: 8px;">${param.name}</div>
            <div style="display: flex; align-items: center; margin-top: 5px;">
              <span style="width: 8px; height: 8px; background: #00e5ff; border-radius: 50%; margin-right: 8px;"></span>
              <span style="color: #b3e5fc;">违规数量:</span> 
              <span style="color: #00e5ff; font-weight: bold; margin-left: 5px;">${param.value}</span>
            </div>
            <div style="display: flex; align-items: center; margin-top: 5px;">
              <span style="width: 8px; height: 8px; background: ${param.data.riskLevel === 'critical' ? '#ff4081' : param.data.riskLevel === 'high' ? '#ff9800' : '#81d4fa'}; border-radius: 50%; margin-right: 8px;"></span>
              <span style="color: #b3e5fc;">风险等级:</span> 
              <span style="color: ${param.data.riskLevel === 'critical' ? '#ff4081' : param.data.riskLevel === 'high' ? '#ff9800' : '#81d4fa'}; font-weight: bold; margin-left: 5px;">${riskText}</span>
            </div>
          </div>
        `;
            },
            extraCssText: 'box-shadow: 0 0 20px rgba(0, 195, 255, 0.5);'
        },
        grid: {
            top: '1%',
            right: '5%',
            bottom: '1%',
            left: '5%',
            containLabel: true
        },
        xAxis: {
            show: false,
            type: 'value',
            axisLine: {
                lineStyle: {
                    color: 'rgba(224, 247, 250, 0.3)'
                }
            },
            axisLabel: {
                color: 'rgba(224, 247, 250, 0.7)',
                formatter: (value) => {
                    if (value >= 1000) {
                        return (value / 1000).toFixed(1) + 'k';
                    }
                    return value;
                }
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(224, 247, 250, 0.1)'
                }
            }
        },
        yAxis: {
            type: 'category',
            data: top5Violations.map(item => item.type),
            // 轴线（整条竖轴）的颜色和粗细
            axisLine: {
                show: true,
                lineStyle: {
                    color: 'rgba(191, 219, 254, 0.5)', // 轴线颜色（可调）
                    width: 4, // 轴线宽度（像素）
                    type: 'solid'
                }
            },
            axisTick: {
                show: false,
            },
            // 使用 rich + formatter 根据风险级别动态改变标签样式（大小/颜色/加粗）
            axisLabel: {
                interval: 0,
                formatter: (value) => {
                    if (criticalRiskTypes.includes(value)) {
                        return `{critical|${value}}`;
                    }
                    if (highRiskTypes.includes(value)) {
                        return `{high|${value}}`;
                    }
                    return `{normal|${value}}`;
                },
                rich: {
                    normal: {
                        color: 'rgba(224,247,250,0.85)',
                        fontSize: 20,
                        fontWeight: 700,
                        padding: [0, 6, 0, 6]
                    },
                    high: {
                        color: '#ff9800',
                        fontSize: 20,
                        fontWeight: 700,
                        padding: [0, 6, 0, 6]
                    },
                    critical: {
                        color: '#ff4081',
                        fontSize: 20,
                        fontWeight: 700,
                        padding: [0, 6, 0, 6]
                    }
                }
            }
        },
        series: [
            {
                name: '违规数量',
                type: 'bar',
                barWidth: '40px',
                data: top5Violations.map(item => ({
                    value: item.count,
                    riskLevel: item.riskLevel,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: item.riskLevel === 'critical' ?
                                    'rgba(255, 64, 130, 0.8)' :
                                    item.riskLevel === 'high' ?
                                        'rgba(255, 152, 0, 0.8)' :
                                        'rgba(0, 170, 255, 0.8)' },
                            { offset: 1, color: item.riskLevel === 'critical' ?
                                    'rgba(255, 100, 150, 1)' :
                                    item.riskLevel === 'high' ?
                                        'rgba(255, 180, 50, 1)' :
                                        'rgba(0, 200, 255, 1)' }
                        ]),
                        shadowBlur: item.riskLevel === 'critical' ? 15 :
                            item.riskLevel === 'high' ? 10 : 5,
                        shadowColor: item.riskLevel === 'critical' ? 'rgba(255, 64, 130, 0.5)' :
                            item.riskLevel === 'high' ? 'rgba(255, 152, 0, 0.5)' :
                                'rgba(0, 150, 255, 0.3)'
                    }
                })),
                label: {
                    show: true,
                    position: 'right',
                    color: '#fff',
                    formatter: '{c}',
                    fontSize: 20,
                    fontWeight: 'bold',
                    offset: [5, 0],
                },
                emphasis: {
                    itemStyle: {
                        opacity: 0.9
                    }
                }
            }
        ],
        animationEasing: 'elasticOut',
        animationDelay: function (idx) {
            return idx * 20;
        }
    };
};
// 更新图表
const updateChart = () => {
    if (charts.value.bar) {
        const option = getBarChartOption();
        charts.value.bar.setOption(option, true);
    }
};
// 处理窗口大小调整
const handleResize = () => {
    if (charts.value.bar) {
        charts.value.bar.resize();
    }
};
// 清理资源
const cleanup = () => {
    if (charts.value.bar) {
        charts.value.bar.dispose();
        charts.value.bar = null;
    }
    window.removeEventListener('resize', handleResize);
};
// 初始化数据
const initData = () => {
    statsData.value = [
        {
            label: '公众号文章总数',
            value: props.stats.totalArticles,
        },
        {
            label: '已监测文章数',
            value: props.stats.monitoredArticles,
        },
        {
            label: '内容不合格数',
            value: props.stats.nonCompliantArticles,
        }
    ];
};
// 生命周期钩子
onMounted(() => {
    window.addEventListener('resize', handleResize);
    nextTick().then(() => {
        loading.value = ElLoading.service({
            target: '#wechat-pa-monitor',
            text: '加载中...',
        });
    });
});
onUnmounted(() => {
    cleanup();
});
// 监听数据变化
watch(() => props.stats, (newVal) => {
    if (newVal) {
        initData();
    }
}, { deep: true });
watch(() => props.violationTypes, (newVal) => {
    if (newVal && newVal.length > 0) {
        initCharts();
        try {
            loading.value?.close?.();
        }
        catch (e) { /* ignore */ }
    }
}, { deep: true }); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['stat-card', 'stat-card', 'stat-card', 'stat-card', 'stat-card', 'stat-card', 'stat-card', 'card-glow', 'stat-card', 'stat-card', 'stat-card', 'stat-card', 'card-glow', 'stat-card', 'stat-card',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("compliance-monitor-container") },
    id: ("wechat-pa-monitor"),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("panel-content") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("stats-section") },
});
for (const [stat, index] of __VLS_getVForSourceType((__VLS_ctx.statsData))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: ((index)),
        ...{ class: ("stat-card") },
        ...{ class: ((`stat-card-${index}`)) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-glow") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-label") },
    });
    (stat.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-value") },
    });
    (__VLS_ctx.formatNumber(stat.value));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-section") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-title") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: ("compliance-bar-chart"),
    ...{ class: ("bar-chart") },
});
['compliance-monitor-container', 'panel-content', 'stats-section', 'stat-card', 'card-glow', 'card-content', 'stat-label', 'stat-value', 'chart-section', 'chart-title', 'bar-chart',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            statsData: statsData,
            formatNumber: formatNumber,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
        };
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
