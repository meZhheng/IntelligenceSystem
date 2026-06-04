import { ref, onMounted, onBeforeUnmount, watch, defineProps, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import 'echarts/theme/macarons';
import { ElLoading } from 'element-plus';
const loading = ref(null);
// 定义14个风险内容分类（固定顺序）
const categories = [
    '性别歧视',
    '网络借贷',
    '单位、人员信息',
    '抹黑造谣',
    '婚恋纠纷',
    '历史虚无主义',
    '组织编制',
    '装备动态',
    '谣言',
    '政治言论',
    '网络暴力',
    '煽动对立',
    '其他',
];
// 定义组件props
const props = defineProps({
    // 数据格式：每个元素包含value（数值）和isHighRisk（是否高风险）
    data: {
        type: Array,
        required: true,
        default: () => []
    }
});
// 响应式数据
const chartRef = ref(null);
const chartInstance = ref(null);
const getMaxValueIndices = computed(() => {
    const data = props.data || [];
    if (data.length === 0)
        return [];
    const highRiskPairs = data
        .map((it, idx) => ({ it, idx }))
        .filter(p => p.it && p.it.isHighRisk === true);
    if (highRiskPairs.length === 0)
        return [];
    const values = highRiskPairs.map(p => p.it.value);
    const maxValue = Math.max(...values);
    return highRiskPairs.reduce((acc, p) => {
        if (p.it.value === maxValue)
            acc.push(p.idx);
        return acc;
    }, []);
});
const getHighRiskIndices = computed(() => {
    const data = props.data || [];
    if (data.length === 0)
        return [];
    const indices = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i].isHighRisk === true)
            indices.push(i);
    }
    return indices;
});
const isMaxValue = (index) => {
    return getMaxValueIndices.value.includes(index) === true ? 1 : 0;
};
// 缩略长标签（超过4个字符的截断）
const getShortCategoryName = (name, limit = 8) => {
    return name.length > limit ? name.substring(0, limit) + '...' : name;
};
/* 创建3D柱体图形元素 */
const create3DBarShapes = () => {
    // 左侧面
    const leftRect = echarts.graphic.extendShape({
        shape: {
            x: 0,
            y: 0,
            width: 40, // 柱状图宽
            zWidth: 10, // 阴影折角宽
            zHeight: 5, // 阴影折角高
        },
        buildPath: function (ctx, shape) {
            const api = shape.api;
            const xAxisPoint = api.coord([shape.xValue, 0]);
            const p0 = [shape.x - shape.width / 2, shape.y - shape.zHeight];
            const p1 = [shape.x - shape.width / 2, shape.y];
            const p2 = [xAxisPoint[0] - shape.width / 2, xAxisPoint[1]];
            const p3 = [xAxisPoint[0] + shape.width / 2, xAxisPoint[1]];
            const p4 = [shape.x + shape.width / 2, shape.y];
            ctx.moveTo(p0[0], p0[1]);
            ctx.lineTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
            ctx.lineTo(p3[0], p3[1]);
            ctx.lineTo(p4[0], p4[1]);
            ctx.lineTo(p0[0], p0[1]);
            ctx.closePath();
        },
    });
    // 右侧面
    const rightRect = echarts.graphic.extendShape({
        shape: {
            x: 0,
            y: 0,
            width: 35,
            zWidth: 18,
            zHeight: 8,
        },
        buildPath: function (ctx, shape) {
            const api = shape.api;
            const xAxisPoint = api.coord([shape.xValue, 0]);
            const p1 = [shape.x - shape.width / 2, shape.y - shape.zHeight / 2];
            const p3 = [xAxisPoint[0] + shape.width / 2, xAxisPoint[1]];
            const p4 = [shape.x + shape.width / 2, shape.y];
            const p5 = [xAxisPoint[0] + shape.width / 2 + shape.zWidth, xAxisPoint[1]];
            const p6 = [shape.x + shape.width / 2 + shape.zWidth, shape.y - shape.zHeight / 2];
            const p7 = [shape.x - shape.width / 2 + shape.zWidth, shape.y - shape.zHeight];
            ctx.moveTo(p4[0], p4[1]);
            ctx.lineTo(p3[0], p3[1]);
            ctx.lineTo(p5[0], p5[1]);
            ctx.lineTo(p6[0], p6[1]);
            ctx.lineTo(p4[0], p4[1]);
            ctx.moveTo(p4[0], p4[1]);
            ctx.lineTo(p6[0], p6[1]);
            ctx.lineTo(p7[0], p7[1]);
            ctx.lineTo(p1[0], p1[1]);
            ctx.lineTo(p4[0], p4[1]);
            ctx.closePath();
        },
    });
    // 注册图形元素
    echarts.graphic.registerShape('leftRect', leftRect);
    echarts.graphic.registerShape('rightRect', rightRect);
};
// 设置颜色 - 最大值为深红到半透明浅红，其他为蓝紫到半透明浅蓝
const colors = {
    max: {
        front: {
            start: '#c51b1b',
            end: 'rgba(255, 107, 107, 0.08)'
        },
        side: {
            start: '#e08a8a', // 比#c51b1b浅30%
            end: 'rgba(255, 150, 150, 0.12)'
        }
    },
    normal: {
        front: {
            start: '#4a6fa5',
            end: 'rgba(77, 166, 255, 0.08)'
        },
        side: {
            start: '#8a9ec2', // 比#4a6fa5浅25%
            end: 'rgba(120, 180, 240, 0.12)'
        }
    },
    // 新增绿色配色（完美匹配现有设计逻辑）
    safe: {
        front: {
            start: '#2e7d32', // Material Design 深绿色 (800)
            end: 'rgba(76, 175, 80, 0.08)' // #4caf50 (500) 透明渐变终点
        },
        side: {
            start: '#66bb6a', // 比#2e7d32浅40% (Material 400)
            end: 'rgba(129, 199, 132, 0.12)' // #81c784 (300) 透明渐变终点
        }
    }
};
/* 初始化图表 */
const initChart = () => {
    if (!chartRef.value || props.data.length === 0)
        return;
    // 销毁已有实例
    if (chartInstance.value) {
        chartInstance.value.dispose();
    }
    // 创建新实例
    chartInstance.value = echarts.init(chartRef.value, {
        backgroundColor: 'transparent'
    });
    // 注册3D柱体图形
    create3DBarShapes();
    // 配置选项
    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0, 20, 40, 0.8)',
            borderColor: 'rgba(100, 200, 255, 0.3)',
            textStyle: {
                color: '#e6f7ff'
            },
            axisPointer: {
                type: 'shadow',
                shadowStyle: {
                    color: 'rgba(100, 200, 255, 0.15)'
                }
            },
            formatter: (params) => {
                const item = params[0];
                const isHighRisk = props.data[item.dataIndex].isHighRisk;
                return `
        <div style="padding: 8px;">
          <div style="font-weight: bold; color: ${isHighRisk ? '#ff6b6b' : '#4da6ff'}; margin-bottom: 4px;">
            ${categories[item.dataIndex]}
          </div>
          <div style="display: flex; justify-content: space-between; width: 120px;">
            <span>舆情数量:</span>
            <span style="font-weight: bold; margin-left: 8px;">${item.value}</span>
          </div>
          ${isHighRisk ? '<div style="color: #ff6b6b; margin-top: 4px;">⚠️ 高风险分类</div>' : ''}
        </div>
        `;
            }
        },
        grid: {
            top: '2%',
            left: '2%',
            right: '2%',
            bottom: '2%', // 增加底部空间适应旋转标签
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: categories,
            axisLine: {
                lineStyle: {
                    color: 'rgba(100, 200, 255, 0.9)',
                    width: 1
                }
            },
            axisTick: {
                show: false
            },
            axisLabel: {
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 18,
                formatter: (value) => {
                    return '{offset|}' + getShortCategoryName(value);
                },
                rich: {
                    offset: {
                        width: 15
                    }
                },
                interval: 0,
                margin: 20,
                hideOverlap: true
            },
            splitLine: {
                show: false,
            }
        },
        yAxis: {
            type: 'value',
            // name: '舆情数量',
            // nameGap: 30,
            // nameTextStyle: {
            //     color: 'rgba(255, 255, 255, 0.8)',
            //     fontSize: 24
            // },
            axisLine: {
                show: true,
                lineStyle: {
                    color: 'rgba(100, 200, 255, 0.9)'
                }
            },
            axisLabel: {
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 18
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(100, 200, 255, 0.3)',
                    width: 2,
                    type: 'dashed'
                }
            }
        },
        series: [
            {
                name: '舆情数量',
                type: 'custom',
                renderItem: (params, api) => {
                    const index = params.dataIndex;
                    const location = api.coord([api.value(0), api.value(1)]);
                    // ✅ 获取 isHighRisk 状态（来自 data 中的 item.isHighRisk）
                    const isHighRisk = getHighRiskIndices.value.includes(index);
                    // ✅ 修改颜色匹配逻辑：优先判断 isHighRisk
                    let colorConfig;
                    if (isHighRisk === false) {
                        // 不是高风险 → 使用安全色
                        colorConfig = colors.safe;
                    }
                    else {
                        // 是高风险 → 按原逻辑判断是否为最大值
                        const isMax = isMaxValue(index);
                        colorConfig = isMax ? colors.max : colors.normal;
                    }
                    // ✅ 正面使用深色渐变
                    const frontGradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: colorConfig.front.start },
                        { offset: 1, color: colorConfig.front.end }
                    ]);
                    // ✅ 侧面使用浅色渐变（比正面浅）
                    const sideGradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: colorConfig.side.start },
                        { offset: 1, color: colorConfig.side.end }
                    ]);
                    // 创建3D柱体的三个面
                    return {
                        type: 'group',
                        children: [
                            // 左侧面
                            {
                                type: 'leftRect',
                                shape: {
                                    api,
                                    xValue: api.value(0),
                                    yValue: api.value(1),
                                    x: location[0],
                                    y: location[1],
                                },
                                style: {
                                    fill: frontGradient, // 关键：正面用深色
                                    shadowBlur: 10,
                                    shadowColor: 'rgba(0, 0, 0, 0.3)'
                                }
                            },
                            // 右侧面
                            {
                                type: 'rightRect',
                                shape: {
                                    api,
                                    xValue: api.value(0),
                                    yValue: api.value(1),
                                    x: location[0],
                                    y: location[1],
                                },
                                style: {
                                    fill: sideGradient, // 关键：侧面用浅色
                                    opacity: 0.95 // 稍微降低不透明度增强层次感
                                }
                            },
                            // 单独添加文本元素（放在最后确保在最上层）
                            {
                                type: 'text',
                                style: {
                                    text: api.value(1),
                                    x: location[0] + 8,
                                    y: location[1] - 32,
                                    textAlign: 'center',
                                    textVerticalAlign: 'middle',
                                    fill: '#fff',
                                    fontSize: 18,
                                    fontWeight: 'bold',
                                    textShadowColor: 'rgba(0, 0, 0, 0.7)',
                                    textShadowBlur: 2
                                }
                            }
                        ]
                    };
                },
                data: props.data.map((item, index) => ({
                    value: [index, item.value],
                    isHighRisk: item.isHighRisk // 仅保留业务数据
                }))
            }
        ],
        animationDuration: 1200,
    };
    chartInstance.value.setOption(option);
};
/* 窗口大小变化处理 */
const handleResize = () => {
    chartInstance.value?.resize();
};
/* 生命周期 */
onMounted(() => {
    window.addEventListener('resize', handleResize);
    nextTick().then(() => {
        loading.value = ElLoading.service({
            target: '#risk-bar',
            text: '加载中...',
        });
    });
});
// 监听数据变化重新渲染
watch(() => props.data, () => {
    initChart();
    try {
        loading.value?.close?.();
    }
    catch (e) { /* ignore */ }
}, { deep: true });
onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    chartInstance.value?.dispose();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['stat-value', 'chart-wrap',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("risk-sentiment-container") },
    id: ("risk-bar"),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-wrap") },
    ref: ("chartRef"),
});
// @ts-ignore navigation for `const chartRef = ref()`
/** @type { typeof __VLS_ctx.chartRef } */ ;
['risk-sentiment-container', 'chart-wrap',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartRef: chartRef,
        };
    },
    props: {
        // 数据格式：每个元素包含value（数值）和isHighRisk（是否高风险）
        data: {
            type: Array,
            required: true,
            default: () => []
        }
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    props: {
        // 数据格式：每个元素包含value（数值）和isHighRisk（是否高风险）
        data: {
            type: Array,
            required: true,
            default: () => []
        }
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
