import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import axios from '@/api/axios';
import { ElMessage } from 'element-plus';
// total 取当前选中数据集的 total_data
const total = computed(() => {
    if (!selectedDataset.value)
        return 0;
    const ds = datasets.value.find(d => d.value === selectedDataset.value);
    return ds ? ds.total_data : 0;
});
const running = ref(false);
const started = ref(false);
const finished = ref(false);
const processed = ref(0);
const startTime = ref(null);
const endTime = ref(null);
const avgSpeed = ref(0);
const selectedDataset = ref(null);
// 假设的数据集列表，可以从接口拉取
const datasets = ref([]);
const percent = computed(() => {
    const raw = (processed.value / total.value) * 100;
    return parseFloat(raw.toFixed(1));
});
function formatTime(date) {
    if (!date)
        return '--:--:--';
    return date.toLocaleTimeString();
}
async function fetchOffineDataset() {
    const link = `/evaluate/offline/AvaiableDataset`;
    axios.get(link).then((response) => {
        datasets.value = [{ 'value': -1, 'label': '风险内容检测', 'total_data': 10000 }];
    }).catch((e) => {
        ElMessage.error(e);
    });
}
let eventSource = null;
// async function startDetection() {
//     if (running.value || !selectedDataset.value) return
//     // 先关掉可能存在的旧连接
//     if (eventSource) {
//         eventSource.close()
//         eventSource = null
//     }
//     // 在这里可以根据 selectedDataset.value 发起不同的数据请求
//     console.log('开始检测的数据集：', selectedDataset.value)
//     // 初始化状态
//     running.value = true
//     finished.value = false
//     processed.value = 0
//     startTime.value = null
//     endTime.value = null
//     avgSpeed.value = 0
//     // 模拟启动延迟
//     // await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200))
//     // 开始检测
//     startTime.value = new Date()
//     started.value = true
//     const startTs = performance.now()
//     const token = localStorage.getItem('user-token')
//     // 用 polyfill 并设置 Authorization header
//     eventSource = new EventSourcePolyfill(
//         `/api/evaluate/offline/detect2`,
//         {
//             headers: { Authorization: `Bearer ${token}` }
//         }
//     )
//     eventSource.onmessage = (e) => {
//         try {
//             const data = JSON.parse(e.data)
//             // 后端推送 { processed: number }
//             processed.value = data.processed
//             // 如果到总量了，就关闭连接
//             if (processed.value >= total.value) {
//                 running.value = false
//                 eventSource?.close()
//             }
//         } catch {
//             // 如果推送了非 JSON（比如心跳），就忽略
//         } finally {
//             endTime.value = new Date()
//             const durationSec = (performance.now() - startTs) / 1000
//             avgSpeed.value = processed.value / durationSec
//             running.value = false
//             finished.value = true
//         }
//     }
//     eventSource.onerror = (err) => {
//         running.value = false
//         eventSource?.close()
//         ElMessage.error('检测过程中断开：' + err)
//     }
// }
let eventSourceTimer = null;
async function startDetection() {
    if (running.value || !selectedDataset.value)
        return;
    // 关闭可能存在的旧定时器
    if (eventSourceTimer) {
        clearInterval(eventSourceTimer);
        eventSourceTimer = null;
    }
    console.log('开始检测的数据集：', selectedDataset.value);
    // 初始化状态
    running.value = true;
    started.value = true;
    finished.value = false;
    processed.value = 0;
    startTime.value = new Date();
    endTime.value = null;
    avgSpeed.value = 0;
    const totalItems = 10000;
    const durationSec = 420 + Math.random() * 60; // 7-8分钟随机
    const startTs = performance.now();
    // 每次更新的条数可以随机一点，模拟不均匀进度
    const getRandomStep = () => Math.floor(totalItems / durationSec * 0.5 + Math.random() * (totalItems / durationSec));
    eventSourceTimer = setInterval(() => {
        const step = getRandomStep();
        console.log(`Processing ${step} items...`);
        processed.value = Math.min(processed.value + step, totalItems);
        const durationNowSec = (performance.now() - startTs) / 1000;
        avgSpeed.value = processed.value / durationNowSec;
        if (processed.value >= totalItems) {
            clearInterval(eventSourceTimer);
            eventSourceTimer = null;
            running.value = false;
            finished.value = true;
            endTime.value = new Date();
        }
    }, 1000); // 每秒更新一次
}
onMounted(() => {
    fetchOffineDataset();
});
// 组件销毁前，记得关闭 SSE
onBeforeUnmount(() => {
    eventSource?.close();
}); /* PartiallyEnd: #3632/scriptSetup.vue */
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
const __VLS_7 = {}.ElSelect;
/** @type { [typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ] } */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    modelValue: ((__VLS_ctx.selectedDataset)),
    placeholder: ("请选择要检测的数据集"),
    ...{ style: ({}) },
}));
const __VLS_9 = __VLS_8({
    modelValue: ((__VLS_ctx.selectedDataset)),
    placeholder: ("请选择要检测的数据集"),
    ...{ style: ({}) },
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
for (const [ds] of __VLS_getVForSourceType((__VLS_ctx.datasets))) {
    const __VLS_13 = {}.ElOption;
    /** @type { [typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ] } */ ;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
        key: ((ds.value)),
        label: ((ds.label)),
        value: ((ds.value)),
    }));
    const __VLS_15 = __VLS_14({
        key: ((ds.value)),
        label: ((ds.label)),
        value: ((ds.value)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
}
__VLS_12.slots.default;
var __VLS_12;
const __VLS_19 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    ...{ 'onClick': {} },
    type: ("primary"),
    loading: ((__VLS_ctx.running)),
    disabled: ((!__VLS_ctx.selectedDataset)),
}));
const __VLS_21 = __VLS_20({
    ...{ 'onClick': {} },
    type: ("primary"),
    loading: ((__VLS_ctx.running)),
    disabled: ((!__VLS_ctx.selectedDataset)),
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
let __VLS_25;
const __VLS_26 = {
    onClick: (__VLS_ctx.startDetection)
};
let __VLS_22;
let __VLS_23;
(__VLS_ctx.running ? '检测中...' : '启动检测');
__VLS_24.slots.default;
var __VLS_24;
if (__VLS_ctx.started) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.formatTime(__VLS_ctx.startTime));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.processed);
    (__VLS_ctx.total);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.avgSpeed.toFixed(2));
    const __VLS_27 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
        percentage: ((__VLS_ctx.percent)),
    }));
    const __VLS_29 = __VLS_28({
        percentage: ((__VLS_ctx.percent)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
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
            selectedDataset: selectedDataset,
            datasets: datasets,
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
