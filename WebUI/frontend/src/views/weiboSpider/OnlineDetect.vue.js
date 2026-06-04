import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { EventSourcePolyfill } from 'event-source-polyfill';
const total = ref(0);
const running = ref(false);
const started = ref(false);
const finished = ref(false);
const processed = ref(0);
const startTime = ref(null);
const endTime = ref(null);
const avgSpeed = ref(0);
const percent = computed(() => {
    const raw = (processed.value / total.value) * 100;
    return parseFloat(raw.toFixed(1));
});
function formatTime(date) {
    if (!date)
        return '--:--:--';
    return date.toLocaleTimeString();
}
let eventSource = null;
async function startDetection() {
    if (running.value)
        return;
    // 先关掉可能存在的旧连接
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    // 初始化状态
    running.value = true;
    finished.value = false;
    processed.value = 0;
    startTime.value = null;
    endTime.value = null;
    avgSpeed.value = 0;
    // 模拟启动延迟
    // await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200))
    // 开始检测
    startTime.value = new Date();
    started.value = true;
    const startTs = performance.now();
    const token = localStorage.getItem('user-token');
    // 用 polyfill 并设置 Authorization header
    eventSource = new EventSourcePolyfill(`/api/evaluate/online/detect`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    eventSource.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            // 后端推送 { processed: number }
            processed.value = data.processed;
            total.value = data.total;
            // 如果到总量了，就关闭连接
            if (processed.value >= total.value) {
                running.value = false;
                eventSource?.close();
            }
        }
        catch {
            // 如果推送了非 JSON（比如心跳），就忽略
        }
        finally {
            endTime.value = new Date();
            const durationSec = (performance.now() - startTs) / 1000;
            avgSpeed.value = total.value / durationSec;
            running.value = false;
            finished.value = true;
        }
    };
    eventSource.onerror = (err) => {
        running.value = false;
        eventSource?.close();
        ElMessage.error('检测过程中断开：' + err);
    };
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: ("detection-card") },
}));
const __VLS_2 = __VLS_1({
    ...{ class: ("detection-card") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_6 = {};
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("controls") },
});
const __VLS_7 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    ...{ 'onClick': {} },
    type: ("primary"),
    loading: ((__VLS_ctx.running)),
}));
const __VLS_9 = __VLS_8({
    ...{ 'onClick': {} },
    type: ("primary"),
    loading: ((__VLS_ctx.running)),
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
let __VLS_13;
const __VLS_14 = {
    onClick: (__VLS_ctx.startDetection)
};
let __VLS_10;
let __VLS_11;
(__VLS_ctx.running ? '检测中...' : '启动检测');
__VLS_12.slots.default;
var __VLS_12;
if (__VLS_ctx.started) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.formatTime(__VLS_ctx.startTime));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.processed);
    (__VLS_ctx.total);
    const __VLS_15 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
        percentage: ((__VLS_ctx.percent)),
    }));
    const __VLS_17 = __VLS_16({
        percentage: ((__VLS_ctx.percent)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
}
if (__VLS_ctx.finished) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.formatTime(__VLS_ctx.endTime));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.avgSpeed.toFixed(2));
}
__VLS_5.slots.default;
var __VLS_5;
['detection-card', 'controls', 'info', 'result',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            total: total,
            running: running,
            started: started,
            finished: finished,
            processed: processed,
            startTime: startTime,
            endTime: endTime,
            avgSpeed: avgSpeed,
            percent: percent,
            formatTime: formatTime,
            startDetection: startDetection,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
