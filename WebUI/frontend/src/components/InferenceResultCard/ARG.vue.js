import { ref, computed, watch } from 'vue';
import { Finished } from '@element-plus/icons-vue';
defineOptions({
    name: 'ArgResultViewer'
});
const props = defineProps({
    result: {
        type: Object,
        required: true,
        default: () => ({})
    }
});
const loading = ref(true);
watch(() => props.result, (newVal) => {
    console.log('props.result changed:', newVal, loading.value);
    if (loading.value && newVal != null && Object.keys(newVal).length > 0) {
        loading.value = false;
    }
    else if (!loading.value && Object.keys(newVal).length === 0) {
        loading.value = true;
    }
}, { immediate: true, deep: true } // 可选，看你是否需要立即执行和深度监听
);
// 处理数据格式
const modelLog = computed(() => {
    const log = props.result?.log || {};
    return {
        textualRationale: log['TextualDescriptionRationale'] || '',
        commonsenseRationale: log['CommonsenseRationale'] || '',
        textualJudgment: log['TextualDescriptionJudgement'] || 0,
        commonsenseJudgment: log['CommonsenseJudgement'] || 0,
        textualEvaluation: log['TDEvaluation'] * 100 || 0,
        commonsenseEvaluation: log['CSEvaluation'] * 100 || 0,
        confidence: `${log['Confidence'] * 100}% 置信度` || '95% 置信度',
    };
});
// 最终结果计算
const finalResult = computed(() => props.result?.data ?? 0);
const finalResultText = computed(() => finalResult.value ? '判定为虚假信息' : '判定为真实信息');
const resultClass = computed(() => ({
    'result-success': finalResult.value === 0,
    'result-danger': finalResult.value === 1
}));
const resultTagType = computed(() => finalResult.value ? 'danger' : 'success');
const resultPercentage = computed(() => modelLog.value.confidence);
// 评估分数转换（示例数据）
const textualScore = computed(() => modelLog.value.textualEvaluation);
const commonsenseScore = computed(() => modelLog.value.commonsenseEvaluation);
const scoreColor = (percentage) => {
    return percentage > 80 ? '#67c23a' : '#f56c6c';
};
// 判断结果转换
const textualJudgmentText = computed(() => modelLog.value.textualJudgment ? '存在异常' : '正常文本');
const commonsenseJudgmentText = computed(() => modelLog.value.commonsenseJudgment ? '存在矛盾' : '符合逻辑');
const textualJudgmentType = computed(() => modelLog.value.textualJudgment ? 'danger' : 'success');
const commonsenseJudgmentType = computed(() => modelLog.value.commonsenseJudgment ? 'danger' : 'success');
// 折叠面板控制
const activeNames = ref(['1', '2', '3']);
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
if (!__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("arg-result-container") },
    });
    const __VLS_0 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ class: ("result-overview") },
        ...{ class: ((__VLS_ctx.resultClass)) },
    }));
    const __VLS_2 = __VLS_1({
        ...{ class: ("result-overview") },
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
    }));
    const __VLS_8 = __VLS_7({
        ...{ class: ("result-icon") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const __VLS_12 = {}.Finished;
    /** @type { [typeof __VLS_components.Finished, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_11.slots.default;
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("result-title") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("result-content") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.finalResultText);
    const __VLS_18 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
        type: ((__VLS_ctx.resultTagType)),
        size: ("large"),
    }));
    const __VLS_20 = __VLS_19({
        type: ((__VLS_ctx.resultTagType)),
        size: ("large"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    (__VLS_ctx.resultPercentage);
    __VLS_23.slots.default;
    var __VLS_23;
    __VLS_5.slots.default;
    var __VLS_5;
    const __VLS_24 = {}.ElSteps;
    /** @type { [typeof __VLS_components.ElSteps, typeof __VLS_components.elSteps, typeof __VLS_components.ElSteps, typeof __VLS_components.elSteps, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        active: ((3)),
        finishStatus: ("success"),
        alignCenter: (true),
        ...{ class: ("process-steps") },
    }));
    const __VLS_26 = __VLS_25({
        active: ((3)),
        finishStatus: ("success"),
        alignCenter: (true),
        ...{ class: ("process-steps") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    const __VLS_30 = {}.ElStep;
    /** @type { [typeof __VLS_components.ElStep, typeof __VLS_components.elStep, ] } */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
        title: ("文本分析"),
        description: ("LLM生成推理依据"),
    }));
    const __VLS_32 = __VLS_31({
        title: ("文本分析"),
        description: ("LLM生成推理依据"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    const __VLS_36 = {}.ElStep;
    /** @type { [typeof __VLS_components.ElStep, typeof __VLS_components.elStep, ] } */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        title: ("有效性评估"),
        description: ("SLM验证推理质量"),
    }));
    const __VLS_38 = __VLS_37({
        title: ("有效性评估"),
        description: ("SLM验证推理质量"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    const __VLS_42 = {}.ElStep;
    /** @type { [typeof __VLS_components.ElStep, typeof __VLS_components.elStep, ] } */ ;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
        title: ("综合判断"),
        description: ("生成最终结论"),
    }));
    const __VLS_44 = __VLS_43({
        title: ("综合判断"),
        description: ("生成最终结论"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    __VLS_29.slots.default;
    var __VLS_29;
    const __VLS_48 = {}.ElCollapse;
    /** @type { [typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, ] } */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        modelValue: ((__VLS_ctx.activeNames)),
        ...{ class: ("detail-panels") },
    }));
    const __VLS_50 = __VLS_49({
        modelValue: ((__VLS_ctx.activeNames)),
        ...{ class: ("detail-panels") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    const __VLS_54 = {}.ElCollapseItem;
    /** @type { [typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, ] } */ ;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
        title: ("第一步：LLM基础分析"),
        name: ("1"),
    }));
    const __VLS_56 = __VLS_55({
        title: ("第一步：LLM基础分析"),
        name: ("1"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    const __VLS_60 = {}.ElRow;
    /** @type { [typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ] } */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        gutter: ((20)),
    }));
    const __VLS_62 = __VLS_61({
        gutter: ((20)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    const __VLS_66 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
        span: ((12)),
    }));
    const __VLS_68 = __VLS_67({
        span: ((12)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_67));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("analysis-panel") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("rationale-content") },
    });
    (__VLS_ctx.modelLog.textualRationale);
    __VLS_71.slots.default;
    var __VLS_71;
    const __VLS_72 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        span: ((12)),
    }));
    const __VLS_74 = __VLS_73({
        span: ((12)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("analysis-panel") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("rationale-content") },
    });
    (__VLS_ctx.modelLog.commonsenseRationale);
    __VLS_77.slots.default;
    var __VLS_77;
    __VLS_65.slots.default;
    var __VLS_65;
    __VLS_59.slots.default;
    var __VLS_59;
    const __VLS_78 = {}.ElCollapseItem;
    /** @type { [typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, ] } */ ;
    // @ts-ignore
    const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
        title: ("第二步：SLM有效性评估"),
        name: ("2"),
    }));
    const __VLS_80 = __VLS_79({
        title: ("第二步：SLM有效性评估"),
        name: ("2"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_79));
    const __VLS_84 = {}.ElRow;
    /** @type { [typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ] } */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        gutter: ((20)),
    }));
    const __VLS_86 = __VLS_85({
        gutter: ((20)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    const __VLS_90 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
        span: ((12)),
    }));
    const __VLS_92 = __VLS_91({
        span: ((12)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_91));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("assessment-panel") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    const __VLS_96 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        percentage: ((__VLS_ctx.textualScore)),
        color: ((__VLS_ctx.scoreColor)),
        showText: ((false)),
    }));
    const __VLS_98 = __VLS_97({
        percentage: ((__VLS_ctx.textualScore)),
        color: ((__VLS_ctx.scoreColor)),
        showText: ((false)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("score-text") },
    });
    (__VLS_ctx.textualScore);
    __VLS_95.slots.default;
    var __VLS_95;
    const __VLS_102 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
        span: ((12)),
    }));
    const __VLS_104 = __VLS_103({
        span: ((12)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("assessment-panel") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    const __VLS_108 = {}.ElProgress;
    /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        percentage: ((__VLS_ctx.commonsenseScore)),
        color: ((__VLS_ctx.scoreColor)),
        showText: ((false)),
    }));
    const __VLS_110 = __VLS_109({
        percentage: ((__VLS_ctx.commonsenseScore)),
        color: ((__VLS_ctx.scoreColor)),
        showText: ((false)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("score-text") },
    });
    (__VLS_ctx.commonsenseScore);
    __VLS_107.slots.default;
    var __VLS_107;
    __VLS_89.slots.default;
    var __VLS_89;
    __VLS_83.slots.default;
    var __VLS_83;
    const __VLS_114 = {}.ElCollapseItem;
    /** @type { [typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, ] } */ ;
    // @ts-ignore
    const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
        title: ("第三步：综合判断"),
        name: ("3"),
    }));
    const __VLS_116 = __VLS_115({
        title: ("第三步：综合判断"),
        name: ("3"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_115));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("judgment-panel") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("judgment-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    const __VLS_120 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        type: ((__VLS_ctx.textualJudgmentType)),
    }));
    const __VLS_122 = __VLS_121({
        type: ((__VLS_ctx.textualJudgmentType)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    (__VLS_ctx.textualJudgmentText);
    __VLS_125.slots.default;
    var __VLS_125;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("judgment-item") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    const __VLS_126 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
        type: ((__VLS_ctx.commonsenseJudgmentType)),
    }));
    const __VLS_128 = __VLS_127({
        type: ((__VLS_ctx.commonsenseJudgmentType)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_127));
    (__VLS_ctx.commonsenseJudgmentText);
    __VLS_131.slots.default;
    var __VLS_131;
    __VLS_119.slots.default;
    var __VLS_119;
    __VLS_53.slots.default;
    var __VLS_53;
}
['arg-result-container', 'result-overview', 'result-header', 'result-icon', 'result-title', 'result-content', 'process-steps', 'detail-panels', 'analysis-panel', 'rationale-content', 'analysis-panel', 'rationale-content', 'assessment-panel', 'score-text', 'assessment-panel', 'score-text', 'judgment-panel', 'judgment-item', 'label', 'judgment-item', 'label',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            $props: __VLS_makeOptional(props),
            ...props,
            Finished: Finished,
            loading: loading,
            modelLog: modelLog,
            finalResultText: finalResultText,
            resultClass: resultClass,
            resultTagType: resultTagType,
            resultPercentage: resultPercentage,
            textualScore: textualScore,
            commonsenseScore: commonsenseScore,
            scoreColor: scoreColor,
            textualJudgmentText: textualJudgmentText,
            commonsenseJudgmentText: commonsenseJudgmentText,
            textualJudgmentType: textualJudgmentType,
            commonsenseJudgmentType: commonsenseJudgmentType,
            activeNames: activeNames,
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
