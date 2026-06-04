import { ref } from "vue";
import { ElMessage } from "element-plus";
import { getEmotionTagType, getSentimentLabel, getStanceTagType, stringifyRawResult } from "./socialResult";
const __VLS_props = defineProps();
const emit = defineEmits();
const rawDialogVisible = ref(false);
const rawDialogContent = ref("");
const rawDialogTitle = ref("模型原始输出");
const rawDialogSource = ref("");
const getRawPreview = (row) => {
    if (!row?.raw_result)
        return "";
    const cleaned = stringifyRawResult(row.raw_result).replace(/\s+/g, " ").trim();
    return cleaned.length > 120 ? `${cleaned.slice(0, 120)}...` : cleaned;
};
const showRaw = (row) => {
    if (!row?.raw_result) {
        ElMessage.info("无原始输出可查看");
        return;
    }
    rawDialogContent.value = stringifyRawResult(row.raw_result);
    rawDialogTitle.value = `原始输出${row.model_name ? ` — ${row.model_name}` : ""}`;
    rawDialogSource.value = row.data_id ? `data_id: ${row.data_id}` : "";
    rawDialogVisible.value = true;
};
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['raw-preview',];
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElDrawer;
/** @type { [typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: ((__VLS_ctx.visible)),
    title: ((__VLS_ctx.analysisType === 'emotion' ? '情感分析结果' : '立场分析结果')),
    size: ("72%"),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: ((__VLS_ctx.visible)),
    title: ((__VLS_ctx.analysisType === 'emotion' ? '情感分析结果' : '立场分析结果')),
    size: ("72%"),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_6 = {};
let __VLS_7;
const __VLS_8 = {
    'onUpdate:modelValue': (...[$event]) => {
        __VLS_ctx.emit('update:visible', $event);
    }
};
let __VLS_3;
let __VLS_4;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("analysis-summary") },
});
if (__VLS_ctx.summary.valid > 0) {
    const __VLS_9 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
        type: ("success"),
    }));
    const __VLS_11 = __VLS_10({
        type: ("success"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
    (__VLS_ctx.summary.valid);
    __VLS_14.slots.default;
    var __VLS_14;
}
if (__VLS_ctx.summary.invalid > 0) {
    const __VLS_15 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
        type: ("danger"),
    }));
    const __VLS_17 = __VLS_16({
        type: ("danger"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    (__VLS_ctx.summary.invalid);
    __VLS_20.slots.default;
    var __VLS_20;
}
const __VLS_21 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({}));
const __VLS_23 = __VLS_22({}, ...__VLS_functionalComponentArgsRest(__VLS_22));
(__VLS_ctx.summary.processing_time_sec || 0);
__VLS_26.slots.default;
var __VLS_26;
const __VLS_27 = {}.ElTag;
/** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({}));
const __VLS_29 = __VLS_28({}, ...__VLS_functionalComponentArgsRest(__VLS_28));
(__VLS_ctx.summary.model_used || '—');
__VLS_32.slots.default;
var __VLS_32;
const __VLS_33 = {}.ElTable;
/** @type { [typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ] } */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    data: ((__VLS_ctx.results)),
    border: (true),
    height: ("calc(100vh - 210px)"),
}));
const __VLS_35 = __VLS_34({
    data: ((__VLS_ctx.results)),
    border: (true),
    height: ("calc(100vh - 210px)"),
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
const __VLS_39 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
    prop: ("text"),
    label: ("原文"),
    minWidth: ("260"),
}));
const __VLS_41 = __VLS_40({
    prop: ("text"),
    label: ("原文"),
    minWidth: ("260"),
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
{
    const { default: __VLS_thisSlot } = __VLS_44.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_45 = {}.ElTooltip;
    /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
        effect: ("dark"),
        content: ((row.text)),
        placement: ("top"),
    }));
    const __VLS_47 = __VLS_46({
        effect: ("dark"),
        content: ((row.text)),
        placement: ("top"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_46));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("text-preview") },
    });
    (row.text);
    __VLS_50.slots.default;
    var __VLS_50;
}
__VLS_44.slots.default;
var __VLS_44;
const __VLS_51 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
    label: ("处理后文本"),
    minWidth: ("260"),
}));
const __VLS_53 = __VLS_52({
    label: ("处理后文本"),
    minWidth: ("260"),
}, ...__VLS_functionalComponentArgsRest(__VLS_52));
{
    const { default: __VLS_thisSlot } = __VLS_56.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_57 = {}.ElTooltip;
    /** @type { [typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ] } */ ;
    // @ts-ignore
    const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
        effect: ("dark"),
        content: ((row.processed_text)),
        placement: ("top"),
    }));
    const __VLS_59 = __VLS_58({
        effect: ("dark"),
        content: ((row.processed_text)),
        placement: ("top"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_58));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("text-preview") },
    });
    (row.processed_text || '未处理');
    __VLS_62.slots.default;
    var __VLS_62;
    if (row.error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("error-text") },
        });
        (row.error);
    }
}
__VLS_56.slots.default;
var __VLS_56;
if (__VLS_ctx.analysisType === 'emotion') {
    const __VLS_63 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
        prop: ("pred"),
        label: ("情感结果"),
        width: ("100"),
    }));
    const __VLS_65 = __VLS_64({
        prop: ("pred"),
        label: ("情感结果"),
        width: ("100"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    {
        const { default: __VLS_thisSlot } = __VLS_68.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_69 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
            type: ((__VLS_ctx.getEmotionTagType(row.pred))),
        }));
        const __VLS_71 = __VLS_70({
            type: ((__VLS_ctx.getEmotionTagType(row.pred))),
        }, ...__VLS_functionalComponentArgsRest(__VLS_70));
        (row.pred || '无效');
        __VLS_74.slots.default;
        var __VLS_74;
    }
    __VLS_68.slots.default;
    var __VLS_68;
}
if (__VLS_ctx.analysisType === 'emotion') {
    const __VLS_75 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
        prop: ("label"),
        label: ("舆情标签"),
        width: ("100"),
    }));
    const __VLS_77 = __VLS_76({
        prop: ("label"),
        label: ("舆情标签"),
        width: ("100"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    {
        const { default: __VLS_thisSlot } = __VLS_80.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_81 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
            type: ((__VLS_ctx.getEmotionTagType(__VLS_ctx.getSentimentLabel(row.label)))),
        }));
        const __VLS_83 = __VLS_82({
            type: ((__VLS_ctx.getEmotionTagType(__VLS_ctx.getSentimentLabel(row.label)))),
        }, ...__VLS_functionalComponentArgsRest(__VLS_82));
        (__VLS_ctx.getSentimentLabel(row.label) || '缺失');
        __VLS_86.slots.default;
        var __VLS_86;
    }
    __VLS_80.slots.default;
    var __VLS_80;
}
if (__VLS_ctx.analysisType === 'stance') {
    const __VLS_87 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
        prop: ("target"),
        label: ("分析目标"),
        width: ("120"),
    }));
    const __VLS_89 = __VLS_88({
        prop: ("target"),
        label: ("分析目标"),
        width: ("120"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
}
if (__VLS_ctx.analysisType === 'stance') {
    const __VLS_93 = {}.ElTableColumn;
    /** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
    // @ts-ignore
    const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
        prop: ("pred"),
        label: ("立场结果"),
        width: ("110"),
    }));
    const __VLS_95 = __VLS_94({
        prop: ("pred"),
        label: ("立场结果"),
        width: ("110"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_94));
    {
        const { default: __VLS_thisSlot } = __VLS_98.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_99 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
            type: ((__VLS_ctx.getStanceTagType(row.pred))),
        }));
        const __VLS_101 = __VLS_100({
            type: ((__VLS_ctx.getStanceTagType(row.pred))),
        }, ...__VLS_functionalComponentArgsRest(__VLS_100));
        (row.pred || '无效');
        __VLS_104.slots.default;
        var __VLS_104;
    }
    __VLS_98.slots.default;
    var __VLS_98;
}
const __VLS_105 = {}.ElTableColumn;
/** @type { [typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ] } */ ;
// @ts-ignore
const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({
    label: ("模型判断理由"),
    minWidth: ("220"),
}));
const __VLS_107 = __VLS_106({
    label: ("模型判断理由"),
    minWidth: ("220"),
}, ...__VLS_functionalComponentArgsRest(__VLS_106));
{
    const { default: __VLS_thisSlot } = __VLS_110.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (row.raw_result) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ onClick: (...[$event]) => {
                    if (!((row.raw_result)))
                        return;
                    __VLS_ctx.showRaw(row);
                } },
            ...{ class: ("raw-preview") },
        });
        (__VLS_ctx.getRawPreview(row));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("muted") },
        });
    }
}
__VLS_110.slots.default;
var __VLS_110;
__VLS_38.slots.default;
var __VLS_38;
const __VLS_111 = {}.ElDialog;
/** @type { [typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ] } */ ;
// @ts-ignore
const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
    modelValue: ((__VLS_ctx.rawDialogVisible)),
    title: ((__VLS_ctx.rawDialogTitle)),
    width: ("70%"),
    appendToBody: (true),
}));
const __VLS_113 = __VLS_112({
    modelValue: ((__VLS_ctx.rawDialogVisible)),
    title: ((__VLS_ctx.rawDialogTitle)),
    width: ("70%"),
    appendToBody: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_112));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("raw-dialog-actions") },
});
const __VLS_117 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent(__VLS_117, new __VLS_117({
    ...{ 'onClick': {} },
    size: ("small"),
}));
const __VLS_119 = __VLS_118({
    ...{ 'onClick': {} },
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_118));
let __VLS_123;
const __VLS_124 = {
    onClick: (...[$event]) => {
        __VLS_ctx.rawDialogVisible = false;
    }
};
let __VLS_120;
let __VLS_121;
__VLS_122.slots.default;
var __VLS_122;
if (__VLS_ctx.rawDialogSource) {
    const __VLS_125 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
        size: ("small"),
    }));
    const __VLS_127 = __VLS_126({
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_126));
    (__VLS_ctx.rawDialogSource);
    __VLS_130.slots.default;
    var __VLS_130;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("raw-content-wrapper") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
    ...{ class: ("raw-content") },
});
(__VLS_ctx.rawDialogContent);
__VLS_116.slots.default;
var __VLS_116;
__VLS_5.slots.default;
var __VLS_5;
['analysis-summary', 'text-preview', 'text-preview', 'error-text', 'raw-preview', 'muted', 'raw-dialog-actions', 'raw-content-wrapper', 'raw-content',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            getEmotionTagType: getEmotionTagType,
            getSentimentLabel: getSentimentLabel,
            getStanceTagType: getStanceTagType,
            emit: emit,
            rawDialogVisible: rawDialogVisible,
            rawDialogContent: rawDialogContent,
            rawDialogTitle: rawDialogTitle,
            rawDialogSource: rawDialogSource,
            getRawPreview: getRawPreview,
            showRaw: showRaw,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
