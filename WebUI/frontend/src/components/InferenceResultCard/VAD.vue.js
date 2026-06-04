import { reactive } from 'vue';
const __VLS_props = defineProps();
// 根据类别数量生成一组颜色（可自定义）
const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#9A60B4'];
const colorMap = reactive(colors);
const VADMapping = {
    Valence: 'Valence/情绪正负向',
    Arousal: 'Arousal/情绪强度',
    Dominance: 'Dominance/控制感'
};
// V/A/D 颜色映射
const vadColorMap = {
    Valence: '#409EFF',
    Arousal: '#E6A23C',
    Dominance: '#F56C6C',
}; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
['prediction', 'label', 'label',];
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("multi-sentiment-result") },
});
const __VLS_0 = {}.ElCollapse;
/** @type { [typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    accordion: (true),
}));
const __VLS_2 = __VLS_1({
    accordion: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
for (const [item, idx] of __VLS_getVForSourceType((__VLS_ctx.results))) {
    const __VLS_6 = {}.ElCollapseItem;
    /** @type { [typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        key: ((idx)),
        title: ((`第 ${idx + 1} 句话：${__VLS_ctx.utterances[idx] || ''}`)),
        name: ((String(idx))),
    }));
    const __VLS_8 = __VLS_7({
        key: ((idx)),
        title: ((`第 ${idx + 1} 句话：${__VLS_ctx.utterances[idx] || ''}`)),
        name: ((String(idx))),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content-block") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("prediction") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    const __VLS_12 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        type: ("success"),
    }));
    const __VLS_14 = __VLS_13({
        type: ("success"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    (__VLS_ctx.labels[item.predicted_class]);
    __VLS_17.slots.default;
    var __VLS_17;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("probabilities") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    for (const [p, ci] of __VLS_getVForSourceType((item.class_probs))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("prob-list") },
            key: ((ci)),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("prob-label") },
        });
        (__VLS_ctx.labels[ci], p);
        const __VLS_18 = {}.ElProgress;
        /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
            percentage: ((Math.round(p * 100))),
            strokeWidth: ((16)),
            textInside: ((true)),
            color: ((__VLS_ctx.colorMap[ci])),
        }));
        const __VLS_20 = __VLS_19({
            percentage: ((Math.round(p * 100))),
            strokeWidth: ((16)),
            textInside: ((true)),
            color: ((__VLS_ctx.colorMap[ci])),
        }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("vad-analysis") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("label") },
    });
    const __VLS_24 = {}.ElRow;
    /** @type { [typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        gutter: ((24)),
    }));
    const __VLS_26 = __VLS_25({
        gutter: ((24)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    for (const [name] of __VLS_getVForSourceType((['Valence', 'Arousal', 'Dominance']))) {
        const __VLS_30 = {}.ElCol;
        /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
        // @ts-ignore
        const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
            span: ((8)),
            key: ((name)),
        }));
        const __VLS_32 = __VLS_31({
            span: ((8)),
            key: ((name)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_31));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("vad-item") },
        });
        const __VLS_36 = {}.ElProgress;
        /** @type { [typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ] } */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            type: ("circle"),
            percentage: ((Math.round(item[name.toLowerCase()] * 100))),
            width: ((80)),
            color: ((__VLS_ctx.vadColorMap[name])),
        }));
        const __VLS_38 = __VLS_37({
            type: ("circle"),
            percentage: ((Math.round(item[name.toLowerCase()] * 100))),
            width: ((80)),
            color: ((__VLS_ctx.vadColorMap[name])),
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("vad-label") },
        });
        (__VLS_ctx.VADMapping[name]);
        __VLS_35.slots.default;
        var __VLS_35;
    }
    __VLS_29.slots.default;
    var __VLS_29;
    __VLS_11.slots.default;
    var __VLS_11;
}
__VLS_5.slots.default;
var __VLS_5;
['multi-sentiment-result', 'content-block', 'prediction', 'label', 'probabilities', 'label', 'prob-list', 'prob-label', 'vad-analysis', 'label', 'vad-item', 'vad-label',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            colorMap: colorMap,
            VADMapping: VADMapping,
            vadColorMap: vadColorMap,
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
