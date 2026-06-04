import { computed, ref } from 'vue';
const props = defineProps();
// 分类标签
const categories = computed(() => props.results.data[0]);
// 取 llm_response 的第 0 项作为解释 map
const explanations = computed(() => {
    const resp = props.results.log.llm_response && props.results.log.llm_response[0];
    return resp || {};
});
// 默认全部展开
const activeNames = ref(categories.value); /* PartiallyEnd: #3632/scriptSetup.vue */
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
for (const [tag, idx] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
    const __VLS_0 = {}.ElTag;
    /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        key: ((idx)),
        ...{ class: ("violation-tag") },
        size: ("small"),
        type: ("danger"),
        effect: ("plain"),
    }));
    const __VLS_2 = __VLS_1({
        key: ((idx)),
        ...{ class: ("violation-tag") },
        size: ("small"),
        type: ("danger"),
        effect: ("plain"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    (tag);
    __VLS_5.slots.default;
    var __VLS_5;
}
const __VLS_6 = {}.ElCollapse;
/** @type { [typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, typeof __VLS_components.ElCollapse, typeof __VLS_components.elCollapse, ] } */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
    modelValue: ((__VLS_ctx.activeNames)),
    ...{ class: ("explanations") },
}));
const __VLS_8 = __VLS_7({
    modelValue: ((__VLS_ctx.activeNames)),
    ...{ class: ("explanations") },
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
for (const [explanation, cat] of __VLS_getVForSourceType((__VLS_ctx.explanations))) {
    const __VLS_12 = {}.ElCollapseItem;
    /** @type { [typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, typeof __VLS_components.ElCollapseItem, typeof __VLS_components.elCollapseItem, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        key: ((cat)),
        title: ((cat)),
        name: ((cat)),
    }));
    const __VLS_14 = __VLS_13({
        key: ((cat)),
        title: ((cat)),
        name: ((cat)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("explanation-text") },
    });
    (explanation);
    __VLS_17.slots.default;
    var __VLS_17;
}
__VLS_11.slots.default;
var __VLS_11;
['violation-output', 'output-label', 'violation-tags', 'violation-tag', 'explanations', 'explanation-text',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            categories: categories,
            explanations: explanations,
            activeNames: activeNames,
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
