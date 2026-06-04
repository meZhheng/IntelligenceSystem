import { computed } from 'vue';
import { SuccessFilled, WarningFilled } from '@element-plus/icons-vue';
const props = defineProps({
    result: {
        type: Object,
        required: true,
        default: null,
    }
});
// 计算属性
const isSafe = computed(() => props.result.data?.[0] === 0);
const offensiveConfidence = computed(() => Math.round(props.result.confidences?.[0]?.[1] * 100 || 0));
const safeConfidence = computed(() => Math.round(props.result.confidences?.[0]?.[0] * 100 || 0));
// 样式计算
const resultClass = computed(() => ({
    'safe-result': isSafe.value,
    'offensive-result': !isSafe.value
}));
const resultTitle = computed(() => isSafe.value ? '安全文本' : '检测到虚假内容');
const resultTagType = computed(() => isSafe.value ? 'success' : 'danger');
const confidenceText = computed(() => isSafe.value
    ? `安全置信度 ${safeConfidence.value}%`
    : `虚假置信度 ${offensiveConfidence.value}%`);
// 渐变色配置
const offensiveGradient = [
    { color: '#f56c6c', percentage: 0 },
    { color: '#cf1322', percentage: 80 },
];
const safeGradient = [
    { color: '#67c23a', percentage: 0 },
    { color: '#389e0d', percentage: 80 },
]; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.result != null) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("offensive-check-container") },
    });
    const __VLS_0 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ class: ("result-card") },
        ...{ class: ((__VLS_ctx.resultClass)) },
    }));
    const __VLS_2 = __VLS_1({
        ...{ class: ("result-card") },
        ...{ class: ((__VLS_ctx.resultClass)) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result-header") },
    });
    const __VLS_6 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        ...{ class: ("result-icon") },
        size: ((40)),
    }));
    const __VLS_8 = __VLS_7({
        ...{ class: ("result-icon") },
        size: ((40)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    if (__VLS_ctx.isSafe) {
        const __VLS_12 = {}.SuccessFilled;
        /** @type { [typeof __VLS_components.SuccessFilled, ] } */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
        const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
    else {
        const __VLS_18 = {}.WarningFilled;
        /** @type { [typeof __VLS_components.WarningFilled, ] } */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
        const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
    }
    __VLS_11.slots.default;
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result-text") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.resultTitle);
    const __VLS_24 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        type: ((__VLS_ctx.resultTagType)),
        size: ("large"),
    }));
    const __VLS_26 = __VLS_25({
        type: ((__VLS_ctx.resultTagType)),
        size: ("large"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    (__VLS_ctx.confidenceText);
    __VLS_29.slots.default;
    var __VLS_29;
    __VLS_5.slots.default;
    var __VLS_5;
    const __VLS_30 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
        ...{ class: ("confidence-card") },
    }));
    const __VLS_32 = __VLS_31({
        ...{ class: ("confidence-card") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    {
        const { header: __VLS_thisSlot } = __VLS_35.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("card-title") },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("confidence-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("label") },
    });
    const __VLS_36 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        percentage: ((__VLS_ctx.offensiveConfidence)),
        color: ((__VLS_ctx.offensiveGradient)),
        strokeWidth: ((18)),
        showText: ((false)),
    }));
    const __VLS_38 = __VLS_37({
        percentage: ((__VLS_ctx.offensiveConfidence)),
        color: ((__VLS_ctx.offensiveGradient)),
        strokeWidth: ((18)),
        showText: ((false)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("percentage") },
    });
    (__VLS_ctx.offensiveConfidence);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("confidence-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("label") },
    });
    const __VLS_42 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
        percentage: ((__VLS_ctx.safeConfidence)),
        color: ((__VLS_ctx.safeGradient)),
        strokeWidth: ((18)),
        showText: ((false)),
    }));
    const __VLS_44 = __VLS_43({
        percentage: ((__VLS_ctx.safeConfidence)),
        color: ((__VLS_ctx.safeGradient)),
        strokeWidth: ((18)),
        showText: ((false)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("percentage") },
    });
    (__VLS_ctx.safeConfidence);
    __VLS_35.slots.default;
    var __VLS_35;
}
['offensive-check-container', 'result-card', 'result-header', 'result-icon', 'result-text', 'confidence-card', 'card-title', 'confidence-item', 'label', 'percentage', 'confidence-item', 'label', 'percentage',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            SuccessFilled: SuccessFilled,
            WarningFilled: WarningFilled,
            isSafe: isSafe,
            offensiveConfidence: offensiveConfidence,
            safeConfidence: safeConfidence,
            resultClass: resultClass,
            resultTitle: resultTitle,
            resultTagType: resultTagType,
            confidenceText: confidenceText,
            offensiveGradient: offensiveGradient,
            safeGradient: safeGradient,
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
});
; /* PartiallyEnd: #4569/main.vue */
