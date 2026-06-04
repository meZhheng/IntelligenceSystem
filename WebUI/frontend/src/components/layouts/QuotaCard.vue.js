import { computed, toRefs } from 'vue';
const props = defineProps({
    title: { type: String, required: true },
    quotaData: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
});
const { quotaData } = toRefs(props);
const percentage = computed(() => {
    if (!quotaData.value)
        return 0;
    if (quotaData.value.limit_bytes === null)
        return 0;
    const pct = (quotaData.value.used_bytes / quotaData.value.limit_bytes) * 100;
    return Math.min(pct, 999); // 限制一个上限以防异常
});
const progressStatus = computed(() => {
    if (!quotaData.value)
        return 'success';
    if (quotaData.value.limit_bytes === null)
        return 'success';
    if (quotaData.value.used_bytes > (quotaData.value.limit_bytes || 0))
        return 'exception';
    if (percentage.value >= 90)
        return 'warning';
    return 'success';
});
// 单位转换
function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let num = bytes;
    while (num >= 1024 && i < units.length - 1) {
        num /= 1024;
        i += 1;
    }
    return `${num.toFixed(1)} ${units[i]}`;
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("quota-card") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("header") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("title") },
});
(__VLS_ctx.title);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("meta") },
});
if (__VLS_ctx.loading) {
    const __VLS_0 = {}.ElSkeleton;
    /** @type { [typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        rows: ((1)),
        animated: (true),
        ...{ style: ({}) },
    }));
    const __VLS_2 = __VLS_1({
        rows: ((1)),
        animated: (true),
        ...{ style: ({}) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("error-text") },
    });
    (__VLS_ctx.error);
}
else if (__VLS_ctx.quotaData) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("numbers") },
    });
    (__VLS_ctx.formatSize(__VLS_ctx.quotaData.used_bytes));
    if (__VLS_ctx.quotaData.limit_bytes !== null) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatSize(__VLS_ctx.quotaData.limit_bytes));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
if (__VLS_ctx.quotaData && !__VLS_ctx.loading && !__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("body") },
    });
    const __VLS_6 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        percentage: ((__VLS_ctx.percentage)),
        status: ((__VLS_ctx.progressStatus)),
        textInside: ((false)),
        strokeWidth: ((14)),
    }));
    const __VLS_8 = __VLS_7({
        percentage: ((__VLS_ctx.percentage)),
        status: ((__VLS_ctx.progressStatus)),
        textInside: ((false)),
        strokeWidth: ((14)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("footer") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("percent-text") },
    });
    if (__VLS_ctx.quotaData.limit_bytes !== null) {
        (__VLS_ctx.percentage.toFixed(1));
    }
    else {
        (__VLS_ctx.formatSize(__VLS_ctx.quotaData.used_bytes));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("updated") },
    });
    (new Date(__VLS_ctx.quotaData.updated_at).toLocaleString('zh-CN', { hour12: false }));
}
['quota-card', 'header', 'title', 'meta', 'error-text', 'numbers', 'body', 'footer', 'percent-text', 'updated',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            quotaData: quotaData,
            percentage: percentage,
            progressStatus: progressStatus,
            formatSize: formatSize,
        };
    },
    props: {
        title: { type: String, required: true },
        quotaData: { type: Object, default: null },
        loading: { type: Boolean, default: false },
        error: { type: String, default: '' },
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    props: {
        title: { type: String, required: true },
        quotaData: { type: Object, default: null },
        loading: { type: Boolean, default: false },
        error: { type: String, default: '' },
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
