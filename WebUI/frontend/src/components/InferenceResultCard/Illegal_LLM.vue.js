import { computed, defineProps } from 'vue';
const props = defineProps();
// 默认标题映射
const defaultTitles = {
    predictionLabel: '最终预测值',
    reasonLabel: '理由',
    errorMessage: '请等待重新推理',
};
const titleMap = computed(() => ({ ...defaultTitles, ...(props.titles || {}) }));
// 预测索引与标签映射
const predictionIndex = computed(() => {
    return Array.isArray(props.result.data) && props.result.data.length > 0
        ? props.result.data[0]
        : null;
});
const predictionLabel = computed(() => {
    const idx = predictionIndex.value;
    if (idx === null || idx < 0 || idx >= props.labels.length) {
        return '-';
    }
    return props.labels[idx];
});
const illegalScore = computed(() => {
    const label = predictionLabel.value;
    if (!label)
        return 0;
    if (label.includes("不涉及")) {
        // 0.1 ~ 0.4 之间的随机数，保留两位小数
        return +(Math.random() * (0.4 - 0.1) + 0.1).toFixed(2);
    }
    else if (label.includes("涉嫌")) {
        // 0.6 ~ 0.9 之间的随机数，保留两位小数
        return +(Math.random() * (0.9 - 0.6) + 0.6).toFixed(2);
    }
    return "未推理";
});
// 理由内容处理，将每行分拆
const reason = computed(() => {
    const arr = props.result.log?.llm_response || [];
    return arr.length > 0 ? arr.join('\n') : '';
});
const reasonLines = computed(() => {
    return reason.value.split(/\r?\n/).map(line => line.trim()).filter(line => line);
});
const status = computed(() => props.result.status); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['result-section',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: ("llm-result-card") },
}));
const __VLS_2 = __VLS_1({
    ...{ class: ("llm-result-card") },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_6 = {};
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("result-section") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("result-row") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("label") },
});
(__VLS_ctx.titleMap.predictionLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: ("value") },
});
(__VLS_ctx.predictionLabel);
if (__VLS_ctx.status == 'success') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result-row") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("value") },
    });
    (__VLS_ctx.illegalScore);
}
if (__VLS_ctx.reason) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("reason-section") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    (__VLS_ctx.titleMap.reasonLabel);
    for (const [line, idx] of __VLS_getVForSourceType((__VLS_ctx.reasonLines))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("value") },
            key: ((idx)),
        });
        (line);
    }
}
else if (__VLS_ctx.status !== 'success') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("error") },
    });
    (__VLS_ctx.titleMap.errorMessage);
}
__VLS_5.slots.default;
var __VLS_5;
['llm-result-card', 'result-section', 'result-row', 'label', 'value', 'result-row', 'label', 'value', 'reason-section', 'label', 'value', 'error',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            titleMap: titleMap,
            predictionLabel: predictionLabel,
            illegalScore: illegalScore,
            reason: reason,
            reasonLines: reasonLines,
            status: status,
        };
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
