import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import { ElLoading } from 'element-plus';
const loading = ref(null);
const props = defineProps();
// 响应式引用
const chartRef = ref(null);
const chartContainerRef = ref(null);
const chartInstance = ref(null);
// 默认配置
const DEFAULT_ROTATION_RANGE = [-45, 45];
const DEFAULT_MIN_SIZE = 12;
const DEFAULT_MAX_SIZE = 70;
const DEFAULT_SHAPE = 'circle';
const DEFAULT_UPDATE_INTERVAL = 15;
// 计算属性
const keywords = computed(() => props.keywords ?? []);
const rotationRange = computed(() => props.rotationRange ?? DEFAULT_ROTATION_RANGE);
const minSize = computed(() => props.minSize ?? DEFAULT_MIN_SIZE);
const maxSize = computed(() => props.maxSize ?? DEFAULT_MAX_SIZE);
const shape = computed(() => props.shape ?? DEFAULT_SHAPE);
const updateInterval = computed(() => props.updateInterval ?? DEFAULT_UPDATE_INTERVAL);
// 统计信息
const totalCount = computed(() => keywords.value.length);
const topKeywords = computed(() => {
    if (keywords.value.length === 0)
        return '0';
    const sorted = [...keywords.value].sort((a, b) => b.value - a.value);
    return sorted.slice(0, 15).map(item => item.name).join(' ');
});
const updateFrequency = computed(() => `${updateInterval.value}秒`);
/* 初始化图表 */
function initChart() {
    if (!chartContainerRef.value)
        return;
    // 销毁现有实例
    if (chartInstance.value) {
        chartInstance.value.dispose();
    }
    // 创建新实例
    chartInstance.value = echarts.init(chartContainerRef.value, null, {
        renderer: 'canvas',
        useDirtyRect: false
    });
    // 设置图表配置
    setChartOptions();
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
}
// 辅助：生成 CSS rgb/rgba，遇到非法值返回 fallback
const rgbToCssSafe = (rgb, alpha) => {
    if (!Array.isArray(rgb) || rgb.length < 3)
        return 'rgb(77,166,255)'; // fallback
    const [r, g, b] = rgb.map(x => Number.isFinite(x) ? Math.round(x) : 0);
    if (alpha == null)
        return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
/* 设置图表选项 */
function setChartOptions() {
    if (!chartInstance.value)
        return;
    // 固定的最小/最大颜色（blue-100 -> blue-900）
    const LOW_RGB = [147, 197, 253]; // blue-100
    const HIGH_RGB = [30, 58, 138]; // blue-900
    // 辅助函数：clamp、RGB -> CSS、根据比例插值、调整亮度
    const clamp = (v, a = 0, b = 255) => Math.max(a, Math.min(b, Math.round(v)));
    // 根据 t(0..1) 在两个 RGB 之间线性插值
    const lerpRgb = (a, b, t) => [
        clamp(a[0] + (b[0] - a[0]) * t),
        clamp(a[1] + (b[1] - a[1]) * t),
        clamp(a[2] + (b[2] - a[2]) * t)
    ];
    // 调整亮度：amount 为 -1..1（负数变暗，正数变亮），简单向 0 或 255 推近
    const adjustBrightness = (rgb, amount) => {
        if (amount === 0)
            return rgb.map(v => clamp(v));
        if (amount > 0) {
            return rgb.map(v => clamp(v + (255 - v) * amount));
        }
        else {
            return rgb.map(v => clamp(v + (0 - v) * (-amount)));
        }
    };
    // 计算当前关键词中的最小/最大值（仅数值）
    const values = keywords.value.map((k) => (typeof k.value === 'number' ? k.value : NaN)).filter((v) => !Number.isNaN(v));
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 1; // 防止除以0
    const option = {
        tooltip: {
            show: true,
            backgroundColor: 'rgba(5, 25, 45, 0.9)',
            borderColor: 'rgba(100, 200, 255, 0.3)',
            borderWidth: 1,
            textStyle: {
                color: '#e0f7fa',
                fontSize: 14
            },
            formatter: (params) => {
                return `${params.name}<br/>权重: ${params.value}`;
            },
            extraCssText: 'box-shadow: 0 0 10px rgba(100, 200, 255, 0.5);'
        },
        series: [{
                type: 'wordCloud',
                gridSize: 2,
                sizeRange: [minSize.value, maxSize.value],
                rotationRange: rotationRange.value,
                shape: shape.value,
                width: '100%',
                height: '100%',
                drawOutOfBound: false,
                textStyle: {
                    fontFamily: 'Microsoft YaHei, Arial, sans-serif',
                    fontWeight: 'bold',
                    // 假定你已定义了 clamp, lerpRgb, adjustBrightness, rgbToCssSafe 等辅助函数（参照之前代码）
                    color: (params) => {
                        // 防护：解析 value
                        const rawVal = params && params.value;
                        const val = Number.isFinite(Number(rawVal)) ? Number(rawVal) : 0;
                        // 规范化 weight
                        let weight = 0.5;
                        if (maxValue !== minValue && Number.isFinite(minValue) && Number.isFinite(maxValue)) {
                            weight = Math.max(0, Math.min(1, (val - minValue) / (maxValue - minValue)));
                        }
                        // 基础颜色插值并微调
                        const baseRgb = lerpRgb(LOW_RGB, HIGH_RGB, Number.isFinite(weight) ? weight : 0.5);
                        // name hash -> 微扰动
                        const name = String(params.name || '');
                        let hash = 0;
                        for (let i = 0; i < name.length; i++) {
                            hash = name.charCodeAt(i) + ((hash << 5) - hash);
                            hash |= 0;
                        }
                        const hueOffset = ((hash >> 2) % 13) - 6;
                        const microAdjust = Number.isFinite(hueOffset) ? (hueOffset / 30) : 0;
                        const adjustedBase = adjustBrightness(baseRgb, microAdjust);
                        // 若 data 中有合法的 item.color 字符串则优先用它
                        const itemColor = params.data && params.data.color;
                        if (typeof itemColor === 'string' && itemColor.trim()) {
                            return itemColor;
                        }
                        // 根据权重返回不同亮度的纯色字符串（不使用 gradient）
                        // 高权重 -> 更亮一点，低权重 -> 稍暗一些
                        const brightnessAdj = weight >= 0.85 ? 0.18 : weight >= 0.6 ? 0.08 : 0.02;
                        const finalRgb = adjustBrightness(adjustedBase, brightnessAdj);
                        return rgbToCssSafe(finalRgb); // e.g. "rgb(34,120,200)"
                    },
                    emphasis: {
                        shadowBlur: 10,
                        shadowColor: '#4da6ff'
                    }
                },
                emphasis: {
                    textStyle: {
                        textShadowBlur: 20,
                        textShadowColor: '#4da6ff'
                    }
                },
                data: keywords.value.map((item) => ({
                    name: item.name,
                    value: item.value,
                    category: item.category,
                    color: item.color
                }))
            }],
        animation: true,
        animationDuration: 1000
    };
    chartInstance.value.setOption(option);
}
/* 处理窗口大小变化 */
function handleResize() {
    if (chartInstance.value) {
        chartInstance.value.resize();
    }
}
/* 生命周期钩子 */
onMounted(async () => {
    await nextTick();
    initChart();
    // 初始渲染
    setChartOptions();
    nextTick().then(() => {
        loading.value = ElLoading.service({
            target: '#wordCloudArea',
            text: '加载中...',
        });
    });
});
onBeforeUnmount(() => {
    if (chartInstance.value) {
        chartInstance.value.dispose();
        chartInstance.value = null;
    }
    window.removeEventListener('resize', handleResize);
});
/* 监听关键词变化 */
watch(keywords, () => {
    if (chartInstance.value) {
        setChartOptions();
        try {
            loading.value?.close?.();
        }
        catch (e) { /* ignore */ }
    }
}, { deep: true });
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['keyword-cloud-wrap', 'title-glow',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: ("wordCloudArea"),
    ...{ class: ("keyword-cloud-wrap") },
    ref: ("chartRef"),
    ...{ style: (({ width: __VLS_ctx.width, height: __VLS_ctx.height })) },
});
// @ts-ignore navigation for `const chartRef = ref()`
/** @type { typeof __VLS_ctx.chartRef } */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("chart-container") },
    ref: ("chartContainerRef"),
});
// @ts-ignore navigation for `const chartContainerRef = ref()`
/** @type { typeof __VLS_ctx.chartContainerRef } */ ;
['keyword-cloud-wrap', 'chart-container',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartRef: chartRef,
            chartContainerRef: chartContainerRef,
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
