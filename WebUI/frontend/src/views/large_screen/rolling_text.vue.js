import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
const props = defineProps();
// 默认配置
const DEFAULT_INITIAL_DELAY = 500;
const DEFAULT_ITEM_INTERVAL = 500;
const DEFAULT_NEW_ITEM_DURATION = 10000; // 5秒
// 响应式状态
const visibleItems = ref([]);
const simulatedSpeed = ref(2000); // 模拟速度（ms）
const newItemDuration = ref(DEFAULT_NEW_ITEM_DURATION);
const animationQueue = ref([]);
const isProcessing = ref(false);
const wrapRef = ref(null);
const innerRef = ref(null);
const itemHeight = ref(100); // 单个item的预估高度（px）
// 计算属性
const items = computed(() => props.items ?? []);
const maxLines = computed(() => props.maxLines ?? 2);
const initialDelay = computed(() => props.initialDelay ?? DEFAULT_INITIAL_DELAY);
const itemInterval = computed(() => props.itemInterval ?? DEFAULT_ITEM_INTERVAL);
const newItemDurationMs = computed(() => props.newItemDuration ?? DEFAULT_NEW_ITEM_DURATION);
// 统计信息
const totalCount = computed(() => visibleItems.value.length);
const safeCount = computed(() => visibleItems.value.filter(item => badgeClass(item.pred_label) === 'safe').length);
const dangerCount = computed(() => visibleItems.value.filter(item => badgeClass(item.pred_label) === 'danger').length);
/* 格式化时间、badgeClass 与原来一致 */
function formatTime(ts) {
    if (!ts)
        return '';
    try {
        const d = new Date(ts);
        const opts = {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, timeZone: 'Asia/Tokyo'
        };
        const parts = new Intl.DateTimeFormat('zh-CN', opts).formatToParts(d);
        const map = {};
        parts.forEach(p => { if (p.type !== 'literal')
            map[p.type] = p.value; });
        return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
    }
    catch (e) {
        return ts;
    }
}
function badgeClass(label) {
    const low = (label || '').toLowerCase();
    if (/正常|不涉及|safe|non|none/i.test(low))
        return 'safe';
    if (/敏感|违规|涉|侵权|hate|abuse|illegal|violation/i.test(low))
        return 'danger';
    return 'neutral';
}
/* 初始化：加载前10条数据 */
function initializeWithFirstTen() {
    if (!items.value || items.value.length === 0)
        return;
    // 取前10条或全部数据
    const initialItems = items.value.slice(0, 10).map(item => ({ ...item }));
    visibleItems.value = initialItems;
    // 剩余数据放入队列
    animationQueue.value = [...items.value.slice(10)];
    // 计算单个item高度（用于滚动预留）
    setTimeout(() => {
        if (innerRef.value && innerRef.value.children.length > 0) {
            itemHeight.value = innerRef.value.children[0].offsetHeight;
        }
    }, 100);
}
/* 模拟实时检测效果 */
function simulateRealTimeDetection() {
    if (animationQueue.value.length === 0)
        return;
    isProcessing.value = true;
    processNextItem();
}
async function processNextItem() {
    if (animationQueue.value.length === 0) {
        isProcessing.value = false;
        return;
    }
    // 2. 从队列中取出下一项
    const newItem = {
        ...animationQueue.value.shift(),
        isEntering: true,
        isNew: true
    };
    visibleItems.value.push(newItem);
    // 3. 滚动到底部
    scrollToBottom();
    // 4. 动画完成后移除进入状态
    setTimeout(() => {
        const index = visibleItems.value.findIndex(item => item.data_id === newItem.data_id);
        if (index !== -1) {
            visibleItems.value[index].isEntering = false;
        }
    }, 500);
    // 5. 5秒后移除"新"标签
    setTimeout(() => {
        const index = visibleItems.value.findIndex(item => item.data_id === newItem.data_id);
        if (index !== -1) {
            visibleItems.value[index].isNew = false;
        }
    }, newItemDurationMs.value);
    // 6. 处理下一项，添加极端随机性（模拟突发性连续快速检测）
    const now = Date.now();
    let randomizedSpeed;
    // 创建突发性检测模式：每10秒有20%概率进入"检测高峰"期（持续1.5秒）
    const isBurstPeriod = (now % 10000) < 1500 && Math.random() < 0.2;
    if (isBurstPeriod) {
        // 检测高峰期：速度是正常速度的4-8倍（连续快速检测）
        randomizedSpeed = simulatedSpeed.value / (4 + Math.random() * 4);
    }
    else {
        // 非高峰期：70%概率慢速，30%概率中速
        if (Math.random() < 0.7) {
            // 大部分时间较慢（模拟复杂检测）
            randomizedSpeed = simulatedSpeed.value * (1.2 + Math.random() * 1.8);
        }
        else {
            // 小部分时间中等速度
            randomizedSpeed = simulatedSpeed.value * (0.5 + Math.random() * 0.5);
        }
    }
    setTimeout(processNextItem, randomizedSpeed);
}
function scrollToBottom() {
    const container = innerRef.value;
    if (container) {
        // 平滑滚动到底部
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }
}
function updateSimulatedSpeed() {
    // 如果正在处理，重新开始模拟
    if (isProcessing.value && animationQueue.value.length > 0) {
        simulateRealTimeDetection();
    }
}
/* 监听 items 的变化 */
watch(items, (newVal) => {
    if (newVal && newVal.length > 0) {
        // 重置状态
        visibleItems.value = [];
        animationQueue.value = [];
        // 初始化前10条
        initializeWithFirstTen();
        // 如果有剩余数据，开始模拟
        if (animationQueue.value.length > 0) {
            setTimeout(simulateRealTimeDetection, initialDelay.value);
        }
    }
    else {
        visibleItems.value = [];
    }
}, { immediate: true, deep: true });
/* 生命周期挂载与卸载 */
onMounted(() => {
    // 初始设置
    simulatedSpeed.value = itemInterval.value;
    newItemDuration.value = newItemDurationMs.value;
    // 设置 ResizeObserver
    const resizeObs = new ResizeObserver(() => {
        scrollToBottom();
        // 重新计算item高度
        if (innerRef.value && innerRef.value.children.length > 0) {
            itemHeight.value = innerRef.value.children[0].offsetHeight;
        }
    });
    if (wrapRef.value) {
        resizeObs.observe(wrapRef.value);
    }
    if (innerRef.value) {
        resizeObs.observe(innerRef.value);
    }
    onBeforeUnmount(() => {
        resizeObs.disconnect();
    });
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['detect-list-inner', 'detect-list-inner', 'detect-list-inner', 'detect-list-inner', 'detect-item', 'detect-item', 'glow-effect', 'detect-item', 'glow-effect', 'detect-item', 'glow-effect', 'detect-item', 'animate-in', 'glow-effect', 'badge', 'badge', 'badge', 'speed-slider', 'speed-slider', 'speed-slider', 'speed-labels', 'detect-item', 'text', 'badge', 'control-panel', 'detect-item', 'detect-item', 'safe-item', 'badge', 'danger-item', 'badge', 'neutral-item', 'badge', 'detect-list-wrap',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("detect-list-wrap") },
    ref: ("wrapRef"),
    role: ("region"),
    'aria-label': ("检测结果滚动列表"),
});
// @ts-ignore navigation for `const wrapRef = ref()`
/** @type { typeof __VLS_ctx.wrapRef } */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("detect-list-inner") },
    ref: ("innerRef"),
});
// @ts-ignore navigation for `const innerRef = ref()`
/** @type { typeof __VLS_ctx.innerRef } */ ;
if (__VLS_ctx.visibleItems.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("empty") },
    });
}
for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.visibleItems))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detect-item") },
        key: ((item.data_id + '-' + index)),
        ...{ class: (({
                'animate-in': item.isEntering,
                'safe-item': __VLS_ctx.badgeClass(item.pred_label) === 'safe',
                'danger-item': __VLS_ctx.badgeClass(item.pred_label) === 'danger',
                'neutral-item': __VLS_ctx.badgeClass(item.pred_label) === 'neutral'
            })) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("glow-effect") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("left") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("badge") },
        ...{ class: ((__VLS_ctx.badgeClass(item.pred_label))) },
    });
    (item.pred_label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("center") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("text") },
        title: ((item.text)),
    });
    (item.text);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("meta") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("time") },
    });
    (__VLS_ctx.formatTime(item.timestamp));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("id") },
    });
    (item.data_id);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("right") },
    });
    if (item.isNew) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("new-tag") },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            ...{ class: ("mini-icon") },
            viewBox: ("0 0 1024 1024"),
            width: ("28"),
            height: ("28"),
            'aria-hidden': ("true"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: ("M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z"),
            fill: ("transparent"),
            stroke: ("rgba(255,255,255,0.15)"),
            'stroke-width': ("20"),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: ("M352 432h320v64H352z"),
            fill: ("#bae6fd"),
        });
    }
}
['detect-list-wrap', 'detect-list-inner', 'empty', 'detect-item', 'animate-in', 'safe-item', 'danger-item', 'neutral-item', 'glow-effect', 'left', 'badge', 'center', 'text', 'meta', 'time', 'id', 'right', 'new-tag', 'mini-icon',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            visibleItems: visibleItems,
            wrapRef: wrapRef,
            innerRef: innerRef,
            formatTime: formatTime,
            badgeClass: badgeClass,
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
