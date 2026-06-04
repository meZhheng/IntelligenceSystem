import { computed } from 'vue';
import { SuccessFilled, WarningFilled } from '@element-plus/icons-vue';
const props = defineProps({
    data: {
        type: Object,
        default: null
    }
});
// 只有当 data 不为 null 时才渲染主要内容
const hasData = computed(() => props.data !== null);
// 分类结果
const isReal = computed(() => props.data?.prediction === 0);
// 假设的权重配置（根据实际模型调整）
const textWeight = 90;
const entityWeight = 10;
// 置信度与原始分数
const raw = computed(() => props.data?.raw_scores ?? {
    final: 0,
    bias_contrib: 0,
    entity_contrib: 0
});
// 百分比形式
const finalConfidence = computed(() => Math.round(raw.value.final * 100));
const textConfidence = computed(() => Math.round(raw.value.bias_contrib * 100));
const entityConfidence = computed(() => Math.round(raw.value.entity_contrib * 100));
// 实体列表
const entities = computed(() => (props.data?.entities ?? '').split('[SEP]').filter(s => s));
// 样式／标签
const resultClass = computed(() => ({
    'real-news': isReal.value,
    'fake-news': !isReal.value
}));
const verdictText = computed(() => isReal.value ? '真实信息' : '虚假信息');
const verdictType = computed(() => isReal.value ? 'success' : 'danger');
const confidenceText = computed(() => `${finalConfidence.value}% 置信度`);
// 进度条颜色
const finalColor = [
    { color: '#67c23a', percentage: 0 },
    { color: isReal.value ? '#389e0d' : '#cf1322', percentage: 80 }
];
const textColor = [
    { color: '#f56c6c', percentage: 0 },
    { color: '#cf1322', percentage: 80 }
];
const entityColor = [
    { color: '#f56c6c', percentage: 0 },
    { color: '#cf1322', percentage: 80 }
];
// 原文高亮
const highlightedText = computed(() => {
    let text = props.data.text;
    // 创建实体副本并按长度降序排序（解决短实体优先匹配长实体的问题）
    const sortedEntities = entities.value.slice().sort((a, b) => b.length - a.length);
    sortedEntities.forEach(entity => {
        // 转义正则特殊字符
        const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 使用单词边界和正向向前断言确保精确匹配
        const regex = new RegExp(`(${escapedEntity})(?![^<]*>)(?![^<]*</span>)`, 'g');
        text = text.replace(regex, `<span class="entity-highlight" style="background: ${getEntityColor(entity)}">$1</span>`);
    });
    return text;
});
const getEntityColor = (entity) => {
    const hash = entity.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 80%)`;
};
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.hasData) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("debiased-rumor-container disable-select") },
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
        ...{ class: ("status-icon") },
        size: ((40)),
    }));
    const __VLS_8 = __VLS_7({
        ...{ class: ("status-icon") },
        size: ((40)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    if (__VLS_ctx.isReal) {
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
        ...{ class: ("result-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.verdictText);
    const __VLS_24 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        type: ((__VLS_ctx.verdictType)),
        size: ("large"),
    }));
    const __VLS_26 = __VLS_25({
        type: ((__VLS_ctx.verdictType)),
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
        ...{ class: ("text-card") },
    }));
    const __VLS_32 = __VLS_31({
        ...{ class: ("text-card") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    {
        const { header: __VLS_thisSlot } = __VLS_35.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("card-title") },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("original-text") },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightedText) }, null, null);
    __VLS_35.slots.default;
    var __VLS_35;
    const __VLS_36 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        ...{ class: ("analysis-card") },
    }));
    const __VLS_38 = __VLS_37({
        ...{ class: ("analysis-card") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    {
        const { header: __VLS_thisSlot } = __VLS_41.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("card-title") },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("decision-flow") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("input-dimensions") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dimension text-dimension") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dimension-header") },
    });
    const __VLS_42 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
        ...{ class: ("dimension-icon") },
    }));
    const __VLS_44 = __VLS_43({
        ...{ class: ("dimension-icon") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    const __VLS_48 = {}.Document;
    /** @type { [typeof __VLS_components.Document, ] } */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
    const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_47.slots.default;
    var __VLS_47;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("dimension-title") },
    });
    const __VLS_54 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
        type: ("dashboard"),
        percentage: ((__VLS_ctx.textConfidence)),
        color: ((__VLS_ctx.textColor)),
        width: ((180)),
    }));
    const __VLS_56 = __VLS_55({
        type: ("dashboard"),
        percentage: ((__VLS_ctx.textConfidence)),
        color: ((__VLS_ctx.textColor)),
        width: ((180)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    {
        const { default: __VLS_thisSlot } = __VLS_59.slots;
        const [{ percentage }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-content") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("metric-label") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("metric-value") },
        });
        (percentage);
    }
    __VLS_59.slots.default;
    var __VLS_59;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dimension entity-dimension") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dimension-header") },
    });
    const __VLS_60 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        ...{ class: ("dimension-icon") },
    }));
    const __VLS_62 = __VLS_61({
        ...{ class: ("dimension-icon") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    const __VLS_66 = {}.Connection;
    /** @type { [typeof __VLS_components.Connection, ] } */ ;
    // @ts-ignore
    const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({}));
    const __VLS_68 = __VLS_67({}, ...__VLS_functionalComponentArgsRest(__VLS_67));
    __VLS_65.slots.default;
    var __VLS_65;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("dimension-title") },
    });
    const __VLS_72 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        type: ("dashboard"),
        percentage: ((__VLS_ctx.entityConfidence)),
        color: ((__VLS_ctx.entityColor)),
        width: ((180)),
    }));
    const __VLS_74 = __VLS_73({
        type: ("dashboard"),
        percentage: ((__VLS_ctx.entityConfidence)),
        color: ((__VLS_ctx.entityColor)),
        width: ((180)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    {
        const { default: __VLS_thisSlot } = __VLS_77.slots;
        const [{ percentage }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-content") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("metric-label") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("metric-value") },
        });
        (percentage);
    }
    __VLS_77.slots.default;
    var __VLS_77;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("synthesis-panel") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("formula-display") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("formula-text") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("formula-component") },
    });
    (__VLS_ctx.textWeight);
    const __VLS_78 = {}.ElIcon;
    /** @type { [typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ] } */ ;
    // @ts-ignore
    const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
        ...{ class: ("formula-icon") },
    }));
    const __VLS_80 = __VLS_79({
        ...{ class: ("formula-icon") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_79));
    const __VLS_84 = {}.Plus;
    /** @type { [typeof __VLS_components.Plus, ] } */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
    const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_83.slots.default;
    var __VLS_83;
    (__VLS_ctx.entityWeight);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result-display") },
    });
    const __VLS_90 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
        type: ("circle"),
        percentage: ((__VLS_ctx.finalConfidence)),
        color: ((__VLS_ctx.finalColor)),
        width: ((200)),
    }));
    const __VLS_92 = __VLS_91({
        type: ("circle"),
        percentage: ((__VLS_ctx.finalConfidence)),
        color: ((__VLS_ctx.finalColor)),
        width: ((200)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_91));
    {
        const { default: __VLS_thisSlot } = __VLS_95.slots;
        const [{ percentage }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("final-result") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("result-label") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("result-value") },
        });
        (percentage);
    }
    __VLS_95.slots.default;
    var __VLS_95;
    __VLS_41.slots.default;
    var __VLS_41;
}
['debiased-rumor-container', 'disable-select', 'result-card', 'result-header', 'status-icon', 'result-content', 'text-card', 'card-title', 'original-text', 'analysis-card', 'card-title', 'decision-flow', 'input-dimensions', 'dimension', 'text-dimension', 'dimension-header', 'dimension-icon', 'dimension-title', 'progress-content', 'metric-label', 'metric-value', 'dimension', 'entity-dimension', 'dimension-header', 'dimension-icon', 'dimension-title', 'progress-content', 'metric-label', 'metric-value', 'synthesis-panel', 'formula-display', 'formula-text', 'formula-component', 'formula-icon', 'result-display', 'final-result', 'result-label', 'result-value',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            SuccessFilled: SuccessFilled,
            WarningFilled: WarningFilled,
            hasData: hasData,
            isReal: isReal,
            textWeight: textWeight,
            entityWeight: entityWeight,
            finalConfidence: finalConfidence,
            textConfidence: textConfidence,
            entityConfidence: entityConfidence,
            resultClass: resultClass,
            verdictText: verdictText,
            verdictType: verdictType,
            confidenceText: confidenceText,
            finalColor: finalColor,
            textColor: textColor,
            entityColor: entityColor,
            highlightedText: highlightedText,
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
