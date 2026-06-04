import { computed, defineProps, ref } from 'vue';
// 分类标签
const categories = computed(() => props.result?.data?.[0] || null);
// 取 llm_response 的第 0 项作为解释 map
const explanations = computed(() => {
    const resp = props.result?.log?.llm_response && props.result?.log?.llm_response[0];
    return resp || {};
});
const props = defineProps();
// Take first LLM response object
const responseMap = computed(() => {
    const arr = props.result?.log?.llm_response || [];
    return arr.length > 0 ? arr[0] : {};
});
// For collapse control
const activeKeys = ref(Object.keys(responseMap.value)); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("violation-output") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: ("output-label") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("violation-tags") },
});
if (!__VLS_ctx.categories) {
    const __VLS_0 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ class: ("null-tag") },
        size: ("small"),
        type: ("success"),
        effect: ("plain"),
    }));
    const __VLS_2 = __VLS_1({
        ...{ class: ("null-tag") },
        size: ("small"),
        type: ("success"),
        effect: ("plain"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_5.slots.default;
    var __VLS_5;
}
else if (__VLS_ctx.categories.length > 0) {
    for (const [tag, idx] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
        const __VLS_6 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
            key: ((idx)),
            ...{ class: ("violation-tag") },
            size: ("small"),
            type: ("danger"),
            effect: ("plain"),
        }));
        const __VLS_8 = __VLS_7({
            key: ((idx)),
            ...{ class: ("violation-tag") },
            size: ("small"),
            type: ("danger"),
            effect: ("plain"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_7));
        (tag);
        __VLS_11.slots.default;
        var __VLS_11;
    }
}
else if (__VLS_ctx.categories.length === 0) {
    const __VLS_12 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ class: ("legal-tag") },
        size: ("small"),
        type: ("success"),
        effect: ("plain"),
    }));
    const __VLS_14 = __VLS_13({
        ...{ class: ("legal-tag") },
        size: ("small"),
        type: ("success"),
        effect: ("plain"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_17.slots.default;
    var __VLS_17;
}
const __VLS_18 = {}.ElCollapse;
/** @type { [typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, ] } */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    modelValue: ((__VLS_ctx.activeKeys)),
    ...{ class: ("explanations") },
}));
const __VLS_20 = __VLS_19({
    modelValue: ((__VLS_ctx.activeKeys)),
    ...{ class: ("explanations") },
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
for (const [explanation, cat] of __VLS_getVForSourceType((__VLS_ctx.explanations))) {
    const __VLS_24 = {}.ElCollapseItem;
    /** @type { [typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        key: ((cat)),
        title: ((cat)),
        name: ((cat)),
    }));
    const __VLS_26 = __VLS_25({
        key: ((cat)),
        title: ((cat)),
        name: ((cat)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("explanation-text") },
    });
    (explanation);
    __VLS_29.slots.default;
    var __VLS_29;
}
__VLS_23.slots.default;
var __VLS_23;
['violation-output', 'output-label', 'violation-tags', 'null-tag', 'violation-tag', 'legal-tag', 'explanations', 'explanation-text',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            categories: categories,
            explanations: explanations,
            activeKeys: activeKeys,
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
